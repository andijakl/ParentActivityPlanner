"use client";

import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { AlertTriangle } from 'lucide-react'; // For error icon

interface AuthProviderComponentProps {
  children: React.ReactNode;
}

// Routes accessible only when logged out
const PUBLIC_ROUTES = ['/signin', '/signup']; // Invite route handled separately
// Routes accessible only when logged in
const PROTECTED_ROUTES_PREFIX = '/'; // Assuming all main app routes start with '/' implicitly after auth routes

export default function AuthProviderComponent({ children }: AuthProviderComponentProps) {
  // Get state from context, including the definitive initialization status
  const { user, loading, error, isFirebaseInitialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Perform redirects *only* if Firebase is initialized AND auth state is no longer loading
    if (isFirebaseInitialized && !loading) {
      const isPublicAuthRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
      // Invite route needs special handling - allow access whether logged in or out
      const isInviteRoute = pathname.startsWith('/invite/');
      const isRootPath = pathname === '/'; // Handle root path explicitly if needed

      if (!user && !isPublicAuthRoute && !isInviteRoute && !isRootPath) {
        // If not logged in and accessing a protected route (excluding invite and root)
        console.log(`AuthProviderComponent: User not logged in, redirecting from ${pathname} to /signin`);
        router.replace('/signin'); // Use replace to avoid history clutter
      } else if (user && (isPublicAuthRoute || isRootPath) && !isInviteRoute) {
        // If logged in and trying to access signin/signup or root (excluding invite)
        console.log(`AuthProviderComponent: User logged in, redirecting from ${pathname} to /dashboard`);
        router.replace('/dashboard');
      }
      // Allow access if:
      // - User is logged in & accessing protected route OR invite route
      // - User is not logged in & accessing public route OR invite route
    }
  }, [user, loading, router, pathname, isFirebaseInitialized]);

   // --- Render Logic ---

   // 1. Handle Firebase Initialization Error (Highest Priority)
   // This uses the status determined during config.ts load
   if (!isFirebaseInitialized) {
     return (
         <div className="flex flex-col items-center justify-center min-h-screen text-center text-destructive p-4 bg-background">
              <AlertTriangle className="h-12 w-12 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Application Initialization Error</h2>
              <p className="max-w-md">
                 {error?.message || "Could not connect to essential services. Please check Firebase configuration or network connection."}
              </p>
              {/* Optionally add a retry button - might require page reload */}
              {/* <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">Retry</Button> */}
         </div>
     );
   }

   // 2. Handle General Loading State (Auth check in progress, *after* successful initialization)
   // Show loading skeleton while checking auth state or during redirects.
   const isPublicAuthRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
   const isInviteRoute = pathname.startsWith('/invite/');
   const isRootPath = pathname === '/';
   let showLoadingSkeleton = loading;

   // Prevent flash of content during redirects
    if (isFirebaseInitialized && !loading) {
       if (!user && !isPublicAuthRoute && !isInviteRoute && !isRootPath) {
           // Redirecting to signin
           showLoadingSkeleton = true;
       }
       if (user && (isPublicAuthRoute || isRootPath) && !isInviteRoute) {
          // Redirecting to dashboard
           showLoadingSkeleton = true;
       }
    }


   if (showLoadingSkeleton) {
     return (
       <div className="flex items-center justify-center min-h-screen bg-background">
         <Skeleton className="h-12 w-12 rounded-full" />
         <Skeleton className="h-4 w-[250px] ml-4" />
       </div>
     );
   }

    // 3. Handle Potential Auth Fetch Errors (After loading & initialization is ok)
    // This error might be related to fetching the user profile, etc., from the context useEffect.
    // Only show this if initialization itself was okay.
    if (error) { // Check for error *after* initialization check and loading state
       return (
           <div className="flex flex-col items-center justify-center min-h-screen text-center text-destructive p-4 bg-background">
              <AlertTriangle className="h-12 w-12 mb-4" />
              <h2 className="text-xl font-semibold mb-2">An Error Occurred</h2>
              <p className="max-w-md">
                 {error.message || "Something went wrong while loading your information. Please try refreshing the page."}
              </p>
           </div>
       );
    }

   // 4. Render Children (If initialized, not loading, no errors, and route access is permitted)
   // If we reach this point, all checks have passed, and redirects (if any) should have happened or are in progress (covered by skeleton).
  return <>{children}</>;
}

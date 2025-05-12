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
const PUBLIC_ROUTES = ['/signin', '/signup', '/invite'];
// Routes accessible only when logged in
const PROTECTED_ROUTES_PREFIX = '/'; // Assuming all main app routes start with '/' implicitly after auth routes

export default function AuthProviderComponent({ children }: AuthProviderComponentProps) {
  const { user, loading, error, isFirebaseInitialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only perform redirects if Firebase is initialized and not loading
    if (isFirebaseInitialized && !loading) {
      const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
      const isInviteRoute = pathname.startsWith('/invite/'); // Allow invite route access regardless of login status

      if (!user && !isPublicRoute && !isInviteRoute) {
        // If user is not logged in and trying to access a protected route (excluding invite)
        console.log(`AuthProviderComponent: User not logged in, redirecting from ${pathname} to /signin`);
        router.push('/signin');
      } else if (user && isPublicRoute && !isInviteRoute) {
        // If user is logged in and trying to access signin/signup (excluding invite)
        console.log(`AuthProviderComponent: User logged in, redirecting from ${pathname} to /dashboard`);
        router.push('/dashboard');
      }
      // Allow access if:
      // - user is logged in and accessing protected route
      // - user is not logged in and accessing public route or invite route
      // - user is logged in and accessing invite route
    }
  }, [user, loading, router, pathname, isFirebaseInitialized]);

   // --- Render Logic ---

   // 1. Handle Firebase Initialization Error (Highest Priority)
   if (!isFirebaseInitialized) {
     return (
         <div className="flex flex-col items-center justify-center min-h-screen text-center text-destructive p-4 bg-background">
              <AlertTriangle className="h-12 w-12 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Application Initialization Error</h2>
              <p className="max-w-md">
                 {error?.message || "Could not connect to essential services. Please ensure your Firebase configuration is correct or contact support."}
              </p>
              {/* Optionally add a retry button or link */}
         </div>
     );
   }

   // 2. Handle General Loading State (Auth check in progress)
   // We show loading skeleton regardless of the target route while auth is being checked.
   if (loading) {
     return (
       <div className="flex items-center justify-center min-h-screen bg-background">
         <Skeleton className="h-12 w-12 rounded-full" />
         <Skeleton className="h-4 w-[250px] ml-4" />
       </div>
     );
   }

    // 3. Handle Potential Auth Fetch Errors (After loading & initialization is ok)
    // This error might be related to fetching the user profile, etc.
    // Depending on the severity, you might show a less intrusive error or allow partial access.
    // For now, we'll show a similar error screen if an error exists after loading.
    if (error) {
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

   // 4. Render Children (If initialized, not loading, no errors, and route access is permitted by useEffect logic)
   // The useEffect handles redirection, so if we reach this point, the user should see the intended content.
   // We add a check here to prevent rendering the children briefly during a redirect triggered by useEffect.
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
    const isInviteRoute = pathname.startsWith('/invite/');
    if (!user && !isPublicRoute && !isInviteRoute) {
        // Still loading/redirecting to signin, show skeleton to avoid flash of protected content
        return (
             <div className="flex items-center justify-center min-h-screen bg-background">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-4 w-[250px] ml-4" />
            </div>
        )
    }
    if (user && isPublicRoute && !isInviteRoute) {
        // Still loading/redirecting to dashboard, show skeleton to avoid flash of public content
         return (
             <div className="flex items-center justify-center min-h-screen bg-background">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-4 w-[250px] ml-4" />
            </div>
        )
    }


  // Render the actual page content if all checks pass
  return <>{children}</>;
}
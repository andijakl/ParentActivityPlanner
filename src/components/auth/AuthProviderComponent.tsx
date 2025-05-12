"use client";

import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

interface AuthProviderComponentProps {
  children: React.ReactNode;
}

// Routes accessible only when logged out
const PUBLIC_ROUTES = ['/signin', '/signup', '/invite'];
// Routes accessible only when logged in
const PROTECTED_ROUTES_PREFIX = '/'; // Assuming all main app routes start with '/' implicitly after auth routes

export default function AuthProviderComponent({ children }: AuthProviderComponentProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
      const isInviteRoute = pathname.startsWith('/invite/');

      if (!user && !isPublicRoute) {
        // If user is not logged in and trying to access a protected route
        router.push('/signin');
      } else if (user && isPublicRoute && !isInviteRoute) {
        // If user is logged in and trying to access signin/signup
        // Allow access to invite routes even if logged in
        router.push('/dashboard');
      }
      // Allow access if:
      // - user is logged in and accessing protected route
      // - user is not logged in and accessing public route
      // - user is logged in or out and accessing invite route
    }
  }, [user, loading, router, pathname]);

  // Show loading state while checking auth, prevents flicker
  if (loading) {
     return (
        <div className="flex items-center justify-center min-h-screen">
           <Skeleton className="h-12 w-12 rounded-full" />
           <Skeleton className="h-4 w-[250px] ml-4" />
        </div>
     );
  }

  // Prevent rendering protected routes prematurely if redirecting
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
   if (!user && !isPublicRoute) {
     return ( // Still show loading or minimal layout while redirecting
       <div className="flex items-center justify-center min-h-screen">
         <Skeleton className="h-12 w-12 rounded-full" />
         <Skeleton className="h-4 w-[250px] ml-4" />
       </div>
     );
   }
   // Prevent rendering signin/signup if logged in and redirecting
   const isInviteRoute = pathname.startsWith('/invite/');
   if (user && isPublicRoute && !isInviteRoute) {
        return ( // Still show loading or minimal layout while redirecting
            <div className="flex items-center justify-center min-h-screen">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-4 w-[250px] ml-4" />
            </div>
        );
   }


  return <>{children}</>;
}

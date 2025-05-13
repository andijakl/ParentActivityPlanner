// src/components/auth/AuthProviderComponent.tsx
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuthProviderComponent({ children }: { children: React.ReactNode }) {
  const { user, loading, firebaseConfigError, firebaseAuthError, isFirebaseSetupAttempted } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthRoute = pathname.startsWith('/signin') || pathname.startsWith('/signup');
  const isInviteRoute = pathname.startsWith('/invite');
  // The home page '/' is special, it redirects based on auth state, so it's not strictly "public" in the same way as /invite
  const isPublicRoute = isAuthRoute || isInviteRoute || pathname === '/'; // Keep '/' as public for initial load determination

  useEffect(() => {
    console.log(
      `[AuthProviderComponent] Effect run. Path: ${pathname}, User: ${user ? user.uid : 'null'}, Loading: ${loading}, FirebaseConfigError: ${!!firebaseConfigError}, FirebaseAuthError: ${!!firebaseAuthError}, IsFirebaseSetupAttempted: ${isFirebaseSetupAttempted}, IsAuthRoute: ${isAuthRoute}, IsPublicRoute: ${isPublicRoute}`
    );

    if (firebaseConfigError) {
      console.error("[AuthProviderComponent] Firebase Configuration Error detected. Auth checks and redirects halted.", firebaseConfigError);
      return;
    }

    // Only perform redirects if Firebase setup has been attempted, is not loading, and there's no config error.
    if (isFirebaseSetupAttempted && !loading && !firebaseConfigError) {
      if (user) { // User is logged in
        if (isAuthRoute) {
          console.log(`[AuthProviderComponent] User logged in, but on auth route (${pathname}). Redirecting to /dashboard.`);
          router.replace('/dashboard');
        } else {
          console.log(`[AuthProviderComponent] User logged in. Staying on current route: ${pathname}`);
          // No redirect needed if user is logged in and not on an auth route.
        }
      } else { // User is not logged in
        if (!isPublicRoute) {
          console.log(`[AuthProviderComponent] User not logged in and on protected route (${pathname}). Redirecting to /signin.`);
          router.replace('/signin');
        } else {
           console.log(`[AuthProviderComponent] User not logged in, but on public route (${pathname}). No redirect needed.`);
        }
      }
    } else {
        console.log(`[AuthProviderComponent] Conditions for redirect logic not met. Loading: ${loading}, FirebaseConfigError: ${!!firebaseConfigError}, isFirebaseSetupAttempted: ${isFirebaseSetupAttempted}`);
    }
  }, [user, loading, router, pathname, isAuthRoute, isPublicRoute, firebaseConfigError, firebaseAuthError, isFirebaseSetupAttempted]);


  if (firebaseConfigError) {
    // This block handles critical Firebase configuration errors.
    // It should be displayed regardless of the route.
    console.log(`[AuthProviderComponent] Rendering Firebase Configuration Error Page for path: ${pathname}`);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-foreground">
        <div className="w-full max-w-lg p-6 md:p-8 border rounded-lg shadow-xl bg-card border-destructive">
          <h1 className="text-xl md:text-2xl font-bold text-destructive mb-4 text-center">Application Configuration Error</h1>
          <p className="text-card-foreground mb-3 text-center">
            Parent Activity Hub cannot start due to a Firebase configuration problem.
          </p>
          <div className="bg-destructive/10 p-3 rounded-md mb-4">
            <p className="text-sm text-destructive font-medium">
              <strong>Error Details:</strong> {firebaseConfigError.message}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Please ensure your Firebase environment variables (e.g., <code>NEXT_PUBLIC_FIREBASE_API_KEY</code>) are correctly set in your <code>.env.local</code> file and that the Firebase project is properly set up in the Firebase console (including authorized domains for authentication if applicable).
          </p>
           <div className="mt-6 text-center">
            <Button onClick={() => window.location.reload()} variant="destructive">
              Try Reloading Page
            </Button>
          </div>
        </div>
      </div>
    );
  }


  // Show loading skeleton if:
  // 1. Firebase setup has been attempted AND
  // 2. Auth state is loading AND
  // 3. There's no Firebase config error
  if (isFirebaseSetupAttempted && loading && !firebaseConfigError) {
    console.log(`[AuthProviderComponent] Rendering loading skeleton for path: ${pathname} (auth state loading).`);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-[250px] ml-4" />
      </div>
    );
  }

  // Show Firebase Auth error page if:
  // 1. Firebase setup attempted AND
  // 2. Not loading auth state AND
  // 3. There IS a firebaseAuthError AND
  // 4. Not on a public route AND
  // 5. No Firebase config error (already handled)
  if (isFirebaseSetupAttempted && !loading && firebaseAuthError && !isPublicRoute && !firebaseConfigError) {
    console.warn(`[AuthProviderComponent] Firebase Auth error on protected route (${pathname}) after load. Displaying auth error page.`, firebaseAuthError);
    return (
       <div className="flex flex-col items-center justify-center min-h-screen p-4">
           <div className="w-full max-w-md p-6 border rounded-lg shadow-lg bg-card border-destructive">
             <h1 className="text-xl font-bold text-destructive mb-4 text-center">Authentication Error</h1>
             <p className="text-card-foreground mb-2 text-center">
                 There was an issue with the authentication service.
             </p>
             <div className="bg-destructive/10 p-3 rounded-md mb-4">
                <p className="text-sm text-destructive font-medium">
                    <strong>Details:</strong> {firebaseAuthError.message}
                </p>
             </div>
             <div className="mt-6 text-center">
                <Button onClick={() => router.push('/signin')} variant="secondary">
                    Go to Sign In
                </Button>
             </div>
           </div>
       </div>
    );
  }

  // If none of the above conditions for error/loading pages are met, render children.
  // The useEffect above will handle redirects if necessary based on auth state and route.
  console.log(`[AuthProviderComponent] Rendering children for path: ${pathname}. User: ${user ? user.uid: 'null'}, Loading: ${loading}, IsPublicRoute: ${isPublicRoute}, FirebaseConfigError: ${!!firebaseConfigError}, FirebaseAuthError: ${!!firebaseAuthError}, IsFirebaseSetupAttempted: ${isFirebaseSetupAttempted}`);
  return <>{children}</>;

}

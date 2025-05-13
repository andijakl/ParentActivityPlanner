"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';

const AUTH_ROUTES = ['/signin', '/signup']; // Public-like routes that logged-in users should be redirected away from
// Invite page is special: if logged in, process invite; if not, go to signup/signin with invite code
const INVITE_ROUTE = '/invite';
const DEFAULT_REDIRECT_AUTH = '/dashboard'; // Where logged-in users are sent if they hit an AUTH_ROUTE
const DEFAULT_REDIRECT_NO_AUTH = '/signin'; // Where non-logged-in users are sent if they hit a protected route

export default function AuthProviderComponent({ children }: { children: React.ReactNode }) {
  const { user, loading, isFirebaseSetupAttempted, firebaseConfigError, firebaseAuthError } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Determine if Firebase services are ready and usable
  const isFirebaseReady = isFirebaseSetupAttempted && !firebaseConfigError && !firebaseAuthError;


  useEffect(() => {
    // Wait for Firebase initialization, auth state, and any auth errors to settle.
    if (loading || !isFirebaseSetupAttempted) {
      return;
    }

    // If Firebase itself has a configuration error, don't attempt redirects.
    // The AuthContext or specific pages should handle displaying this error.
    if (firebaseConfigError) {
        console.error("AuthProviderComponent: Firebase configuration error, aborting auth redirects.", firebaseConfigError);
        return;
    }
    // If there's an auth-specific error (e.g., from onAuthStateChanged), also might want to halt or handle differently
    if (firebaseAuthError) {
        console.warn("AuthProviderComponent: Firebase auth error present.", firebaseAuthError);
        // Depending on desired behavior, you might still proceed with redirects or halt.
        // For now, let's proceed but be aware an auth error exists.
    }


    const currentPathIsAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
    const currentPathIsInviteRoute = pathname.startsWith(INVITE_ROUTE);

    if (user) {
      // User is logged in.
      if (currentPathIsAuthRoute) {
        // If logged in and on a regular auth page (e.g., /signin, /signup), redirect to dashboard.
        router.replace(DEFAULT_REDIRECT_AUTH);
      }
      // If on /invite page and logged in, allow the page to handle the invite logic. No redirect from here.
      // If logged in and on a protected page (e.g., /friends, /dashboard), no redirect is needed.
    } else {
      // User is not logged in.
      if (!currentPathIsAuthRoute && !currentPathIsInviteRoute && pathname !== '/') {
        // If not logged in, and not on an auth page, not on invite page, and not on the root page,
        // it's a protected page, so redirect to sign-in.
        router.replace(DEFAULT_REDIRECT_NO_AUTH);
      }
      // If not logged in and on an auth page, invite page, or the root page,
      // no redirect is needed. The user is allowed to be on these pages.
    }
  }, [user, loading, router, pathname, isFirebaseSetupAttempted, firebaseConfigError, firebaseAuthError]);


  // If Firebase hasn't been attempted to be set up yet, or is loading, show a generic loader.
  // This helps prevent premature rendering or redirection.
  if (!isFirebaseSetupAttempted || loading) {
    // You can replace this with a more sophisticated loading component if desired
    return <div className="flex items-center justify-center min-h-screen">Loading authentication...</div>;
  }
  
  // If there's a fundamental Firebase config error, display a message.
  // AuthContext also provides this, but this component can act as a top-level gate.
  if (firebaseConfigError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Firebase Configuration Error</h1>
        <p className="text-destructive mb-4">{firebaseConfigError.message}</p>
        <p>Please ensure your Firebase environment variables (<code>NEXT_PUBLIC_FIREBASE_*</code>) are correctly set in <code>.env.local</code> and try again.</p>
      </div>
    );
  }

  return <>{children}</>;
}

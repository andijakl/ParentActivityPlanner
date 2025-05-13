"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';

const AUTH_ROUTES = ['/signin', '/signup', '/invite']; // Public-like routes that logged-in users should be redirected away from
const DEFAULT_REDIRECT_AUTH = '/dashboard'; // Where logged-in users are sent if they hit an AUTH_ROUTE
const DEFAULT_REDIRECT_NO_AUTH = '/signin'; // Where non-logged-in users are sent if they hit a protected route

export default function AuthProviderComponent({ children }: { children: React.ReactNode }) {
  const { user, loading, isFirebaseEffectivelyInitialized, firebaseConfigError } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isFirebaseReady = isFirebaseEffectivelyInitialized && !firebaseConfigError;

  useEffect(() => {
    if (!isFirebaseReady || loading) {
      // Wait for Firebase initialization and auth state to settle.
      return;
    }

    const currentPathIsAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));

    if (user) {
      // User is logged in.
      if (currentPathIsAuthRoute) {
        // If logged in and on an auth page (e.g., /signin, /signup), redirect to dashboard.
        router.replace(DEFAULT_REDIRECT_AUTH);
      }
      // If logged in and on a protected page (e.g., /friends, /dashboard), no redirect is needed from here.
      // The user is allowed to be on this page.
    } else {
      // User is not logged in.
      if (!currentPathIsAuthRoute && pathname !== '/') {
        // If not logged in, and not on an auth page, and not on the root page,
        // it's a protected page, so redirect to sign-in.
        router.replace(DEFAULT_REDIRECT_NO_AUTH);
      }
      // If not logged in and on an auth page (e.g., /signin) or the root page,
      // no redirect is needed from here. The user is allowed to be on this page.
    }
  }, [user, loading, router, pathname, isFirebaseReady, DEFAULT_REDIRECT_AUTH, DEFAULT_REDIRECT_NO_AUTH]); // Added constants to dependency array for completeness

  // Render children; actual loading UI can be handled by consuming components or a global loader.
  // This component primarily focuses on redirection logic.
  return <>{children}</>;
}



"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';

const AUTH_ROUTES = ['/signin', '/signup', '/invite']; // Public routes
const DEFAULT_REDIRECT_AUTH = '/dashboard'; // Redirect if logged in and on auth page
const DEFAULT_REDIRECT_NO_AUTH = '/signin'; // Redirect if not logged in and on protected page

export default function AuthProviderComponent({ children }: { children: React.ReactNode }) {
  const { user, loading, isFirebaseSetupAttempted, firebaseConfigError } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isFirebaseEffectivelyInitialized = isFirebaseSetupAttempted && !firebaseConfigError;

  useEffect(() => {
    if (!isFirebaseEffectivelyInitialized || loading) {
      return; // Wait for Firebase and auth state to be ready
    }

    const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));

    if (user) {
      // User is logged in
      if (isAuthRoute) {
        router.replace(DEFAULT_REDIRECT_AUTH); // Redirect from auth pages to dashboard
      }
      // For other protected routes, user is allowed, no action needed.
    } else {
      // User is not logged in
      if (!isAuthRoute && pathname !== '/') { // Also allow root path for initial redirect logic
        router.replace(DEFAULT_REDIRECT_NO_AUTH); // Redirect from protected pages to signin
      }
      // For auth routes or root, user is allowed, no action needed here.
    }
  }, [user, loading, router, pathname, isFirebaseEffectivelyInitialized]);

  // Show loading state or children
  // This component primarily handles redirection, actual loading UI can be elsewhere or children can handle it.
  // if (loading || !isFirebaseEffectivelyInitialized) {
  // return <div>Loading authentication...</div>; // Or a more sophisticated loader
  // }

  return <>{children}</>;
}

// src/components/auth/AuthProviderComponent.tsx
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuthProviderComponent({ children }: { children: React.ReactNode }) {
  const { user, loading, firebaseConfigError, firebaseAuthError } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthRoute = pathname.startsWith('/signin') || pathname.startsWith('/signup');
  const isInviteRoute = pathname.startsWith('/invite');
  // The root page "/" should also be considered public or a landing page before auth check.
  const isPublicRoute = isAuthRoute || isInviteRoute || pathname === '/';


  useEffect(() => {
    if (firebaseConfigError) {
        console.error("AuthProviderComponent: Firebase Configuration Error. Halting auth checks.", firebaseConfigError);
        // The component will render the loading/error skeleton because `loading` might still be true
        // or the firebaseConfigError flag will be caught by the render logic.
        return;
    }
    
    // firebaseAuthError is not directly used for redirection logic here,
    // but rather for potential UI cues or global error handling.
    // The loading state and user presence are key for redirects.

    if (!loading) { // Only act once auth state is resolved
      if (user) { // User is logged in
        if (isAuthRoute) { // Trying to access /signin or /signup
          router.replace('/dashboard');
        }
        // If user is logged in and NOT on an auth route (e.g., on /dashboard, /friends, /profile),
        // they are allowed to be there. No redirection needed from this effect.
      } else { // User is NOT logged in
        if (!isPublicRoute) { // Trying to access a protected route
          router.replace('/signin');
        }
        // If user is not logged in and on a public route, they are allowed. No redirection needed.
      }
    }
  }, [user, loading, router, pathname, isAuthRoute, isPublicRoute, firebaseConfigError]);


  if (loading || firebaseConfigError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-[250px] ml-4" />
        {firebaseConfigError && (
            <p className="text-destructive text-center mt-4 p-4 break-words max-w-md">
                <strong>Application Error:</strong> Firebase is not configured correctly.
                <br />
                Details: {firebaseConfigError.message}
            </p>
        )}
      </div>
    );
  }
  
  // If there's an auth error after loading, and it's not a config error (handled above)
  // Display a message if on a protected route. Public routes might still function or show specific errors.
   if (firebaseAuthError && !loading && !isPublicRoute) {
     console.warn("AuthProviderComponent: Rendering children despite Firebase Auth error after initial load on a protected route.", firebaseAuthError);
     // Consider showing a more specific error UI here if children don't handle it
     return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <p className="text-destructive text-center">
                <strong>Authentication Error:</strong> There was an issue with authentication.
                <br />
                Details: {firebaseAuthError.message}
                <br />
                Please try signing in again or contact support.
            </p>
            <Button onClick={() => router.push('/signin')} className="mt-4">Go to Sign In</Button>
        </div>
     );
   }

  // Render children if:
  // 1. Not loading AND (user exists OR current route is public)
  // This covers authenticated users on any page, and unauthenticated users on public pages.
  if (!loading && (user || isPublicRoute)) {
    return <>{children}</>;
  }
  
  // Fallback: This case should ideally be rare if redirects work as expected.
  // It implies !loading, !user, and !isPublicRoute.
  // useEffect should have redirected to /signin. This skeleton is a temporary visual during that redirect.
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-4 w-[250px] ml-4" />
      <p className="ml-4 text-muted-foreground">Loading page...</p>
    </div>
  );
}

// src/components/auth/AuthProviderComponent.tsx
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuthProviderComponent({ children }: { children: React.ReactNode }) {
  // firebaseConfigError is from AuthContext, sourced from firebase/config.ts
  const { user, loading, firebaseConfigError, firebaseAuthError, isFirebaseSetupAttempted } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthRoute = pathname.startsWith('/signin') || pathname.startsWith('/signup');
  const isInviteRoute = pathname.startsWith('/invite');
  const isPublicRoute = isAuthRoute || isInviteRoute || pathname === '/';

  useEffect(() => {
    // If Firebase configuration itself failed, primary concern is to inform user, not redirect.
    if (firebaseConfigError) {
      console.error("AuthProviderComponent: Firebase Configuration Error detected. Auth checks and redirects halted.", firebaseConfigError);
      return; // Prevent further auth logic if core config is broken.
    }
    
    // Proceed with auth logic only if Firebase config is okay and auth state is resolved
    if (!loading && !firebaseConfigError) {
      if (user) {
        if (isAuthRoute) {
          router.replace('/dashboard');
        }
      } else {
        if (!isPublicRoute) {
          router.replace('/signin');
        }
      }
    }
  }, [user, loading, router, pathname, isAuthRoute, isPublicRoute, firebaseConfigError]);

  // Priority 1: Display critical Firebase configuration error
  if (firebaseConfigError) {
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

  // Priority 2: Show loading skeleton while auth state is being determined
  // (and Firebase config is OK and setup has been attempted)
  if (loading && isFirebaseSetupAttempted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-[250px] ml-4" />
      </div>
    );
  }

  // Priority 3: Handle Firebase authentication errors (e.g., network issues with auth service)
  // on protected routes, after initial loading and config check.
  if (firebaseAuthError && !loading && !isPublicRoute) {
    console.warn("AuthProviderComponent: Firebase Auth error on a protected route after load.", firebaseAuthError);
    return (
       <div className="flex flex-col items-center justify-center min-h-screen p-4">
           <div className="w-full max-w-md p-6 border rounded-lg shadow-lg bg-card border-destructive">
             <h1 className="text-xl font-bold text-destructive mb-4 text-center">Authentication Error</h1>
             <p className="text-destructive-foreground mb-2 text-center">
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

  // Default: Render children if everything is okay or if it's a public route
  // This covers:
  // - Authenticated user on any page
  // - Unauthenticated user on a public route
  // - Cases where loading is finished, no errors, and user status dictates access (handled by useEffect redirects)
  // - Initial render pass if Firebase setup hasn't been marked as attempted yet
  if ((!loading && (user || isPublicRoute)) || !isFirebaseSetupAttempted) {
    return <>{children}</>;
  }
  
  // Fallback loading state (e.g., if redirects are in progress but not yet completed by useEffect,
  // or if it's the very first render before isFirebaseSetupAttempted is true and loading is still true)
  // This implies !loading (if reached past the above if) or initial state.
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-4 w-[250px] ml-4" />
      <p className="ml-4 text-muted-foreground">Loading page...</p>
    </div>
  );
}

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
        // It's important not to redirect in a loop if the error page itself is protected.
        // This component assumes error display/handling might be part of the children or a global error boundary.
        return;
    }
    if (firebaseAuthError) {
        console.error("AuthProviderComponent: Firebase Authentication Error.", firebaseAuthError);
        // Similar to config error, avoid redirect loops.
        return;
    }

    if (!loading) { 
      if (user && isAuthRoute) {
        router.replace('/dashboard');
      } else if (!user && !isPublicRoute) {
        router.replace('/signin');
      }
    }
  }, [user, loading, router, pathname, isAuthRoute, isPublicRoute, firebaseConfigError, firebaseAuthError]);


  if (loading || firebaseConfigError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-[250px] ml-4" />
        {firebaseConfigError && (
            <p className="text-destructive text-center mt-4 p-4">
                <strong>Application Error:</strong> Firebase is not configured correctly. Please ensure your environment variables (<code>NEXT_PUBLIC_FIREBASE_...</code>) are set up.
                <br />
                Details: {firebaseConfigError.message}
            </p>
        )}
      </div>
    );
  }
  
  // If there's an auth error after loading, and it's not a config error (handled above)
  // You might want to display this differently, or let a global error boundary catch it.
  // For now, this allows rendering children but logs the error.
   if (firebaseAuthError && !loading) {
     console.warn("AuthProviderComponent: Rendering children despite Firebase Auth error after initial load.", firebaseAuthError);
   }

  // Render children if:
  // 1. Not loading AND (user exists OR current route is public)
  // 2. Or if there's an auth error but we're past initial loading (allowing error display within children)
  if (!loading && (user || isPublicRoute || firebaseAuthError)) {
    return <>{children}</>;
  }
  
  // Fallback: If still loading, or if conditions above aren't met, show loading skeleton.
  // This covers cases where !user and !isPublicRoute and still loading.
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-4 w-[250px] ml-4" />
    </div>
  );
}

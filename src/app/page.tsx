
// src/app/page.tsx
"use client";

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Corrected import path
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { user, loading, isFirebaseSetupAttempted, firebaseConfigError } = useAuth();
  const router = useRouter();

  const isFirebaseEffectivelyInitialized = isFirebaseSetupAttempted && !firebaseConfigError;

  useEffect(() => {
    // Redirect only when Firebase is effectively initialized and auth check is complete
    if (isFirebaseEffectivelyInitialized && !loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/signin');
      }
    }
  }, [user, loading, router, isFirebaseEffectivelyInitialized]);

  // Show loading state until initialization and auth check are done
  // Even if redirecting, showing a brief loading state prevents content flashing
  return (
     <div className="flex items-center justify-center min-h-screen">
        {/* Keep skeleton for visual feedback during the brief check */}
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-[250px] ml-4" />
     </div>
  );
}

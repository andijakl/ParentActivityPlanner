"use client"; // Needs client-side hooks for auth check and redirect

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; // Use the hook directly
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton'; // Loading indicator

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect once loading is complete
    if (!loading) {
      if (user) {
        router.replace('/dashboard'); // Use replace to avoid adding to history
      } else {
        router.replace('/signin');
      }
    }
  }, [user, loading, router]);

  // Render a loading indicator while checking auth state
  return (
     <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-[250px] ml-4" />
     </div>
  );

}

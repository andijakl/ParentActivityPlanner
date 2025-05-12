// src/app/(app)/activities/edit/page.tsx
"use client";

import React, { useEffect, useState, Suspense } from 'react'; // Import Suspense
import { useSearchParams, useRouter } from 'next/navigation'; // Use useSearchParams
import { useAuth } from '@/context/AuthContext';
import { getActivity } from '@/lib/firebase/services';
import type { Activity } from '@/lib/types';
import { ActivityForm } from '@/components/activities/ActivityForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function EditActivityContent() { // Wrap content in a component for Suspense
  const searchParams = useSearchParams(); // Use useSearchParams
  const router = useRouter();
  const activityId = searchParams.get('id'); // Get ID from query parameter
  const { user, loading: authLoading } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activityId && user) {
      setIsLoading(true);
      setError(null);
      getActivity(activityId)
        .then(data => {
          if (data) {
            if (data.creatorId !== user.uid) {
              setError("You are not authorized to edit this activity.");
              setActivity(null);
              // Redirect immediately if not authorized
              // Consider adding a small delay or showing the error message briefly
              // router.push('/dashboard');
            } else {
              setActivity(data);
            }
          } else {
            setError("Activity not found.");
          }
        })
        .catch(err => {
          console.error("Error fetching activity for edit:", err);
          setError("Failed to load activity details.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!activityId) {
        setError("No activity ID provided.");
        setIsLoading(false);
    } else if (!user && !authLoading) {
        setError("Please sign in to edit activities.");
        setIsLoading(false);
        // Optional: Redirect to sign-in
        // router.push('/signin');
    }
  }, [activityId, user, authLoading, router]);

  const handleFormSubmit = (updatedActivityId: string) => {
    // Redirect to the details page using query parameter
    router.push(`/activities/details?id=${updatedActivityId}`);
  };

  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6 max-w-2xl">
         {/* Provide a fallback link for the skeleton state */}
         <Button variant="link" asChild className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground -ml-4">
           <Link href={activityId ? `/activities/details?id=${activityId}` : '/dashboard'}>
               <ArrowLeft className="mr-1 h-4 w-4" />
               {activityId ? 'Back to Activity' : 'Back to Dashboard'}
           </Link>
         </Button>
        <Skeleton className="h-8 w-48 mb-6" /> {/* Title Skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine the correct back link URL based on whether activityId is present
  const backLinkHref = activityId ? `/activities/details?id=${activityId}` : '/dashboard';

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6 text-center max-w-2xl">
         <Button variant="link" asChild className="mb-4">
            <Link href={backLinkHref}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                {activityId ? 'Back to Activity' : 'Back to Dashboard'}
            </Link>
         </Button>
        <p className="text-destructive mt-4">{error}</p>
      </div>
    );
  }

  if (!activity) {
    // This case should ideally be covered by the error state if loading finished
    return (
         <div className="container mx-auto py-6 px-4 md:px-6 text-center max-w-2xl">
             <Button variant="link" asChild className="mb-4">
                <Link href="/dashboard">
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back to Dashboard
                </Link>
             </Button>
            <p className="mt-4">Activity data could not be loaded.</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-2xl">
      <Button variant="link" asChild className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground -ml-4">
          {/* Use the determined back link href */}
          <Link href={backLinkHref}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Activity
          </Link>
      </Button>
      <h1 className="text-3xl font-bold mb-6">Edit Activity</h1>
      <Card>
        <CardContent className="pt-6">
          <ActivityForm activity={activity} onFormSubmit={handleFormSubmit} />
        </CardContent>
      </Card>
    </div>
  );
}

// Export the page component wrapped in Suspense
export default function EditActivityPage() {
  return (
    <Suspense fallback={<div>Loading activity...</div>}> {/* Provide a simple fallback */}
      <EditActivityContent />
    </Suspense>
  );
}

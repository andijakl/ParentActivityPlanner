
// src/app/(app)/activities/[id]/edit/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getActivity } from '@/lib/firebase/services';
import type { Activity } from '@/lib/types';
import { ActivityForm } from '@/components/activities/ActivityForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EditActivityPage() {
  const params = useParams();
  const router = useRouter();
  const activityId = params.id as string;
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
              setActivity(null); // Clear activity if not authorized
              // Optionally redirect: router.push('/dashboard');
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
    } else if (!user && !authLoading) {
        // User not logged in, redirect or show error
        setError("Please sign in to edit activities.");
        setIsLoading(false);
        // router.push('/signin'); // Or handle as needed
    } else if (!activityId) {
        setError("Invalid activity ID.");
        setIsLoading(false);
    }
  }, [activityId, user, authLoading, router]);

  const handleFormSubmit = (updatedActivityId: string) => {
    router.push(`/activities/${updatedActivityId}`);
  };

  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6 max-w-2xl">
        <Link href={`/activities/${activityId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Activity
        </Link>
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

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6 text-center max-w-2xl">
         <Link href={activityId ? `/activities/${activityId}` : '/dashboard'} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {activityId ? 'Back to Activity' : 'Back to Dashboard'}
        </Link>
        <p className="text-destructive mt-4">{error}</p>
      </div>
    );
  }

  if (!activity) {
    // Should be covered by error or loading state
    return (
         <div className="container mx-auto py-6 px-4 md:px-6 text-center max-w-2xl">
             <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Dashboard
            </Link>
            <p className="mt-4">Activity data could not be loaded.</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-2xl">
      <Link href={`/activities/${activityId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Activity
      </Link>
      <h1 className="text-3xl font-bold mb-6">Edit Activity</h1>
      <Card>
        <CardContent className="pt-6">
          <ActivityForm activity={activity} onFormSubmit={handleFormSubmit} />
        </CardContent>
      </Card>
    </div>
  );
}

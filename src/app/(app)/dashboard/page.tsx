
// src/app/(app)/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardActivities } from '@/lib/firebase/services';
import type { ActivityClient } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ActivityList } from '@/components/activities/ActivityList';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user, userProfile, loading: authLoading } = useAuth(); // authLoading indicates if AuthContext is busy
  const [activities, setActivities] = useState<ActivityClient[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Dashboard's own loading state for activities
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait until authentication status is resolved by AuthContext
    if (authLoading) {
      console.log("DashboardPage: Auth state is loading, waiting...");
      setIsLoading(true); // Keep dashboard loading indicator active if auth is still loading
      return;
    }

    console.log("DashboardPage: Auth state resolved. User:", user ? user.uid : 'null');

    if (user) {
      setIsLoading(true); // Set loading true for fetching activities
      setError(null);
      console.log("DashboardPage: User authenticated, fetching activities for user:", user.uid);

      getDashboardActivities(user.uid)
        .then(fetchedActivities => {
          console.log("DashboardPage: Successfully fetched activities:", fetchedActivities.length, fetchedActivities);
          setActivities(fetchedActivities);
        })
        .catch(err => {
          console.error("DashboardPage: Error fetching dashboard activities:", err);
          setError(err.message || "Failed to load activities. Please try again later.");
          setActivities([]); // Clear activities on error
        })
        .finally(() => {
          console.log("DashboardPage: Activity fetch process finished.");
          setIsLoading(false); // Always set loading to false after attempt
        });
    } else {
      // No user is authenticated, and authLoading is false
      console.log("DashboardPage: No authenticated user. Clearing activities and stopping load.");
      setActivities([]);
      setError(null);
      setIsLoading(false);
    }
  }, [user, authLoading]); // Rerun effect if user or authLoading state changes

  const welcomeMessage = userProfile?.displayName
    ? `Welcome back, ${userProfile.displayName}!`
    : "Welcome to Parent Activity Hub!";

  // This loading state now combines auth loading (implicitly via effect dependencies) and activity loading
  if (isLoading) { // Show skeleton if dashboard is loading its own data OR if auth is still loading (covered by initial effect state)
    console.log("DashboardPage: Rendering loading skeleton.");
    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <Skeleton className="h-9 w-1/2 md:w-1/3" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-5 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
         <h1 className="text-3xl font-bold">{welcomeMessage}</h1>
        <Button asChild>
            <Link href="/activities/create">Create New Activity</Link>
        </Button>
      </div>

       <Card>
            <CardHeader>
                 <CardTitle>Upcoming Activities</CardTitle>
                 <CardDescription>Activities planned by you and your friends.</CardDescription>
            </CardHeader>
            <CardContent>
                {error ? (
                    <p className="text-destructive text-center py-4">{error}</p>
                ) : activities.length > 0 ? (
                   <ActivityList activities={activities} currentUserId={user?.uid ?? ''} />
                 ) : (
                     <div className="text-center py-10">
                         <p className="text-muted-foreground mb-4">No upcoming activities found.</p>
                         <Button variant="secondary" asChild>
                           <Link href="/activities/create">Plan your first activity</Link>
                         </Button>
                         <span className="mx-2 text-muted-foreground">or</span>
                         <Button variant="outline" asChild>
                           <Link href="/friends">Connect with friends</Link>
                         </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}

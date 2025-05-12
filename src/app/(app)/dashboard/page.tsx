// src/app/(app)/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDashboardActivities } from '@/lib/firebase/services';
import type { Activity } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ActivityList } from '@/components/activities/ActivityList'; // We'll create this next
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      setError(null);
      getDashboardActivities(user.uid)
        .then(fetchedActivities => {
          setActivities(fetchedActivities);
        })
        .catch(err => {
          console.error("Error fetching dashboard activities:", err);
          setError("Failed to load activities. Please try again later.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
        // Should be redirected by layout, but handle defensively
        setIsLoading(false);
        setActivities([]);
    }
  }, [user]);

  const welcomeMessage = userProfile?.displayName
    ? `Welcome back, ${userProfile.displayName}!`
    : "Welcome to Activity Hub!";

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
                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-24 w-full rounded-lg" />
                        <Skeleton className="h-24 w-full rounded-lg" />
                        <Skeleton className="h-24 w-full rounded-lg" />
                    </div>
                ) : error ? (
                    <p className="text-destructive">{error}</p>
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

      {/* You can add more sections here, e.g., Past Activities, Friend Requests */}
    </div>
  );
}

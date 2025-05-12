// src/app/(app)/activities/[id]/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getActivity, joinActivity, leaveActivity } from '@/lib/firebase/services';
import type { Activity } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { MapPin, CalendarDays, Users, UserPlus, UserMinus, ArrowLeft } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { ParticipantsList } from '@/components/activities/ParticipantsList'; // We'll create this next


export default function ActivityDetailPage() {
  const params = useParams();
  const activityId = params.id as string;
  const { user, userProfile } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [isJoining, setIsJoining] = React.useState(false);
  const [isLeaving, setIsLeaving] = React.useState(false);


  useEffect(() => {
    if (activityId) {
      setIsLoading(true);
      setError(null);
      getActivity(activityId)
        .then(data => {
          if (data) {
            setActivity(data);
          } else {
            setError("Activity not found.");
          }
        })
        .catch(err => {
          console.error("Error fetching activity details:", err);
          setError("Failed to load activity details.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
        setError("Invalid activity ID.");
        setIsLoading(false);
    }
  }, [activityId]);

   const handleJoin = async () => {
        if (!user || !userProfile || !activity) return;
        setIsJoining(true);
        try {
            const participantData = {
                uid: user.uid,
                name: userProfile.displayName ?? user.displayName,
                photoURL: userProfile.photoURL ?? user.photoURL
            };
            await joinActivity(activity.id, participantData);
            toast({ title: "Joined Activity!", description: `You've joined "${activity.title}".` });
            // Refresh data after joining
            const updatedActivity = await getActivity(activityId);
            setActivity(updatedActivity);
        } catch (error) {
            console.error("Error joining activity:", error);
            toast({ title: "Error", description: "Could not join the activity.", variant: "destructive" });
        } finally {
            setIsJoining(false);
        }
    };

    const handleLeave = async () => {
        if (!user || !userProfile || !activity) return;
        setIsLeaving(true);
         try {
             const participantToRemove = activity.participants.find(p => p.uid === user.uid);
             if (!participantToRemove) return;

            await leaveActivity(activity.id, participantToRemove);
            toast({ title: "Left Activity", description: `You've left "${activity.title}".` });
            // Refresh data after leaving
             const updatedActivity = await getActivity(activityId);
             setActivity(updatedActivity);
        } catch (error) {
            console.error("Error leaving activity:", error);
            toast({ title: "Error", description: "Could not leave the activity.", variant: "destructive" });
        } finally {
            setIsLeaving(false);
        }
    };


  if (isLoading) {
    return <ActivityDetailSkeleton />;
  }

  if (error) {
    return (
        <div className="container mx-auto py-6 px-4 md:px-6 text-center">
             <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Dashboard
            </Link>
            <p className="text-destructive mt-4">{error}</p>
        </div>
    );
  }

  if (!activity) {
    // Should be covered by error state, but as a fallback
     return <p className="text-center mt-10">Activity not found.</p>;
  }

   // Format dates/times safely
   const activityDate = activity.date instanceof Timestamp ? activity.date.toDate() : activity.date;
   const formattedDate = activityDate ? format(activityDate, "PPP") : 'Date TBD'; // e.g., Sep 20, 2023
   const formattedTime = activityDate ? format(activityDate, "p") : 'Time TBD'; // e.g., 1:00 PM

   const isCreator = activity.creatorId === user?.uid;
   const isParticipant = activity.participants.some(p => p.uid === user?.uid);


  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-3xl">
       <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
         <ArrowLeft className="mr-1 h-4 w-4" />
         Back to Dashboard
       </Link>
      <Card className="overflow-hidden">
        <CardHeader className="p-6">
          <CardTitle className="text-2xl md:text-3xl mb-2">{activity.title}</CardTitle>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-muted-foreground text-sm">
              <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span>{formattedDate} at {formattedTime}</span>
              </div>
              {activity.location && (
                  <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{activity.location}</span>
                  </div>
               )}
          </div>
           <div className="flex items-center gap-2 text-sm mt-3 pt-3 border-t">
             <Avatar className="h-8 w-8">
                <AvatarImage src={activity.creatorPhotoURL ?? undefined} alt={activity.creatorName ?? 'Creator'} />
                <AvatarFallback>{activity.creatorName ? activity.creatorName[0] : 'C'}</AvatarFallback>
             </Avatar>
             <span>Created by {isCreator ? 'You' : activity.creatorName ?? 'Unknown'}</span>
         </div>
        </CardHeader>
        <CardContent className="p-6">
           {/* Optional Description Section
            {activity.description && (
              <div className="mb-6">
                  <h3 className="font-semibold mb-2 text-lg">Details</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{activity.description}</p>
               </div>
            )} */}

            <div className="mb-6">
                <h3 className="font-semibold mb-3 text-lg flex items-center gap-2">
                    <Users className="h-5 w-5"/>
                    Participants ({activity.participants.length})
                 </h3>
                 <ParticipantsList participants={activity.participants} />
            </div>
        </CardContent>
        <CardFooter className="p-6 bg-muted/30 dark:bg-muted/10 border-t flex justify-end">
            {!isCreator && !isParticipant && (
              <Button onClick={handleJoin} disabled={isJoining || isLeaving}>
                <UserPlus className="mr-2 h-4 w-4" />
                {isJoining ? 'Joining...' : 'Join Activity'}
              </Button>
            )}
            {!isCreator && isParticipant && (
              <Button variant="outline" onClick={handleLeave} disabled={isJoining || isLeaving}>
                <UserMinus className="mr-2 h-4 w-4" />
                {isLeaving ? 'Leaving...' : 'Leave Activity'}
              </Button>
            )}
            {isCreator && (
                 <p className="text-sm text-muted-foreground italic mr-auto">You created this activity.</p>
                 // Add Edit/Delete buttons here if needed
                // <Button variant="outline" size="sm" disabled>Edit</Button>
                // <Button variant="destructive" size="sm" className="ml-2" disabled>Delete</Button>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}


function ActivityDetailSkeleton() {
    return (
         <div className="container mx-auto py-6 px-4 md:px-6 max-w-3xl">
              <Skeleton className="h-5 w-32 mb-4" /> {/* Back link */}
              <Card>
                <CardHeader className="p-6 space-y-3">
                    <Skeleton className="h-8 w-3/4" /> {/* Title */}
                    <Skeleton className="h-5 w-1/2" /> {/* Date/Location */}
                    <div className="flex items-center gap-2 pt-3 border-t">
                         <Skeleton className="h-8 w-8 rounded-full" />
                         <Skeleton className="h-4 w-24" /> {/* Creator */}
                    </div>
                 </CardHeader>
                 <CardContent className="p-6 space-y-4">
                      <Skeleton className="h-6 w-32 mb-3" /> {/* Participants Title */}
                     <div className="space-y-3">
                        <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-1/2" /></div>
                        <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-2/3" /></div>
                        <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-1/2" /></div>
                     </div>
                 </CardContent>
                 <CardFooter className="p-6 bg-muted/30 dark:bg-muted/10 border-t flex justify-end">
                     <Skeleton className="h-10 w-24" /> {/* Action button */}
                 </CardFooter>
            </Card>
        </div>
    )
}

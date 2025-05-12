// src/app/(app)/activities/[id]/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Added useRouter
import { useAuth } from '@/context/AuthContext';
import { getActivity, joinActivity, leaveActivity, deleteActivity } from '@/lib/firebase/services'; // Added deleteActivity
import type { Activity } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { MapPin, CalendarDays, Users, UserPlus, UserMinus, ArrowLeft, FilePenLine, Trash2 } from 'lucide-react'; // Added FilePenLine, Trash2
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { ParticipantsList } from '@/components/activities/ParticipantsList';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter(); // Initialize useRouter
  const activityId = params.id as string;
  const { user, userProfile } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [isJoining, setIsJoining] = React.useState(false);
  const [isLeaving, setIsLeaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);


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
             const updatedActivity = await getActivity(activityId);
             setActivity(updatedActivity);
        } catch (error) {
            console.error("Error leaving activity:", error);
            toast({ title: "Error", description: "Could not leave the activity.", variant: "destructive" });
        } finally {
            setIsLeaving(false);
        }
    };

    const handleDelete = async () => {
        if (!activity) return;
        setIsDeleting(true);
        try {
            await deleteActivity(activity.id);
            toast({ title: "Activity Deleted", description: `"${activity.title}" has been removed.` });
            router.push('/dashboard'); // Redirect after successful deletion
        } catch (err) {
            console.error("Error deleting activity:", err);
            toast({ title: "Error", description: "Could not delete the activity.", variant: "destructive" });
            setIsDeleting(false);
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
     return <p className="text-center mt-10">Activity not found.</p>;
  }

   const activityDate = activity.date instanceof Timestamp ? activity.date.toDate() : activity.date;
   const formattedDate = activityDate ? format(activityDate, "PPP") : 'Date TBD';
   const formattedTime = activityDate ? format(activityDate, "p") : 'Time TBD';

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
            <div className="mb-6">
                <h3 className="font-semibold mb-3 text-lg flex items-center gap-2">
                    <Users className="h-5 w-5"/>
                    Participants ({activity.participants.length})
                 </h3>
                 <ParticipantsList participants={activity.participants} />
            </div>
        </CardContent>
        <CardFooter className="p-6 bg-muted/30 dark:bg-muted/10 border-t flex flex-wrap items-center justify-end gap-2">
            {isCreator && (
                 <div className="mr-auto flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/activities/${activity.id}/edit`}>
                            <FilePenLine className="mr-1 h-4 w-4" /> Edit
                        </Link>
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isDeleting}>
                                <Trash2 className="mr-1 h-4 w-4" /> {isDeleting ? 'Deleting...' : 'Delete'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete the activity "{activity.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                    {isDeleting ? 'Deleting...' : 'Delete Activity'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 </div>
            )}
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
        </CardFooter>
      </Card>
    </div>
  );
}


function ActivityDetailSkeleton() {
    return (
         <div className="container mx-auto py-6 px-4 md:px-6 max-w-3xl">
              <Skeleton className="h-5 w-32 mb-4" />
              <Card>
                <CardHeader className="p-6 space-y-3">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                    <div className="flex items-center gap-2 pt-3 border-t">
                         <Skeleton className="h-8 w-8 rounded-full" />
                         <Skeleton className="h-4 w-24" />
                    </div>
                 </CardHeader>
                 <CardContent className="p-6 space-y-4">
                      <Skeleton className="h-6 w-32 mb-3" />
                     <div className="space-y-3">
                        <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-1/2" /></div>
                        <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-2/3" /></div>
                        <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-1/2" /></div>
                     </div>
                 </CardContent>
                 <CardFooter className="p-6 bg-muted/30 dark:bg-muted/10 border-t flex justify-end">
                     <Skeleton className="h-10 w-24" />
                 </CardFooter>
            </Card>
        </div>
    )
}
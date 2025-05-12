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
import { de } from 'date-fns/locale'; // Import German locale
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
            setError("Aktivität nicht gefunden.");
          }
        })
        .catch(err => {
          console.error("Fehler beim Laden der Aktivitätsdetails:", err);
          setError("Fehler beim Laden der Aktivitätsdetails.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
        setError("Ungültige Aktivitäts-ID.");
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
            toast({ title: "Aktivität beigetreten!", description: `Du bist "${activity.title}" beigetreten.` });
            const updatedActivity = await getActivity(activityId);
            setActivity(updatedActivity);
        } catch (error) {
            console.error("Fehler beim Beitreten der Aktivität:", error);
            toast({ title: "Fehler", description: "Konnte der Aktivität nicht beitreten.", variant: "destructive" });
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
            toast({ title: "Aktivität verlassen", description: `Du hast "${activity.title}" verlassen.` });
             const updatedActivity = await getActivity(activityId);
             setActivity(updatedActivity);
        } catch (error) {
            console.error("Fehler beim Verlassen der Aktivität:", error);
            toast({ title: "Fehler", description: "Konnte die Aktivität nicht verlassen.", variant: "destructive" });
        } finally {
            setIsLeaving(false);
        }
    };

    const handleDelete = async () => {
        if (!activity) return;
        setIsDeleting(true);
        try {
            await deleteActivity(activity.id);
            toast({ title: "Aktivität gelöscht", description: `"${activity.title}" wurde entfernt.` });
            router.push('/dashboard'); // Redirect after successful deletion
        } catch (err) {
            console.error("Fehler beim Löschen der Aktivität:", err);
            toast({ title: "Fehler", description: "Konnte die Aktivität nicht löschen.", variant: "destructive" });
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
                Zurück zum Dashboard
            </Link>
            <p className="text-destructive mt-4">{error}</p>
        </div>
    );
  }

  if (!activity) {
     return <p className="text-center mt-10">Aktivität nicht gefunden.</p>;
  }

   // Ensure activity.date is treated correctly, whether it's a Firestore Timestamp or already a Date
   const activityDate = activity.date instanceof Timestamp ? activity.date.toDate() : (activity.date instanceof Date ? activity.date : null);
   // Format date and time using German locale and 24-hour format
   const formattedDate = activityDate ? format(activityDate, "PPP", { locale: de }) : 'Datum TBD';
   const formattedTime = activityDate ? format(activityDate, "HH:mm", { locale: de }) : 'Zeit TBD';

   const isCreator = activity.creatorId === user?.uid;
   const isParticipant = activity.participants.some(p => p.uid === user?.uid);


  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-3xl">
       <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
         <ArrowLeft className="mr-1 h-4 w-4" />
         Zurück zum Dashboard
       </Link>
      <Card className="overflow-hidden">
        <CardHeader className="p-6">
          <CardTitle className="text-2xl md:text-3xl mb-2">{activity.title}</CardTitle>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-muted-foreground text-sm">
              <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span>{formattedDate} um {formattedTime} Uhr</span>
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
                <AvatarImage src={activity.creatorPhotoURL ?? undefined} alt={activity.creatorName ?? 'Ersteller'} />
                <AvatarFallback>{activity.creatorName ? activity.creatorName[0] : 'E'}</AvatarFallback>
             </Avatar>
             <span>Erstellt von {isCreator ? 'Dir' : activity.creatorName ?? 'Unbekannt'}</span>
         </div>
        </CardHeader>
        <CardContent className="p-6">
            <div className="mb-6">
                <h3 className="font-semibold mb-3 text-lg flex items-center gap-2">
                    <Users className="h-5 w-5"/>
                    Teilnehmer ({activity.participants.length})
                 </h3>
                 <ParticipantsList participants={activity.participants} />
            </div>
        </CardContent>
        <CardFooter className="p-6 bg-muted/30 dark:bg-muted/10 border-t flex flex-wrap items-center justify-end gap-2">
            {isCreator && (
                 <div className="mr-auto flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/activities/${activity.id}/edit`}>
                            <FilePenLine className="mr-1 h-4 w-4" /> Bearbeiten
                        </Link>
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isDeleting}>
                                <Trash2 className="mr-1 h-4 w-4" /> {isDeleting ? 'Löschen...' : 'Löschen'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Löschen bestätigen</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Bist du sicher, dass du die Aktivität "{activity.title}" löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                    {isDeleting ? 'Löschen...' : 'Aktivität löschen'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 </div>
            )}
            {!isCreator && !isParticipant && (
              <Button onClick={handleJoin} disabled={isJoining || isLeaving}>
                <UserPlus className="mr-2 h-4 w-4" />
                {isJoining ? 'Beitreten...' : 'Beitreten'}
              </Button>
            )}
            {!isCreator && isParticipant && (
              <Button variant="outline" onClick={handleLeave} disabled={isJoining || isLeaving}>
                <UserMinus className="mr-2 h-4 w-4" />
                {isLeaving ? 'Verlassen...' : 'Verlassen'}
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

// src/components/activities/ActivityCard.tsx
"use client";

import React from 'react';
import type { Activity } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { de } from 'date-fns/locale'; // Import German locale
import { MapPin, CalendarDays, Users, UserPlus, UserMinus, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { joinActivity, leaveActivity } from '@/lib/firebase/services';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Timestamp } from 'firebase/firestore'; // Explicit import


interface ActivityCardProps {
  activity: Activity;
  currentUserId: string;
}

export function ActivityCard({ activity, currentUserId }: ActivityCardProps) {
    const { user, userProfile } = useAuth();
    const { toast } = useToast();
    const [isJoining, setIsJoining] = React.useState(false);
    const [isLeaving, setIsLeaving] = React.useState(false);

    const isCreator = activity.creatorId === currentUserId;
    const isParticipant = activity.participants.some(p => p.uid === currentUserId);

    // Defensive check for timestamp
    const activityDate = activity.date instanceof Timestamp ? activity.date.toDate() : (activity.date instanceof Date ? activity.date : null);

    // Format date and time using German locale and 24-hour format
    const formattedDate = activityDate ? format(activityDate, "PPP", { locale: de }) : 'Datum TBD';
    const formattedTime = activityDate ? format(activityDate, "HH:mm", { locale: de }) : 'Zeit TBD';

    const handleJoin = async () => {
        if (!user || !userProfile) return;
        setIsJoining(true);
        try {
            const participantData = {
                uid: user.uid,
                name: userProfile.displayName ?? user.displayName,
                photoURL: userProfile.photoURL ?? user.photoURL
            };
            await joinActivity(activity.id, participantData);
            toast({ title: "Aktivität beigetreten!", description: `Du bist "${activity.title}" beigetreten.` });
            // Note: Ideally, refresh data or update state locally for immediate UI update
            // For now, user needs to refresh page to see updated participant list accurately.
             window.location.reload(); // Simple refresh for now
        } catch (error) {
            console.error("Error joining activity:", error);
            toast({ title: "Fehler", description: "Konnte der Aktivität nicht beitreten.", variant: "destructive" });
        } finally {
            setIsJoining(false);
        }
    };

    const handleLeave = async () => {
        if (!user || !userProfile) return;
        setIsLeaving(true);
         try {
            // Find the exact participant object to remove (needed for arrayRemove)
             const participantToRemove = activity.participants.find(p => p.uid === user.uid);
             if (!participantToRemove) {
                 console.warn("Current user not found in participant list for removal.");
                 setIsLeaving(false);
                 return; // Exit if not found
             }

            await leaveActivity(activity.id, participantToRemove);
            toast({ title: "Aktivität verlassen", description: `Du hast "${activity.title}" verlassen.` });
             // Note: Ideally, refresh data or update state locally
             window.location.reload(); // Simple refresh for now
        } catch (error) {
            console.error("Error leaving activity:", error);
            toast({ title: "Fehler", description: "Konnte die Aktivität nicht verlassen.", variant: "destructive" });
        } finally {
            setIsLeaving(false);
        }
    };


  return (
     <TooltipProvider>
    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="p-4 bg-muted/30 dark:bg-muted/10 border-b">
         <div className="flex items-center justify-between gap-4">
             <CardTitle className="text-lg">{activity.title}</CardTitle>
              <Link href={`/activities/${activity.id}`} passHref>
                <Button variant="ghost" size="sm" className="text-xs h-7">
                    Details
                    <ExternalLink className="ml-1 h-3 w-3"/>
                 </Button>
              </Link>

         </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
             <Avatar className="h-6 w-6">
                <AvatarImage src={activity.creatorPhotoURL ?? undefined} alt={activity.creatorName ?? 'Ersteller'} />
                <AvatarFallback>{activity.creatorName ? activity.creatorName[0] : 'E'}</AvatarFallback>
             </Avatar>
            <span>Erstellt von {isCreator ? 'Dir' : activity.creatorName ?? 'Unbekannt'}</span>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span>{formattedDate} um {formattedTime} Uhr</span>
        </div>
        {activity.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{activity.location}</span>
          </div>
        )}
         <div className="flex items-center gap-2 text-sm pt-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="mr-2">{activity.participants.length} {activity.participants.length === 1 ? 'Teilnehmer' : 'Teilnehmer'}</span>
             <div className="flex -space-x-2 overflow-hidden">
                {activity.participants.slice(0, 5).map((p) => (
                     <Tooltip key={p.uid}>
                         <TooltipTrigger asChild>
                             <Avatar className="inline-block h-6 w-6 rounded-full ring-2 ring-background">
                                 <AvatarImage src={p.photoURL ?? undefined} alt={p.name ?? 'Teilnehmer'} />
                                 <AvatarFallback>{p.name ? p.name[0] : 'T'}</AvatarFallback>
                             </Avatar>
                         </TooltipTrigger>
                         <TooltipContent>
                           <p>{p.name ?? 'Teilnehmer'}</p>
                         </TooltipContent>
                    </Tooltip>
                ))}
                 {activity.participants.length > 5 && (
                     <Tooltip>
                        <TooltipTrigger asChild>
                             <Avatar className="inline-block h-6 w-6 rounded-full ring-2 ring-background">
                                 <AvatarFallback>+{activity.participants.length - 5}</AvatarFallback>
                            </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>...und {activity.participants.length - 5} weitere</p>
                        </TooltipContent>
                     </Tooltip>
                 )}
            </div>

        </div>
      </CardContent>
      <CardFooter className="p-4 bg-muted/30 dark:bg-muted/10 border-t">
        {!isCreator && !isParticipant && (
          <Button size="sm" onClick={handleJoin} disabled={isJoining || isLeaving}>
            <UserPlus className="mr-1 h-4 w-4" />
            {isJoining ? 'Beitreten...' : 'Beitreten'}
          </Button>
        )}
        {!isCreator && isParticipant && (
          <Button variant="outline" size="sm" onClick={handleLeave} disabled={isJoining || isLeaving}>
            <UserMinus className="mr-1 h-4 w-4" />
            {isLeaving ? 'Verlassen...' : 'Verlassen'}
          </Button>
        )}
         {isCreator && (
             <p className="text-sm text-muted-foreground italic">Du hast diese Aktivität erstellt.</p>
             // Optionally add Edit/Delete buttons here for the creator
        )}
      </CardFooter>
    </Card>
    </TooltipProvider>
  );
}

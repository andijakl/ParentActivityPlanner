// src/components/activities/ActivityCard.tsx
"use client";

import React from 'react';
import type { ActivityClient } from '@/lib/types'; // Use ActivityClient
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { MapPin, CalendarDays, Users, UserPlus, UserMinus, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth'; // Corrected import path
import { joinActivity, leaveActivity } from '@/lib/firebase/services';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ActivityCardProps {
  activity: ActivityClient; // Expect ActivityClient
  currentUserId: string;
}

export function ActivityCard({ activity, currentUserId }: ActivityCardProps) {
    const { user, userProfile } = useAuth();
    const { toast } = useToast();
    const [isJoining, setIsJoining] = React.useState(false);
    const [isLeaving, setIsLeaving] = React.useState(false);

    const isCreator = activity.creatorId === currentUserId;
    const isParticipant = activity.participants.some(p => p.uid === currentUserId);

    // activity.date is an ISO string, parse it to a Date object
    const activityDate = activity.date ? new Date(activity.date) : null;

    const formattedDate = activityDate && !isNaN(activityDate.getTime()) ? format(activityDate, "PPP", { locale: de }) : 'Date TBD';
    const formattedTime = activityDate && !isNaN(activityDate.getTime()) ? format(activityDate, "HH:mm", { locale: de }) : 'Time TBD';

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
            toast({ title: "Joined Activity!", description: `You have joined "${activity.title}".` });
            window.location.reload(); // Consider a more targeted refresh
        } catch (error) {
            console.error("Error joining activity:", error);
            toast({ title: "Error", description: "Could not join activity.", variant: "destructive" });
        } finally {
            setIsJoining(false);
        }
    };

    const handleLeave = async () => {
        if (!user || !userProfile) return;
        setIsLeaving(true);
         try {
             const participantToRemove = activity.participants.find(p => p.uid === user.uid);
             if (!participantToRemove) {
                 console.warn("Current user not found in participant list for removal.");
                 setIsLeaving(false);
                 return;
             }
            await leaveActivity(activity.id, participantToRemove);
            toast({ title: "Left Activity", description: `You have left "${activity.title}".` });
            window.location.reload(); // Consider a more targeted refresh
        } catch (error) {
            console.error("Error leaving activity:", error);
            toast({ title: "Error", description: "Could not leave activity.", variant: "destructive" });
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
              <Link href={`/activities/details?id=${activity.id}`} passHref>
                <Button variant="ghost" size="sm" className="text-xs h-7">
                    Details
                    <ExternalLink className="ml-1 h-3 w-3"/>
                 </Button>
              </Link>
         </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
             <Avatar className="h-6 w-6">
                <AvatarImage src={activity.creatorPhotoURL ?? undefined} alt={activity.creatorName ?? 'Creator'} />
                <AvatarFallback>{activity.creatorName ? activity.creatorName[0] : 'C'}</AvatarFallback>
             </Avatar>
            <span>Created by {isCreator ? 'You' : activity.creatorName ?? 'Unknown'}</span>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span>{formattedDate} at {formattedTime}</span>
        </div>
        {activity.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{activity.location}</span>
          </div>
        )}
         <div className="flex items-center gap-2 text-sm pt-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="mr-2">{activity.participants.length} {activity.participants.length === 1 ? 'participant' : 'participants'}</span>
             <div className="flex -space-x-2 overflow-hidden">
                {activity.participants.slice(0, 5).map((p) => (
                     <Tooltip key={p.uid}>
                         <TooltipTrigger asChild>
                             <Avatar className="inline-block h-6 w-6 rounded-full ring-2 ring-background">
                                 <AvatarImage src={p.photoURL ?? undefined} alt={p.name ?? 'Participant'} />
                                 <AvatarFallback>{p.name ? p.name[0] : 'P'}</AvatarFallback>
                             </Avatar>
                         </TooltipTrigger>
                         <TooltipContent>
                           <p>{p.name ?? 'Participant'}</p>
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
                            <p>...and {activity.participants.length - 5} more</p>
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
            {isJoining ? 'Joining...' : 'Join'}
          </Button>
        )}
        {!isCreator && isParticipant && (
          <Button variant="outline" size="sm" onClick={handleLeave} disabled={isJoining || isLeaving}>
            <UserMinus className="mr-1 h-4 w-4" />
            {isLeaving ? 'Leaving...' : 'Leave'}
          </Button>
        )}
         {isCreator && (
             <p className="text-sm text-muted-foreground italic">You created this activity.</p>
        )}
      </CardFooter>
    </Card>
    </TooltipProvider>
  );
}

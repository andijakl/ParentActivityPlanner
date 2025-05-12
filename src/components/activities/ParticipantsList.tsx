// src/components/activities/ParticipantsList.tsx
import React from 'react';
import type { Activity } from '@/lib/types'; // Get participant type from Activity
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

type Participant = Activity['participants'][0]; // Extract participant type

interface ParticipantsListProps {
  participants: Participant[];
}

export function ParticipantsList({ participants }: ParticipantsListProps) {

   const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
  };


  if (!participants || participants.length === 0) {
    return <p className="text-sm text-muted-foreground">No participants have joined yet.</p>;
  }

  return (
    <ScrollArea className="h-[150px] w-full"> {/* Adjust height as needed */}
        <div className="space-y-3 pr-4">
        {participants.map((participant) => (
            <div key={participant.uid} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
            <Avatar className="h-10 w-10 border">
                <AvatarImage src={participant.photoURL ?? undefined} alt={participant.name ?? 'Participant'} />
                <AvatarFallback>{getInitials(participant.name)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{participant.name ?? 'Participant'}</span>
            {/* Optionally add child nickname if stored in participant data */}
            {/* {participant.childNickname && <span className="text-xs text-muted-foreground">({participant.childNickname})</span>} */}
            </div>
        ))}
        </div>
    </ScrollArea>
  );
}

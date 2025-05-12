// src/components/activities/ActivityList.tsx
import React from 'react';
import type { ActivityClient } from '@/lib/types'; // Use ActivityClient
import { ActivityCard } from './ActivityCard';

interface ActivityListProps {
  activities: ActivityClient[]; // Expect ActivityClient[]
  currentUserId: string;
}

export function ActivityList({ activities, currentUserId }: ActivityListProps) {
  if (!activities || activities.length === 0) {
    return <p className="text-center text-muted-foreground py-4">No activities to display.</p>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} currentUserId={currentUserId} />
      ))}
    </div>
  );
}

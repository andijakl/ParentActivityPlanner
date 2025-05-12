// src/components/activities/ActivityList.tsx
import React from 'react';
import type { Activity } from '@/lib/types';
import { ActivityCard } from './ActivityCard'; // We'll create this next

interface ActivityListProps {
  activities: Activity[];
  currentUserId: string;
}

export function ActivityList({ activities, currentUserId }: ActivityListProps) {
  if (!activities || activities.length === 0) {
     // This case might be handled by the parent, but good to have a fallback
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

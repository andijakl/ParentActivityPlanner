// src/components/activities/ActivityForm.tsx
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Timestamp } from "firebase/firestore";
import { format, parseISO, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from '@/context/AuthContext';
import { createActivity, updateActivity } from '@/lib/firebase/services';
import type { Activity } from '@/lib/types';


const formSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }).max(100),
  date: z.date({ required_error: "A date is required." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Invalid time format (HH:mm)."}), // HH:mm format
  location: z.string().max(100).optional().nullable(),
  // description: z.string().max(500).optional().nullable(),
});

type ActivityFormData = z.infer<typeof formSchema>;

interface ActivityFormProps {
  activity?: Activity | null;
  onFormSubmit?: (activityId: string) => void;
}

export function ActivityForm({ activity, onFormSubmit }: ActivityFormProps) {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const isEditing = !!activity;

  const defaultDate = activity?.date instanceof Timestamp ? activity.date.toDate() : new Date();
  const defaultTime = activity?.date instanceof Timestamp ? format(activity.date.toDate(), 'HH:mm') : format(new Date(), 'HH:mm');


  const form = useForm<ActivityFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: activity?.title ?? "",
      date: defaultDate,
      time: defaultTime,
      location: activity?.location ?? "",
      // description: activity?.description ?? "",
    },
  });

  async function onSubmit(values: ActivityFormData) {
     if (!user || !userProfile) {
        toast({ title: "Authentication Error", description: "You must be logged in to manage activities.", variant: "destructive"});
        return;
     }
    setIsLoading(true);

    try {
        const [hours, minutes] = values.time.split(':').map(Number);
        let combinedDateTime = setHours(values.date, hours);
        combinedDateTime = setMinutes(combinedDateTime, minutes);
        combinedDateTime = setSeconds(combinedDateTime, 0);
        combinedDateTime = setMilliseconds(combinedDateTime, 0);

        const activityPayload = {
            title: values.title,
            date: Timestamp.fromDate(combinedDateTime),
            location: values.location || null,
            // description: values.description || null,
        };

        let activityId: string;

        if (isEditing && activity) {
            // For updates, we only pass the fields that can be changed
            await updateActivity(activity.id, activityPayload);
            activityId = activity.id;
            toast({ title: "Activity Updated", description: `"${values.title}" has been updated.` });
        } else {
            // For creation, include creator and initial participant info
            const creationData: Omit<Activity, 'id' | 'createdAt'> = {
                ...activityPayload,
                creatorId: user.uid,
                creatorName: userProfile.displayName ?? user.displayName ?? 'Unknown User',
                creatorPhotoURL: userProfile.photoURL ?? user.photoURL,
                participants: [
                    {
                        uid: user.uid,
                        name: userProfile.displayName ?? user.displayName,
                        photoURL: userProfile.photoURL ?? user.photoURL,
                    }
                ],
            };
            activityId = await createActivity(creationData);
            toast({ title: "Activity Created", description: `"${values.title}" has been scheduled.` });
        }

         if (onFormSubmit) {
             onFormSubmit(activityId);
         } else {
             if (isEditing) {
                 router.push(`/activities/${activityId}`); // Redirect to detail page after edit
             } else {
                 router.push('/dashboard'); // Redirect to dashboard after create
             }
         }

    } catch (error: any) {
      console.error("Error saving activity:", error);
      toast({
        title: isEditing ? "Update Failed" : "Creation Failed",
        description: "Could not save the activity. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activity Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Park Playdate, Museum Visit" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || isLoading }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} disabled={isLoading} className="w-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                )}
                />
         </div>


        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Central Park Playground, Science Museum Cafe" {...field} value={field.value ?? ""} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
          {isLoading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Activity' : 'Create Activity')}
        </Button>
      </form>
    </Form>
  );
}
```
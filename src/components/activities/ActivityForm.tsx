// src/components/activities/ActivityForm.tsx
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Timestamp } from "firebase/firestore";
import { format, parseISO, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { de } from 'date-fns/locale';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label"; // Not directly used, FormLabel is
// import { Textarea } from "@/components/ui/textarea"; // Keep if you plan to add a description field
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from '@/hooks/useAuth'; // Corrected import path
import { createActivity, updateActivity } from '@/lib/firebase/services';
import type { ActivityClient, CreateActivityData, UpdateActivityData } from '@/lib/types';


const formSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }).max(100),
  date: z.date({ required_error: "A date is required." }), // This is a Date object from the Calendar
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Invalid time format (HH:mm)."}),
  location: z.string().max(100).optional().nullable(),
});

type ActivityFormData = z.infer<typeof formSchema>;

interface ActivityFormProps {
  activity?: ActivityClient | null; // Expects ActivityClient with date as string
  onFormSubmit?: (activityId: string) => void;
}

export function ActivityForm({ activity, onFormSubmit }: ActivityFormProps) {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const isEditing = !!activity;

  // Parse ISO string from activity.date (if editing) to Date object for the form
  const initialDate = activity?.date ? new Date(activity.date) : new Date();
  const initialTime = activity?.date ? format(new Date(activity.date), 'HH:mm', { locale: de }) : format(new Date(), 'HH:mm', { locale: de });

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: activity?.title ?? "",
      date: initialDate, // This is a Date object
      time: initialTime,
      location: activity?.location ?? "",
    },
  });

  async function onSubmit(values: ActivityFormData) {
     if (!user || !userProfile) {
        toast({ title: "Authentication Error", description: "You must be signed in to manage activities.", variant: "destructive"});
        return;
     }
    setIsLoading(true);

    try {
        const [hours, minutes] = values.time.split(':').map(Number);
        let combinedDateTime = setHours(values.date, hours); // values.date is a Date object
        combinedDateTime = setMinutes(combinedDateTime, minutes);
        combinedDateTime = setSeconds(combinedDateTime, 0);
        combinedDateTime = setMilliseconds(combinedDateTime, 0);

        const locationValue = values.location === "" ? null : values.location;

        // Data for Firestore (date as Timestamp)
        const firestoreDate = Timestamp.fromDate(combinedDateTime);

        let activityId: string;

        if (isEditing && activity) {
            const updateData: UpdateActivityData = {
                 title: values.title,
                 date: firestoreDate,
                 location: locationValue,
             };
            await updateActivity(activity.id, updateData);
            activityId = activity.id;
            toast({ title: "Activity Updated", description: `"${values.title}" has been updated.` });
        } else {
            const creationData: CreateActivityData = {
                title: values.title,
                date: firestoreDate,
                location: locationValue,
                creatorId: user.uid,
                creatorName: userProfile.displayName ?? user.displayName ?? 'Unknown User',
                creatorPhotoURL: userProfile.photoURL ?? user.photoURL,
                participants: [
                    {
                        uid: user.uid,
                        name: userProfile.displayName ?? user.displayName ?? 'Unknown User',
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
            router.push(`/dashboard`); // Redirect to dashboard after create/update
         }

    } catch (error: any) {
      console.error("Error saving activity:", error);
      toast({
        title: isEditing ? "Update Failed" : "Creation Failed",
        description: `Could not save the activity. ${error.message || ''}`,
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
                <Input placeholder="e.g., Playground Meetup, Museum Visit" {...field} disabled={isLoading} />
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
                              format(field.value, "PPP", { locale: de })
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          locale={de}
                          weekStartsOn={1}
                          mode="single"
                          selected={field.value} // field.value is a Date object here
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
                        <Input type="time" {...field} disabled={isLoading} className="w-full" step="900" />
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
                <Input placeholder="e.g., Park Playground, Museum Cafe" {...field} value={field.value ?? ""} onChange={field.onChange} disabled={isLoading} />
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

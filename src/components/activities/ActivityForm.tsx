// src/components/activities/ActivityForm.tsx
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Timestamp } from "firebase/firestore";
import { format, parseISO, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { de } from 'date-fns/locale'; // Keep German locale for date formatting conventions

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Keep if you plan to add a description field
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
  location: z.string().max(100).optional().nullable(), // Allow null for Firestore
  // description: z.string().max(500).optional(), // Example: Add description field
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
  const defaultTime = activity?.date instanceof Timestamp ? format(activity.date.toDate(), 'HH:mm', { locale: de }) : format(new Date(), 'HH:mm', { locale: de });


  const form = useForm<ActivityFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: activity?.title ?? "",
      date: defaultDate,
      time: defaultTime,
      location: activity?.location ?? "", // Default to empty string for form, will be converted to null if empty
      // description: activity?.description ?? "",
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
        let combinedDateTime = setHours(values.date, hours);
        combinedDateTime = setMinutes(combinedDateTime, minutes);
        combinedDateTime = setSeconds(combinedDateTime, 0);
        combinedDateTime = setMilliseconds(combinedDateTime, 0);

        // Convert empty string location to null for Firestore compatibility
        const locationValue = values.location === "" ? null : values.location;

        const activityPayload = {
            title: values.title,
            date: Timestamp.fromDate(combinedDateTime),
            location: locationValue, // Use the potentially null value
            // description: values.description,
        };

        let activityId: string;

        if (isEditing && activity) {
            // Ensure we only pass fields allowed for update
             const updateData: Partial<Omit<Activity, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'creatorPhotoURL' | 'participants'>> = {
                 title: activityPayload.title,
                 date: activityPayload.date,
                 location: activityPayload.location,
                 // description: activityPayload.description,
             };
            await updateActivity(activity.id, updateData);
            activityId = activity.id;
            toast({ title: "Activity Updated", description: `"${values.title}" has been updated.` });
        } else {
            const creationData: Omit<Activity, 'id' | 'createdAt'> = {
                ...activityPayload,
                creatorId: user.uid,
                creatorName: userProfile.displayName ?? user.displayName ?? 'Unknown User',
                creatorPhotoURL: userProfile.photoURL ?? user.photoURL,
                participants: [
                    {
                        uid: user.uid,
                        name: userProfile.displayName ?? user.displayName ?? 'Unknown User', // Ensure name is not null
                        photoURL: userProfile.photoURL ?? user.photoURL,
                    }
                ],
                // description: values.description, // Include description if added
            };
            activityId = await createActivity(creationData);
            toast({ title: "Activity Created", description: `"${values.title}" has been scheduled.` });
        }

         if (onFormSubmit) {
             onFormSubmit(activityId);
         } else {
            // Redirect to the new details page with query parameter
            router.push(`/activities/details?id=${activityId}`);
         }

    } catch (error: any) {
      console.error("Error saving activity:", error);
      toast({
        title: isEditing ? "Update Failed" : "Creation Failed",
        description: `Could not save the activity. ${error.message || ''}`, // Include error message if available
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
                              format(field.value, "PPP", { locale: de }) // Use German locale for display
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          locale={de} // Set German locale for the calendar
                          weekStartsOn={1} // Start week on Monday
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
                        {/* Use standard time input */}
                        <Input type="time" {...field} disabled={isLoading} className="w-full" step="900" /> {/* step="900" for 15-minute intervals if desired */}
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
                {/* Ensure value is handled correctly (null vs. "") */}
                <Input placeholder="e.g., Park Playground, Museum Cafe" {...field} value={field.value ?? ""} onChange={field.onChange} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Example: Description Field */}
        {/* <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any extra details about the activity..."
                  className="resize-none"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        /> */}


        <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
          {isLoading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Activity' : 'Create Activity')}
        </Button>
      </form>
    </Form>
  );
}

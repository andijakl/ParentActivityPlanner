// src/app/(app)/profile/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { updateUserProfile } from '@/lib/firebase/services';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"; // Added FormDescription
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const profileSchema = z.object({
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50),
  childNickname: z.string().max(50).optional(),
  // email cannot be changed here, it's managed via Firebase Auth methods if needed
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      childNickname: "",
    },
  });

   // Populate form once userProfile is loaded
  useEffect(() => {
    if (userProfile) {
      form.reset({
        displayName: userProfile.displayName ?? '',
        childNickname: userProfile.childNickname ?? '',
      });
    }
     // Handle case where user exists but profile is somehow null (e.g., creation failed)
     else if (user && !authLoading) {
         // Maybe set defaults from auth user if profile is missing
         form.reset({
             displayName: user.displayName ?? '',
             childNickname: '',
         });
         console.warn("User profile data is missing, using auth display name as default.");
     }

  }, [userProfile, user, authLoading, form]);


  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    setIsLoading(true);
    try {
      await updateUserProfile(user.uid, data);
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved.",
      });
      // Optionally force refresh context if local update isn't sufficient
      // window.location.reload(); // Or use a more sophisticated state management update
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update Failed",
        description: "Could not update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

   const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
  };


   if (authLoading || (!userProfile && user)) { // Show loading if auth is loading OR user exists but profile isn't loaded yet
    return (
      <div className="space-y-4">
         <Skeleton className="h-10 w-48" />
         <Skeleton className="h-8 w-64" />
         <Card>
             <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
             <CardContent className="space-y-6">
                 <div className="flex items-center gap-4">
                     <Skeleton className="h-16 w-16 rounded-full" />
                     <Skeleton className="h-4 w-24" />
                 </div>
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-24" />
             </CardContent>
         </Card>
      </div>
    );
  }

   if (!user) {
     // This case should ideally be handled by the AuthProviderComponent redirecting
     return <p>Please sign in to view your profile.</p>;
   }


  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
      <p className="text-muted-foreground mb-6">View and update your personal information.</p>

      <Card>
        <CardHeader>
            <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-16 w-16">
                   <AvatarImage src={userProfile?.photoURL ?? user.photoURL ?? ''} alt={userProfile?.displayName ?? user.displayName ?? 'User'} />
                   <AvatarFallback>{getInitials(userProfile?.displayName ?? user.displayName)}</AvatarFallback>
                </Avatar>
                 <div>
                    <CardTitle className="text-xl">{userProfile?.displayName ?? user.displayName ?? 'User'}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                 </div>
            </div>
             <p className="text-sm text-muted-foreground">Manage your account details below.</p>

        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="childNickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Child's Nickname (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Little Adventurer" {...field} disabled={isLoading} />
                    </FormControl>
                     <FormDescription>
                        This helps identify your child in activities (visible to friends).
                     </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input value={user.email ?? 'No email provided'} disabled readOnly />
                  </FormControl>
                  <FormDescription>
                    Email cannot be changed here. Use account settings if needed (feature not implemented).
                  </FormDescription>
              </FormItem>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

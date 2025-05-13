// src/app/(app)/profile/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Corrected import path
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { updateUserProfile } from '@/lib/firebase/services';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label'; // Not directly used
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Form data does not include 'createdAt' or 'uid' or 'email' as they are not directly editable here.
const profileSchema = z.object({
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50),
  childNickname: z.string().max(50).optional(),
  // photoURL can be part of UserProfile, but typically handled via file upload separately
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, userProfile, loading: authLoading } = useAuth(); // userProfile is UserProfileClient
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      childNickname: "",
    },
  });

  useEffect(() => {
    if (userProfile) { // userProfile.createdAt is already an ISO string
      form.reset({
        displayName: userProfile.displayName ?? '',
        childNickname: userProfile.childNickname ?? '',
      });
    } else if (user && !authLoading) {
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
      // updateUserProfile expects data that matches parts of UserProfile (Firestore version)
      // but only specific fields like displayName, childNickname.
      // The service function is already adapted to handle Omit<UserProfile, 'createdAt' | 'uid' | 'email'>
      await updateUserProfile(user.uid, {
          displayName: data.displayName,
          childNickname: data.childNickname
      });
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved.",
      });
      // AuthContext will re-fetch or update userProfile if needed, or rely on Firebase's onAuthStateChanged
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


   if (authLoading || (!userProfile && user)) {
    return (
      <div className="space-y-4 container mx-auto py-6 px-4 md:px-6 max-w-2xl">
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
                      <Input placeholder="e.g., Little Adventurer" {...field} value={field.value ?? ""} onChange={field.onChange} disabled={isLoading} />
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
                    Email cannot be changed here.
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

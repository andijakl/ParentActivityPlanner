// src/components/auth/SignInForm.tsx
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, type User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config'; // auth and db can be null
import { doc, getDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label"; // Not directly used
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import type { UserProfile, InvitationClient } from '@/lib/types'; // UserProfile for type reference
import { createUserProfile, addFriend, deleteInvitation, getInvitation } from '@/lib/firebase/services'; // Import services

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('invite');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleInviteAfterSignIn = async (signedInUser: FirebaseUser, code: string) => {
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot handle invite.");
        toast({ title: "Invite Error", description: "Database service unavailable.", variant: "destructive" });
        return;
    }
    try {
        const invitation: InvitationClient | null = await getInvitation(code);

        if (!invitation) {
            toast({ title: "Invite Not Found", description: "The invite code is invalid or expired.", variant: "destructive" });
            return;
        }
        if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
            toast({ title: "Invite Expired", description: "This invitation link has expired.", variant: "destructive" });
            return;
        }
        if (signedInUser.uid === invitation.inviterId) {
            toast({ title: "Cannot Add Self", description: "You cannot accept your own invitation.", variant: "destructive" });
            return;
        }

        const friendRef = doc(db, `users/${signedInUser.uid}/friends/${invitation.inviterId}`);
        const friendSnap = await getDoc(friendRef);

        if (!friendSnap.exists()) {
            await addFriend(signedInUser.uid, invitation.inviterId);
            await deleteInvitation(code);
            toast({ title: "Friend Added!", description: `You are now connected with ${invitation.inviterName || 'your friend'}.` });
        } else {
            toast({ title: "Already Friends", description: "You are already connected with this friend." });
            await deleteInvitation(code); 
        }
    } catch (error) {
        console.error("Error handling invite code after sign-in:", error);
        toast({ title: "Invite Error", description: "Could not process the invite code.", variant: "destructive" });
    }
};


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth) {
        toast({ title: "Error", description: "Authentication service is unavailable.", variant: "destructive"});
        return;
    }
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({ title: "Sign In Successful", description: "Welcome back!" });

      if (inviteCode) {
        await handleInviteAfterSignIn(userCredential.user, inviteCode);
      }
      router.push('/dashboard'); 
    } catch (error: any) {
      console.error("Sign in error:", error);
      let description = "An unexpected error occurred. Please try again.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = "Invalid email or password.";
      } else if (error.code === 'auth/invalid-email') {
         description = "Please enter a valid email address.";
      }
      toast({
        title: "Sign In Failed",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
     if (!auth || !db) {
         toast({ title: "Error", description: "Authentication or database service is unavailable.", variant: "destructive"});
         return;
     }
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        const newUserProfileData: Omit<UserProfile, 'createdAt'> = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          childNickname: '', 
        };
        await createUserProfile(newUserProfileData); 
        console.log("Created new user profile for Google Sign-In user:", user.uid);
      } else {
          console.log("User profile already exists for Google Sign-In user:", user.uid);
      }

      toast({ title: "Google Sign In Successful", description: `Welcome, ${user.displayName}!` });
      if (inviteCode) {
        await handleInviteAfterSignIn(user, inviteCode);
      }
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Google Sign in error:", error);
       let description = "Could not sign in with Google. Please try again.";
       if (error.code === 'auth/popup-closed-by-user') {
           description = "Google Sign-In cancelled.";
       } else if (error.code === 'auth/account-exists-with-different-credential') {
           description = "An account already exists with this email address using a different sign-in method.";
       }
      toast({
        title: "Google Sign In Failed",
        description: description,
        variant: "destructive",
      });
    } finally {
        setIsGoogleLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Sign In</CardTitle>
        <CardDescription>Enter your email and password to access your account.</CardDescription>
        {inviteCode && (
            <CardDescription className="text-primary pt-2">
                You've been invited! Sign in to connect.
            </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} type="email" disabled={isLoading || isGoogleLoading}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input placeholder="••••••••" {...field} type="password" disabled={isLoading || isGoogleLoading}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading || !auth}>
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </Form>
        <Separator className="my-6" />
         <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading || !auth || !db}>
             {isGoogleLoading ? "Signing In..." : (
               <>
                 <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px"><path fill="#EA4335" d="M24 9.5c3.48 0 6.38 1.19 8.63 3.27L38.5 7.1C34.63 3.68 29.74 1.5 24 1.5 14.87 1.5 7.07 6.84 3.5 14.29l6.88 5.31C11.97 13.31 17.57 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24c0-1.63-.15-3.2-.43-4.7H24v8.98h12.64c-.55 2.9-2.17 5.37-4.6 7.06l6.62 5.13C43.17 36.3 46.5 30.77 46.5 24z"/><path fill="#34A853" d="M10.38 29.6c-.52-1.56-.81-3.23-.81-4.96s.29-3.4.81-4.96L3.5 14.29C1.94 17.39 1 20.6 1 24s.94 6.61 2.5 9.71l6.88-5.31z"/><path fill="#FBBC05" d="M24 46.5c5.74 0 10.63-1.92 14.13-5.19l-6.62-5.13c-1.91 1.28-4.37 2.05-7.51 2.05-6.43 0-12.03-3.81-13.62-9.08L3.5 34.29C7.07 41.16 14.87 46.5 24 46.5z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
                 Sign in with Google
               </>
             )}
         </Button>
      </CardContent>
       <CardFooter className="flex justify-center text-sm">
        <p>Don't have an account?&nbsp;</p>
         <Link href={inviteCode ? `/signup?invite=${inviteCode}` : "/signup"} className="font-medium text-primary hover:underline underline-offset-4">
           Sign Up
         </Link>
       </CardFooter>
    </Card>
  );
}

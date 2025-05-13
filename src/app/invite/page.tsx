// src/app/invite/page.tsx
"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth'; // Corrected import path
import { getInvitation, addFriend, deleteInvitation } from '@/lib/firebase/services';
import type { InvitationClient } from '@/lib/types'; // Use InvitationClient
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'; // Added CardFooter
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { UserPlus, AlertTriangle, Home } from 'lucide-react'; // Removed CheckCircle as it's not used

function InvitePageContent() {
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('code');
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [invitation, setInvitation] = useState<InvitationClient | null>(null); // Use InvitationClient
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (inviteCode) {
      setIsLoading(true);
      setError(null);
      getInvitation(inviteCode) // This now returns InvitationClient
        .then(data => {
          if (data) {
            // Optional: Check if invitation.expiresAt (string) is past
            if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
                setError("This invitation has expired.");
                setInvitation(null);
            } else {
                setInvitation(data);
            }
          } else {
            setError("Invalid or expired invitation code.");
          }
        })
        .catch(err => {
          console.error("Error fetching invitation:", err);
          setError("Could not retrieve invitation details.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
        setError("No invitation code provided.");
        setIsLoading(false);
    }
  }, [inviteCode]);

   const handleAcceptInvite = async () => {
        if (!inviteCode) {
            setError("Invitation code is missing.");
            return;
        }

        if (!user) {
            // Redirect to signup page with invite code if not logged in
            router.push(`/signup?invite=${inviteCode}`);
            return;
        }

        if (!invitation) return;

        if (user.uid === invitation.inviterId) {
             toast({ title: "Cannot Add Self", description: "You cannot accept your own invitation.", variant: "destructive" });
             return;
        }

        setIsAccepting(true);
        try {
            await addFriend(user.uid, invitation.inviterId);
            // addFriend service handles bidirectional friendship
            await deleteInvitation(inviteCode);

            toast({ title: "Friend Added!", description: `You are now connected with ${invitation.inviterName || 'your friend'}.`, });
            router.push('/dashboard');

        } catch (error) {
            console.error("Error accepting invite:", error);
             if (error instanceof Error && error.message.includes("already friends")) {
                 toast({ title: "Already Friends", description: "You are already connected with this user.", variant: "default" });
                 try { await deleteInvitation(inviteCode); } catch (delErr) { console.error("Failed to delete already-friends invite", delErr); }
                 router.push('/dashboard');
             } else {
                toast({ title: "Accept Failed", description: "Could not connect with friend. The invite might be invalid or already used.", variant: "destructive" });
             }
        } finally {
            setIsAccepting(false);
        }
    };


  if (isLoading || authLoading) {
    return (
         <div className="flex items-center justify-center min-h-screen p-4">
             <Card className="w-full max-w-md">
                 <CardHeader><Skeleton className="h-7 w-3/4" /></CardHeader>
                 <CardContent className="space-y-4">
                     <Skeleton className="h-5 w-full" />
                     <Skeleton className="h-10 w-full" />
                 </CardContent>
             </Card>
        </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary/50 dark:bg-secondary/20 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">
             {error ? (
                  <span className="flex items-center justify-center gap-2 text-destructive">
                     <AlertTriangle /> Invitation Error
                  </span>
             ) : invitation ? (
                  <span className="flex items-center justify-center gap-2 text-primary">
                     <UserPlus/> You're Invited!
                  </span>
             ) : (
                 'Loading Invitation...'
             )}
          </CardTitle>
           {invitation && !error && <CardDescription className="pt-2">
                {invitation.inviterName || 'A friend'} wants to connect with you on Parent Activity Hub.
            </CardDescription>}
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : invitation ? (
            <Button onClick={handleAcceptInvite} disabled={isAccepting || !inviteCode} className="w-full">
              {isAccepting ? 'Connecting...' : (user ? 'Accept Invitation' : 'Sign Up to Accept')}
            </Button>
          ) : (
             <p className="text-muted-foreground">Loading invitation details...</p>
          )}
        </CardContent>
         <CardFooter className="flex justify-center">
            <Button variant="link" asChild>
                <Link href={user ? "/dashboard" : "/signin"} className="text-sm">
                     <Home className="mr-1 h-4 w-4"/> Go to {user ? "Dashboard" : "Sign In"}
                </Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Skeleton className="h-12 w-12" /> Loading...</div>}>
      <InvitePageContent />
    </Suspense>
  );
}

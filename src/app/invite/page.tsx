// src/app/invite/page.tsx
"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth'; 
import { getInvitation, addFriend, deleteInvitation } from '@/lib/firebase/services';
import type { InvitationClient } from '@/lib/types'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { UserPlus, AlertTriangle, Home } from 'lucide-react'; 

function InvitePageContent() {
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('code');
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [invitation, setInvitation] = useState<InvitationClient | null>(null); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (inviteCode) {
      setIsLoading(true);
      setError(null);
      getInvitation(inviteCode) 
        .then(data => {
          if (data) {
            if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
                setError("This invitation has expired.");
                setInvitation(null);
                 // Attempt to delete expired invitation
                deleteInvitation(inviteCode).catch(err => console.warn("Failed to delete expired invitation:", err));
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
            router.push(`/signup?invite=${inviteCode}`);
            return;
        }

        if (!invitation) {
            toast({ title: "Error", description: "Invitation details not loaded.", variant: "destructive" });
            return;
        }

        if (user.uid === invitation.inviterId) {
             toast({ title: "Cannot Add Self", description: "You cannot accept your own invitation.", variant: "destructive" });
             return;
        }

        setIsAccepting(true);
        try {
            await addFriend(user.uid, invitation.inviterId);
            // If addFriend succeeds (or throws 'already-friends'), we assume the connection is made or already exists.
            await deleteInvitation(inviteCode); // Delete invitation after successful connection attempt
            toast({ title: "Friend Added!", description: `You are now connected with ${invitation.inviterName || 'your friend'}.` });
            router.push('/friends'); // Redirect to friends page to see the new connection
        } catch (error: any) {
            console.error("Error accepting invite:", error);
            if (error.code === 'already-friends') {
                 toast({ title: "Already Friends", description: "You are already connected with this user." });
                 try { 
                     await deleteInvitation(inviteCode); // Clean up invite if already friends
                 } catch (delErr) { 
                     console.error("Failed to delete already-friends invite", delErr); 
                 }
                 router.push('/friends');
            } else if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes("permission denied"))) {
                 toast({ title: "Connection Issue", description: "Could not establish the full friend connection. One part of the connection may have failed due to permissions. The inviter might need to accept you too.", variant: "destructive", duration: 7000 });
                 // Even if partially failed, inviter was added to acceptor's list, so delete invite
                 try { await deleteInvitation(inviteCode); } catch (delErr) { /* ignore */ }
                 router.push('/friends'); // Go to friends page, partial connection might be visible
            } else {
                toast({ title: "Accept Failed", description: `Could not connect with friend. ${error.message || 'The invite might be invalid or an unexpected error occurred.'}`, variant: "destructive" });
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
              {isAccepting ? 'Connecting...' : (user ? 'Accept Invitation' : 'Sign Up/In to Accept')}
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


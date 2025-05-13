// src/app/(app)/friends/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth'; 
import { getFriends, generateInviteCode, removeFriend, getInvitation, addFriend, deleteInvitation } from '@/lib/firebase/services';
import type { Friend, InvitationClient } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Copy, Trash2, RefreshCw, Send, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


export default function FriendsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isRemovingFriend, setIsRemovingFriend] = useState<string | null>(null); 
  
  const [enteredInviteCode, setEnteredInviteCode] = useState('');
  const [isAcceptingEnteredInvite, setIsAcceptingEnteredInvite] = useState(false);


   const fetchFriends = useCallback(async () => {
        if (user) {
             setIsLoadingFriends(true);
             try {
                 const fetchedFriends = await getFriends(user.uid);
                 setFriends(fetchedFriends);
             } catch (error) {
                 console.error("Error fetching friends:", error);
                 toast({ title: "Error", description: "Could not load friends list.", variant: "destructive" });
             } finally {
                 setIsLoadingFriends(false);
             }
        }
   }, [user, toast]);


  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);


  const handleGenerateInvite = async () => {
    if (!user || !userProfile) return;
    setIsGeneratingCode(true);
    try {
      const code = await generateInviteCode(user.uid, userProfile.displayName ?? user.displayName);
      const link = `${window.location.origin}/invite?code=${code}`;
      setGeneratedInviteLink(link);
      toast({ title: "Invite Link Generated!", description: "Share this link with a friend." });
    } catch (error) {
      console.error("Error generating invite code:", error);
      toast({ title: "Error", description: "Could not generate invite code.", variant: "destructive" });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (!generatedInviteLink) return;
    navigator.clipboard.writeText(generatedInviteLink)
      .then(() => {
        toast({ title: "Invite Link Copied!", description: "Link ready to be shared." });
      })
      .catch(err => {
        console.error('Failed to copy invite link: ', err);
         toast({ title: "Copy Failed", description: "Could not copy the link automatically.", variant: "destructive" });
      });
  };

   const handleRemoveFriend = async (friendId: string) => {
       if (!user) return;
       setIsRemovingFriend(friendId);
       try {
           await removeFriend(user.uid, friendId);
           toast({ title: "Friend Removed", description: "Friendship connection has been removed." });
           fetchFriends();
       } catch (error) {
           console.error("Error removing friend:", error);
           toast({ title: "Error", description: "Could not remove friend.", variant: "destructive" });
       } finally {
           setIsRemovingFriend(null); 
       }
   };

   const handleAcceptEnteredInvite = async () => {
    if (!enteredInviteCode.trim()) {
        toast({ title: "Input Error", description: "Please enter an invite code.", variant: "destructive" });
        return;
    }
    if (!user) {
        toast({ title: "Auth Error", description: "Please sign in to accept an invite.", variant: "destructive" });
        return;
    }

    setIsAcceptingEnteredInvite(true);
    try {
        const invitation: InvitationClient | null = await getInvitation(enteredInviteCode.trim());

        if (!invitation) {
            toast({ title: "Invite Not Found", description: "The invite code is invalid or expired.", variant: "destructive" });
            setIsAcceptingEnteredInvite(false);
            return;
        }
        if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
            toast({ title: "Invite Expired", description: "This invitation link has expired.", variant: "destructive" });
            try { await deleteInvitation(enteredInviteCode.trim()); } catch (delErr) { console.warn("Failed to delete expired invite:", delErr); }
            setIsAcceptingEnteredInvite(false);
            return;
        }
        if (user.uid === invitation.inviterId) {
            toast({ title: "Cannot Add Self", description: "You cannot accept your own invitation.", variant: "destructive" });
            setIsAcceptingEnteredInvite(false);
            return;
        }

        await addFriend(user.uid, invitation.inviterId);
        await deleteInvitation(enteredInviteCode.trim());
        toast({ title: "Friend Added!", description: `You are now connected with ${invitation.inviterName || 'your friend'}.` });
        setEnteredInviteCode(''); // Clear input
        fetchFriends(); // Refresh friends list

    } catch (error: any) {
        console.error("Error accepting entered invite code:", error);
        if (error.code === 'already-friends') {
             toast({ title: "Already Friends", description: "You are already connected with this user." });
             try { await deleteInvitation(enteredInviteCode.trim()); } catch (delErr) { /* ignore */ }
             fetchFriends();
        } else if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes("permission denied"))) {
             toast({ title: "Connection Issue", description: "Could not establish the full friend connection due to permissions. One part may have failed.", variant: "destructive", duration: 7000 });
             try { await deleteInvitation(enteredInviteCode.trim()); } catch (delErr) { /* ignore */ }
             fetchFriends();
        } else {
            toast({ title: "Invite Error", description: `Could not process the invite code. ${error.message || ''}`, variant: "destructive" });
        }
    } finally {
        setIsAcceptingEnteredInvite(false);
    }
};


   const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
  };


  if (authLoading) {
    return <FriendsPageSkeleton />;
  }

   if (!user) {
     return <p>Please sign in to manage friends.</p>;
   }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 space-y-8">
      <h1 className="text-3xl font-bold">Manage Friends</h1>

      {/* Generate Invite Link Section */}
       <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5"/> Create Invite Link</CardTitle>
             <CardDescription>Share your unique link with other parents to connect.</CardDescription>
           </CardHeader>
           <CardContent className="flex flex-col sm:flex-row items-center gap-4">
             {generatedInviteLink ? (
                 <>
                     <Input value={generatedInviteLink} readOnly className="flex-1" aria-label="Generated invite link"/>
                     <Button onClick={handleCopyInviteLink} variant="outline" size="icon" aria-label="Copy invite link">
                       <Copy className="h-4 w-4" />
                     </Button>
                 </>
             ) : (
                <p className="text-sm text-muted-foreground flex-1">Click "Generate" to create a shareable invite link.</p>
             )}
              <Button onClick={handleGenerateInvite} disabled={isGeneratingCode} className="w-full sm:w-auto">
                 {isGeneratingCode ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin"/> Generating...</> : <><UserPlus className="mr-2 h-4 w-4"/>Generate Invite Link</>}
              </Button>
           </CardContent>
           {generatedInviteLink && (
            <CardFooter>
                    <p className="text-xs text-muted-foreground">This link is valid for 7 days. Anyone with this link can add you as a friend.</p>
            </CardFooter>
           )}
       </Card>

        {/* Accept Invite Code Section */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5 transform -rotate-45"/> Accept an Invite Code</CardTitle>
                <CardDescription>Received an invite code from a friend? Enter it here.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-stretch gap-2">
                <Input 
                    placeholder="Enter invite code" 
                    value={enteredInviteCode}
                    onChange={(e) => setEnteredInviteCode(e.target.value)}
                    className="flex-1"
                    aria-label="Enter invite code"
                    disabled={isAcceptingEnteredInvite}
                />
                <Button 
                    onClick={handleAcceptEnteredInvite} 
                    disabled={isAcceptingEnteredInvite || !enteredInviteCode.trim()}
                    className="w-full sm:w-auto"
                >
                    {isAcceptingEnteredInvite ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin"/>Accepting...</> : 'Accept Invite'}
                </Button>
            </CardContent>
        </Card>


      {/* Friends List Section */}
       <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Your Friends</CardTitle>
             <CardDescription>People you have connected with on Parent Activity Hub.</CardDescription>
           </CardHeader>
           <CardContent>
               {isLoadingFriends ? (
                 <FriendsListSkeleton />
               ) : friends.length > 0 ? (
                  <div className="space-y-3">
                    {friends.map((friend) => (
                      <div key={friend.uid} className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:shadow-md transition-shadow duration-150">
                         <div className="flex items-center gap-3">
                             <Avatar className="h-10 w-10 border">
                                <AvatarImage src={friend.photoURL ?? undefined} alt={friend.displayName ?? 'Friend'} />
                                <AvatarFallback>{getInitials(friend.displayName)}</AvatarFallback>
                            </Avatar>
                             <span className="font-medium">{friend.displayName ?? 'Friend'}</span>
                        </div>
                         <AlertDialog>
                           <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive-foreground rounded-full"
                                    disabled={isRemovingFriend === friend.uid}
                                    aria-label={`Remove ${friend.displayName ?? 'friend'}`}
                                >
                                    {isRemovingFriend === friend.uid ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                           </AlertDialogTrigger>
                           <AlertDialogContent>
                             <AlertDialogHeader>
                               <AlertDialogTitle>Remove Friend?</AlertDialogTitle>
                               <AlertDialogDescription>
                                 Are you sure you want to remove {friend.displayName ?? 'this friend'}? This will remove the connection for both of you and cannot be undone.
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel disabled={isRemovingFriend === friend.uid}>Cancel</AlertDialogCancel>
                               <AlertDialogAction
                                    onClick={() => handleRemoveFriend(friend.uid)}
                                    disabled={isRemovingFriend === friend.uid}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    {isRemovingFriend === friend.uid ? 'Removing...' : 'Remove Friend'}
                               </AlertDialogAction>
                             </AlertDialogFooter>
                           </AlertDialogContent>
                         </AlertDialog>
                      </div>
                    ))}
                  </div>
               ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">You haven't connected with any friends yet. Share your invite link or accept one!</p>
               )}
           </CardContent>
       </Card>

    </div>
  );
}


function FriendsPageSkeleton() {
    return (
        <div className="container mx-auto py-6 px-4 md:px-6 space-y-8">
            <Skeleton className="h-9 w-48" /> {/* Title */}

             {/* Generate Invite Card Skeleton */}
             <Card>
               <CardHeader>
                   <Skeleton className="h-6 w-1/3" />
                   <Skeleton className="h-4 w-3/4 mt-1" />
               </CardHeader>
               <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-full sm:w-40" /> {/* Generate Button */}
               </CardContent>
                <CardFooter>
                     <Skeleton className="h-3 w-full" />
                </CardFooter>
             </Card>

             {/* Accept Invite Card Skeleton */}
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-full mt-1" />
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-stretch gap-2">
                    <Skeleton className="h-10 flex-1" /> {/* Input */}
                    <Skeleton className="h-10 w-full sm:w-32" /> {/* Button */}
                </CardContent>
             </Card>


             {/* Friends List Card Skeleton */}
              <Card>
                 <CardHeader>
                      <Skeleton className="h-6 w-1/3" />
                      <Skeleton className="h-4 w-1/2 mt-1" />
                 </CardHeader>
                 <CardContent>
                     <FriendsListSkeleton />
                 </CardContent>
             </Card>
        </div>
    );
}

function FriendsListSkeleton() {
     return (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
               <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                   <div className="flex items-center gap-3">
                       <Skeleton className="h-10 w-10 rounded-full" />
                       <Skeleton className="h-4 w-24" />
                   </div>
                   <Skeleton className="h-8 w-8 rounded-full" /> {/* Remove Button */}
               </div>
            ))}
        </div>
     )
}


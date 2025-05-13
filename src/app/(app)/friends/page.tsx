// src/app/(app)/friends/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Corrected import path
import { getFriends, generateInviteCode, removeFriend } from '@/lib/firebase/services';
import type { Friend } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Copy, Trash2, RefreshCw } from 'lucide-react';
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
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isRemovingFriend, setIsRemovingFriend] = useState<string | null>(null); // Store friend UID being removed
  const [inviteLink, setInviteLink] = useState<string | null>(null); // Store the full invite link

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
     // TODO: Consider fetching existing invite code if one was previously generated and still valid
  }, [fetchFriends]);


  const handleGenerateInvite = async () => {
    if (!user || !userProfile) return;
    setIsGeneratingCode(true);
    try {
      const code = await generateInviteCode(user.uid, userProfile.displayName ?? user.displayName);
      setInviteCode(code);
      // Generate the invite link using query parameter
      const link = `${window.location.origin}/invite?code=${code}`;
      setInviteLink(link);
      toast({ title: "Invite Code Generated!", description: "Share this link with a friend." });
    } catch (error) {
      console.error("Error generating invite code:", error);
      toast({ title: "Error", description: "Could not generate invite code.", variant: "destructive" });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCopyCode = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink)
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
           // Refresh friends list after removal
           fetchFriends();
       } catch (error) {
           console.error("Error removing friend:", error);
           toast({ title: "Error", description: "Could not remove friend.", variant: "destructive" });
       } finally {
           setIsRemovingFriend(null); // Clear loading state regardless of outcome
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
     // Should be redirected, but good practice
     return <p>Please sign in to manage friends.</p>;
   }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 space-y-8">
      <h1 className="text-3xl font-bold">Manage Friends</h1>

      {/* Invite Code Section */}
       <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5"/> Add Friends</CardTitle>
             <CardDescription>Share your unique invite link with other parents to connect.</CardDescription>
           </CardHeader>
           <CardContent className="flex flex-col sm:flex-row items-center gap-4">
             {inviteLink ? (
                 <>
                     <Input value={inviteLink} readOnly className="flex-1" />
                     <Button onClick={handleCopyCode} variant="outline" size="icon" aria-label="Copy invite link">
                       <Copy className="h-4 w-4" />
                     </Button>
                     {/* Optional: Add refresh/regenerate button? */}
                 </>
             ) : (
                <p className="text-sm text-muted-foreground flex-1">Click generate to get your invite link.</p>
             )}
              <Button onClick={handleGenerateInvite} disabled={isGeneratingCode} className="w-full sm:w-auto">
                 {isGeneratingCode ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin"/> Generating...</> : 'Generate Invite Link'}
              </Button>

           </CardContent>
           <CardFooter>
                <p className="text-xs text-muted-foreground">Anyone with this link can add you as a friend. Generate a new link to invalidate the old one (feature not implemented).</p>
           </CardFooter>
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
                      <div key={friend.uid} className="flex items-center justify-between gap-3 p-2 rounded-md border hover:bg-muted/50">
                         <div className="flex items-center gap-3">
                             <Avatar className="h-10 w-10 border">
                                <AvatarImage src={friend.photoURL ?? undefined} alt={friend.displayName ?? 'Friend'} />
                                <AvatarFallback>{getInitials(friend.displayName)}</AvatarFallback>
                            </Avatar>
                             <span className="text-sm font-medium">{friend.displayName ?? 'Friend'}</span>
                        </div>
                         <AlertDialog>
                           <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive/10"
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
                                 Are you sure you want to remove {friend.displayName ?? 'this friend'}? This action cannot be undone and will remove the connection for both of you.
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel>Cancel</AlertDialogCancel>
                               <AlertDialogAction
                                    onClick={() => handleRemoveFriend(friend.uid)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Remove
                               </AlertDialogAction>
                             </AlertDialogFooter>
                           </AlertDialogContent>
                         </AlertDialog>

                      </div>
                    ))}
                  </div>
               ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">You haven't connected with any friends yet. Share your invite link!</p>
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

             {/* Invite Card Skeleton */}
             <Card>
               <CardHeader>
                   <Skeleton className="h-6 w-32" />
                   <Skeleton className="h-4 w-3/4 mt-1" />
               </CardHeader>
               <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-full sm:w-36" />
               </CardContent>
                <CardFooter>
                     <Skeleton className="h-3 w-full" />
                </CardFooter>
             </Card>

             {/* Friends List Card Skeleton */}
              <Card>
                 <CardHeader>
                      <Skeleton className="h-6 w-32" />
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
               <div key={i} className="flex items-center justify-between gap-3 p-2 rounded-md border">
                   <div className="flex items-center gap-3">
                       <Skeleton className="h-10 w-10 rounded-full" />
                       <Skeleton className="h-4 w-24" />
                   </div>
                   <Skeleton className="h-8 w-8" /> {/* Remove Button */}
               </div>
            ))}
        </div>
     )
}

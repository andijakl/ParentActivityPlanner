"use client";

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/context/AuthContext'; // Use the context hook
import { handleSignOut } from '@/lib/firebase/services';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, Settings, Users, CalendarPlus } from 'lucide-react'; // Import icons

export function UserNav() {
  const { user, userProfile } = useAuth();
  const router = useRouter();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U'; // Default 'User'
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
  };

  const handleLogoutClick = async () => {
    try {
      await handleSignOut();
      router.push('/signin'); // Redirect to sign-in page after logout
    } catch (error) {
      console.error("Logout failed:", error);
      // Optionally show a toast notification for logout failure
    }
  };

  if (!user) {
    // Optionally render a Sign In button or null if header shouldn't show anything when logged out
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
                src={userProfile?.photoURL ?? user.photoURL ?? ''}
                alt={userProfile?.displayName ?? user.displayName ?? 'User'} />
            <AvatarFallback>{getInitials(userProfile?.displayName ?? user.displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {userProfile?.displayName ?? user.displayName ?? 'User'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
           <DropdownMenuItem asChild>
             <Link href="/profile">
               <User className="mr-2 h-4 w-4" />
               <span>Profile</span>
             </Link>
           </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/activities/create">
               <CalendarPlus className="mr-2 h-4 w-4" />
               <span>New Activity</span>
             </Link>
           </DropdownMenuItem>
            <DropdownMenuItem asChild>
             <Link href="/friends">
               <Users className="mr-2 h-4 w-4" />
               <span>Friends</span>
             </Link>
           </DropdownMenuItem>
          {/* <DropdownMenuItem disabled>
             <Settings className="mr-2 h-4 w-4" />
             <span>Settings</span>
           </DropdownMenuItem> */}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogoutClick}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

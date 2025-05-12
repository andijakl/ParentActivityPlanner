"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger // You might need this if you want a trigger inside the sidebar itself
} from "@/components/ui/sidebar";
import { Button } from '@/components/ui/button';
import { Mountain, LayoutDashboard, User, CalendarPlus, Users, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { handleSignOut } from '@/lib/firebase/services';
import { useRouter } from 'next/navigation';


export function AppSidebar() {
    const pathname = usePathname();
    const { user } = useAuth();
    const router = useRouter();

    const isActive = (path: string) => pathname === path;

    const handleLogoutClick = async () => {
        try {
          await handleSignOut();
          router.push('/signin'); // Redirect to sign-in page after logout
        } catch (error) {
          console.error("Logout failed:", error);
        }
      };


    // Don't render sidebar if not logged in (handled by AuthProviderComponent redirect)
    // Or you could conditionally render based on `user` state if preferred
    // if (!user) return null;


    return (
       <Sidebar collapsible="icon" side="left" variant='sidebar'>
        <SidebarHeader>
            <Link
                href="/dashboard"
                className="flex items-center gap-2 font-semibold text-sidebar-foreground"
                >
                <Mountain className="h-6 w-6 text-primary" />
                {/* Label visible when expanded */}
                <span className="group-data-[collapsible=icon]:hidden">Parent Activity Hub</span>
             </Link>
            {/* Optional: Add a trigger inside the header if needed */}
            {/* <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:hidden" /> */}
        </SidebarHeader>
        <SidebarContent className="p-2">
            <SidebarMenu>
                <SidebarMenuItem>
                     <SidebarMenuButton
                        asChild
                        isActive={isActive('/dashboard')}
                        tooltip={{children: "Dashboard", side: "right", align: "center"}}
                    >
                        <Link href="/dashboard">
                            <LayoutDashboard />
                            <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <SidebarMenuButton
                        asChild
                        isActive={isActive('/activities/create')}
                        tooltip={{children: "New Activity", side: "right", align: "center"}}
                    >
                         <Link href="/activities/create">
                             <CalendarPlus />
                             <span className="group-data-[collapsible=icon]:hidden">New Activity</span>
                         </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                     <SidebarMenuButton
                        asChild
                        isActive={isActive('/friends')}
                        tooltip={{children: "Friends", side: "right", align: "center"}}
                    >
                        <Link href="/friends">
                            <Users />
                            <span className="group-data-[collapsible=icon]:hidden">Friends</span>
                        </Link>
                    </SidebarMenuButton>
                 </SidebarMenuItem>
                 <SidebarMenuItem>
                    <SidebarMenuButton
                        asChild
                        isActive={isActive('/profile')}
                        tooltip={{children: "Profile", side: "right", align: "center"}}
                     >
                        <Link href="/profile">
                             <User />
                             <span className="group-data-[collapsible=icon]:hidden">Profile</span>
                         </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                 {/* <SidebarMenuItem>
                    <SidebarMenuButton
                        disabled // Example: disable settings for now
                        tooltip={{children: "Settings", side: "right", align: "center"}}
                    >
                         <Settings />
                         <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                    </SidebarMenuButton>
                 </SidebarMenuItem> */}
            </SidebarMenu>
        </SidebarContent>
         <SidebarFooter>
            {/* Footer content if needed, e.g., logout */}
             <SidebarMenu>
                <SidebarMenuItem>
                     <SidebarMenuButton
                        onClick={handleLogoutClick}
                        tooltip={{children: "Log Out", side: "right", align: "center"}}
                    >
                         <LogOut />
                         <span className="group-data-[collapsible=icon]:hidden">Log Out</span>
                     </SidebarMenuButton>
                </SidebarMenuItem>
             </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
    );
}

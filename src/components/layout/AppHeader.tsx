"use client";

import React from 'react';
import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserNav } from '@/components/auth/UserNav';
import { Mountain } from 'lucide-react'; // Or your preferred logo icon

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
       {/* Mobile Sidebar Trigger */}
      <div className="md:hidden">
        <SidebarTrigger />
      </div>

       {/* Logo/Brand - Hidden on mobile inside sidebar, shown here on larger screens if sidebar is collapsed/not present */}
        {/* You might adjust visibility based on sidebar state if needed */}
      <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold text-foreground"
        >
          <Mountain className="h-6 w-6 text-primary" />
          <span className="">Parent Activity Hub</span>
      </Link>


      {/* Optional: Breadcrumbs or Search Bar can go here */}
      <div className="relative ml-auto flex-1 md:grow-0">
        {/* Search Bar Placeholder */}
        {/* <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input type="search" placeholder="Search..." className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]" /> */}
      </div>

      {/* User Navigation Dropdown */}
      <div className="ml-auto">
         <UserNav />
      </div>
    </header>
  );
}

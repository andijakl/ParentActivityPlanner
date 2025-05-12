// src/app/(app)/layout.tsx
import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import AuthProviderComponent from '@/components/auth/AuthProviderComponent'; // Import the client component

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
     <AuthProviderComponent> {/* Wrap layout with auth protection */}
        <SidebarProvider defaultOpen={true}>
            <AppSidebar />
            <SidebarInset className="flex flex-col">
                <AppHeader />
                <main className="flex-1 overflow-auto p-4 md:p-6">
                   {children}
                </main>
             </SidebarInset>
        </SidebarProvider>
     </AuthProviderComponent>
  );
}

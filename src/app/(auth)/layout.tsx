// src/app/(auth)/layout.tsx
import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary/50 dark:bg-secondary/20 p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

// src/app/(app)/error.tsx
'use client'; // Error components must be Client Components

import type { FC } from 'react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const AppError: FC<AppErrorProps> = ({ error, reset }) => {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("App-level error boundary caught an error:", error);
  }, [error]);

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-theme(spacing.16))] items-center justify-center py-10 px-4">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Oops! Something Went Wrong</CardTitle>
          <CardDescription>
            We encountered an unexpected issue. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive mb-2">
            <strong>Error:</strong> {error.message || 'An unknown error occurred.'}
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground mb-4">
              Error Digest: {error.digest}
            </p>
          )}
          <Button onClick={() => reset()} size="lg">
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default AppError;

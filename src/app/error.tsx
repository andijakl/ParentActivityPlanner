// src/app/error.tsx
'use client'; // Error components must be Client Components

import type { FC } from 'react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const GlobalError: FC<ErrorProps> = ({ error, reset }) => {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error boundary caught an error:", error, error.digest);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Something went wrong! (Global Error Boundary)</h2>
          <p style={{ color: 'red', marginBottom: '8px', maxWidth: '600px', wordBreak: 'break-word' }}>
            <strong>Error:</strong> {error.message || 'An unexpected error occurred.'}
          </p>
          {error.digest && (
            <p style={{ fontSize: '0.9em', color: '#555', marginBottom: '16px' }}>
              Digest: {error.digest}
            </p>
          )}
          <Button onClick={() => reset()} variant="outline" size="lg">
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}

export default GlobalError;

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
    console.error("Global error boundary caught an error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>Something went wrong!</h2>
          <p style={{ color: 'red' }}>{error.message || 'An unexpected error occurred.'}</p>
          <p style={{ fontSize: '0.9em', color: '#555' }}>Digest: {error.digest}</p>
          <Button onClick={() => reset()} variant="outline">
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}

export default GlobalError;

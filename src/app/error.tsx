// src/app/error.tsx
'use client'; // Error components must be Client Components

import type { FC } from 'react';
import { useEffect } from 'react';

// Basic button styling to avoid dependency on ui/button
const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  margin: '10px',
  cursor: 'pointer',
  border: '1px solid #ccc',
  borderRadius: '4px',
  backgroundColor: '#f0f0f0',
  color: '#333', // Added text color for visibility
};

const GlobalError: FC<ErrorProps> = ({ error, reset }) => {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error boundary caught an error (from src/app/error.tsx):", error, error.digest);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Application Error</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Minimal styles to ensure basic layout */}
        <style>{`
          body { margin: 0; padding: 0; font-family: sans-serif; background-color: #f8f9fa; color: #212529; }
          .error-container { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; box-sizing: border-box; }
          .error-title { font-size: 24px; margin-bottom: 16px; color: #dc3545; }
          .error-message { margin-bottom: 8px; max-width: 600px; word-break: break-word; }
          .error-details { color: #dc3545; margin-bottom: 8px; background: #f8d7da; padding: 10px; border-radius: 4px; text-align: left; max-width: 600px; word-break: break-word; font-size: 0.9em; }
          .error-digest { font-size: 0.8em; color: #6c757d; margin-bottom: 16px; }
        `}</style>
      </head>
      <body>
        <div className="error-container">
          <h2 className="error-title">Oops! Something Went Wrong.</h2>
          <p className="error-message">
            We encountered an unexpected issue. Please try again later.
          </p>
          {process.env.NODE_ENV === 'development' && error?.message && (
            <p className="error-details">
              <strong>Error details (Development Mode):</strong> {error.message}
            </p>
          )}
          {process.env.NODE_ENV === 'development' && error?.digest && (
            <p className="error-digest">
              Digest: {error.digest}
            </p>
          )}
          <button onClick={() => reset()} style={buttonStyle}>
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}

export default GlobalError;

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

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
    console.error("Global error boundary caught an error (from src/app/error.tsx):");
    console.error("Error Message:", error.message);
    if (error.digest) {
      console.error("Error Digest:", error.digest);
    }
    if (error.stack) {
      console.error("Error Stack:", error.stack);
    }
    // For more comprehensive logging, you might send `error` object itself if your logging service supports it.
    // console.error(error); 
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Application Error</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Minimal styles to ensure basic layout */}
        <style>{`
          body { margin: 0; padding: 0; font-family: sans-serif; background-color: #f8f9fa; color: #212529; }
          .error-container { padding: 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; box-sizing: border-box; }
          .error-title { font-size: 22px; font-weight: 600; margin-bottom: 16px; color: #dc3545; }
          .error-message-text { margin-bottom: 8px; max-width: 600px; word-break: break-word; font-size: 1rem; color: #212529; }
          .error-details-box { color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; margin-bottom: 16px; padding: 15px; border-radius: 4px; text-align: left; max-width: 90%; width:auto; min-width: 300px; max-width: 700px; word-break: break-word; font-size: 0.85em; }
          .error-details-box strong { display: block; margin-bottom: 5px; font-size: 0.9em;}
          .error-digest-text { font-size: 0.75em; color: #6c757d; margin-bottom: 16px; word-break: break-all; }
          pre { white-space: pre-wrap; word-wrap: break-word; text-align: left; font-size: 0.8em; max-height: 200px; overflow-y: auto; background-color: #f1f1f1; padding: 10px; border-radius: 4px; margin-top: 10px;}
        `}</style>
      </head>
      <body suppressHydrationWarning>
        <div className="error-container">
          <h2 className="error-title">Oops! Something Went Wrong.</h2>
          <p className="error-message-text">
            We encountered an unexpected issue. Please try again later.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="error-details-box">
              {error?.message && (
                <p>
                  <strong>Error Message:</strong> {error.message}
                </p>
              )}
              {error?.digest && (
                <p className="error-digest-text">
                  <strong>Digest:</strong> {error.digest}
                </p>
              )}
              {error?.stack && (
                <div>
                  <strong>Stack Trace:</strong>
                  <pre>{error.stack}</pre>
                </div>
              )}
            </div>
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


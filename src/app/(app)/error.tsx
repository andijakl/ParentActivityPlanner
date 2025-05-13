// src/app/(app)/error.tsx
'use client'; // Error components must be Client Components

import type { FC } from 'react';
import { useEffect } from 'react';

// Basic button styling
const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  margin: '10px auto', // Center button
  cursor: 'pointer',
  border: '1px solid #007bff', // Use a theme-like color
  borderRadius: '4px',
  backgroundColor: '#007bff',
  color: 'white',
  display: 'inline-block', // Ensure it behaves well
};

const cardStyle: React.CSSProperties = {
  border: '1px solid #dee2e6', // Lighter border
  borderRadius: '0.5rem', // Consistent with theme
  padding: '2rem', // More padding
  maxWidth: '500px',
  margin: 'auto', // Center card
  textAlign: 'center',
  boxShadow: '0 0.25rem 0.75rem rgba(0, 0, 0, 0.05)', // Subtle shadow
  backgroundColor: '#ffffff', // White background
};

const cardHeaderStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const cardTitleStyle: React.CSSProperties = { fontSize: '1.75rem', fontWeight: '600', marginBottom: '0.5rem', color: '#343a40' };
const cardDescriptionStyle: React.CSSProperties = { fontSize: '1rem', color: '#6c757d', marginBottom: '1.5rem' };
const cardContentStyle: React.CSSProperties = {};

const iconContainerStyle: React.CSSProperties = {
    margin: '0 auto 1rem auto',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'rgba(220, 53, 69, 0.1)', // Softer destructive accent
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const iconStyle: React.CSSProperties = {
    fontSize: '1.5rem', // Larger icon
    color: '#dc3545', // Destructive color
    fontWeight: 'bold',
};

const errorDetailsStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: '#dc3545',
    marginBottom: '1rem',
    background: '#f8d7da',
    padding: '0.75rem',
    borderRadius: '0.25rem',
    textAlign: 'left',
    wordBreak: 'break-word',
};

const errorDigestStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: '#6c757d',
    marginBottom: '1.5rem',
    wordBreak: 'break-all',
};


const AppError: FC<AppErrorProps> = ({ error, reset }) => {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("App-level error boundary caught an error (from src/app/(app)/error.tsx):", error);
  }, [error]);

  return (
    <div style={{ padding: '20px', minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f7f9' }}>
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <div style={iconContainerStyle}>
            <span style={iconStyle}>!</span> {/* Simple exclamation mark */}
          </div>
          <div style={cardTitleStyle}>Oops! Something Went Wrong</div>
          <div style={cardDescriptionStyle}>
            We encountered an unexpected issue in this part of the application.
          </div>
        </div>
        <div style={cardContentStyle}>
          {process.env.NODE_ENV === 'development' && error?.message && (
            <p style={errorDetailsStyle}>
              <strong>Error:</strong> {error.message}
            </p>
          )}
          {process.env.NODE_ENV === 'development' && error?.digest && (
            <p style={errorDigestStyle}>
              Error Digest: {error.digest}
            </p>
          )}
          <button onClick={() => reset()} style={buttonStyle}>
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

export default AppError;

interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// src/context/AuthContext.tsx
"use client";

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from "firebase/firestore";
// Import config elements individually, including error state and config check
import { auth, db, firebaseInitializationError, isFirebaseConfigured } from '@/lib/firebase/config';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: Error | null; // Can now include initialization error
  isFirebaseInitialized: boolean; // Reflects actual initialization status
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Initialize error state with potential initialization error from config.ts
  const [error, setError] = useState<Error | null>(firebaseInitializationError);
  // Determine initialization status based on config check and error state
  const isFirebaseInitialized = isFirebaseConfigured() && !firebaseInitializationError;

  useEffect(() => {
    // If there was an initialization error or auth is null, don't attempt to use Firebase Auth
    if (!isFirebaseInitialized || !auth) {
        console.warn("Firebase is not initialized or auth instance is null. Skipping auth state listener.");
        // Error state is already set from initialization check in config.ts
        setLoading(false); // Stop loading as we can't proceed
        return;
    }

    setLoading(true); // Set loading before starting listener setup

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // Ensure loading is true while processing auth change
      setUser(firebaseUser);
      setUserProfile(null); // Reset profile on auth change

      if (firebaseUser && db) { // Check db again just in case
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data() as UserProfile);
            // Clear previous fetch error if successful, but preserve initialization error if it exists
            if (!firebaseInitializationError) setError(null);
          } else {
            console.log("User profile document not found for UID:", firebaseUser.uid);
            setUserProfile(null);
             // Clear fetch error if profile just not found yet, preserve init error
            if (!firebaseInitializationError) setError(null);
          }
        } catch (fetchError) {
          console.error("Error fetching user profile:", fetchError);
          // Set fetch error, but prioritize showing initialization error if it exists
          setError(firebaseInitializationError || (fetchError instanceof Error ? fetchError : new Error("Failed to fetch profile")));
          setUserProfile(null);
        }
      } else {
        // User is signed out or db is not available
        setUserProfile(null);
         // Clear auth-related error on sign out, preserve init error
        if (!firebaseUser && !firebaseInitializationError) setError(null);
      }
      setLoading(false); // Finished processing auth change
    }, (authError) => {
       console.error("Auth state change error:", authError);
       // Set auth error, prioritize init error
       setError(firebaseInitializationError || authError);
       setUser(null);
       setUserProfile(null);
       setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  // Dependency array includes isFirebaseInitialized and auth instance check
  }, [isFirebaseInitialized, auth]); // Rerun if initialization status changes

  // --- Render Logic ---

  // Display specific message if Firebase isn't configured/initialized (takes precedence)
  if (!isFirebaseInitialized) {
       // Error state should hold the initialization error message
       return (
           <div className="flex items-center justify-center min-h-screen text-center text-destructive p-4">
               <p>{error?.message || "Application configuration error. Please check setup or contact support."}</p>
               {/* More user-friendly message */}
               {/* <p>Oops! Something went wrong with the setup. Please contact support.</p> */}
           </div>
       );
  }

  // Display loading state while checking auth state (only if Firebase initialized correctly)
  if (loading) {
     return (
       <div className="flex items-center justify-center min-h-screen">
         <Skeleton className="h-12 w-12 rounded-full" />
         <Skeleton className="h-4 w-[250px] ml-4" />
       </div>
     );
   }

  // Render children if initialized and not loading
  // Pass the potentially existing initialization error down via context
  return (
    <AuthContext.Provider value={{ user, userProfile, loading, error, isFirebaseInitialized }}>
      {children}
    </AuthContext.Provider>
  );
};

// useAuth hook remains the same
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

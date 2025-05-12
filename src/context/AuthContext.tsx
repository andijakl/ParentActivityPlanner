// src/context/AuthContext.tsx
"use client";

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from '@/lib/firebase/config'; // auth and db can be null
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  isFirebaseInitialized: boolean; // Add a flag
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isFirebaseInitialized = !!auth && !!db; // Check if Firebase was initialized

  useEffect(() => {
    // Only subscribe if Firebase is initialized
    if (!isFirebaseInitialized) {
        console.warn("Firebase is not initialized. Skipping auth state listener.");
        setError(new Error("Firebase configuration error. Please check environment variables."));
        setLoading(false);
        return;
    }

    // Ensure auth is not null before subscribing
    if (!auth) {
        console.error("Firebase Auth instance is null. Cannot subscribe to auth state changes.");
        setError(new Error("Firebase Auth initialization failed."));
        setLoading(false);
        return;
    }


    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // Set loading true at the start of processing the change
      // Keep previous error unless overwritten
      // setError(null);
      setUser(firebaseUser);
      setUserProfile(null); // Reset profile on auth change

      if (firebaseUser && db) { // Check db again just in case
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data() as UserProfile);
             setError(null); // Clear previous fetch error if successful
          } else {
            console.log("User profile document not found for UID:", firebaseUser.uid);
            setUserProfile(null);
             // Don't set error here, profile might be created later
          }
        } catch (fetchError) {
          console.error("Error fetching user profile:", fetchError);
          setError(fetchError instanceof Error ? fetchError : new Error("Failed to fetch profile"));
          setUserProfile(null);
        }
      } else {
        // User is signed out or db is not available
        setUserProfile(null);
        if (!firebaseUser) setError(null); // Clear error on sign out
      }
      setLoading(false);
    }, (authError) => {
       console.error("Auth state change error:", authError);
       setError(authError);
       setUser(null);
       setUserProfile(null);
       setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [isFirebaseInitialized]); // Re-run effect if initialization status changes (though it shouldn't)

  // Display loading state first
  if (loading && typeof window !== 'undefined') {
     return (
       <div className="flex items-center justify-center min-h-screen">
         <Skeleton className="h-12 w-12 rounded-full" />
         <Skeleton className="h-4 w-[250px] ml-4" />
       </div>
     );
   }

   // Then, display specific message if Firebase isn't initialized (after loading check)
   if (!isFirebaseInitialized && !loading) {
        return (
            <div className="flex items-center justify-center min-h-screen text-center text-destructive p-4">
                <p>Application configuration error. Please check environment variables or contact support.</p>
                {/* You might want a less technical message for end-users */}
            </div>
        );
   }


  return (
    <AuthContext.Provider value={{ user, userProfile, loading, error, isFirebaseInitialized }}>
      {children}
    </AuthContext.Provider>
  );
};

// Update useAuth hook if necessary (no changes needed here based on the context value structure)
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// src/context/AuthContext.tsx
"use client";

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
// Import explicitly named exports, including the check function and error state
import { auth, db, firebaseInitializationError, isFirebaseConfigured } from '@/lib/firebase/config';
import type { UserProfile } from '@/lib/types';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  isFirebaseInitialized: boolean; // Keep this to signal overall status
}

// Determine initial state based on config module's status
const initialIsFirebaseInitialized = isFirebaseConfigured() && !firebaseInitializationError;
const initialLoadingState = initialIsFirebaseInitialized; // Only loading if Firebase might be usable

const defaultAuthContextValue: AuthContextType = {
    user: null,
    userProfile: null,
    loading: initialLoadingState,
    error: firebaseInitializationError, // Start with potential init error from config
    isFirebaseInitialized: initialIsFirebaseInitialized,
};


const AuthContext = createContext<AuthContextType>(defaultAuthContextValue);


interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // Use initial states derived from config module status
  const [loading, setLoading] = useState(defaultAuthContextValue.loading);
  const [error, setError] = useState<Error | null>(defaultAuthContextValue.error);
  const isFirebaseInitialized = defaultAuthContextValue.isFirebaseInitialized; // Status is now determined on import

  useEffect(() => {
    // Only proceed if Firebase was initialized successfully AND auth instance exists
    if (!isFirebaseInitialized || !auth) {
        console.warn("Auth Provider: Firebase not initialized or auth instance is null. Skipping auth state listener.");
        // If not initialized, ensure loading is false and error reflects the init error
        if (!isFirebaseInitialized) {
            setLoading(false);
            setError(firebaseInitializationError);
        }
        // If auth is null but init was attempted, might be a different issue, but likely covered by firebaseInitializationError
        return;
    }

    // If we reach here, Firebase seems okay, start the listener
    setLoading(true);
    console.log("Auth Provider: Setting up Firebase Auth listener.");

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // Start loading for auth change processing
      setUser(firebaseUser);
      setUserProfile(null); // Reset profile on auth change

      if (firebaseUser && db) { // Check db is available too
        console.log("Auth Provider: User detected, fetching profile:", firebaseUser.uid);
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          let userDocSnap = await getDoc(userDocRef);

           if (!userDocSnap.exists()) {
                console.log("User profile not found, creating one for:", firebaseUser.uid);
                const newUserProfile: UserProfile = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    createdAt: serverTimestamp(),
                    childNickname: '',
                 };
                 try {
                    await setDoc(userDocRef, newUserProfile);
                    userDocSnap = await getDoc(userDocRef); // Re-fetch after creation
                    if (userDocSnap.exists()) {
                         setUserProfile(userDocSnap.data() as UserProfile);
                         console.log("Successfully created and fetched profile for:", firebaseUser.uid);
                         setError(null); // Clear previous fetch error on success
                    } else {
                         console.error("Failed to fetch profile immediately after creation for:", firebaseUser.uid);
                         setUserProfile(null);
                         setError(new Error("Failed to load profile after creation."));
                    }
                 } catch (createError) {
                     console.error("Error creating user profile:", createError);
                     setError(createError instanceof Error ? createError : new Error("Failed to create profile"));
                     setUserProfile(null);
                 }
           } else {
                console.log("User profile found for:", firebaseUser.uid);
                setUserProfile(userDocSnap.data() as UserProfile);
                setError(null); // Clear previous fetch error on success
           }
        } catch (fetchError) {
          console.error("Error fetching user profile:", fetchError);
          setError(fetchError instanceof Error ? fetchError : new Error("Failed to fetch profile"));
          setUserProfile(null);
        }
      } else {
        // User signed out or db not available
        console.log("Auth Provider: No user detected or DB unavailable.");
        setUserProfile(null);
        if (!firebaseUser) setError(null); // Clear auth-related error on sign out
      }
      setLoading(false); // Finished processing auth change
    }, (authError) => {
       console.error("Auth Provider: Auth state change error:", authError);
       setError(authError);
       setUser(null);
       setUserProfile(null);
       setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
        console.log("Auth Provider: Cleaning up auth listener.");
        unsubscribe();
    }
  // Rerun effect if the initialized status changes (though unlikely after initial load)
  }, [isFirebaseInitialized]);


  // Memoize context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
      user,
      userProfile,
      loading,
      error,
      isFirebaseInitialized // Provide the status determined at module load
  }), [user, userProfile, loading, error, isFirebaseInitialized]);


  return (
    <AuthContext.Provider value={contextValue}>
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

// src/context/AuthContext.tsx
"use client";

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, firebaseInitializationError, isFirebaseConfigured } from '@/lib/firebase/config';
import type { UserProfile } from '@/lib/types';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  isFirebaseInitialized: boolean;
}

// Provide a default context value matching the type, used when context is undefined initially.
const defaultAuthContextValue: AuthContextType = {
    user: null,
    userProfile: null,
    loading: true, // Assume loading initially
    error: firebaseInitializationError, // Start with potential init error
    isFirebaseInitialized: isFirebaseConfigured() && !firebaseInitializationError,
};


const AuthContext = createContext<AuthContextType>(defaultAuthContextValue);


interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(firebaseInitializationError);
  const isFirebaseInitialized = isFirebaseConfigured() && !firebaseInitializationError;

  useEffect(() => {
    // If there was an initialization error or auth is null, don't attempt to use Firebase Auth
    if (!isFirebaseInitialized || !auth) {
        console.warn("Firebase is not initialized or auth instance is null. Skipping auth state listener.");
        // Error state is already set from initialization check in config.ts
        setLoading(false); // Stop loading as we can't proceed
        // Update context values for consumers
        setUser(null);
        setUserProfile(null);
        setError(firebaseInitializationError); // Ensure error is set
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
          let userDocSnap = await getDoc(userDocRef);

           // If profile doesn't exist, create a basic one (e.g., after Google sign-in first time)
           if (!userDocSnap.exists()) {
                console.log("User profile not found, creating one for:", firebaseUser.uid);
                const newUserProfile: UserProfile = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    createdAt: serverTimestamp(),
                    childNickname: '', // Initialize optional fields
                 };
                 try {
                    await setDoc(userDocRef, newUserProfile);
                    // Re-fetch the snapshot after creation to get the server timestamp resolved
                    userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                         setUserProfile(userDocSnap.data() as UserProfile);
                         console.log("Successfully created and fetched profile for:", firebaseUser.uid);
                    } else {
                         // This case should be rare after successful setDoc
                         console.error("Failed to fetch profile immediately after creation for:", firebaseUser.uid);
                         setUserProfile(null); // Fallback
                    }
                 } catch (createError) {
                     console.error("Error creating user profile:", createError);
                     setError(firebaseInitializationError || (createError instanceof Error ? createError : new Error("Failed to create profile")));
                     setUserProfile(null);
                 }
           } else {
                setUserProfile(userDocSnap.data() as UserProfile);
           }

          // Clear previous fetch error if successful, but preserve initialization error if it exists
          if (!firebaseInitializationError) setError(null);

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
  }, [isFirebaseInitialized]); // Rerun if initialization status changes


  // --- Render Logic ---
  // AuthProvider *only* provides the context value.
  // It does NOT render loading states or error messages directly.
  // Consumers (like AuthProviderComponent) will use the context values
  // (loading, error, isFirebaseInitialized) to decide what to render.

  // Important: The value passed to the provider must be memoized or stable
  // to prevent unnecessary re-renders of consumers.
  const contextValue = React.useMemo(() => ({
      user,
      userProfile,
      loading,
      error,
      isFirebaseInitialized
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
  // No need to check for undefined if we provide a default value to createContext,
  // but it's safer to keep the check in case the default value setup changes.
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
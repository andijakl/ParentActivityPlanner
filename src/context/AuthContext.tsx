// src/context/AuthContext.tsx
"use client";

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from "firebase/firestore"; // Only Timestamp for type checking if needed
import { auth, db, firebaseInitializationError, isFirebaseConfigured } from '@/lib/firebase/config';
import type { UserProfile, UserProfileClient } from '@/lib/types';
import { fetchUserProfileForClient, createUserProfile } from '@/lib/firebase/services';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfileClient | null;
  loading: boolean;
  error: Error | null;
  isFirebaseInitialized: boolean;
}

// Determine initial state based on Firebase config outcome
const initialConfigured = isFirebaseConfigured();
const initialError = firebaseInitializationError;
const initialIsFirebaseInitialized = initialConfigured && !initialError;

// If Firebase is not configured or an init error occurred, we are not "loading" auth state.
// Loading is true only if Firebase is initialized and we are waiting for onAuthStateChanged.
const initialLoadingState = initialIsFirebaseInitialized;


const defaultAuthContextValue: AuthContextType = {
    user: null,
    userProfile: null,
    loading: initialLoadingState,
    error: initialError,
    isFirebaseInitialized: initialIsFirebaseInitialized,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContextValue);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(defaultAuthContextValue.user);
  const [userProfile, setUserProfile] = useState<UserProfileClient | null>(defaultAuthContextValue.userProfile);
  const [currentError, setCurrentError] = useState<Error | null>(defaultAuthContextValue.error);
  const [isLoading, setIsLoading] = useState(defaultAuthContextValue.loading);

  // isFirebaseInitialized reflects the status from config.ts and doesn't change post-mount.
  const isFirebaseInitialized = defaultAuthContextValue.isFirebaseInitialized;

  useEffect(() => {
    // If Firebase isn't properly initialized (either not configured or init error),
    // or if the auth service itself is null (shouldn't happen if isFirebaseInitialized is true),
    // then we can't set up the auth listener.
    if (!isFirebaseInitialized || !auth) {
      setIsLoading(false); // Not loading auth state if Firebase isn't ready
      // Ensure an error is set if not already from initial values
      if (!currentError) {
          setCurrentError(firebaseInitializationError || new Error("Firebase is not available."));
      }
      return;
    }

    // At this point, Firebase should be initialized and `auth` service available.
    // Start loading for onAuthStateChanged.
    setIsLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setUserProfile(null); // Reset profile on auth change

      if (firebaseUser && db) {
        try {
          let clientProfile = await fetchUserProfileForClient(firebaseUser.uid);
          if (!clientProfile) {
            console.log("User profile not found, creating one for:", firebaseUser.uid);
            const newUserProfileData: Omit<UserProfile, 'createdAt'> = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                childNickname: '',
            };
            await createUserProfile(newUserProfileData);
            clientProfile = await fetchUserProfileForClient(firebaseUser.uid);
            if (clientProfile) {
                setUserProfile(clientProfile);
                setCurrentError(null);
            } else {
                setUserProfile(null);
                setCurrentError(new Error("Failed to load profile after creation."));
            }
          } else {
            setUserProfile(clientProfile);
            setCurrentError(null);
          }
        } catch (fetchError) {
          console.error("Error fetching/creating user profile:", fetchError);
          setCurrentError(fetchError instanceof Error ? fetchError : new Error("Failed to process profile"));
          setUserProfile(null);
        }
      } else {
        // No Firebase user or DB not available
        if (!firebaseUser) setCurrentError(null); // Clear error if user simply logged out
      }
      setIsLoading(false); // Finished processing auth state
    }, (authHookError) => {
       console.error("Auth Provider: Auth state change hook error:", authHookError);
       setCurrentError(authHookError);
       setUser(null);
       setUserProfile(null);
       setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isFirebaseInitialized, currentError]); // Re-run if isFirebaseInitialized changes (it won't after mount) or if currentError is set/cleared

  const contextValue = React.useMemo(() => ({
      user,
      userProfile,
      loading: isLoading,
      error: currentError,
      isFirebaseInitialized // This value is stable from defaultAuthContextValue
  }), [user, userProfile, isLoading, currentError, isFirebaseInitialized]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

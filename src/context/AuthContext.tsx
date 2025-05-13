
"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
// Import auth, and also the error status from config
import { auth, firebaseInitializationError as configInitializationError, isFirebaseConfigured } from '@/lib/firebase/config';
import { fetchUserProfileForClient } from '@/lib/firebase/services';
import type { UserProfileClient } from '@/lib/types';

export interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfileClient | null;
  loading: boolean; // True while checking auth state or fetching profile
  isFirebaseSetupAttempted: boolean; // True once the initial Firebase setup logic in this context has run
  firebaseConfigError: Error | null; // Error from initial Firebase app configuration
  firebaseAuthError: Error | null;   // Error from onAuthStateChanged or profile fetching
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileClient | null>(null);
  const [loading, setLoading] = useState(true); // Start true until first auth check completes
  const [isFirebaseSetupAttempted, setIsFirebaseSetupAttempted] = useState(false);
  const [firebaseAuthError, setFirebaseAuthError] = useState<Error | null>(null);
  // configInitializationError is imported and directly used

  useEffect(() => {
    setIsFirebaseSetupAttempted(true); // Mark that setup has been attempted

    // If Firebase itself had a configuration error, or is not configured, or auth service is unavailable,
    // do not proceed with onAuthStateChanged.
    if (configInitializationError || !isFirebaseConfigured() || !auth) {
      setUser(null);
      setUserProfile(null);
      setLoading(false);
      // firebaseConfigError is already set from the import, so AuthProviderComponent can display it.
      return; // Exit early
    }

    // If Firebase is configured and auth object exists, proceed with auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true); // Set loading true at the start of auth state change processing
      setFirebaseAuthError(null); // Reset auth error
      if (currentUser) {
        setUser(currentUser);
        try {
          const profile = await fetchUserProfileForClient(currentUser.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error("AuthContext: Error fetching user profile:", error);
          const fetchError = error instanceof Error ? error : new Error("Failed to fetch user profile");
          setFirebaseAuthError(fetchError);
          setUserProfile(null); // Clear profile on error
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false); // Set loading false after processing auth state and profile
    }, (error) => {
        console.error("AuthContext: Firebase onAuthStateChanged error:", error);
        setFirebaseAuthError(error);
        setUser(null);
        setUserProfile(null);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []); // Empty dependency array: runs once on mount. configInitializationError is stable.

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      isFirebaseSetupAttempted,
      firebaseConfigError: configInitializationError, // Use the error from firebase/config
      firebaseAuthError
    }}>
      {children}
    </AuthContext.Provider>
  );
};


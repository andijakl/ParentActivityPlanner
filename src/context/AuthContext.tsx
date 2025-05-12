// src/context/AuthContext.tsx
"use client";

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { auth, db, firebaseInitializationError, isFirebaseConfigured } from '@/lib/firebase/config';
import type { UserProfile, UserProfileClient } from '@/lib/types'; // Import both
import { fetchUserProfileForClient, createUserProfile } from '@/lib/firebase/services'; // Use specific fetch for client

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfileClient | null; // Store UserProfileClient
  loading: boolean;
  error: Error | null;
  isFirebaseInitialized: boolean;
}

const initialIsFirebaseInitialized = isFirebaseConfigured() && !firebaseInitializationError;
const initialLoadingState = initialIsFirebaseInitialized;

const defaultAuthContextValue: AuthContextType = {
    user: null,
    userProfile: null,
    loading: initialLoadingState,
    error: firebaseInitializationError,
    isFirebaseInitialized: initialIsFirebaseInitialized,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContextValue);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileClient | null>(null); // Store UserProfileClient
  const [loading, setLoading] = useState(defaultAuthContextValue.loading);
  const [error, setError] = useState<Error | null>(defaultAuthContextValue.error);
  const isFirebaseInitialized = defaultAuthContextValue.isFirebaseInitialized;

  useEffect(() => {
    if (!isFirebaseInitialized || !auth) {
        if (!isFirebaseInitialized) {
            setLoading(false);
            setError(firebaseInitializationError);
        }
        return;
    }

    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);
      setUserProfile(null);

      if (firebaseUser && db) {
        try {
          let clientProfile = await fetchUserProfileForClient(firebaseUser.uid);

           if (!clientProfile) {
                console.log("User profile not found, creating one for:", firebaseUser.uid);
                const newUserProfileData: Omit<UserProfile, 'createdAt'> = { // Data for createUserProfile
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    childNickname: '',
                 };
                 try {
                    await createUserProfile(newUserProfileData); // Creates profile with serverTimestamp
                    clientProfile = await fetchUserProfileForClient(firebaseUser.uid); // Re-fetch for client version

                    if (clientProfile) {
                         setUserProfile(clientProfile);
                         console.log("Successfully created and fetched client profile for:", firebaseUser.uid);
                         setError(null);
                    } else {
                         console.error("Failed to fetch client profile immediately after creation for:", firebaseUser.uid);
                         setUserProfile(null);
                         setError(new Error("Failed to load profile after creation."));
                    }
                 } catch (createError) {
                     console.error("Error creating user profile:", createError);
                     setError(createError instanceof Error ? createError : new Error("Failed to create profile"));
                     setUserProfile(null);
                 }
           } else {
                console.log("User client profile found for:", firebaseUser.uid);
                setUserProfile(clientProfile);
                setError(null);
           }
        } catch (fetchError) {
          console.error("Error fetching user profile:", fetchError);
          setError(fetchError instanceof Error ? fetchError : new Error("Failed to fetch profile"));
          setUserProfile(null);
        }
      } else {
        console.log("Auth Provider: No user detected or DB unavailable.");
        setUserProfile(null);
        if (!firebaseUser) setError(null);
      }
      setLoading(false);
    }, (authError) => {
       console.error("Auth Provider: Auth state change error:", authError);
       setError(authError);
       setUser(null);
       setUserProfile(null);
       setLoading(false);
    });

    return () => {
        console.log("Auth Provider: Cleaning up auth listener.");
        unsubscribe();
    }
  }, [isFirebaseInitialized]);

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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

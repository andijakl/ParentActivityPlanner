// src/context/AuthContext.tsx
"use client";

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from '@/lib/firebase/config';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: Error | null;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setError(null);
      setUser(firebaseUser);
      setUserProfile(null); // Reset profile on auth change

      if (firebaseUser) {
        try {
          // Fetch user profile from Firestore
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data() as UserProfile);
          } else {
            // Handle case where user is authenticated but profile doesn't exist yet
            // This might happen during sign-up before profile is created
            console.log("User profile document not found for UID:", firebaseUser.uid);
             // Optionally create a basic profile here if needed, or wait for profile creation step
             // For now, just set profile to null
             setUserProfile(null);
          }
        } catch (fetchError) {
          console.error("Error fetching user profile:", fetchError);
          setError(fetchError instanceof Error ? fetchError : new Error("Failed to fetch profile"));
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
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
  }, []);

  // Display a loading screen while authentication state is being determined
  if (loading && typeof window !== 'undefined') {
     return (
       <div className="flex items-center justify-center min-h-screen">
         <Skeleton className="h-12 w-12 rounded-full" />
         <Skeleton className="h-4 w-[250px] ml-4" />
       </div>
     );
   }


  return (
    <AuthContext.Provider value={{ user, userProfile, loading, error }}>
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

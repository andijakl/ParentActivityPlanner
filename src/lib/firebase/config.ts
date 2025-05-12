// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Load config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let firebaseInitializationError: Error | null = null; // Added to store initialization error

// Function to check if Firebase essential config is provided
export const isFirebaseConfigured = (): boolean => !!firebaseConfig.apiKey && !!firebaseConfig.authDomain && !!firebaseConfig.projectId;

// Initialize Firebase
if (!isFirebaseConfigured()) {
  const errorMessage = "Firebase configuration is missing essential values (apiKey, authDomain, projectId). Please check your .env.local file and ensure NEXT_PUBLIC_FIREBASE_* variables are set correctly. Firebase services will not be initialized.";
  console.error(errorMessage);
  firebaseInitializationError = new Error(errorMessage);
} else {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      console.log("Firebase initialized successfully.");
    } else {
      app = getApp();
      console.log("Firebase app already initialized.");
    }

    if (app) {
      authInstance = getAuth(app);
      dbInstance = getFirestore(app);
    } else {
      const errorMessage = "Firebase app instance is null after attempting initialization.";
      console.error(errorMessage);
       firebaseInitializationError = new Error(errorMessage);
    }
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    firebaseInitializationError = error instanceof Error ? error : new Error(String(error));
    app = null;
    authInstance = null;
    dbInstance = null;
  }
}

const auth = authInstance;
const db = dbInstance;

// Export potentially null values and the error state.
// Components using these need to handle the null case.
export { app, auth, db, firebaseInitializationError };

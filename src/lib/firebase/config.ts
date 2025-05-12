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
let authInstance: Auth | null = null; // Renamed internal variable
let dbInstance: Firestore | null = null; // Renamed internal variable
let firebaseInitializationError: Error | null = null;

// Function to check if Firebase essential config is provided
export const isFirebaseConfigured = (): boolean => !!firebaseConfig.apiKey && !!firebaseConfig.authDomain && !!firebaseConfig.projectId;

// Centralized initialization function
function initializeFirebase() {
  // Avoid re-initializing if already successfully initialized
  if (app) return;

  // Clear previous errors before attempting initialization
  firebaseInitializationError = null;

  if (!isFirebaseConfigured()) {
    const errorMessage = "Firebase configuration is missing essential values (apiKey, authDomain, projectId). Please check your .env.local file and ensure NEXT_PUBLIC_FIREBASE_* variables are set correctly. Firebase services will not be initialized.";
    console.error(errorMessage);
    firebaseInitializationError = new Error(errorMessage);
    // Ensure instances remain null
    app = null;
    authInstance = null;
    dbInstance = null;
    return; // Exit early
  }

  try {
    // Ensure no race conditions with multiple initializations (relevant for HMR)
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      console.log("Firebase initialized successfully.");
    } else {
      app = getApp();
      console.log("Firebase app already initialized.");
    }

    if (app) {
      // Only assign to internal variables if successful
      authInstance = getAuth(app);
      dbInstance = getFirestore(app);
      console.log("Firebase Auth and Firestore services obtained.");
    } else {
      // This case should technically not happen if getApp() or initializeApp() succeeded,
      // but added for robustness.
      throw new Error("Firebase app instance is unexpectedly null after initialization attempt.");
    }
  } catch (error) {
    console.error("Error initializing Firebase services:", error);
    firebaseInitializationError = error instanceof Error ? error : new Error(String(error));
    // Ensure instances are null on failure
    app = null;
    authInstance = null;
    dbInstance = null;
  }
}

// Call initialization logic immediately when the module loads.
// This ensures it runs once per environment (server/client) upon first import.
initializeFirebase();

// Export the potentially null instances and the error state.
// Consumers MUST check for null before using auth or db.
const auth = authInstance;
const db = dbInstance;

export { app, auth, db, firebaseInitializationError };

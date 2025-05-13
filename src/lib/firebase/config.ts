// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

let app: FirebaseApp | null = null; // Initialize as null
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseInitializationError: Error | null = null;

function isFirebaseConfiguredCorrectly(): boolean {
  const essentialKeys: (keyof typeof firebaseConfig)[] = ['apiKey', 'authDomain', 'projectId'];
  for (const key of essentialKeys) {
    if (!firebaseConfig[key]) {
      return false;
    }
  }
  return true;
}

if (!getApps().length) {
  if (isFirebaseConfiguredCorrectly()) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Firebase: initializeApp() failed:", errorMessage, error);
      firebaseInitializationError = new Error(`Firebase Core App Initialization Failed: ${errorMessage}`);
      // app, auth, db remain null
    }

    if (app && !firebaseInitializationError) { // Proceed only if app initialized successfully
      try {
        auth = getAuth(app);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Firebase: getAuth() failed:", errorMessage, error);
        firebaseInitializationError = new Error(`Firebase Auth Initialization Failed: ${errorMessage}`);
        auth = null; // Ensure auth is null on error
      }

      try {
        db = getFirestore(app);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Firebase: getFirestore() failed:", errorMessage, error);
        firebaseInitializationError = new Error(`Firebase Firestore Initialization Failed: ${errorMessage}`);
        db = null; // Ensure db is null on error
      }
    }
  } else {
    const errorMessage =
      "Firebase configuration is missing essential values (apiKey, authDomain, projectId). " +
      "Please check your .env.local file and ensure NEXT_PUBLIC_FIREBASE_* variables are set correctly. " +
      "Firebase services will not be initialized.";
    // console.error is fine for developer info, especially for config issues.
    console.error(errorMessage);
    firebaseInitializationError = new Error(errorMessage);
    // app, auth, db remain null
  }
} else {
  // An app already exists, likely due to HMR or multiple initializations.
  app = getApp(); // Get the existing app
  // Try to get services, assuming the existing app might be correctly configured.
  // This path is less common for the initial load error scenario.
  if (isFirebaseConfiguredCorrectly()) {
     if (app && !auth) { // Check if auth is not already initialized
        try {
            auth = getAuth(app);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn("Firebase: getAuth() on existing app failed:", errorMessage, error);
            // Potentially set firebaseInitializationError or handle differently if this is a critical path
            // For now, primarily focusing on initial load errors.
             if (!firebaseInitializationError) firebaseInitializationError = new Error(`Firebase Auth Get on Existing App Failed: ${errorMessage}`);
            auth = null;
        }
     }
     if (app && !db) { // Check if db is not already initialized
        try {
            db = getFirestore(app);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn("Firebase: getFirestore() on existing app failed:", errorMessage, error);
             if (!firebaseInitializationError) firebaseInitializationError = new Error(`Firebase Firestore Get on Existing App Failed: ${errorMessage}`);
            db = null;
        }
     }
  } else if (!firebaseInitializationError) {
    // Existing app, but current config is bad, and no prior error was set
    const errorMessage =
      "Firebase app exists, but current configuration is invalid. Services may not work as expected.";
    console.warn(errorMessage);
    firebaseInitializationError = new Error(errorMessage);
    auth = null; // Ensure services are nulled out if config is bad now
    db = null;
  }
}

export { app, auth, db, firebaseInitializationError, isFirebaseConfiguredCorrectly as isFirebaseConfigured };

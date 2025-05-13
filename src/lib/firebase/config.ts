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

let app: FirebaseApp;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseInitializationError: Error | null = null;

function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
  );
}

if (!getApps().length) {
  if (isFirebaseConfigured()) {
    try {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      firebaseInitializationError = error instanceof Error ? error : new Error(String(error));
      // Ensure auth and db are null if initialization fails
      auth = null;
      db = null;
    }
  } else {
    const errorMessage =
      "Firebase configuration is missing essential values (apiKey, authDomain, projectId). " +
      "Please check your .env.local file and ensure NEXT_PUBLIC_FIREBASE_* variables are set correctly. " +
      "Firebase services will not be initialized.";
    console.error(errorMessage);
    firebaseInitializationError = new Error(errorMessage);
    // app will be undefined here. To avoid errors with getAuth(app) or getFirestore(app) if app is undefined,
    // we ensure auth and db are explicitly null.
    auth = null;
    db = null;
  }
} else {
  app = getApp(); // If already initialized, get the app
  // And then try to get auth and db, respecting that config might still be bad
  // This path is less likely if !getApps().length is the primary guard for init
  if (isFirebaseConfigured()) {
     try {
        auth = getAuth(app);
        db = getFirestore(app);
     } catch (error) {
        console.error("Firebase getAuth/getFirestore failed on existing app:", error);
        firebaseInitializationError = error instanceof Error ? error : new Error(String(error));
        auth = null;
        db = null;
     }
  } else {
    // This case implies apps were initialized elsewhere, but current config is bad.
    // It's an unusual state.
    const errorMessage =
      "Firebase app exists, but current configuration is invalid. Services may not work as expected.";
    console.warn(errorMessage); // Warn because app exists but config is bad.
    firebaseInitializationError = new Error(errorMessage);
    auth = null;
    db = null;
  }
}

export { app, auth, db, firebaseInitializationError, isFirebaseConfigured };

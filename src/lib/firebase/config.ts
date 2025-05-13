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
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Log the original error for debugging but store a standard Error object.
      console.error("Firebase initialization failed during initializeApp/getAuth/getFirestore:", errorMessage, error);
      firebaseInitializationError = new Error(`Firebase Init Failed: ${errorMessage}`);
      auth = null;
      db = null;
    }
  } else {
    const errorMessage =
      "Firebase configuration is missing essential values (apiKey, authDomain, projectId). " +
      "Please check your .env.local file and ensure NEXT_PUBLIC_FIREBASE_* variables are set correctly. " +
      "Firebase services will not be initialized.";
    console.error(errorMessage); // This console.error is fine, it's for developer info.
    firebaseInitializationError = new Error(errorMessage);
    auth = null;
    db = null;
  }
} else {
  app = getApp();
  if (isFirebaseConfigured()) {
     try {
        auth = getAuth(app);
        db = getFirestore(app);
     } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Firebase getAuth/getFirestore failed on existing app:", errorMessage, error);
        firebaseInitializationError = new Error(`Firebase Auth/Firestore Get Failed on Existing App: ${errorMessage}`);
        auth = null;
        db = null;
     }
  } else {
    const errorMessage =
      "Firebase app exists, but current configuration is invalid. Services may not work as expected.";
    console.warn(errorMessage); 
    firebaseInitializationError = new Error(errorMessage);
    auth = null;
    db = null;
  }
}

export { app, auth, db, firebaseInitializationError, isFirebaseConfigured };


// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

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
let authInstance: Auth | null = null; // Renamed to avoid conflict with export
let dbInstance: Firestore | null = null; // Renamed to avoid conflict with export

// Validate essential config
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error(
    "Firebase configuration is missing essential values (apiKey, authDomain, projectId). " +
    "Please check your .env.local file and ensure NEXT_PUBLIC_FIREBASE_* variables are set correctly. " +
    "Firebase services will not be initialized."
  );
} else {
  try {
    // Initialize Firebase only if it hasn't been initialized yet
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
       console.log("Firebase initialized successfully."); // Add log for confirmation
    } else {
      app = getApp();
       console.log("Firebase app already initialized."); // Add log
    }

    // Get Auth and Firestore instances only if app initialization was successful
    if (app) {
      authInstance = getAuth(app);
      dbInstance = getFirestore(app);
    } else {
       console.error("Firebase app instance is null after attempting initialization.");
    }

  } catch (error) {
    console.error("Error initializing Firebase:", error);
    // If initialization fails (e.g., invalid config values even if present),
    // ensure app, auth, and db remain null.
    app = null;
    authInstance = null;
    dbInstance = null;
  }
}

// Export potentially null values. Components using these need to handle the null case.
// Assign to exported variables
const auth = authInstance;
const db = dbInstance;

export { app, auth, db };

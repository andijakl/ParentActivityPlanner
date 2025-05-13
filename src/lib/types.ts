
import type { Timestamp } from "firebase/firestore";

// --- Base types for re-use ---
interface BaseUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null; // Can remain optional for UserProfile as it's from Auth
  childNickname: string | null;
}

interface BaseActivity {
  id: string;
  title: string;
  location?: string | null;
  creatorId: string;
  creatorName: string;
  creatorPhotoURL?: string | null;
  participants: { uid: string; name: string | null, photoURL?: string | null }[];
}

interface BaseInvitation {
  code: string;
  inviterId: string;
  inviterName: string | null;
}

// --- Types for data as stored in/retrieved from Firestore ---

export interface UserProfile extends BaseUserProfile {
  createdAt: Timestamp;
  photoURL: string | null; // Make non-optional in Firestore, store null if not set
  childNickname: string | null; // Make non-optional in Firestore, store null if not set
}

export interface Activity extends BaseActivity {
  date: Timestamp;
  createdAt: Timestamp;
  location?: string | null; // Ensure non-optional in Firestore data
}

export interface Invitation extends BaseInvitation {
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

// --- Types for data prepared for client-side consumption (Timestamps are ISO strings) ---

export interface UserProfileClient extends BaseUserProfile {
  createdAt: string; // ISO Date string
  photoURL: string | null; // Mirror Firestore type
  childNickname: string | null; // Mirror Firestore type
}

export interface ActivityClient extends BaseActivity {
  date: string; // ISO Date string
  createdAt: string; // ISO Date string
  location: string | null; // Mirror Firestore type
}

export interface InvitationClient extends BaseInvitation {
  createdAt: string; // ISO Date string
  expiresAt?: string; // ISO Date string or undefined
}

// --- Data Transfer Object types for service functions ---

// Data for creating an activity, expects date to be a Timestamp
export type CreateActivityData = Omit<Activity, 'id' | 'createdAt'>;

// Data for updating, date should be Timestamp if provided
export type UpdateActivityData = Partial<Omit<Activity, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'creatorPhotoURL' | 'participants'>>;


// --- Other types ---

export interface Friend {
    uid: string;
    displayName: string | null;
    photoURL: string | null; // Changed from optional to allow null explicitly
}

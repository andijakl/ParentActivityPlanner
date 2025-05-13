
import type { Timestamp } from "firebase/firestore";

// --- Base types for re-use ---
interface BaseUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
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
  photoURL: string | null;
  childNickname: string | null;
}

export interface Activity extends BaseActivity {
  date: Timestamp;
  createdAt: Timestamp;
  location: string | null; // Ensure location is explicitly null if not set
  participantUids?: string[]; // Array of UIDs for efficient querying of participation
}

export interface Invitation extends BaseInvitation {
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

// --- Types for data prepared for client-side consumption (Timestamps are ISO strings) ---

export interface UserProfileClient extends BaseUserProfile {
  createdAt: string; // ISO Date string
  photoURL: string | null;
  childNickname: string | null;
}

export interface ActivityClient extends BaseActivity {
  date: string; // ISO Date string
  createdAt: string; // ISO Date string
  location: string | null;
  participantUids?: string[];
}

export interface InvitationClient extends BaseInvitation {
  createdAt: string; // ISO Date string
  expiresAt?: string; // ISO Date string or undefined
}

// --- Data Transfer Object types for service functions ---

// Data for creating an activity, expects date to be a Timestamp
// participantUids should be initialized with creatorId
export type CreateActivityData = Omit<Activity, 'id' | 'createdAt'> & { participantUids: string[] };


// Data for updating, date should be Timestamp if provided
// Participants and participantUids are typically updated via join/leave specific functions
export type UpdateActivityData = Partial<Omit<Activity, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'creatorPhotoURL' | 'participants' | 'participantUids'>>;


// --- Other types ---

export interface Friend {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
}

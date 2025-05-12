import type { Timestamp } from "firebase/firestore";

// --- Base types for re-use ---
interface BaseUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  childNickname?: string;
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
}

export interface Activity extends BaseActivity {
  date: Timestamp;
  createdAt: Timestamp;
}

export interface Invitation extends BaseInvitation {
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

// --- Types for data prepared for client-side consumption (Timestamps are ISO strings) ---

export interface UserProfileClient extends BaseUserProfile {
  createdAt: string; // ISO Date string
}

export interface ActivityClient extends BaseActivity {
  date: string; // ISO Date string
  createdAt: string; // ISO Date string
}

export interface InvitationClient extends BaseInvitation {
  createdAt: string; // ISO Date string
  expiresAt?: string; // ISO Date string or undefined
}

// --- Other types ---

export interface Friend {
    uid: string;
    displayName: string | null;
    photoURL?: string | null;
}

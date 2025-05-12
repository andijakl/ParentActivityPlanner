import type { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  childNickname?: string; // Optional child nickname
  createdAt: Timestamp;
  // Add other profile fields as needed
}

export interface Activity {
  id: string;
  title: string;
  date: Timestamp; // Store date and time together
  location?: string | null; // Optional location, allow null
  creatorId: string;
  creatorName: string; // Denormalized for easy display
  creatorPhotoURL?: string | null; // Denormalized
  participants: { uid: string; name: string | null, photoURL?: string | null }[]; // List of participants
  createdAt: Timestamp;
}

export interface Friend {
    uid: string;
    displayName: string | null;
    photoURL?: string | null;
    // Add other relevant friend details if needed
}

export interface Invitation {
  code: string;
  inviterId: string;
  inviterName: string | null;
  createdAt: Timestamp;
  expiresAt?: Timestamp; // Optional expiry
}

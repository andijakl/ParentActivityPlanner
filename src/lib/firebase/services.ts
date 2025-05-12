// src/lib/firebase/services.ts
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
  orderBy,
  FieldValue,
  // limit,
  // startAfter,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "./config"; // db and auth can be null
import type {
  UserProfile, UserProfileClient,
  Activity, ActivityClient,
  Friend,
  Invitation, InvitationClient,
} from "@/lib/types";
import { v4 as uuidv4 } from 'uuid'; // For generating unique invite codes


// --- Helper to transform Firestore doc to Client types ---
const toUserProfileClient = (profile: UserProfile): UserProfileClient => ({
    ...profile,
    createdAt: (profile.createdAt as Timestamp).toDate().toISOString(),
});

const toActivityClient = (activity: Activity): ActivityClient => ({
    ...activity,
    date: (activity.date as Timestamp).toDate().toISOString(),
    createdAt: (activity.createdAt as Timestamp).toDate().toISOString(),
});

const toInvitationClient = (invitation: Invitation): InvitationClient => ({
    ...invitation,
    createdAt: (invitation.createdAt as Timestamp).toDate().toISOString(),
    expiresAt: invitation.expiresAt ? (invitation.expiresAt as Timestamp).toDate().toISOString() : undefined,
});


// --- User Profile ---

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!db) {
      console.error("Firestore (db) is not initialized.");
      return null;
  }
  const userDocRef = doc(db, "users", uid);
  const userDocSnap = await getDoc(userDocRef);
  if (userDocSnap.exists()) {
    return userDocSnap.data() as UserProfile;
  } else {
    return null;
  }
};

// Used by AuthContext, so needs to return UserProfileClient
export const fetchUserProfileForClient = async (uid: string): Promise<UserProfileClient | null> => {
    const profile = await getUserProfile(uid);
    return profile ? toUserProfileClient(profile) : null;
};


export const updateUserProfile = async (uid: string, data: Partial<Omit<UserProfile, 'createdAt' | 'uid' | 'email'>>): Promise<void> => {
   if (!db) {
      console.error("Firestore (db) is not initialized. Cannot update profile.");
      throw new Error("Database service unavailable.");
   }
  const userDocRef = doc(db, "users", uid);
  // Only allow updating specific fields like displayName, photoURL, childNickname
  const updateData: Partial<Omit<UserProfile, 'createdAt' | 'uid' | 'email'>> = {};
  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.photoURL !== undefined) updateData.photoURL = data.photoURL;
  if (data.childNickname !== undefined) updateData.childNickname = data.childNickname;

  if (Object.keys(updateData).length > 0) {
    await updateDoc(userDocRef, updateData);
  }
};

// Takes core UserProfile data, adds serverTimestamp for createdAt
export const createUserProfile = async (userData: Omit<UserProfile, 'createdAt'>): Promise<void> => {
     if (!db) {
        console.error("Firestore (db) is not initialized. Cannot create profile.");
         throw new Error("Database service unavailable.");
     }
    const userDocRef = doc(db, "users", userData.uid);
    const profileForDb: UserProfile = {
        ...userData,
        createdAt: serverTimestamp() as Timestamp, // Firestore will convert this
    };
    await setDoc(userDocRef, profileForDb);
};


// --- Authentication ---

export const handleSignOut = async (): Promise<void> => {
  if (!auth) {
      console.error("Firebase Auth is not initialized. Cannot sign out.");
      return;
  }
  await signOut(auth);
};


// --- Activities ---
// Data for creating an activity, expects date to be a Timestamp
export type CreateActivityData = Omit<Activity, 'id' | 'createdAt'>;

export const createActivity = async (activityData: CreateActivityData): Promise<string> => {
   if (!db) {
       console.error("Firestore (db) is not initialized. Cannot create activity.");
       throw new Error("Database service unavailable.");
   }
  const newActivityRef = doc(collection(db, "activities"));
  const newActivityForDb: Activity = {
    ...activityData,
    id: newActivityRef.id,
    createdAt: serverTimestamp() as Timestamp,
  };
  await setDoc(newActivityRef, newActivityForDb);
  return newActivityRef.id;
};

export const getActivity = async (activityId: string): Promise<ActivityClient | null> => {
    if (!db) {
        console.error("Firestore (db) is not initialized.");
        return null;
    }
    const activityDocRef = doc(db, "activities", activityId);
    const activityDocSnap = await getDoc(activityDocRef);
    if (activityDocSnap.exists()) {
        const data = activityDocSnap.data() as Activity; // Fetches Firestore type
        return toActivityClient(data); // Converts to client type
    } else {
        return null;
    }
};

// Data for updating, date should be Timestamp if provided
export type UpdateActivityData = Partial<Omit<Activity, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'creatorPhotoURL' | 'participants'>>;

export const updateActivity = async (activityId: string, data: UpdateActivityData): Promise<void> => {
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot update activity.");
        throw new Error("Database service unavailable.");
    }
    const activityDocRef = doc(db, "activities", activityId);
    await updateDoc(activityDocRef, data);
};

export const deleteActivity = async (activityId: string): Promise<void> => {
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot delete activity.");
        throw new Error("Database service unavailable.");
    }
    const activityDocRef = doc(db, "activities", activityId);
    await deleteDoc(activityDocRef);
};


export const getDashboardActivities = async (uid: string): Promise<ActivityClient[]> => {
     if (!db) {
         console.error("Firestore (db) is not initialized.");
         return [];
     }
    const friends = await getFriends(uid);
    const friendIds = friends.map(f => f.uid);
    const userAndFriendIds = [uid, ...friendIds];

    if (userAndFriendIds.length === 0) return [];

     const activitiesRef = collection(db, "activities");
     const now = Timestamp.now();

     const chunks = [];
     for (let i = 0; i < userAndFriendIds.length; i += 30) {
         chunks.push(userAndFriendIds.slice(i, i + 30));
     }

     const activityPromises = chunks.map(chunk => {
         const q = query(
             activitiesRef,
             where("creatorId", "in", chunk),
             where("date", ">=", now),
             orderBy("date", "asc")
         );
         return getDocs(q);
     });

     const querySnapshots = await Promise.all(activityPromises);
     const activities = querySnapshots.flatMap(snapshot =>
         snapshot.docs.map(doc => {
             const data = doc.data() as Activity;
             return toActivityClient(data); // Convert to client type
            })
     );

     activities.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

     return activities;
};

export const joinActivity = async (activityId: string, user: { uid: string; name: string | null, photoURL?: string | null }): Promise<void> => {
   if (!db) {
       console.error("Firestore (db) is not initialized. Cannot join activity.");
       throw new Error("Database service unavailable.");
   }
  const activityDocRef = doc(db, "activities", activityId);
  await updateDoc(activityDocRef, {
    participants: arrayUnion(user)
  });
};

export const leaveActivity = async (activityId: string, user: { uid: string; name: string | null, photoURL?: string | null }): Promise<void> => {
   if (!db) {
       console.error("Firestore (db) is not initialized. Cannot leave activity.");
       throw new Error("Database service unavailable.");
   }
  const activityDocRef = doc(db, "activities", activityId);
  await updateDoc(activityDocRef, {
    participants: arrayRemove(user)
  });
};

// --- Friends ---

export const generateInviteCode = async (inviterId: string, inviterName: string | null): Promise<string> => {
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot generate invite code.");
        throw new Error("Database service unavailable.");
    }
    const code = uuidv4().substring(0, 8);
    const inviteDocRef = doc(db, "invitations", code);

    const newInvitationForDb: Invitation = {
        code: code,
        inviterId: inviterId,
        inviterName: inviterName,
        createdAt: serverTimestamp() as Timestamp,
    };

    await setDoc(inviteDocRef, newInvitationForDb);
    return code;
};


export const getInvitation = async (code: string): Promise<InvitationClient | null> => {
    if (!db) {
        console.error("Firestore (db) is not initialized.");
        return null;
    }
    const inviteDocRef = doc(db, "invitations", code);
    const inviteDocSnap = await getDoc(inviteDocRef);
    if (inviteDocSnap.exists()) {
        const data = inviteDocSnap.data() as Invitation;
        return toInvitationClient(data);
    } else {
        return null;
    }
}

export const deleteInvitation = async (code: string): Promise<void> => {
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot delete invitation.");
        throw new Error("Database service unavailable.");
    }
    const inviteDocRef = doc(db, "invitations", code);
    await deleteDoc(inviteDocRef);
}


export const addFriend = async (userId: string, friendId: string): Promise<void> => {
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot add friend.");
        throw new Error("Database service unavailable.");
    }
    const friendProfile = await getUserProfile(friendId);
    if (!friendProfile) {
        throw new Error("Friend profile not found.");
    }

    const friendData: Friend = {
        uid: friendProfile.uid,
        displayName: friendProfile.displayName,
        photoURL: friendProfile.photoURL,
    };

    const userFriendDocRef = doc(db, `users/${userId}/friends/${friendId}`);
    await setDoc(userFriendDocRef, friendData);

    const currentUserProfile = await getUserProfile(userId);
    if (!currentUserProfile) {
        console.error("Current user profile not found while adding friend to their list.");
        throw new Error("Current user profile not found.");
    }
    const currentUserAsFriendData: Friend = {
        uid: currentUserProfile.uid,
        displayName: currentUserProfile.displayName,
        photoURL: currentUserProfile.photoURL,
    };
    const friendUserDocRef = doc(db, `users/${friendId}/friends/${userId}`);
    await setDoc(friendUserDocRef, currentUserAsFriendData);
};

export const removeFriend = async (userId: string, friendId: string): Promise<void> => {
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot remove friend.");
        throw new Error("Database service unavailable.");
    }
    const batch = writeBatch(db);
    const userFriendRef = doc(db, `users/${userId}/friends/${friendId}`);
    const friendUserRef = doc(db, `users/${friendId}/friends/${userId}`);
    batch.delete(userFriendRef);
    batch.delete(friendUserRef);
    await batch.commit();
};

export const getFriends = async (userId: string): Promise<Friend[]> => {
   if (!db) {
       console.error("Firestore (db) is not initialized.");
       return [];
   }
  const friendsRef = collection(db, `users/${userId}/friends`);
  const q = query(friendsRef);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Friend);
};

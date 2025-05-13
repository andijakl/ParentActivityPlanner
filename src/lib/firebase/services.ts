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
  CreateActivityData, UpdateActivityData,
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
    // UserProfile defines createdAt as Timestamp. setDoc is typed to accept FieldValue for such fields.
    const profileForDb = {
        ...userData,
        createdAt: serverTimestamp(), 
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
export const createActivity = async (activityData: CreateActivityData): Promise<string> => {
   if (!db) {
       console.error("Firestore (db) is not initialized. Cannot create activity.");
       throw new Error("Database service unavailable.");
   }
  const newActivityRef = doc(collection(db, "activities"));
  // Activity defines createdAt as Timestamp. setDoc handles FieldValue.
  const newActivityForDb = {
    ...activityData,
    id: newActivityRef.id,
    createdAt: serverTimestamp(),
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

     // Firestore 'in' queries are limited to 30 elements in the array.
     // Chunk the userAndFriendIds array if it's larger.
     const chunks: string[][] = [];
     for (let i = 0; i < userAndFriendIds.length; i += 30) {
         chunks.push(userAndFriendIds.slice(i, i + 30));
     }

     const activityPromises = chunks.map(chunk => {
         const q = query(
             activitiesRef,
             where("creatorId", "in", chunk),
             where("date", ">=", now), // Only get future or current activities
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

     // Sort all activities from all chunks by date
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
    const code = uuidv4().substring(0, 8); // Generate a shorter, unique code
    const inviteDocRef = doc(db, "invitations", code);

    // Invitation defines createdAt as Timestamp. setDoc handles FieldValue.
    const newInvitationForDb = {
        code: code,
        inviterId: inviterId,
        inviterName: inviterName,
        createdAt: serverTimestamp(),
        // expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // Example: 7 days expiry
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

    // Check if they are already friends to prevent duplicate operations or errors
    const userFriendRef = doc(db, `users/${userId}/friends/${friendId}`);
    const userFriendSnap = await getDoc(userFriendRef);
    if (userFriendSnap.exists()) {
        console.log(`Users ${userId} and ${friendId} are already friends.`);
        // Optionally throw an error or return a specific status
        // For now, we'll just prevent re-adding.
        // throw new Error("Users are already friends.");
        return;
    }

    const batch = writeBatch(db);

    // Fetch profiles to get friend data
    const friendProfile = await getUserProfile(friendId);
    if (!friendProfile) {
        throw new Error("Friend profile not found.");
    }
    const friendData: Friend = {
        uid: friendProfile.uid,
        displayName: friendProfile.displayName,
        photoURL: friendProfile.photoURL,
    };
    batch.set(userFriendRef, friendData);


    const currentUserProfile = await getUserProfile(userId);
    if (!currentUserProfile) {
        // This should ideally not happen if the current user is authenticated and has a profile
        console.error("Current user profile not found while adding friend to their list.");
        throw new Error("Current user profile not found.");
    }
    const currentUserAsFriendData: Friend = {
        uid: currentUserProfile.uid,
        displayName: currentUserProfile.displayName,
        photoURL: currentUserProfile.photoURL,
    };
    const friendUserRef = doc(db, `users/${friendId}/friends/${userId}`);
    batch.set(friendUserRef, currentUserAsFriendData);

    await batch.commit();
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
  const q = query(friendsRef, orderBy("displayName", "asc")); // Optionally order friends
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Friend);
};

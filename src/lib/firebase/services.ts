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
  limit,
  startAfter,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "./config";
import type { UserProfile, Activity, Friend, Invitation } from "@/lib/types";
import { v4 as uuidv4 } from 'uuid'; // For generating unique invite codes


// --- User Profile ---

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userDocRef = doc(db, "users", uid);
  const userDocSnap = await getDoc(userDocRef);
  if (userDocSnap.exists()) {
    return userDocSnap.data() as UserProfile;
  } else {
    return null;
  }
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  const userDocRef = doc(db, "users", uid);
   // Ensure serverTimestamp is not included directly in update data if it's already set
   const updateData = { ...data };
   delete updateData.createdAt; // Don't try to update createdAt
   // Add a lastUpdated timestamp if desired
   // updateData.lastUpdatedAt = serverTimestamp();

  await updateDoc(userDocRef, updateData);
};

export const createUserProfile = async (user: UserProfile): Promise<void> => {
    const userDocRef = doc(db, "users", user.uid);
    // Use setDoc with merge: true to avoid overwriting if somehow called twice,
    // or just setDoc if confident it's only called once on signup.
    await setDoc(userDocRef, {
        ...user,
        createdAt: serverTimestamp(), // Ensure createdAt is set on creation
    });
};


// --- Authentication ---

export const handleSignOut = async (): Promise<void> => {
  await signOut(auth);
};


// --- Activities ---

export const createActivity = async (activityData: Omit<Activity, 'id' | 'createdAt'>): Promise<string> => {
  const newActivityRef = doc(collection(db, "activities"));
  const newActivity: Activity = {
    ...activityData,
    id: newActivityRef.id,
    createdAt: serverTimestamp() as Timestamp, // Firestore will convert this
  };
  await setDoc(newActivityRef, newActivity);
  return newActivityRef.id;
};

export const getActivity = async (activityId: string): Promise<Activity | null> => {
    const activityDocRef = doc(db, "activities", activityId);
    const activityDocSnap = await getDoc(activityDocRef);
    if (activityDocSnap.exists()) {
        // Convert Firestore Timestamp to JS Date for easier use in components if needed
        const data = activityDocSnap.data() as Activity;
        // data.date = (data.date as Timestamp).toDate();
        // data.createdAt = (data.createdAt as Timestamp).toDate();
        return data;
    } else {
        return null;
    }
};

// Get activities created by a specific user
export const getUserActivities = async (uid: string): Promise<Activity[]> => {
  const activitiesRef = collection(db, "activities");
  const q = query(activitiesRef, where("creatorId", "==", uid), orderBy("date", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
};

// Get activities created by user's friends
export const getFriendActivities = async (friendIds: string[]): Promise<Activity[]> => {
    if (friendIds.length === 0) {
        return [];
    }
    // Firestore 'in' query limit is 30 items per query as of Nov 2023. Paginate if needed.
    const activitiesRef = collection(db, "activities");
    // Query for activities where creatorId is in the friendIds list
    // Only get future activities
    const now = Timestamp.now();
    const q = query(
        activitiesRef,
        where("creatorId", "in", friendIds),
        where("date", ">=", now),
        orderBy("date", "asc")
        // limit(30) // Consider pagination if friend list is large
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
};

// Get all upcoming activities (user's own and friends')
export const getDashboardActivities = async (uid: string): Promise<Activity[]> => {
    const friends = await getFriends(uid);
    const friendIds = friends.map(f => f.uid);
    const userAndFriendIds = [uid, ...friendIds];

    if (userAndFriendIds.length === 0) return [];

    // Firestore 'in' query limit is 30. Handle larger lists if necessary.
     const activitiesRef = collection(db, "activities");
     const now = Timestamp.now();

     // Split into chunks if needed, but for typical friend counts, one query is fine.
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
             // limit(50) // Add a limit if needed
         );
         return getDocs(q);
     });

     const querySnapshots = await Promise.all(activityPromises);
     const activities = querySnapshots.flatMap(snapshot =>
         snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity))
     );

     // Sort merged activities by date (Firestore sorts within chunks, but not across them)
     activities.sort((a, b) => (a.date as Timestamp).toMillis() - (b.date as Timestamp).toMillis());

     return activities;


};

export const joinActivity = async (activityId: string, user: { uid: string; name: string | null, photoURL?: string | null }): Promise<void> => {
  const activityDocRef = doc(db, "activities", activityId);
  await updateDoc(activityDocRef, {
    participants: arrayUnion(user)
  });
  // TODO: Add notification logic here if needed (e.g., write to a notifications subcollection)
};

export const leaveActivity = async (activityId: string, user: { uid: string; name: string | null, photoURL?: string | null }): Promise<void> => {
  const activityDocRef = doc(db, "activities", activityId);
  await updateDoc(activityDocRef, {
    participants: arrayRemove(user)
  });
   // TODO: Add notification logic here if needed
};

// --- Friends ---

export const generateInviteCode = async (inviterId: string, inviterName: string | null): Promise<string> => {
    const code = uuidv4().substring(0, 8); // Generate a shorter unique code
    const inviteDocRef = doc(db, "invitations", code);

    const newInvitation: Invitation = {
        code: code,
        inviterId: inviterId,
        inviterName: inviterName,
        createdAt: serverTimestamp() as Timestamp,
        // Add expiry if needed: expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // 7 days
    };

    await setDoc(inviteDocRef, newInvitation);
    return code;
};


export const getInvitation = async (code: string): Promise<Invitation | null> => {
    const inviteDocRef = doc(db, "invitations", code);
    const inviteDocSnap = await getDoc(inviteDocRef);
    if (inviteDocSnap.exists()) {
        // Add expiry check here if using expiresAt
        return inviteDocSnap.data() as Invitation;
    } else {
        return null;
    }
}

export const deleteInvitation = async (code: string): Promise<void> => {
    const inviteDocRef = doc(db, "invitations", code);
    await deleteDoc(inviteDocRef);
}


// Add a friend relationship (stores minimal friend info in a subcollection)
export const addFriend = async (userId: string, friendId: string): Promise<void> => {
    const friendProfile = await getUserProfile(friendId);
    if (!friendProfile) {
        throw new Error("Friend profile not found.");
    }

    const friendData: Friend = {
        uid: friendProfile.uid,
        displayName: friendProfile.displayName,
        photoURL: friendProfile.photoURL,
    };

    const friendDocRef = doc(db, `users/${userId}/friends/${friendId}`);
    await setDoc(friendDocRef, friendData);
};

// Remove a friend relationship (requires removing from both users' subcollections)
export const removeFriend = async (userId: string, friendId: string): Promise<void> => {
    const batch = writeBatch(db);

    const userFriendRef = doc(db, `users/${userId}/friends/${friendId}`);
    const friendUserRef = doc(db, `users/${friendId}/friends/${userId}`);

    batch.delete(userFriendRef);
    batch.delete(friendUserRef);

    await batch.commit();
};


// Get a user's friends list
export const getFriends = async (userId: string): Promise<Friend[]> => {
  const friendsRef = collection(db, `users/${userId}/friends`);
  const q = query(friendsRef); // Add orderBy if needed, e.g., orderBy("displayName")
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Friend);
};

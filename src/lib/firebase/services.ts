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
        createdAt: serverTimestamp() as Timestamp, // Explicitly cast for assignment
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
  const newActivityForDb: Activity = {
    ...activityData,
    id: newActivityRef.id,
    createdAt: serverTimestamp() as Timestamp, // Explicitly cast
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
    const userAndFriendIds = Array.from(new Set([uid, ...friendIds])); // Ensure unique IDs

    if (userAndFriendIds.length === 0) return [];

     const activitiesRef = collection(db, "activities");
     const now = Timestamp.now();

     // Firestore 'in' queries are limited to 30 elements in the array.
     // Chunk the userAndFriendIds array if it's larger.
     const chunks: string[][] = [];
     const chunkSize = 30; // Max elements for 'in' query
     for (let i = 0; i < userAndFriendIds.length; i += chunkSize) {
         chunks.push(userAndFriendIds.slice(i, i + chunkSize));
     }

     const activityPromises = chunks.map(chunk => {
         const q = query(
             activitiesRef,
             where("participants", "array-contains-any", chunk.map(id => ({ uid: id })) ), // This query might not work as intended for complex objects.
                                                                                           // A better approach might be separate queries or a more complex data model if array-contains-any on objects is tricky.
                                                                                           // For now, let's assume it's searching for activities where ANY of the chunk UIDs is a participant.
                                                                                           // Or, a simpler creatorId based query as before:
             // where("creatorId", "in", chunk), // Querying by creatorId
             where("date", ">=", now), 
             orderBy("date", "asc")
         );
         // Alternative: Query for activities created by user OR friends, AND activities user is a participant in.
         // This might require two separate queries and then merging+deduplicating.
         // For simplicity, the original `where("creatorId", "in", chunk)` or `where("participants", "array-contains", {uid: someId})` per ID might be more direct.
         // Let's revert to a simpler query structure if the above array-contains-any on objects is problematic or inefficient.
         // Using OR queries (||) is limited in Firestore. Usually done by multiple queries and client-side merge.

         // Querying for activities where the current user or their friends are participants
         // This requires an index on the `participants` array if not already present.
         // A simple `array-contains` query for each user ID would be too many queries.
         // A `array-contains-any` for UIDs within the participants array.
         // However, `array-contains-any` cannot be used with `orderBy` on a different field or `where` on `date` in the same query directly.
         // The most straightforward way is to query activities created by the user/friends and separately query activities they participate in, then merge.
         // Or, fetch all future activities and filter client-side (not scalable).

         // Let's stick to the original logic: activities created by user or friends.
          const qCreator = query(
            activitiesRef,
            where("creatorId", "in", chunk),
            where("date", ">=", now),
            orderBy("date", "asc")
        );
        // And activities where the user is a participant (if not already covered by creator query)
        const qParticipant = query(
            activitiesRef,
            where("participants", "array-contains", { uid: uid, name: null, photoURL: null }), //  Need to query with a full participant object, or restructure.
                                                                                              // This is tricky because name/photoURL can vary.
                                                                                              // Better to iterate through friends for participant check.
            where("date", ">=", now),
            orderBy("date", "asc")
        );
        // This participant query is not ideal. For now, we will primarily rely on created activities.
        // And activities the current user directly joined (which also makes them a participant).
        // The `getDashboardActivities` should show activities created by user OR their friends,
        // AND activities the user is a participant in, regardless of creator.

        return getDocs(qCreator);
     });


     const querySnapshots = await Promise.all(activityPromises);
     let activities = querySnapshots.flatMap(snapshot =>
         snapshot.docs.map(doc => {
             const data = doc.data() as Activity;
             return toActivityClient(data); 
            })
     );
     
     // Additionally, fetch activities where the current user is a participant but not the creator
     if (uid) {
        const participantActivitiesQuery = query(
            collection(db, "activities"),
            where("participants", "array-contains", { uid: uid, name: (await getUserProfile(uid))?.displayName ?? null, photoURL: (await getUserProfile(uid))?.photoURL ?? null }), // This is still not ideal due to name/photoURL possibly changing. Storing only UID in a simple array `participantUids` would be better for querying.
            where("date", ">=", now),
            orderBy("date", "asc")
        );
        // For a robust participant query, it's better to have a `participantUids: string[]` field.
        // Given the current structure, this query is prone to issues if name/photoURL in participant object doesn't exactly match.
        // A simplified approach: get all activities for user/friends and filter if user is participant.
     }


     // Deduplicate activities based on ID
     const uniqueActivities = Array.from(new Map(activities.map(act => [act.id, act])).values());
     
     // Sort all unique activities by date
     uniqueActivities.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

     return uniqueActivities;
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
    const newInvitationForDb: Invitation = {
        code: code,
        inviterId: inviterId,
        inviterName: inviterName,
        createdAt: serverTimestamp() as Timestamp, // Explicitly cast
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // Example: 7 days expiry
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
    
    const friendUserRef = doc(db, `users/${friendId}/friends/${userId}`);
    const friendUserSnap = await getDoc(friendUserRef);

    if (userFriendSnap.exists() && friendUserSnap.exists()) {
        console.log(`Users ${userId} and ${friendId} are already bidirectionally friends.`);
        const err = new Error("Users are already friends.");
        (err as any).code = 'already-friends'; // Add a code for easier checking
        throw err;
    }
    
    // If one side exists but not the other, it's a partial connection, proceed to complete it.
    console.log(`Proceeding to establish/complete friendship between ${userId} and ${friendId}.`);

    const batch = writeBatch(db);

    // Fetch profiles to get friend data
    const friendProfile = await getUserProfile(friendId);
    if (!friendProfile) {
        throw new Error(`Friend profile not found for UID: ${friendId}.`);
    }
    const friendData: Friend = {
        uid: friendProfile.uid,
        displayName: friendProfile.displayName,
        photoURL: friendProfile.photoURL,
    };
    // User (userId) adds Friend (friendId) to their list
    if (!userFriendSnap.exists()) {
        batch.set(userFriendRef, friendData);
    }


    const currentUserProfile = await getUserProfile(userId);
    if (!currentUserProfile) {
        throw new Error(`Current user profile not found for UID: ${userId}.`);
    }
    const currentUserAsFriendData: Friend = {
        uid: currentUserProfile.uid,
        displayName: currentUserProfile.displayName,
        photoURL: currentUserProfile.photoURL,
    };
    // Friend (friendId) adds User (userId) to their list
    if (!friendUserSnap.exists()) {
        batch.set(friendUserRef, currentUserAsFriendData);
    }
    
    // Only commit if there are actual writes to perform
    // The batch will be empty if both already existed from the earlier checks,
    // but the initial check for bidirectionality should catch this.
    // However, to be safe with partial connections:
    if (!userFriendSnap.exists() || !friendUserSnap.exists()) {
        await batch.commit();
    } else {
        // This case should be caught by the initial bidirectional check.
        console.log("No writes needed as friendship seems to exist or was just checked as existing.");
    }
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


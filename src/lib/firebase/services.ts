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
  type FieldValue,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "./config";
import type {
  UserProfile, UserProfileClient,
  Activity, ActivityClient,
  Friend,
  Invitation, InvitationClient,
  CreateActivityData, UpdateActivityData,
} from "@/lib/types";
import { v4 as uuidv4 } from 'uuid';


// --- Helper to transform Firestore doc to Client types ---
const toUserProfileClient = (profile: UserProfile): UserProfileClient => {
    const createdAtTimestamp = profile.createdAt instanceof Timestamp ? profile.createdAt : null;
    return {
        ...profile,
        uid: profile.uid,
        email: profile.email ?? null,
        displayName: profile.displayName ?? null,
        photoURL: profile.photoURL ?? null,
        childNickname: profile.childNickname ?? null,
        createdAt: createdAtTimestamp ? createdAtTimestamp.toDate().toISOString() : new Date(0).toISOString(),
    };
};

const toActivityClient = (activity: Activity): ActivityClient => {
    const dateTimestamp = activity.date instanceof Timestamp ? activity.date : null;
    const createdAtTimestamp = activity.createdAt instanceof Timestamp ? activity.createdAt : null;
    return {
        ...activity,
        // Ensure location is explicitly null if undefined from Firestore
        location: activity.location === undefined ? null : activity.location,
        date: dateTimestamp ? dateTimestamp.toDate().toISOString() : new Date(0).toISOString(),
        createdAt: createdAtTimestamp ? createdAtTimestamp.toDate().toISOString() : new Date(0).toISOString(),
    };
};

const toInvitationClient = (invitation: Invitation): InvitationClient => {
    const createdAtTimestamp = invitation.createdAt instanceof Timestamp ? invitation.createdAt : null;
    const expiresAtTimestamp = invitation.expiresAt instanceof Timestamp ? invitation.expiresAt : null;
    return {
        ...invitation,
        createdAt: createdAtTimestamp ? createdAtTimestamp.toDate().toISOString() : new Date(0).toISOString(),
        expiresAt: expiresAtTimestamp ? expiresAtTimestamp.toDate().toISOString() : undefined,
    };
};


// --- User Profile ---

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  console.log(`[getUserProfile] Attempting to fetch profile for UID: ${uid}`);
  if (!db) {
      console.error(`[getUserProfile] Firestore (db) is not initialized for UID: ${uid}.`);
      throw new Error("Database service unavailable for getUserProfile.");
  }
  const userDocRef = doc(db, "users", uid);
  try {
    console.log(`[getUserProfile] Executing getDoc for users/${uid}`);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      console.log(`[getUserProfile] Profile found for UID: ${uid}`, userDocSnap.data());
      const data = userDocSnap.data();
      return {
          uid: data.uid,
          email: data.email ?? null,
          displayName: data.displayName ?? null,
          photoURL: data.photoURL ?? null,
          childNickname: data.childNickname ?? null,
          createdAt: data.createdAt as Timestamp, // Assuming createdAt is always a Timestamp
      };
    } else {
      console.log(`[getUserProfile] Profile NOT found for UID: ${uid}`);
      return null;
    }
  } catch (error) {
    console.error(`[getUserProfile] Firebase error fetching user profile for ${uid}:`, error);
    if (error instanceof Error && 'code' in error) {
      console.error(`[getUserProfile] Firebase error code: ${(error as any).code}, message: ${error.message}`);
    }
    throw new Error(`Failed to fetch user profile for ${uid}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const fetchUserProfileForClient = async (uid: string): Promise<UserProfileClient | null> => {
    const profile = await getUserProfile(uid);
    return profile ? toUserProfileClient(profile) : null;
};


export const updateUserProfile = async (uid: string, data: Partial<Omit<UserProfile, 'createdAt' | 'uid' | 'email'>>): Promise<void> => {
   if (!db) {
      console.error("Firestore (db) is not initialized. Cannot update profile.");
      throw new Error("Database service unavailable for updateUserProfile.");
   }
  const userDocRef = doc(db, "users", uid);
  const updateData: { [key: string]: any } = {};
  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.photoURL !== undefined) updateData.photoURL = data.photoURL;
  if (data.childNickname !== undefined) updateData.childNickname = data.childNickname;

  if (Object.keys(updateData).length > 0) {
    try {
        await updateDoc(userDocRef, updateData);
    } catch (error) {
        console.error(`Error updating user profile for ${uid}:`, error);
        throw new Error(`Failed to update profile: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export const createUserProfile = async (userData: Omit<UserProfile, 'createdAt'>): Promise<void> => {
     if (!db) {
        console.error("Firestore (db) is not initialized. Cannot create profile.");
         throw new Error("Database service unavailable for createUserProfile.");
     }
    const userDocRef = doc(db, "users", userData.uid);
    const profileForDb: UserProfile = {
        ...userData,
        email: userData.email ?? null,
        displayName: userData.displayName ?? null,
        photoURL: userData.photoURL ?? null,
        childNickname: userData.childNickname ?? null,
        createdAt: serverTimestamp() as Timestamp,
    };
    try {
        await setDoc(userDocRef, profileForDb);
    } catch (error) {
        console.error(`Error creating user profile for ${userData.uid}:`, error);
        throw new Error(`Failed to create profile: ${error instanceof Error ? error.message : String(error)}`);
    }
};


// --- Authentication ---

export const handleSignOut = async (): Promise<void> => {
  if (!auth) {
      console.error("Firebase Auth is not initialized. Cannot sign out.");
      throw new Error("Authentication service unavailable for sign out.");
  }
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw new Error(`Sign out failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};


// --- Activities ---
export const createActivity = async (activityData: CreateActivityData): Promise<string> => {
   if (!db) {
       console.error("Firestore (db) is not initialized. Cannot create activity.");
       throw new Error("Database service unavailable for createActivity.");
   }
  const newActivityRef = doc(collection(db, "activities"));
  const newActivityForDb: Activity = {
    ...activityData,
    id: newActivityRef.id,
    location: activityData.location === "" ? null : activityData.location, // Ensure location is null if empty string
    createdAt: serverTimestamp() as Timestamp,
    // participantUids should be part of CreateActivityData
  };
  try {
    await setDoc(newActivityRef, newActivityForDb);
    return newActivityRef.id;
  } catch (error) {
    console.error("Error creating activity:", error);
    throw new Error(`Failed to create activity: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const getActivity = async (activityId: string): Promise<ActivityClient | null> => {
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot get activity.");
        throw new Error("Database service unavailable for getActivity.");
    }
    const activityDocRef = doc(db, "activities", activityId);
    try {
        const activityDocSnap = await getDoc(activityDocRef);
        if (activityDocSnap.exists()) {
            const data = activityDocSnap.data() as Activity;
            return toActivityClient(data);
        } else {
            return null;
        }
    } catch (error) {
        console.error(`Error fetching activity ${activityId}:`, error);
        throw new Error(`Failed to fetch activity: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const updateActivity = async (activityId: string, data: UpdateActivityData): Promise<void> => {
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot update activity.");
        throw new Error("Database service unavailable for updateActivity.");
    }
    const activityDocRef = doc(db, "activities", activityId);
    const updateData: { [key: string]: any } = { ...data };
    if (data.location !== undefined) {
        updateData.location = data.location === "" ? null : data.location;
    }


    try {
        await updateDoc(activityDocRef, updateData);
    } catch (error) {
        console.error(`Error updating activity ${activityId}:`, error);
        throw new Error(`Failed to update activity: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const deleteActivity = async (activityId: string): Promise<void> => {
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot delete activity.");
        throw new Error("Database service unavailable for deleteActivity.");
    }
    const activityDocRef = doc(db, "activities", activityId);
    try {
        await deleteDoc(activityDocRef);
    } catch (error) {
        console.error(`Error deleting activity ${activityId}:`, error);
        throw new Error(`Failed to delete activity: ${error instanceof Error ? error.message : String(error)}`);
    }
};


export const getDashboardActivities = async (uid: string): Promise<ActivityClient[]> => {
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot get dashboard activities.");
        throw new Error("Database service unavailable for dashboard activities.");
    }

    let userAndFriendIds: string[];
    try {
        const friends = await getFriends(uid);
        const friendIds = friends.map(f => f.uid);
        userAndFriendIds = Array.from(new Set([uid, ...friendIds]));
    } catch (error) {
        console.error("getDashboardActivities: Failed to get friends list. Proceeding with user's activities only.", error);
        userAndFriendIds = [uid];
    }

    if (userAndFriendIds.length === 0) {
        console.warn("getDashboardActivities: No user or friend IDs to query for.");
        return [];
    }

    const activitiesRef = collection(db, "activities");
    const now = Timestamp.now();
    
    const activityPromises: Promise<QuerySnapshot<DocumentData>>[] = [];
    const participantActivityPromises: Promise<QuerySnapshot<DocumentData> | null>[] = [];

    const chunkSize = 30; // Firestore 'in' query limit, also for 'array-contains-any'
    for (let i = 0; i < userAndFriendIds.length; i += chunkSize) {
        const chunk = userAndFriendIds.slice(i, i + chunkSize);
        if (chunk.length === 0) continue;

        // Activities created by users in the chunk
        const qCreator = query(
            activitiesRef,
            where("creatorId", "in", chunk),
            where("date", ">=", now)
            // orderBy("date", "asc") // Cannot have inequality on 'date' and 'in' on 'creatorId' with orderBy on 'date' without composite index
        );
        activityPromises.push(getDocs(qCreator));
    }
    
    // Activities where the current user `uid` is a participant
    // This must be done separately if participantUids is used with array-contains
    const qParticipant = query(
        activitiesRef,
        where("participantUids", "array-contains", uid),
        where("date", ">=", now)
        // orderBy("date", "asc") // Cannot have inequality on 'date' and array-contains with orderBy on 'date' without composite index
    );
    participantActivityPromises.push(getDocs(qParticipant).catch(err => {
        console.error("getDashboardActivities: Error fetching activities where user is participant (array-contains):", err);
        return null; // Allow other queries to proceed
    }));


    const querySnapshots = await Promise.all(activityPromises);
    const participantQuerySnapshots = (await Promise.all(participantActivityPromises)).filter(s => s !== null) as QuerySnapshot<DocumentData>[];


    let activities = querySnapshots.flatMap(snapshot =>
        snapshot.docs.map(doc => toActivityClient(doc.data() as Activity))
    );
    
    participantQuerySnapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => activities.push(toActivityClient(doc.data() as Activity)));
    });

    const uniqueActivities = Array.from(new Map(activities.map(act => [act.id, act])).values());
    uniqueActivities.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return uniqueActivities;
};

export const joinActivity = async (activityId: string, user: { uid: string; name: string | null, photoURL?: string | null }): Promise<void> => {
   if (!db) {
       console.error("Firestore (db) is not initialized. Cannot join activity.");
       throw new Error("Database service unavailable for joinActivity.");
   }
  const activityDocRef = doc(db, "activities", activityId);
  const participantData = {
      uid: user.uid,
      name: user.name ?? null,
      photoURL: user.photoURL ?? null,
  };
  try {
    await updateDoc(activityDocRef, {
      participants: arrayUnion(participantData),
      participantUids: arrayUnion(user.uid)
    });
  } catch (error) {
    console.error(`Error joining activity ${activityId}:`, error);
    throw new Error(`Failed to join activity: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const leaveActivity = async (activityId: string, user: { uid: string; name: string | null, photoURL?: string | null }): Promise<void> => {
   if (!db) {
       console.error("Firestore (db) is not initialized. Cannot leave activity.");
       throw new Error("Database service unavailable for leaveActivity.");
   }
  const activityDocRef = doc(db, "activities", activityId);
   const participantData = {
      uid: user.uid,
      name: user.name ?? null,
      photoURL: user.photoURL ?? null,
  };
  try {
    await updateDoc(activityDocRef, {
      participants: arrayRemove(participantData),
      participantUids: arrayRemove(user.uid)
    });
  } catch (error) {
    console.error(`Error leaving activity ${activityId}:`, error);
    throw new Error(`Failed to leave activity: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// --- Friends ---

export const generateInviteCode = async (inviterId: string, inviterName: string | null): Promise<string> => {
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot generate invite code.");
        throw new Error("Database service unavailable for generateInviteCode.");
    }
    const code = uuidv4().substring(0, 8);
    const inviteDocRef = doc(db, "invitations", code);

    const newInvitationForDb: Invitation = {
        code: code,
        inviterId: inviterId,
        inviterName: inviterName ?? null,
        createdAt: serverTimestamp() as Timestamp,
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    };
    try {
        await setDoc(inviteDocRef, newInvitationForDb);
        return code;
    } catch (error) {
        console.error("Error generating invite code:", error);
        throw new Error(`Failed to generate invite code: ${error instanceof Error ? error.message : String(error)}`);
    }
};


export const getInvitation = async (code: string): Promise<InvitationClient | null> => {
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot get invitation.");
        throw new Error("Database service unavailable for getInvitation.");
    }
    const inviteDocRef = doc(db, "invitations", code);
    try {
        const inviteDocSnap = await getDoc(inviteDocRef);
        if (inviteDocSnap.exists()) {
            const data = inviteDocSnap.data() as Invitation;
            return toInvitationClient(data);
        } else {
            return null;
        }
    } catch (error) {
        console.error(`Error fetching invitation ${code}:`, error);
        throw new Error(`Failed to fetch invitation: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export const deleteInvitation = async (code: string): Promise<void> => {
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot delete invitation.");
        throw new Error("Database service unavailable for deleteInvitation.");
    }
    const inviteDocRef = doc(db, "invitations", code);
    try {
        await deleteDoc(inviteDocRef);
    } catch (error) {
        console.error(`Error deleting invitation ${code}:`, error);
        throw new Error(`Failed to delete invitation: ${error instanceof Error ? error.message : String(error)}`);
    }
}


export const addFriend = async (userId: string, friendId: string): Promise<void> => {
    console.log(`[addFriend] Attempting to add friend. Current User (userId): ${userId}, Prospective Friend (friendId): ${friendId}`);

    if (!db) {
        console.error("[addFriend] Firestore (db) is not initialized.");
        throw new Error("Database service unavailable for addFriend.");
    }
    if (!userId || !friendId) {
        console.error(`[addFriend] Invalid parameters. userId: ${userId}, friendId: ${friendId}`);
        throw new Error("User ID and Friend ID must be provided.");
    }
    if (userId === friendId) {
        console.warn("[addFriend] User tried to add themselves as a friend.");
        const selfAddError = new Error("You cannot add yourself as a friend.");
        (selfAddError as any).code = 'cannot-add-self';
        throw selfAddError;
    }

    const userFriendRef = doc(db, `users/${userId}/friends/${friendId}`);
    const friendUserRef = doc(db, `users/${friendId}/friends/${userId}`);

    const batch = writeBatch(db);
    let operationsCount = 0;

    try {
        console.log(`[addFriend] Fetching profile for current user: ${userId}`);
        const userProfileData = await getUserProfile(userId); // This calls the logged getUserProfile
        if (!userProfileData) {
            console.error(`[addFriend] Current user profile not found for UID: ${userId}.`);
            throw new Error(`Current user profile (UID: ${userId}) not found.`);
        }
        console.log(`[addFriend] Successfully fetched profile for current user: ${userId}`, { uid: userProfileData.uid, displayName: userProfileData.displayName });

        console.log(`[addFriend] Fetching profile for prospective friend: ${friendId}`);
        const friendProfileData = await getUserProfile(friendId); // This calls the logged getUserProfile
        if (!friendProfileData) {
            console.error(`[addFriend] Friend profile not found for UID: ${friendId}.`);
            throw new Error(`Friend profile (UID: ${friendId}) not found.`);
        }
        console.log(`[addFriend] Successfully fetched profile for prospective friend: ${friendId}`, { uid: friendProfileData.uid, displayName: friendProfileData.displayName });

        console.log(`[addFriend] Checking existing friendship status for ${userId} towards ${friendId}`);
        const userFriendSnap = await getDoc(userFriendRef);
        
        if (userFriendSnap.exists()) {
            console.log(`[addFriend] User ${userId} already has ${friendId} as a friend (path: users/${userId}/friends/${friendId} exists).`);
             // To prevent partial states, also check if the other side exists.
             // If not, this might be a good place to complete the friendship if one side exists.
             // However, the primary error is often the write itself.
             // For now, if user's side exists, assume "already-friends".
            const err = new Error("You are already connected with this user.");
            (err as any).code = 'already-friends';
            throw err;
        }

        // Operation 1: Current user (userId) adds inviter (friendId) to their own friends list
        console.log(`[addFriend] Preparing to set users/${userId}/friends/${friendId}`);
        const friendDataForUser: Friend = {
            uid: friendProfileData.uid,
            displayName: friendProfileData.displayName ?? null,
            photoURL: friendProfileData.photoURL ?? null,
        };
        console.log(`[addFriend] Data for users/${userId}/friends/${friendId}:`, friendDataForUser);
        batch.set(userFriendRef, friendDataForUser);
        operationsCount++;

        // Operation 2: Current user (userId) attempts to add themselves to inviter's (friendId) friends list
        // This operation requires friendId to be the authenticated user or rules allowing this.
        console.log(`[addFriend] Preparing to set users/${friendId}/friends/${userId}`);
        const currentUserAsFriendData: Friend = {
            uid: userProfileData.uid,
            displayName: userProfileData.displayName ?? null,
            photoURL: userProfileData.photoURL ?? null,
        };
        console.log(`[addFriend] Data for users/${friendId}/friends/${userId}:`, currentUserAsFriendData);
        batch.set(friendUserRef, currentUserAsFriendData);
        operationsCount++;
        
        if (operationsCount > 0) {
            console.log(`[addFriend] Committing batch with ${operationsCount} operations for ${userId} and ${friendId}.`);
            await batch.commit();
            console.log(`[addFriend] Batch commit successful for ${userId} and ${friendId}. Friendship established.`);
        } else {
            // This case should ideally not be reached if not already friends.
            console.warn(`[addFriend] No operations to commit for ${userId} and ${friendId}. This might indicate they were already friends or an issue in logic.`);
        }

    } catch (error: any) {
        console.error(`[addFriend] Error in addFriend operation between ${userId} and ${friendId}:`, error);
        // console.error(`[addFriend] Error name: ${error.name}, message: ${error.message}, code: ${error.code}, stack: ${error.stack ? error.stack.substring(0, 500) + '...' : 'No stack'}`);
        
        // More detailed logging for Firebase specific errors
        if (error.name === 'FirebaseError') {
             console.error(`[addFriend] FirebaseError details: code=${error.code}, message=${error.message}`);
        }


        if (error.code === 'already-friends' || error.code === 'cannot-add-self') {
            throw error; 
        }
        if (error.message.includes("profile not found")) { // Specific errors from our checks
            throw error;
        }
        
        // Default error for other cases, including actual permission issues from batch.commit()
        // Firestore permission errors from batch.commit() will typically have name: 'FirebaseError' and code: 'permission-denied'
        const defaultErrorMessage = `Failed to establish friend connection. Original error: ${error.message || String(error)}`;
        if (error.name === 'FirebaseError' && (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission')))) {
             console.error(`[addFriend] Firestore permission error during batch commit. This likely means one of the batched writes was denied by security rules (e.g., writing to users/${friendId}/friends/${userId} by user ${userId}).`);
             throw new Error(`Friendship could not be fully established due to a permission issue. One part of the connection might have failed. Check Firestore rules. Original error: ${error.message}`);
        }
        throw new Error(defaultErrorMessage);
    }
};


export const removeFriend = async (userId: string, friendId: string): Promise<void> => {
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot remove friend.");
        throw new Error("Database service unavailable for removeFriend.");
    }
    const batch = writeBatch(db);
    const userFriendRef = doc(db, `users/${userId}/friends/${friendId}`);
    const friendUserRef = doc(db, `users/${friendId}/friends/${userId}`);
    batch.delete(userFriendRef);
    batch.delete(friendUserRef);
    try {
        await batch.commit();
    } catch (error) {
        console.error(`Error removing friend connection between ${userId} and ${friendId}:`, error);
        throw new Error(`Failed to remove friend: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const getFriends = async (userId: string): Promise<Friend[]> => {
   if (!db) {
       console.error("Firestore (db) is not initialized. Cannot get friends.");
       throw new Error("Database service unavailable for getFriends.");
   }
  const friendsRef = collection(db, `users/${userId}/friends`);
  const q = query(friendsRef, orderBy("displayName", "asc"));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            uid: data.uid,
            displayName: data.displayName ?? null,
            photoURL: data.photoURL ?? null,
        } as Friend;
    });
  } catch (error) {
      console.error(`Firebase error fetching friends for ${userId}:`, error);
      throw new Error(`Failed to fetch friends: ${error instanceof Error ? error.message : String(error)}`);
  }
};
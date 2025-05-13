
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
  if (!db) {
      console.error("Firestore (db) is not initialized. Cannot get user profile.");
      throw new Error("Database service unavailable for getUserProfile.");
  }
  const userDocRef = doc(db, "users", uid);
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return {
          uid: data.uid,
          email: data.email ?? null,
          displayName: data.displayName ?? null,
          photoURL: data.photoURL ?? null,
          childNickname: data.childNickname ?? null,
          createdAt: data.createdAt as Timestamp,
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error fetching user profile for ${uid}:`, error);
    throw new Error(`Failed to fetch user profile: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const fetchUserProfileForClient = async (uid: string): Promise<UserProfileClient | null> => {
    // This function now relies on getUserProfile which throws on error.
    // The caller (AuthContext) should handle this error.
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
    location: activityData.location === undefined ? null : activityData.location, // Ensure location is null if undefined
    createdAt: serverTimestamp() as Timestamp,
    // participantUids: [activityData.creatorId] // Initialize with creator
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
    if (data.location !== undefined) { // Ensure location is explicitly set to null if it was an empty string or meant to be removed
        updateData.location = data.location;
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
        const friends = await getFriends(uid); // getFriends now throws on error
        const friendIds = friends.map(f => f.uid);
        userAndFriendIds = Array.from(new Set([uid, ...friendIds]));
    } catch (error) {
        console.error("getDashboardActivities: Failed to get friends list. Proceeding with user's activities only.", error);
        userAndFriendIds = [uid]; // Fallback: fetch only user's own created activities
                                   // If even this isn't desired, rethrow the error or throw a new one.
    }

    if (userAndFriendIds.length === 0) {
        console.warn("getDashboardActivities: No user or friend IDs to query for (uid might be empty or friends fetch failed without fallback).");
        return [];
    }

    const activitiesRef = collection(db, "activities");
    const now = Timestamp.now();
    const fetchedActivities: ActivityClient[] = [];

    // Firestore 'in' query limit is 30
    const chunkSize = 30;
    for (let i = 0; i < userAndFriendIds.length; i += chunkSize) {
        const chunk = userAndFriendIds.slice(i, i + chunkSize);
        if (chunk.length === 0) continue;

        try {
            // Query for activities created by users in the current chunk
            const qCreator = query(
                activitiesRef,
                where("creatorId", "in", chunk),
                where("date", ">=", now),
                orderBy("date", "asc")
            );
            const creatorSnapshot = await getDocs(qCreator);
            creatorSnapshot.docs.forEach(doc => {
                fetchedActivities.push(toActivityClient(doc.data() as Activity));
            });

            // Query for activities where users in the current chunk are participants (using participantUids)
            // This requires 'participantUids' array field in your Activity documents.
            // If 'participantUids' is not consistently populated, this query might not return expected results for participation.
            // For now, we assume it might exist. If not, this query will just not find matches based on this criteria.
            // A more robust solution would ensure participantUids is always updated.
            // The current structure of 'participants' (array of objects) is hard to query efficiently for "is uid in this array of objects".
            // if (uid in chunk) { // This doesn't make sense here, chunk is list of creators to check
            // If we want activities where current user `uid` is a participant, and creator is in `chunk`.
            // This becomes very complex. Simpler to query participation separately if needed.
            // }

        } catch (queryError) {
            console.error("getDashboardActivities: Error fetching activities chunk:", queryError);
            // Option: re-throw to fail the entire operation, or log and continue for partial data.
            // For now, log and continue so some activities might still load.
            // throw new Error(`Failed to fetch activities for chunk: ${queryError.message}`);
        }
    }

    // Fetch activities where the current user `uid` is a participant (if participantUids field exists and is used)
    // This is separate from the creator-based fetch to ensure we get all participations of current user
    // Assuming 'Activity' type has 'participantUids?: string[]'
    try {
        const qParticipant = query(
            activitiesRef,
            where("participantUids", "array-contains", uid),
            where("date", ">=", now)
            // orderBy("date", "asc") // Cannot have inequality on 'date' and array-contains with orderBy on different field without composite index
        );
        const participantSnapshot = await getDocs(qParticipant);
        participantSnapshot.docs.forEach(doc => {
            fetchedActivities.push(toActivityClient(doc.data() as Activity));
        });
    } catch (participantQueryError) {
        console.error("getDashboardActivities: Error fetching activities where user is participant:", participantQueryError);
        // Log and continue.
    }


    // Deduplicate activities (if an activity was created by user AND user is in participantUids)
    const uniqueActivities = Array.from(new Map(fetchedActivities.map(act => [act.id, act])).values());
    // Sort all activities by date
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
      participantUids: arrayUnion(user.uid) // Also update participantUids
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
      participantUids: arrayRemove(user.uid) // Also update participantUids
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
    const code = uuidv4().substring(0, 8); // Ensure uuid is installed and imported
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
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot add friend.");
        throw new Error("Database service unavailable for addFriend.");
    }
    if (userId === friendId) {
        console.warn("User tried to add themselves as a friend.");
        const selfAddError = new Error("You cannot add yourself as a friend.");
        (selfAddError as any).code = 'cannot-add-self';
        throw selfAddError;
    }


    const userFriendRef = doc(db, `users/${userId}/friends/${friendId}`);
    const friendUserRef = doc(db, `users/${friendId}/friends/${userId}`);

    const batch = writeBatch(db);
    let operationsCount = 0;

    try {
        const [userProfileData, friendProfileData, userFriendSnap, friendUserSnap] = await Promise.all([
            getUserProfile(userId),
            getUserProfile(friendId),
            getDoc(userFriendRef),
            getDoc(friendUserRef)
        ]);

        if (!userProfileData) throw new Error(`Current user profile not found for UID: ${userId}.`);
        if (!friendProfileData) throw new Error(`Friend profile not found for UID: ${friendId}.`);

        if (userFriendSnap.exists() && friendUserSnap.exists()) {
            console.log(`Users ${userId} and ${friendId} are already friends.`);
            const err = new Error("Users are already friends.");
            (err as any).code = 'already-friends'; // Custom code for handling in UI
            throw err;
        }

        if (!userFriendSnap.exists()) {
            const friendData: Friend = {
                uid: friendProfileData.uid,
                displayName: friendProfileData.displayName ?? null,
                photoURL: friendProfileData.photoURL ?? null,
            };
            batch.set(userFriendRef, friendData);
            operationsCount++;
        }

        if (!friendUserSnap.exists()) {
            const currentUserAsFriendData: Friend = {
                uid: userProfileData.uid,
                displayName: userProfileData.displayName ?? null,
                photoURL: userProfileData.photoURL ?? null,
            };
            batch.set(friendUserRef, currentUserAsFriendData);
            operationsCount++;
        }
        
        if (operationsCount > 0) {
            await batch.commit();
        } else if (!userFriendSnap.exists() || !friendUserSnap.exists()) {
            // This case indicates a partial friendship, which shouldn't happen with batched writes.
            // If somehow one side exists but not the other, this commit would fix it.
            // However, the initial check for full friendship should cover this.
            // For safety, if only one side was missing and now fixed, this is fine.
            // If somehow code reaches here with opsCount = 0 but not fully friends, log it.
            console.warn(`addFriend: No operations performed for ${userId} and ${friendId}, but they were not fully friends. UserSnap: ${userFriendSnap.exists()}, FriendSnap: ${friendUserSnap.exists()}`);
        }

    } catch (error: any) {
        console.error(`Error adding friend connection between ${userId} and ${friendId}:`, error);
        if (error.code === 'already-friends' || error.code === 'cannot-add-self') {
            throw error; // Re-throw specific custom errors
        }
        throw new Error(`Failed to add friend: ${error.message || String(error)}`);
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
  // Order by displayName, Firestore handles nulls by placing them at the beginning or end based on index config
  const q = query(friendsRef, orderBy("displayName", "asc"));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            uid: data.uid,
            displayName: data.displayName ?? null,
            photoURL: data.photoURL ?? null,
        } as Friend; // Ensure Friend type contract
    });
  } catch (error) {
      console.error(`Firebase error fetching friends for ${userId}:`, error);
      throw new Error(`Failed to fetch friends: ${error instanceof Error ? error.message : String(error)}`);
  }
};


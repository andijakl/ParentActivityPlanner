
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
  QuerySnapshot,
  DocumentData,
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
        location: activity.location ?? null,
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
      console.error("Firestore (db) is not initialized.");
      return null;
  }
  const userDocRef = doc(db, "users", uid);
  const userDocSnap = await getDoc(userDocRef);
  if (userDocSnap.exists()) {
    // Ensure all fields match UserProfile, providing defaults for potentially missing ones
    const data = userDocSnap.data();
    return {
        uid: data.uid,
        email: data.email ?? null,
        displayName: data.displayName ?? null,
        photoURL: data.photoURL ?? null,
        childNickname: data.childNickname ?? null,
        createdAt: data.createdAt as Timestamp, // Assume createdAt exists and is a Timestamp
    };
  } else {
    return null;
  }
};

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
  const updateData: { [key: string]: any } = {};
  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.photoURL !== undefined) updateData.photoURL = data.photoURL;
  if (data.childNickname !== undefined) updateData.childNickname = data.childNickname;

  if (Object.keys(updateData).length > 0) {
    await updateDoc(userDocRef, updateData);
  }
};

export const createUserProfile = async (userData: Omit<UserProfile, 'createdAt'>): Promise<void> => {
     if (!db) {
        console.error("Firestore (db) is not initialized. Cannot create profile.");
         throw new Error("Database service unavailable.");
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
  const newActivityForDb: Activity = {
    ...activityData,
    id: newActivityRef.id,
    location: activityData.location ?? null,
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
        const data = activityDocSnap.data() as Activity;
        return toActivityClient(data);
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
    const updateData: { [key: string]: any } = { ...data };
    if (data.location !== undefined) {
        updateData.location = data.location === undefined ? null : data.location;
    }
    await updateDoc(activityDocRef, updateData);
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
    const userAndFriendIds = Array.from(new Set([uid, ...friendIds]));

    if (userAndFriendIds.length === 0) return [];

     const activitiesRef = collection(db, "activities");
     const now = Timestamp.now();

     const chunks: string[][] = [];
     const chunkSize = 30; // Firestore 'in' query limit
     for (let i = 0; i < userAndFriendIds.length; i += chunkSize) {
         chunks.push(userAndFriendIds.slice(i, i + chunkSize));
     }

     const activityPromises = chunks.map(chunk => {
          const qCreator = query(
            activitiesRef,
            where("creatorId", "in", chunk),
            where("date", ">=", now),
            orderBy("date", "asc")
        );
        return getDocs(qCreator);
     });

     // Fetch activities where the current user is a participant
     // This requires a composite index on participants.uid and date
     const currentUserParticipantQuery = query(
        activitiesRef,
        where("participants", "array-contains", {
            uid: uid,
            // For array-contains on objects, all fields must match.
            // This means we need the current user's name and photoURL as stored in activities.
            // This is inherently brittle if name/photoURL change.
            // A 'participantUids' array field would be more robust for this query.
            // For now, we'll try to fetch the current user's profile to match.
            // This part is complex and might need re-evaluation based on how participant data is stored.
            // Assuming participant data is stored with current name/photo at time of joining.
            // This part might be omitted if too complex or unreliable without schema change.
        }), // This specific query is hard to make reliable without knowing exact stored participant object structure
        where("date", ">=", now),
        orderBy("date", "asc")
     );
     // To make the above query work reliably, you'd typically have a 'participantUids' array field.
     // For now, this part of the query is simplified to an example.
     // A more robust approach:
     const participantActivityPromises = getDocs(query(activitiesRef, where("participantUids", "array-contains", uid), where("date", ">=", now), orderBy("date", "asc")));
     // This requires 'participantUids' field in your Activity documents. If not present, this query will yield no results.
     // For this example, I'll assume it is not present and rely on the creator-based fetch and client-side filtering if needed.
     // The provided code structure for participant queries was complex and prone to issues with object matching in array-contains.
     // A simple and robust solution is a `participantUids` array.

     const querySnapshots = await Promise.all(activityPromises);
     // const participantQuerySnapshots = (await Promise.all([participantActivityPromises])).filter(s => s !== null) as QuerySnapshot<DocumentData>[];
     // Simplified - the participant query above is an example and may not work without schema changes

     let activities = querySnapshots.flatMap(snapshot =>
         snapshot.docs.map(doc => {
             const data = doc.data() as Activity;
             return toActivityClient(data);
            })
     );
     
     // If you implement `participantUids`:
     // const participantSnap = await participantActivityPromises;
     // const participantActivities = participantSnap.docs.map(doc => toActivityClient(doc.data() as Activity));
     // activities = [...activities, ...participantActivities];


     // Deduplicate activities based on ID (if fetched from multiple queries)
     const uniqueActivities = Array.from(new Map(activities.map(act => [act.id, act])).values());
     uniqueActivities.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

     return uniqueActivities;
};

export const joinActivity = async (activityId: string, user: { uid: string; name: string | null, photoURL?: string | null }): Promise<void> => {
   if (!db) {
       console.error("Firestore (db) is not initialized. Cannot join activity.");
       throw new Error("Database service unavailable.");
   }
  const activityDocRef = doc(db, "activities", activityId);
  const participantData = {
      uid: user.uid,
      name: user.name ?? null,
      photoURL: user.photoURL ?? null,
  };
  await updateDoc(activityDocRef, {
    participants: arrayUnion(participantData)
    // If using participantUids:
    // participantUids: arrayUnion(user.uid)
  });
};

export const leaveActivity = async (activityId: string, user: { uid: string; name: string | null, photoURL?: string | null }): Promise<void> => {
   if (!db) {
       console.error("Firestore (db) is not initialized. Cannot leave activity.");
       throw new Error("Database service unavailable.");
   }
  const activityDocRef = doc(db, "activities", activityId);
   const participantData = {
      uid: user.uid,
      name: user.name ?? null,
      photoURL: user.photoURL ?? null,
  };
  await updateDoc(activityDocRef, {
    participants: arrayRemove(participantData)
    // If using participantUids:
    // participantUids: arrayRemove(user.uid)
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
        inviterName: inviterName ?? null,
        createdAt: serverTimestamp() as Timestamp,
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
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

    const userFriendRef = doc(db, `users/${userId}/friends/${friendId}`);
    const friendUserRef = doc(db, `users/${friendId}/friends/${userId}`);

    // Check if they are already fully connected to prevent redundant operations or errors
    const userFriendSnap = await getDoc(userFriendRef);
    const friendUserSnap = await getDoc(friendUserRef);

    if (userFriendSnap.exists() && friendUserSnap.exists()) {
        console.log(`Users ${userId} and ${friendId} are already bidirectionally friends.`);
        const err = new Error("Users are already friends.");
        (err as any).code = 'already-friends';
        throw err;
    }

    const batch = writeBatch(db);

    // Data for friendId to be added to userId's list
    if (!userFriendSnap.exists()) {
        const friendProfile = await getUserProfile(friendId);
        if (!friendProfile) throw new Error(`Friend profile not found for UID: ${friendId}.`);
        const friendData: Friend = {
            uid: friendProfile.uid,
            displayName: friendProfile.displayName ?? null,
            photoURL: friendProfile.photoURL ?? null,
        };
        batch.set(userFriendRef, friendData);
    }

    // Data for userId to be added to friendId's list
    if (!friendUserSnap.exists()) {
        const currentUserProfile = await getUserProfile(userId);
        if (!currentUserProfile) throw new Error(`Current user profile not found for UID: ${userId}.`);
        const currentUserAsFriendData: Friend = {
            uid: currentUserProfile.uid,
            displayName: currentUserProfile.displayName ?? null,
            photoURL: currentUserProfile.photoURL ?? null,
        };
        batch.set(friendUserRef, currentUserAsFriendData);
    }
    
    // Commit batch only if there were any operations added
    // (i.e., if they weren't already fully friends)
    if (!userFriendSnap.exists() || !friendUserSnap.exists()) {
        await batch.commit();
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
  const q = query(friendsRef, orderBy("displayName", "asc")); // Firestore handles null in orderBy
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return { // Ensure Friend type contract
          uid: data.uid,
          displayName: data.displayName ?? null,
          photoURL: data.photoURL ?? null,
      } as Friend;
  });
};

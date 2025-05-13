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
const toUserProfileClient = (profile: UserProfile): UserProfileClient => {
    // Ensure createdAt is a Firestore Timestamp before converting
    const createdAtTimestamp = profile.createdAt instanceof Timestamp ? profile.createdAt : null;
    return {
        ...profile,
        // Fallback to epoch if timestamp is not valid, to prevent crash
        createdAt: createdAtTimestamp ? createdAtTimestamp.toDate().toISOString() : new Date(0).toISOString(),
    };
};

const toActivityClient = (activity: Activity): ActivityClient => {
    const dateTimestamp = activity.date instanceof Timestamp ? activity.date : null;
    const createdAtTimestamp = activity.createdAt instanceof Timestamp ? activity.createdAt : null;
    return {
        ...activity,
        // Fallback to epoch if timestamps are not valid
        date: dateTimestamp ? dateTimestamp.toDate().toISOString() : new Date(0).toISOString(),
        createdAt: createdAtTimestamp ? createdAtTimestamp.toDate().toISOString() : new Date(0).toISOString(),
    };
};

const toInvitationClient = (invitation: Invitation): InvitationClient => {
    const createdAtTimestamp = invitation.createdAt instanceof Timestamp ? invitation.createdAt : null;
    // expiresAt can be undefined or a Timestamp
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
    const profileForDb: UserProfile = { // Ensure it matches UserProfile type for Firestore
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
  const newActivityForDb: Activity = { // Ensure it matches Activity type for Firestore
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
    const userAndFriendIds = Array.from(new Set([uid, ...friendIds])); 

    if (userAndFriendIds.length === 0) return [];

     const activitiesRef = collection(db, "activities");
     const now = Timestamp.now();

     const chunks: string[][] = [];
     const chunkSize = 30; 
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
     
    const participantActivityPromises = chunks.map(async chunk => {
        if (chunk.includes(uid)) {
             const currentUserProfileForQuery = await getUserProfile(uid);
             const qUserIsParticipant = query(
                 activitiesRef,
                 where("participants", "array-contains", {
                     uid: uid,
                     name: currentUserProfileForQuery?.displayName ?? null,
                     photoURL: currentUserProfileForQuery?.photoURL ?? null
                 }),
                 where("date", ">=", now),
                 orderBy("date", "asc")
             );
             return getDocs(qUserIsParticipant);
        }
        return Promise.resolve(null); 
     });


     const querySnapshots = await Promise.all(activityPromises);
     const participantQuerySnapshots = (await Promise.all(participantActivityPromises)).filter(s => s !== null) as FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>[];


     let activities = querySnapshots.flatMap(snapshot =>
         snapshot.docs.map(doc => {
             const data = doc.data() as Activity;
             return toActivityClient(data); 
            })
     );

     const participantActivities = participantQuerySnapshots.flatMap(snapshot =>
        snapshot.docs.map(doc => {
            const data = doc.data() as Activity;
            return toActivityClient(data);
        })
     );
     
     // Combine and deduplicate activities based on ID
     const combinedActivities = [...activities, ...participantActivities];
     const uniqueActivities = Array.from(new Map(combinedActivities.map(act => [act.id, act])).values());
     
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
    const code = uuidv4().substring(0, 8); 
    const inviteDocRef = doc(db, "invitations", code);

    const newInvitationForDb: Invitation = { // Ensure matches Invitation type
        code: code,
        inviterId: inviterId,
        inviterName: inviterName,
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
    const userFriendSnap = await getDoc(userFriendRef);
    
    const friendUserRef = doc(db, `users/${friendId}/friends/${userId}`);
    const friendUserSnap = await getDoc(friendUserRef);

    if (userFriendSnap.exists() && friendUserSnap.exists()) {
        console.log(`Users ${userId} and ${friendId} are already bidirectionally friends.`);
        const err = new Error("Users are already friends.");
        (err as any).code = 'already-friends';
        throw err;
    }
    
    const batch = writeBatch(db);

    const friendProfile = await getUserProfile(friendId);
    if (!friendProfile) {
        throw new Error(`Friend profile not found for UID: ${friendId}.`);
    }
    const friendData: Friend = {
        uid: friendProfile.uid,
        displayName: friendProfile.displayName,
        photoURL: friendProfile.photoURL,
    };
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
    if (!friendUserSnap.exists()) {
        batch.set(friendUserRef, currentUserAsFriendData);
    }
    
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
  const q = query(friendsRef, orderBy("displayName", "asc")); 
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Friend);
};

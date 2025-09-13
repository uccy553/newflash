'use client';

import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Import db
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { UserProfile } from '@/types';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'; // Import Firestore functions
import { FIRESTORE_COLLECTIONS } from '@/lib/constants';

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  isProUser?: boolean; // Example for future extension
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user: User | null) => {
      if (user) {
        const userProfileData: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        };

        // Save/update user profile in Firestore
        const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, user.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (!userDocSnap.exists()) {
            // New user, create document
            await setDoc(userDocRef, {
              ...userProfileData,
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
            });
            console.log('New user profile created in Firestore for UID:', user.uid);
          } else {
            // Existing user, update last login time and potentially other synced fields
            await setDoc(userDocRef, {
              // ...userDocSnap.data(), // if you want to preserve all existing fields
              email: userProfileData.email, // Sync email
              displayName: userProfileData.displayName, // Sync displayName
              photoURL: userProfileData.photoURL, // Sync photoURL
              lastLoginAt: serverTimestamp(),
            }, { merge: true }); // merge:true ensures other fields are not overwritten
            console.log('User profile updated in Firestore for UID:', user.uid);
          }
          // Fetch the possibly updated document to include timestamps for the context
          const updatedUserDoc = await getDoc(userDocRef);
          if (updatedUserDoc.exists()) {
            setCurrentUser(updatedUserDoc.data() as UserProfile);
          } else {
             setCurrentUser(userProfileData); // Fallback to auth data if Firestore fetch fails post-write
          }

        } catch (error) {
          console.error("Error saving/updating user profile to Firestore:", error);
          // Fallback to auth data if Firestore operation fails
          setCurrentUser(userProfileData);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

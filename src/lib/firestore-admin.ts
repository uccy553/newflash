
import { adminDb } from '@/lib/firebase-admin-init';
import type { Note, StoredQuiz, QuizQuestion } from '@/types';
import { AdminTimestamp, AdminFieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS } from './constants';

const checkAdminDbInitialized = () => {
  if (!adminDb) {
    const errorMessage = "CRITICAL ERROR: Firebase Admin SDK (adminDb) is not initialized. This almost certainly means the service account JSON in 'src/lib/firebase-admin-init.ts' is incorrect, incomplete, or still a placeholder. Please: 1. Go to your Firebase project settings > Service accounts. 2. Generate a new private key (JSON file). 3. Copy the ENTIRE content of that JSON file. 4. Paste it to replace the placeholder 'serviceAccount' object in 'src/lib/firebase-admin-init.ts'. 5. Redeploy. Check your Vercel deployment logs for detailed error messages from 'firebase-admin-init.ts' if the problem persists.";
    console.error(`[firestore-admin] ${errorMessage}`);
    throw new Error(errorMessage);
  }
};

// Note Operations (Admin SDK) - Used by chatbot flow
export const getNotes = async (userId: string): Promise<Note[]> => {
  checkAdminDbInitialized();
  const q = adminDb.collection(FIRESTORE_COLLECTIONS.USERS).doc(userId).collection(FIRESTORE_COLLECTIONS.NOTES).orderBy('updatedAt', 'desc');
  const querySnapshot = await q.get();
  const notes = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Note));
  return notes;
};


// StoredQuiz Operations (Admin SDK)
// These functions are currently NOT USED by the quiz generator flow, as it has been refactored to use client-side saving.
// They are kept here in case other server-side features might need to interact with StoredQuiz data using admin privileges.

/*
export const saveGeneratedQuiz = async (
  userId: string,
  quizData: Omit<StoredQuiz, 'id' | 'userId' | 'createdAt'>
): Promise<string> => {
  checkAdminDbInitialized();
  const now = AdminTimestamp.now();
  const fullQuizData: Omit<StoredQuiz, 'id'> = {
    ...quizData,
    userId,
    createdAt: now,
    // Ensure attempt-related fields are initially undefined or not set if this function is for definition only
  };
  try {
    const docRef = await adminDb.collection(FIRESTORE_COLLECTIONS.USERS).doc(userId).collection(FIRESTORE_COLLECTIONS.GENERATED_QUIZZES).add(fullQuizData);
    return docRef.id;
  } catch (e) {
    console.error("LIB/FIRESTORE-ADMIN - saveGeneratedQuiz: addDoc ERROR:", e);
    throw e;
  }
};

export const getRecentQuizQuestionsForUser = async (
  userId: string,
  limitCount: number,
  noteCategory?: string
): Promise<QuizQuestion[]> => {
  checkAdminDbInitialized();

  let query = adminDb.collection(FIRESTORE_COLLECTIONS.USERS)
                      .doc(userId)
                      .collection(FIRESTORE_COLLECTIONS.GENERATED_QUIZZES)
                      .orderBy('createdAt', 'desc') // or 'attemptedAt' if that makes more sense for "recent"
                      .limit(limitCount);

  if (noteCategory) {
    query = query.where('noteCategory', '==', noteCategory);
  }

  const querySnapshot = await query.get();
  const recentQuizzes = querySnapshot.docs.map(docSnap => docSnap.data() as StoredQuiz);

  const allRecentQuestions: QuizQuestion[] = recentQuizzes.reduce((acc, currQuiz) => {
    return acc.concat(currQuiz.questions);
  }, [] as QuizQuestion[]);

  return allRecentQuestions;
};
*/

import { db } from '@/lib/firebase';
import type { Flashcard, QuizSession, Note } from '@/types';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  orderBy,
  limit,
  WriteBatch,
  writeBatch,
  getCountFromServer, 
} from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from './constants';
import { startOfDay, subDays } from 'date-fns';

// Flashcard Operations
export const createFlashcard = async (userId: string, flashcardData: Omit<Flashcard, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();
  const fullFlashcardData: Omit<Flashcard, 'id'> = {
    ...flashcardData,
    phoneticTranscriptionIPA: flashcardData.phoneticTranscriptionIPA || '', 
    tags: flashcardData.tags || [],
    exampleSentence: flashcardData.exampleSentence || '',
    userId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = await addDoc(collection(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.FLASHCARDS), fullFlashcardData);
    return docRef.id;
  } catch (e) {
    console.error("LIB/FIRESTORE - createFlashcard: addDoc ERROR:", e);
    throw e; 
  }
};

export const getFlashcards = async (userId: string): Promise<Flashcard[]> => {
  const q = query(collection(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.FLASHCARDS), orderBy('updatedAt', 'desc'));
  const querySnapshot = await getDocs(q);
  const flashcards = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Flashcard));
  return flashcards;
};

export const getFlashcard = async (userId: string, flashcardId: string): Promise<Flashcard | null> => {
  const docRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.FLASHCARDS, flashcardId);
  const docSnap = await getDoc(docRef);
  const flashcard = docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Flashcard) : null;
  return flashcard;
};

export const updateFlashcard = async (userId: string, flashcardId: string, data: Partial<Omit<Flashcard, 'id' | 'userId' | 'createdAt'>>): Promise<void> => {
  const docRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.FLASHCARDS, flashcardId);
  const dataToUpdate = { ...data };
  if ('phoneticTranscriptionIPA' in dataToUpdate && dataToUpdate.phoneticTranscriptionIPA === undefined) {
    dataToUpdate.phoneticTranscriptionIPA = ''; 
  }
  if ('tags' in dataToUpdate && dataToUpdate.tags === undefined) {
    dataToUpdate.tags = [];
  }
   if ('exampleSentence' in dataToUpdate && dataToUpdate.exampleSentence === undefined) {
    dataToUpdate.exampleSentence = '';
  }

  try {
    await updateDoc(docRef, { ...dataToUpdate, updatedAt: Timestamp.now() });
  } catch (e) {
    console.error("LIB/FIRESTORE - updateFlashcard: updateDoc ERROR:", e);
    throw e;
  }
};

export const deleteFlashcard = async (userId: string, flashcardId: string): Promise<void> => {
  const docRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.FLASHCARDS, flashcardId);
  try {
    await deleteDoc(docRef);
  } catch (e) {
     console.error("LIB/FIRESTORE - deleteFlashcard: deleteDoc ERROR:", e);
    throw e;
  }
};

export const getDueFlashcards = async (userId: string, count: number = 10): Promise<Flashcard[]> => {
  const now = Timestamp.now();
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.FLASHCARDS),
    where('nextReview', '<=', now),
    orderBy('nextReview', 'asc'),
    limit(count)
  );
  const querySnapshot = await getDocs(q);
  const flashcards = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Flashcard));
  return flashcards;
};

export const updateFlashcardsBatch = async (userId: string, flashcardsToUpdate: Pick<Flashcard, 'id' | 'nextReview' | 'interval' | 'easeFactor' | 'repetitions'>[]): Promise<void> => {
  if (flashcardsToUpdate.length === 0) {
    return;
  }
  const batch: WriteBatch = writeBatch(db);
  flashcardsToUpdate.forEach(flashcard => {
    if (flashcard.id) {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.FLASHCARDS, flashcard.id);
      batch.update(docRef, {
        nextReview: flashcard.nextReview,
        interval: flashcard.interval,
        easeFactor: flashcard.easeFactor,
        repetitions: flashcard.repetitions,
        updatedAt: Timestamp.now(),
      });
    }
  });
  try {
    await batch.commit();
  } catch (e) {
    console.error("LIB/FIRESTORE - updateFlashcardsBatch: Batch commit ERROR:", e);
    throw e;
  }
};


// Quiz History Operations
export const recordQuizSession = async (userId: string, quizData: Omit<QuizSession, 'id' | 'userId'>): Promise<string> => {
  const fullQuizData: Omit<QuizSession, 'id'> = {
    ...quizData,
    userId,
  };
  try {
    const docRef = await addDoc(collection(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.QUIZ_HISTORY), fullQuizData);
    return docRef.id;
  } catch (e) {
    console.error("LIB/FIRESTORE - recordQuizSession: addDoc ERROR:", e);
    throw e;
  }
};

export const getQuizHistory = async (userId: string): Promise<QuizSession[]> => {
  const q = query(collection(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.QUIZ_HISTORY), orderBy('date', 'desc'));
  const querySnapshot = await getDocs(q);
  const history = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as QuizSession));
  return history;
};

// New function to count flashcards created within a certain period
export const getFlashcardsCountByPeriod = async (userId: string, periodInDays: number): Promise<number> => {
  const endDate = Timestamp.now();
  const startDate = Timestamp.fromDate(startOfDay(subDays(new Date(), periodInDays -1 ))); 

  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.FLASHCARDS),
    where('createdAt', '>=', startDate),
    where('createdAt', '<=', endDate)
  );
  try {
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
     console.warn("getCountFromServer failed, falling back to getDocs for count:", error);
     const querySnapshot = await getDocs(q);
     return querySnapshot.size;
  }
};

// New function to get total quizzes taken
export const getTotalQuizzesTaken = async (userId: string): Promise<number> => {
  const q = query(collection(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.QUIZ_HISTORY));
   try {
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
     console.warn("getCountFromServer failed, falling back to getDocs for count:", error);
     const querySnapshot = await getDocs(q);
     return querySnapshot.size;
  }
};

// Note Operations
export const createNote = async (userId: string, noteData: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();
  const fullNoteData: Omit<Note, 'id'> = {
    title: noteData.title,
    content: noteData.content,
    category: noteData.category || '', // Ensure category is an empty string if undefined
    userId,
    createdAt: now,
    updatedAt: now,
  };
  try {
    const docRef = await addDoc(collection(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.NOTES), fullNoteData);
    return docRef.id;
  } catch (e) {
    console.error("LIB/FIRESTORE - createNote: addDoc ERROR:", e);
    throw e;
  }
};

export const getNotes = async (userId: string): Promise<Note[]> => {
  const q = query(collection(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.NOTES), orderBy('updatedAt', 'desc'));
  const querySnapshot = await getDocs(q);
  const notes = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Note));
  return notes;
};

export const getNote = async (userId: string, noteId: string): Promise<Note | null> => {
  const docRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.NOTES, noteId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Note) : null;
};

export const updateNote = async (userId: string, noteId: string, data: Partial<Omit<Note, 'id' | 'userId' | 'createdAt'>>): Promise<void> => {
  const docRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.NOTES, noteId);
  const dataToUpdate = { ...data };
  if ('category' in dataToUpdate && dataToUpdate.category === undefined) {
    dataToUpdate.category = '';
  }
  try {
    await updateDoc(docRef, { ...dataToUpdate, updatedAt: Timestamp.now() });
  } catch (e) {
    console.error("LIB/FIRESTORE - updateNote: updateDoc ERROR:", e);
    throw e;
  }
};

export const deleteNote = async (userId: string, noteId: string): Promise<void> => {
  const docRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.NOTES, noteId);
  try {
    await deleteDoc(docRef);
  } catch (e) {
    console.error("LIB/FIRESTORE - deleteNote: deleteDoc ERROR:", e);
    throw e;
  }
};



import { db } from '@/lib/firebase';
import type { Flashcard, QuizSession, Note, StoredQuiz, ActivityLogEntry, UserTheoryAnswer, TheoryQuizQuestion, ObjectiveQuizQuestion } from '@/types';
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
  setDoc, // For setDoc with merge
} from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from './constants';
import { startOfDay, subDays, format as formatDateFns, parseISO } from 'date-fns';

// Flashcard Operations (Client SDK)
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
    console.error("LIB/FIRESTORE-CLIENT - createFlashcard: addDoc ERROR:", e);
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
    console.error("LIB/FIRESTORE-CLIENT - updateFlashcard: updateDoc ERROR:", e);
    throw e;
  }
};

export const deleteFlashcard = async (userId: string, flashcardId: string): Promise<void> => {
  const docRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.FLASHCARDS, flashcardId);
  try {
    await deleteDoc(docRef);
  } catch (e) {
    console.error("LIB/FIRESTORE-CLIENT - deleteFlashcard: deleteDoc ERROR:", e);
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
  const batchOp: WriteBatch = writeBatch(db);
  flashcardsToUpdate.forEach(flashcard => {
    if (flashcard.id) {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.FLASHCARDS, flashcard.id);
      batchOp.update(docRef, {
        nextReview: flashcard.nextReview,
        interval: flashcard.interval,
        easeFactor: flashcard.easeFactor,
        repetitions: flashcard.repetitions,
        updatedAt: Timestamp.now(),
      });
    }
  });
  try {
    await batchOp.commit();
  } catch (e) {
    console.error("LIB/FIRESTORE-CLIENT - updateFlashcardsBatch: Batch commit ERROR:", e);
    throw e;
  }
};


// Quiz History Operations (Client SDK - For "Due Cards Review")
export const recordQuizSession = async (userId: string, quizData: Omit<QuizSession, 'id' | 'userId'>): Promise<string> => {
  const fullQuizData: Omit<QuizSession, 'id'> = {
    ...quizData,
    userId,
  };
  try {
    const docRef = await addDoc(collection(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.QUIZ_HISTORY), fullQuizData);
    return docRef.id;
  } catch (e) {
    console.error("LIB/FIRESTORE-CLIENT - recordQuizSession: addDoc ERROR:", e);
    throw e;
  }
};

export const getQuizHistory = async (userId: string): Promise<QuizSession[]> => {
  const q = query(collection(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.QUIZ_HISTORY), orderBy('date', 'desc'));
  const querySnapshot = await getDocs(q);
  const history = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as QuizSession));
  return history;
};

// Function to count flashcards created within a certain period (Client SDK)
export const getFlashcardsCountByPeriod = async (userId: string, periodInDays: number): Promise<number> => {
  const endDate = Timestamp.now();
  const startDate = Timestamp.fromDate(startOfDay(subDays(new Date(), periodInDays - 1)));

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

// Note Operations (Client SDK)
export const createNote = async (userId: string, noteData: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();
  const fullNoteData: Omit<Note, 'id'> = {
    title: noteData.title,
    content: noteData.content,
    category: noteData.category?.trim() || '',
    userId,
    createdAt: now,
    updatedAt: now,
    sourceImageUrl: noteData.sourceImageUrl
  };
  if (!noteData.sourceImageUrl) {
    delete (fullNoteData as Partial<Note>).sourceImageUrl;
  }

  try {
    const docRef = await addDoc(collection(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.NOTES), fullNoteData);
    return docRef.id;
  } catch (e) {
    console.error("LIB/FIRESTORE-CLIENT - createNote: addDoc ERROR:", e);
    throw e;
  }
};

export const getNotesForClient = async (userId: string): Promise<Note[]> => {
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
  if ('category' in dataToUpdate && typeof dataToUpdate.category === 'string') {
    dataToUpdate.category = dataToUpdate.category.trim();
  } else if ('category' in dataToUpdate && dataToUpdate.category === undefined) {
     dataToUpdate.category = '';
  }
  if (dataToUpdate.sourceImageUrl === undefined) {
    delete dataToUpdate.sourceImageUrl;
  }

  try {
    await updateDoc(docRef, { ...dataToUpdate, updatedAt: Timestamp.now() });
  } catch (e) {
    console.error("LIB/FIRESTORE-CLIENT - updateNote: updateDoc ERROR:", e);
    throw e;
  }
};

export const deleteNote = async (userId: string, noteId: string): Promise<void> => {
  const docRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.NOTES, noteId);
  try {
    await deleteDoc(docRef);
  } catch (e) {
    console.error("LIB/FIRESTORE-CLIENT - deleteNote: deleteDoc ERROR:", e);
    throw e;
  }
};

export const getUserNoteCategories = async (userId: string): Promise<string[]> => {
  const notes = await getNotesForClient(userId);
  const categories = new Set<string>();
  notes.forEach(note => {
    if (note.category && note.category.trim() !== '') {
      categories.add(note.category.trim());
    }
  });
  return Array.from(categories).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
};

// AI Generated Quiz Operations (Client SDK)
export const saveGeneratedQuizAttempt = async (
  userId: string,
  quizAttemptData: Omit<StoredQuiz, 'id' | 'userId'>
): Promise<string> => {
  const fullQuizDataToSave: Omit<StoredQuiz, 'id'> = {
      ...quizAttemptData,
      userId,
  };
  
  // Clean up optional fields before saving
  if (!quizAttemptData.noteCategory || quizAttemptData.noteCategory.trim() === '') {
    delete (fullQuizDataToSave as Partial<StoredQuiz>).noteCategory;
  }
  if (!quizAttemptData.pdfFileName || quizAttemptData.pdfFileName.trim() === '') {
    delete (fullQuizDataToSave as Partial<StoredQuiz>).pdfFileName;
  }

  if (quizAttemptData.quizMode === 'objective') {
    delete (fullQuizDataToSave as Partial<StoredQuiz>).theoryQuestions;
    delete (fullQuizDataToSave as Partial<StoredQuiz>).userTheoryAnswers;
  } else if (quizAttemptData.quizMode === 'theory') {
    delete (fullQuizDataToSave as Partial<StoredQuiz>).questions;
    delete (fullQuizDataToSave as Partial<StoredQuiz>).userScore;
    delete (fullQuizDataToSave as Partial<StoredQuiz>).userCorrectAnswers;
    delete (fullQuizDataToSave as Partial<StoredQuiz>).userIncorrectAnswers;
    // questionsInQuiz for theory could be theoryQuestions.length
    fullQuizDataToSave.questionsInQuiz = quizAttemptData.theoryQuestions?.length || 0;
  }


  try {
    const docRef = await addDoc(
      collection(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.GENERATED_QUIZZES),
      fullQuizDataToSave
    );
    return docRef.id;
  } catch (e) {
    console.error("LIB/FIRESTORE-CLIENT - saveGeneratedQuizAttempt: addDoc ERROR:", e);
    throw e;
  }
};

export const getAttemptedGeneratedQuizzes = async (userId: string): Promise<StoredQuiz[]> => {
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.GENERATED_QUIZZES),
    where('attemptedAt', '!=', null), // Ensure it was actually attempted
    orderBy('attemptedAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  const quizzes = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as StoredQuiz));
  return quizzes;
};


// Activity Log for Streaks (Client SDK)
export const logStudyActivity = async (userId: string): Promise<void> => {
  const today = new Date();
  const dateString = formatDateFns(today, 'yyyy-MM-dd'); // Format as YYYY-MM-DD for document ID

  const activityLogRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.ACTIVITY_LOG, dateString);

  try {
    // Set with merge to create or update the document for today
    await setDoc(activityLogRef, {
      userId: userId,
      lastActivityAt: Timestamp.now(),
    }, { merge: true });
    console.log(`Activity logged for user ${userId} on ${dateString}`);
  } catch (e) {
    console.error("LIB/FIRESTORE-CLIENT - logStudyActivity: setDoc ERROR:", e);
    // Don't throw, as this is a background task, but log it.
  }
};

export const getRecentActivityLogs = async (userId: string, limitDays: number = 60): Promise<ActivityLogEntry[]> => {
  const sinceDate = Timestamp.fromDate(subDays(new Date(), limitDays));

  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.ACTIVITY_LOG),
    where('lastActivityAt', '>=', sinceDate),
    orderBy('lastActivityAt', 'desc'), 
    limit(limitDays) 
  );

  const querySnapshot = await getDocs(q);
  const activityLogs = querySnapshot.docs.map(docSnap => ({
    id: docSnap.id, 
    ...docSnap.data()
  } as ActivityLogEntry));
  return activityLogs;
};


import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
}

export interface Flashcard {
  id?: string;
  front: string;
  back: string;
  exampleSentence?: string;
  phoneticTranscriptionIPA?: string;
  tags?: string[];
  nextReview: Timestamp;
  interval: number; // in days
  easeFactor: number;
  repetitions: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userId: string;
}

export interface QuizSession { // This is for "Due Cards Review" (Spaced Repetition)
  id?: string;
  userId: string;
  date: Timestamp;
  score: number; // percentage 0-100
  cardsReviewed: number;
  correctAnswers: number;
  incorrectAnswers: number;
}

// For Spaced Repetition algorithm
export interface RepetitionItem {
  interval: number;
  repetitions: number;
  easeFactor: number;
}

export type PerformanceRating = 0 | 1 | 2 | 3 | 4 | 5;

export interface Note {
  id?: string;
  userId: string;
  title: string;
  content: string;
  category?: string;
  sourceImageUrl?: string; // Store the first image preview as a reference
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Types for AI Quiz Generator
export interface ObjectiveQuizQuestion { // Renamed from QuizQuestion
  id: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface TheoryQuizQuestion {
  id: string;
  questionText: string;
  idealAnswer: string; // AI's suggested ideal answer or key points
}

// Input for the AI Flow and Server Action (client provides these for quiz generation)
export interface GenerateQuizFromNotesInput {
  notesContent: string;
  questionCount: number;
  quizMode: 'objective' | 'theory'; // Added
  noteCategory?: string;
  recentQuestionTexts?: string[]; // From client's local storage, mainly for objective
  quizSourceType?: 'notes' | 'pdf';
}

// Output from the AI Flow and Server Action for quiz generation
export interface GenerateQuizFromNotesOutput {
  objectiveQuestions?: ObjectiveQuizQuestion[]; // Optional
  theoryQuestions?: TheoryQuizQuestion[]; // Optional
  generatedQuizMode: 'objective' | 'theory'; // To confirm which type was generated
}

export interface UserQuizAttempt { // For objective questions
  questionId: string;
  selectedOptionIndex: number | null;
}

export interface UserTheoryAnswer { // For theory questions
  questionId: string;
  userAnswer: string;
}

export interface ObjectiveQuizResult extends ObjectiveQuizQuestion {
  userSelectedOptionIndex: number | null;
  isCorrect: boolean;
}

export interface TheoryQuizResult extends TheoryQuizQuestion {
  userAnswer: string;
}


// Represents a quiz (with user attempt) as stored in Firestore by the client
export interface StoredQuiz {
  id?: string; // Firestore document ID
  userId: string; // Owner of the quiz attempt
  quizMode: 'objective' | 'theory'; // Added

  // For objective quizzes
  questions?: ObjectiveQuizQuestion[]; // Previously QuizQuestion[]
  userScore?: number; // Score (0-100) achieved by the user (for objective)
  userCorrectAnswers?: number; // For objective
  userIncorrectAnswers?: number; // For objective
  questionsInQuiz?: number; // Total questions in this quiz (questions.length for objective)

  // For theory quizzes
  theoryQuestions?: TheoryQuizQuestion[];
  userTheoryAnswers?: UserTheoryAnswer[];

  notesContentSnippet: string; // Snippet of notes/PDF used for generation context
  noteCategory?: string; // Category of notes quiz was based on (if source was notes)
  quizSourceType?: 'notes' | 'pdf'; // Source of the quiz content
  pdfFileName?: string; // If source was PDF
  attemptedAt?: Timestamp; // When the user took and submitted this quiz
  createdAt: Timestamp; // When this specific quiz *instance* was generated/attempted
}

// Types for Math Solver
export interface SolveMathProblemInput {
  problemStatement?: string;
  mathContext?: string;
  imageDataUri?: string;
}

export interface SolveMathProblemOutput {
  parsedProblem: string;
  extractedProblemFromImage?: string;
  solution: string;
  detailedExplanation: string;
}

export interface ActivityLogEntry {
  id?: string; // YYYY-MM-DD
  userId: string;
  lastActivityAt: Timestamp;
}

// Types for Personalized Tips AI Flow
export interface TopicPerformanceStat {
  name: string;
  averageScore: number;
  quizzesTaken: number;
}

export interface GeneratePersonalizedTipsInput {
  userId: string;
  excellingTopics: TopicPerformanceStat[];
  needsPracticeTopics: TopicPerformanceStat[];
  currentStreak: number;
  newCardsLast7Days: number;
  averageQuizScore: number;
  totalStudyCards: number;
}

export interface GeneratePersonalizedTipsOutput {
  tips: string[];
}

// Types for Flashcard Generation from Note
export interface SuggestedFlashcard {
  front: string;
  back: string;
  exampleSentence?: string;
  suggestedTags?: string[];
}

export interface GenerateFlashcardsFromNoteInput {
  noteContent: string;
  targetFlashcardCount?: number; // Optional: Suggest a number of flashcards
}

export interface GenerateFlashcardsFromNoteOutput {
  suggestedFlashcards: SuggestedFlashcard[];
}


export const APP_NAME = 'FlashFlow';
export const MAX_IMAGE_SIZE_MB = 5; // Max size for a single image for note digitization before compression
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export const MAX_MATH_IMAGE_SIZE_MB = 2; // Max size for math problem images
export const MAX_MATH_IMAGE_SIZE_BYTES = MAX_MATH_IMAGE_SIZE_MB * 1024 * 1024;

export const MAX_IMAGES_PER_UPLOAD = 50; // Max number of images for a single note digitization session


export const DEFAULT_EASE_FACTOR = 2.5;
export const DEFAULT_INTERVAL = 1; // days
export const DEFAULT_REPETITIONS = 0;

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  FLASHCARDS: 'flashcards',
  QUIZ_HISTORY: 'quizHistory', // For "Due Cards Review"
  NOTES: 'notes',
  GENERATED_QUIZZES: 'generatedQuizzes', // For AI Quiz Generator from notes
  ACTIVITY_LOG: 'activityLog', // For tracking daily study activity for streaks
};

import type { RepetitionItem, PerformanceRating } from '@/types';

// SM-2 Algorithm constants
const MIN_EASE_FACTOR = 1.3;

/**
 * Calculates the next review date and updates spaced repetition parameters.
 * Based on the SM-2 algorithm.
 *
 * @param item The flashcard's current repetition data.
 * @param quality The user's recall performance rating (0-5).
 * @returns Updated repetition data.
 */
export function calculateSpacedRepetition(
  item: RepetitionItem,
  quality: PerformanceRating
): RepetitionItem {
  if (quality < 0 || quality > 5) {
    throw new Error('Quality rating must be between 0 and 5.');
  }

  let { interval, repetitions, easeFactor } = item;

  if (quality < 3) {
    // Failed recall: reset repetitions and interval
    repetitions = 0;
    interval = 1; // Review again tomorrow
  } else {
    // Successful recall
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1; // First successful review
    } else if (repetitions === 2) {
      interval = 6; // Second successful review
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < MIN_EASE_FACTOR) {
    easeFactor = MIN_EASE_FACTOR;
  }

  return {
    interval,
    repetitions,
    easeFactor,
  };
}

/**
 * Gets the date for the next review.
 * @param intervalInDays The interval in days until the next review.
 * @returns A Date object for the next review.
 */
export function getNextReviewDate(intervalInDays: number): Date {
  const today = new Date();
  const nextReviewDate = new Date(today.setDate(today.getDate() + intervalInDays));
  return nextReviewDate;
}

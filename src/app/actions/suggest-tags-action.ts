'use server';

import { suggestFlashcardTags, type SuggestFlashcardTagsInput, type SuggestFlashcardTagsOutput } from '@/ai/flows/suggest-flashcard-tags';

interface SuggestTagsActionResult {
    success: boolean;
    tags?: string[];
    error?: string;
}

export async function handleSuggestTagsAction(input: SuggestFlashcardTagsInput): Promise<SuggestTagsActionResult> {
  try {
    const result: SuggestFlashcardTagsOutput = await suggestFlashcardTags(input);
    return { success: true, tags: result.tags };
  } catch (error) {
    console.error("Error suggesting tags:", error);
    // Ensure error is an instance of Error or has a message property
    const errorMessage = error instanceof Error ? error.message : "Failed to suggest tags due to an unknown error";
    return { success: false, error: errorMessage };
  }
}

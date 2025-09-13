'use server';

import { generateFlashcardContent, type GenerateFlashcardContentInput, type GenerateFlashcardContentOutput } from '@/ai/flows/generate-flashcard-content-flow';

interface GenerateContentActionResult {
    success: boolean;
    data?: GenerateFlashcardContentOutput;
    error?: string;
}

export async function handleGenerateFlashcardContentAction(input: GenerateFlashcardContentInput): Promise<GenerateContentActionResult> {
  try {
    const result: GenerateFlashcardContentOutput = await generateFlashcardContent(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error generating flashcard content:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate content due to an unknown error";
    return { success: false, error: errorMessage };
  }
}

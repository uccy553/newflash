
'use server';

import { generateFlashcardsFromNote } from '@/ai/flows/generate-flashcards-from-note-flow';
import type { GenerateFlashcardsFromNoteInput, GenerateFlashcardsFromNoteOutput } from '@/types';

interface GenerateFlashcardsActionResult {
    success: boolean;
    data?: GenerateFlashcardsFromNoteOutput;
    error?: string;
}

export async function handleGenerateFlashcardsFromNoteAction(
    input: GenerateFlashcardsFromNoteInput
): Promise<GenerateFlashcardsActionResult> {
  try {
    // Add default targetFlashcardCount if not provided by client
    const flowInput: GenerateFlashcardsFromNoteInput = {
      ...input,
      targetFlashcardCount: input.targetFlashcardCount || 5, // Default to 5 if not specified
    };

    const result: GenerateFlashcardsFromNoteOutput = await generateFlashcardsFromNote(flowInput);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error generating flashcards from note via action:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate flashcards from note due to an unknown error.";
    return { success: false, error: errorMessage };
  }
}

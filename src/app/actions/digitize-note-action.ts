
'use server';

import { digitizeHandwrittenNote, type DigitizeHandwrittenNoteInput, type DigitizeHandwrittenNoteOutput } from '@/ai/flows/digitize-handwritten-note-flow';

interface DigitizeNoteActionResult {
    success: boolean;
    data?: DigitizeHandwrittenNoteOutput;
    error?: string;
}

export async function handleDigitizeNoteAction(input: DigitizeHandwrittenNoteInput): Promise<DigitizeNoteActionResult> {
  try {
    const result: DigitizeHandwrittenNoteOutput = await digitizeHandwrittenNote(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error digitizing handwritten note:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to digitize note due to an unknown error.";
    return { success: false, error: errorMessage };
  }
}

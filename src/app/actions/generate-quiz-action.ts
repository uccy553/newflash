
'use server';

import { generateQuizFromNotes, type GenerateQuizFromNotesInput as FlowGenerateQuizFromNotesInput } from '@/ai/flows/generate-quiz-from-notes-flow';
import type { GenerateQuizFromNotesInput as AppClientGenerateQuizFromNotesInput, GenerateQuizFromNotesOutput as AppClientGenerateQuizFromNotesOutput } from '@/types'; // Ensure correct output type

interface GenerateQuizActionResult {
    success: boolean;
    data?: AppClientGenerateQuizFromNotesOutput; // Use the app's output type
    error?: string;
}

export async function handleGenerateQuizAction(input: AppClientGenerateQuizFromNotesInput): Promise<GenerateQuizActionResult> {
  try {
    const flowInput: FlowGenerateQuizFromNotesInput = {
        notesContent: input.notesContent,
        questionCount: input.questionCount,
        quizMode: input.quizMode, // Pass the quizMode
        noteCategory: input.noteCategory,
        recentQuestionTexts: input.recentQuestionTexts || [],
        quizSourceType: input.quizSourceType || 'notes',
    };
    // The flow's output (FlowGenerateQuizFromNotesOutput) is compatible with AppClientGenerateQuizFromNotesOutput
    const result: AppClientGenerateQuizFromNotesOutput = await generateQuizFromNotes(flowInput);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error generating quiz from notes via action:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate quiz due to an unknown error.";
    return { success: false, error: errorMessage };
  }
}


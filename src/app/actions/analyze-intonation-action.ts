
'use server';

import { analyzeSentenceIntonation, type AnalyzeSentenceIntonationInput, type AnalyzeSentenceIntonationOutput } from '@/ai/flows/analyze-intonation-flow';

interface AnalyzeIntonationActionResult {
    success: boolean;
    data?: AnalyzeSentenceIntonationOutput;
    error?: string;
}

export async function handleAnalyzeIntonationAction(input: AnalyzeSentenceIntonationInput): Promise<AnalyzeIntonationActionResult> {
  try {
    const result: AnalyzeSentenceIntonationOutput = await analyzeSentenceIntonation(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error analyzing sentence intonation:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to analyze intonation due to an unknown error.";
    return { success: false, error: errorMessage };
  }
}


'use server';

import { generatePersonalizedTips } from '@/ai/flows/generate-personalized-tips-flow';
import type { GeneratePersonalizedTipsInput, GeneratePersonalizedTipsOutput } from '@/types';

interface GenerateTipsActionResult {
  success: boolean;
  data?: GeneratePersonalizedTipsOutput;
  error?: string;
}

export async function handleGeneratePersonalizedTipsAction(
  input: GeneratePersonalizedTipsInput
): Promise<GenerateTipsActionResult> {
  try {
    const result: GeneratePersonalizedTipsOutput = await generatePersonalizedTips(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error generating personalized tips via action:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate personalized tips due to an unknown error.";
    return { success: false, error: errorMessage };
  }
}


'use server';

import { solveMathProblem } from '@/ai/flows/solve-math-problem-flow';
import type { SolveMathProblemInput, SolveMathProblemOutput } from '@/types';

interface SolveMathProblemActionResult {
  success: boolean;
  data?: SolveMathProblemOutput;
  error?: string;
}

export async function handleSolveMathProblemAction(
  input: SolveMathProblemInput
): Promise<SolveMathProblemActionResult> {
  try {
    const result: SolveMathProblemOutput = await solveMathProblem(input);
    // Check if the AI indicated it couldn't solve or parse.
    // This is a soft error condition that the frontend might want to handle differently.
    if (result.solution.toLowerCase().includes("unable to solve") || result.solution.toLowerCase().includes("error")) {
        // We still consider it a "success" from the action's perspective because the AI processed it.
        // The frontend will interpret the content of result.data.
         return { success: true, data: result };
    }
    return { success: true, data: result };
  } catch (error) {
    console.error("Error solving math problem via action:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to solve math problem due to an unknown error.";
    return { success: false, error: errorMessage };
  }
}

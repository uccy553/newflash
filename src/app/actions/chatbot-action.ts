
'use server';

import { askEnglishTutor, type EnglishTutorChatInput, type EnglishTutorChatOutput } from '@/ai/flows/english-tutor-chat-flow';

interface ChatbotActionResult {
    success: boolean;
    data?: EnglishTutorChatOutput;
    error?: string;
}

export async function handleChatbotInteraction(input: EnglishTutorChatInput): Promise<ChatbotActionResult> {
  try {
    // Basic input validation (more can be added based on schema)
    if (!input.userId || !input.message) {
      return { success: false, error: "User ID and message are required." };
    }

    const result: EnglishTutorChatOutput = await askEnglishTutor(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in chatbot interaction:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to get response from chatbot due to an unknown error.";
    return { success: false, error: errorMessage };
  }
}

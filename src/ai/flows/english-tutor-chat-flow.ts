
'use server';
/**
 * @fileOverview A Genkit flow for an AI study tutor chatbot.
 * This chatbot can answer general study questions.
 *
 * - askStudyTutor - Main function to interact with the chatbot.
 * - StudyTutorChatInput - Input type for the chatbot.
 * - StudyTutorChatOutput - Output type from the chatbot.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { fetchUserNotesTool } from '@/ai/tools/fetch-user-notes-tool'; // Kept for potential future use but not actively prompted.
import type { MessageData, MessagePart } from 'genkit';

const StudyTutorChatInputSchema = z.object({
  userId: z.string().min(1, {message: "User ID cannot be empty."}).describe("The ID of the user making the request. This is critical for context if any user-specific tools were to be used in the future."),
  sessionId: z.string().describe("The ID of the current chat session, if continuing an existing one."),
  message: z.string().min(1, { message: "Message cannot be empty." }).describe("The user's current message to the chatbot."),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.custom<MessagePart[]>((val) => {
      if (!Array.isArray(val)) return false;
      return val.every(part =>
        typeof (part as any).text === 'string' ||
        ((part as any).toolRequest && typeof (part as any).toolRequest === 'object') ||
        ((part as any).toolResponse && typeof (part as any).toolResponse === 'object')
      );
    }).describe("Each message part within content. Can be text, tool request, or tool response."),
  })).optional().describe("The history of the conversation so far. Must be an array of user/model turns."),
});
export type EnglishTutorChatInput = z.infer<typeof StudyTutorChatInputSchema>; // Keep exported type name for compatibility with action for now
export type StudyTutorChatInput = z.infer<typeof StudyTutorChatInputSchema>;


const StudyTutorChatOutputSchema = z.object({
  response: z.string().describe("The AI tutor's response message."),
  sessionId: z.string().optional().describe("The session ID, returned to ensure client stays in sync."),
});
export type EnglishTutorChatOutput = z.infer<typeof StudyTutorChatOutputSchema>; // Keep for action compatibility
export type StudyTutorChatOutput = z.infer<typeof StudyTutorChatOutputSchema>;

const SYSTEM_PROMPT_TEMPLATE = `You are Flash, an expert and exceptionally friendly AI study tutor for the FlashFlow app.
Your primary goal is to help the user improve their understanding and knowledge across various subjects by answering their questions clearly and concisely.

INTERACTION STYLE:
- For general questions, answer directly and helpfully.
- Be conversational, encouraging, and keep responses focused.
- Address the user directly.

Your responses should be helpful and directly address the user's query.
You are a general assistant; you do not have access to personal user data like notes unless a specific tool is explicitly invoked by the user for a clearly defined purpose (currently, no such active note-accessing features are prompted for general interaction).
`;


const studyTutorChatFlow = ai.defineFlow(
  {
    name: 'studyTutorChatFlow',
    inputSchema: StudyTutorChatInputSchema,
    outputSchema: StudyTutorChatOutputSchema,
  },
  async (input) => {
    const { userId, message, history = [], sessionId } = input;

    if (!userId) {
      console.error("[studyTutorChatFlow] Critical error: userId is missing from input.");
      return { response: "I'm sorry, but I'm missing some information needed to proceed. Please try again.", sessionId };
    }
    if (!sessionId) {
        console.error("[studyTutorChatFlow] Critical error: sessionId is missing from input.");
        return { response: "I'm sorry, there was an issue with the chat session. Please try again.", sessionId };
    }

    // No {{USER_ID}} placeholder in the simplified prompt, so direct use.
    const filledSystemPrompt = SYSTEM_PROMPT_TEMPLATE;
    
    const messagesForLLM: MessageData[] = history.map(h => ({
        role: h.role,
        content: h.content.map(part => {
            if (part.text) return { text: part.text };
            if ((part as any).toolRequest) return { toolRequest: (part as any).toolRequest };
            if ((part as any).toolResponse) return { toolResponse: (part as any).toolResponse };
            return { text: "Unsupported history part type" };
        }) as MessagePart[],
    }));
    
    messagesForLLM.push({ role: 'user', content: [{ text: message }] });

    const cleanedMessagesForLLM = messagesForLLM.filter((msg, index, arr) => {
      const isInitialBotMsg = index === 0 && msg.role === 'model' && arr.length > 1;
      const isLoginPrompt = msg.content[0]?.text?.includes("Please log in to use");
      const isGreeting = msg.content[0]?.text?.includes("Hello learner!") || msg.content[0]?.text?.includes("Hello!");
      return !(isInitialBotMsg && (isLoginPrompt || isGreeting));
    });


    try {
      console.log("[studyTutorChatFlow] Sending to LLM. UserID:", userId, "SessionID:", sessionId, "Message:", message, "Cleaned History Length:", cleanedMessagesForLLM.length -1);
      
      const llmResponse = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        systemInstruction: [{ text: filledSystemPrompt }], 
        messages: cleanedMessagesForLLM,
        // Removed fetchUserNotesTool from active tools for this general chat, 
        // as the prompt no longer directs the LLM to use it proactively.
        // tools: [fetchUserNotesTool], 
        config: {
          temperature: 0.7, // Slightly increased for more varied general conversation
          safetySettings: [ 
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        },
        // toolChoice: 'auto', // Can be removed if no tools are actively prompted.
      });

      const responseText = llmResponse.text;

      if (!responseText) {
        const toolCallParts = llmResponse.candidates?.[0]?.message?.content.filter(part => part.toolRequest);
        if (toolCallParts && toolCallParts.length > 0) {
           console.warn("[studyTutorChatFlow] LLM responded with tool calls despite not being prompted. This is unexpected.");
          // Gracefully handle unexpected tool call attempt
          return { response: "I'm focusing on answering your questions directly right now. How can I help?", sessionId };
        }
        console.error("[studyTutorChatFlow] AI response text is empty and no tool call detected. Full LLM Response:", JSON.stringify(llmResponse, null, 2));
        return { response: "I seem to be having trouble formulating a response right now. Could you try rephrasing?", sessionId };
      }

      console.log("[studyTutorChatFlow] Received response from LLM:", responseText);
      return { response: responseText, sessionId };

    } catch (e) {
      console.error("[studyTutorChatFlow] Error during AI generation:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      return { response: `I encountered an unexpected issue while processing your request. Please try again. (Details: ${errorMessage.substring(0, 150)}${errorMessage.length > 150 ? '...' : ''})`, sessionId };
    }
  }
);

export async function askEnglishTutor(
  inputFromClient: Omit<StudyTutorChatInput, 'history' | 'sessionId'> & { 
    history?: Array<{ role: 'user' | 'model'; content: Array<MessagePart>; id?: string; sessionId?: string }>;
    sessionId: string;
  }
): Promise<StudyTutorChatOutput> {

  if (!inputFromClient.userId) {
    console.error("[askEnglishTutor] User ID is missing in the input.");
    throw new Error("User ID is missing in the input to askEnglishTutor.");
  }
  if (!inputFromClient.sessionId) {
    console.error("[askEnglishTutor] Session ID is missing in the input.");
    throw new Error("Session ID is missing in the input to askEnglishTutor.");
  }

  const cleanedHistoryForFlow: Array<{ role: 'user' | 'model'; content: MessagePart[] }> =
    (inputFromClient.history || [])
    .filter(h => h.sessionId === inputFromClient.sessionId) 
    .map(h => {
      const validParts: MessagePart[] = h.content
        .map(part => {
          if (part.text && typeof part.text === 'string' && part.text.trim() !== '') {
            return { text: part.text };
          }
          // Tool requests/responses are less likely now but kept for schema compatibility.
          if (part.toolRequest && typeof part.toolRequest === 'object') return part;
          if (part.toolResponse && typeof part.toolResponse === 'object') return part;
          return null;
        })
        .filter(part => part !== null) as MessagePart[];
      return { role: h.role, content: validParts }; 
    })
    .filter(h => h.content.length > 0);


  const processedInput: StudyTutorChatInput = {
    userId: inputFromClient.userId,
    message: inputFromClient.message,
    history: cleanedHistoryForFlow,
    sessionId: inputFromClient.sessionId,
  };

  return studyTutorChatFlow(processedInput);
}

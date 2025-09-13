/**
 * @fileOverview Genkit tool to fetch a user's notes from Firestore.
 * This tool is designed to be called by an AI agent.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getNotes } from '@/lib/firestore'; // Assuming this correctly fetches notes
import type { Note } from '@/types';

export const FetchUserNotesToolInputSchema = z.object({
  userId: z.string().min(1, {message: "User ID cannot be empty."}).describe("The unique identifier of the user whose notes are to be fetched. This ID MUST be provided by the AI agent calling this tool, based on system instructions."),
});
export type FetchUserNotesToolInput = z.infer<typeof FetchUserNotesToolInputSchema>;

// Output schema is a string, which will contain formatted notes or an error/status message.
export const FetchUserNotesToolOutputSchema = z.string().describe(
  "A single string containing all the user's notes, formatted for readability (e.g., 'Title: [Note Title]\\nContent: [Note Content Snippet]\\n---'). If no notes are found, this will be a message like 'No notes found for this user.' If an error occurs, it will be an error message."
);
export type FetchUserNotesToolOutput = z.infer<typeof FetchUserNotesToolOutputSchema>;

export const fetchUserNotesTool = ai.defineTool(
  {
    name: 'fetchUserNotesTool',
    description: "Fetches all of a user's saved English language notes from the FlashFlow application. The AI agent MUST provide the 'userId' as input; this ID is given to the agent by the system.",
    inputSchema: FetchUserNotesToolInputSchema,
    outputSchema: FetchUserNotesToolOutputSchema, // Output is a string
  },
  async (input: FetchUserNotesToolInput): Promise<FetchUserNotesToolOutput> => {
    console.log("[fetchUserNotesTool] Received input:", JSON.stringify(input)); // Log received input

    if (!input || !input.userId) {
      console.error("[fetchUserNotesTool] Critical Error: userId is missing in the input.", input);
      // This message should be clear to the LLM if it somehow calls the tool without the ID.
      return "Error: User ID was not provided to the tool. Cannot fetch notes.";
    }

    const userId = input.userId; // Extract userId for clarity

    console.log(`[fetchUserNotesTool] Attempting to fetch notes for userId: ${userId}`); // Log the userId being used

    try {
      const userNotes: Note[] = await getNotes(userId); // Pass the extracted userId
      console.log(`[fetchUserNotesTool] Fetched ${userNotes.length} notes for userId: ${userId}`); // Log success and count

      if (!userNotes || userNotes.length === 0) {
        console.log(`[fetchUserNotesTool] No notes found for userId: ${userId}`);
        return "No notes found for this user.";
      }

      // Format notes into a single string for the LLM.
      const MAX_NOTES_TO_SUMMARIZE = 5;
      const MAX_CONTENT_LENGTH_PER_NOTE = 300;

      const formattedNotes = userNotes
        .slice(0, MAX_NOTES_TO_SUMMARIZE)
        .map(note => {
          const contentSnippet = note.content.length > MAX_CONTENT_LENGTH_PER_NOTE
            ? note.content.substring(0, MAX_CONTENT_LENGTH_PER_NOTE) + "..."
            : note.content;
          // Replace multiple newlines for better processing by LLM
          return `Title: ${note.title}\nContent: ${contentSnippet.replace(/\n+/g, ' ')}\n---`;
        })
        .join('\n\n');

      let finalOutput = formattedNotes;
      if (userNotes.length > MAX_NOTES_TO_SUMMARIZE) {
        finalOutput += `\n\n(Showing first ${MAX_NOTES_TO_SUMMARIZE} of ${userNotes.length} notes due to context limits.)`;
      }

      const MAX_TOTAL_LENGTH = 2000;
      if (finalOutput.length > MAX_TOTAL_LENGTH) {
        finalOutput = finalOutput.substring(0, MAX_TOTAL_LENGTH) + "\n...(notes truncated due to overall length limit)";
      }

      console.log(`[fetchUserNotesTool] Returning formatted notes for userId: ${userId}. Length: ${finalOutput.length}`);
      return finalOutput;

    } catch (error) {
      console.error(`[fetchUserNotesTool] Error fetching notes for user ${userId}:`, error);
      // Provide a generic error message to the LLM, sensitive details logged server-side.
      // Check if the error message indicates permissions issue
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('denied')) {
          return `An error occurred while trying to fetch the notes. The error message indicates insufficient permissions. Please verify your user ID and ensure the system has the necessary permissions to access your notes.`;
      }
      return `An error occurred while trying to fetch the notes. Details: ${errorMessage}`;
    }
  }
);

// Example of how this tool might be called by the AI (conceptual, for understanding):
// ai.generate({
//   prompt: "Quiz me on my notes.", // Or user asking about their notes
//   tools: [fetchUserNotesTool],
//   // ... other params, including the system prompt that provides the userId
// })
// The LLM would then (if correctly prompted by the system prompt) generate a toolRequest.
// The input would be like: { userId: 'actualUserIdFromSystemPrompt' }
// This would be handled by Genkit to call the tool.
// The result (formatted notes string or error message) is then passed back to the LLM.

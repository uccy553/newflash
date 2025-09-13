
'use server';
/**
 * @fileOverview AI flow to generate suggested flashcards from a given note's content.
 *
 * - generateFlashcardsFromNote - Generates flashcard suggestions from note text.
 * - GenerateFlashcardsFromNoteInput - Input type for the function.
 * - GenerateFlashcardsFromNoteOutput - Output type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { GenerateFlashcardsFromNoteInput, GenerateFlashcardsFromNoteOutput, SuggestedFlashcard } from '@/types';

const SuggestedFlashcardSchema = z.object({
  front: z.string().describe('The concise term, question, or concept for the front of the flashcard.'),
  back: z.string().describe('The corresponding definition, answer, or explanation for the back of the flashcard.'),
  exampleSentence: z.string().optional().describe('An optional example sentence demonstrating the usage of the term/concept.'),
  suggestedTags: z.array(z.string()).optional().describe('An optional array of 1-3 relevant tags (1-2 words each) for the flashcard.'),
});

const GenerateFlashcardsFromNoteInputSchema = z.object({
  noteContent: z.string().min(50, { message: "Note content must be at least 50 characters." }).describe("The text content of the user's note from which to generate flashcards."),
  targetFlashcardCount: z.number().min(1).max(20).default(5).optional().describe("The desired number of flashcards to generate (e.g., 5-10). The AI will aim for this number but may produce more or fewer based on content."),
});

const GenerateFlashcardsFromNoteOutputSchema = z.object({
  suggestedFlashcards: z.array(SuggestedFlashcardSchema).describe('An array of suggested flashcard objects.'),
});

export async function generateFlashcardsFromNote(input: GenerateFlashcardsFromNoteInput): Promise<GenerateFlashcardsFromNoteOutput> {
  return generateFlashcardsFromNoteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFlashcardsFromNotePrompt',
  input: { schema: GenerateFlashcardsFromNoteInputSchema },
  output: { schema: GenerateFlashcardsFromNoteOutputSchema },
  prompt: `You are an expert tutor tasked with helping a student create effective study flashcards from their notes.
Given the following "Note Content", your goal is to identify key information and formulate approximately {{{targetFlashcardCount}}} distinct flashcards.

Note Content:
{{{noteContent}}}

For each flashcard you suggest, provide:
1.  "front": A concise term, concept, or question suitable for the front of a flashcard.
2.  "back": The corresponding definition, answer, or explanation for the back.
3.  "exampleSentence" (Optional): If relevant, a brief example sentence showing the term/concept in use.
4.  "suggestedTags" (Optional): An array of 1-3 short, relevant tags (1-2 words each) that would help categorize this flashcard (e.g., "vocabulary", "key concept", "grammar rule", "historical event").

Guidelines:
- Focus on the most important and testable pieces of information in the note.
- Ensure the 'front' and 'back' are well-defined and suitable for a flashcard format (i.e., not too long, clear question/answer relationship).
- Prioritize clarity and conciseness.
- If the note is short, you may generate fewer than the target count. If it's very rich, you can generate up to (or slightly more than) the target count if many distinct, high-quality flashcards can be made.
- Do not make up information not present in the note.

Respond with a JSON object matching the output schema, containing a "suggestedFlashcards" array.
Do not include any explanatory text outside the JSON object.
`,
});

const generateFlashcardsFromNoteFlow = ai.defineFlow(
  {
    name: 'generateFlashcardsFromNoteFlow',
    inputSchema: GenerateFlashcardsFromNoteInputSchema,
    outputSchema: GenerateFlashcardsFromNoteOutputSchema,
  },
  async (input: GenerateFlashcardsFromNoteInput): Promise<GenerateFlashcardsFromNoteOutput> => {
    const { output } = await prompt(input);
    if (!output || !output.suggestedFlashcards) {
      // Return empty array if AI fails to generate or output is malformed
      return { suggestedFlashcards: [] };
    }
    return output;
  }
);


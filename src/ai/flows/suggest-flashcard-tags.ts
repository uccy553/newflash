
'use server';

/**
 * @fileOverview AI-powered tag suggestion for flashcards, tailored for general learning.
 *
 * - suggestFlashcardTags - A function that suggests tags for a given flashcard content.
 * - SuggestFlashcardTagsInput - The input type for the suggestFlashcardTags function.
 * - SuggestFlashcardTagsOutput - The return type for the suggestFlashcardTags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestFlashcardTagsInputSchema = z.object({
  frontContent: z.string().describe('The content on the front of the flashcard, typically a term, concept, or question.'),
  backContent: z.string().describe('The content on the back of the flashcard, typically the answer, definition, or explanation.'),
  exampleSentence: z.string().optional().describe('An example sentence or context demonstrating the usage of the term/concept on the flashcard.'),
});
export type SuggestFlashcardTagsInput = z.infer<typeof SuggestFlashcardTagsInputSchema>;

const SuggestFlashcardTagsOutputSchema = z.object({
  tags: z
    .array(z.string())
    .describe('An array of suggested tags for the flashcard, relevant to the subject matter.'),
});
export type SuggestFlashcardTagsOutput = z.infer<typeof SuggestFlashcardTagsOutputSchema>;


export async function suggestFlashcardTags(input: SuggestFlashcardTagsInput): Promise<SuggestFlashcardTagsOutput> {
  return suggestFlashcardTagsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestFlashcardTagsPrompt',
  input: {schema: SuggestFlashcardTagsInputSchema},
  output: {schema: SuggestFlashcardTagsOutputSchema},
  prompt: `You are an expert tutor and lexicographer with broad knowledge.
Given the content of a study card, suggest relevant tags that would help a learner categorize and find it.

Consider the following aspects for tagging:
- Item Type (e.g., definition, formula, key date, historical event, theory, concept, vocabulary)
- Part of speech if applicable (e.g., noun, verb, adjective)
- Subject or Topic (e.g., biology, history, physics, literature, chapter 1, unit 3)
- Key concepts illustrated or related.

Flashcard Content:
Front of Card (Term/Question): {{{frontContent}}}
Back of Card (Answer/Definition): {{{backContent}}}
{{#if exampleSentence}}
Example/Context: {{{exampleSentence}}}
{{/if}}

Suggest 3-5 relevant tags. Ensure tags are concise (1-3 words).
Respond with a JSON array of strings. Do not include any explanation text. Just the array.
`,
});

const suggestFlashcardTagsFlow = ai.defineFlow(
  {
    name: 'suggestFlashcardTagsFlow',
    inputSchema: SuggestFlashcardTagsInputSchema,
    outputSchema: SuggestFlashcardTagsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output ? { tags: Array.isArray(output.tags) ? output.tags : [] } : { tags: [] };
  }
);


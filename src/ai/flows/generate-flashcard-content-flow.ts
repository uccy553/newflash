
'use server';
/**
 * @fileOverview AI-powered flashcard content generation for general learning.
 * Includes autocorrection of the input term/concept, detailed definitions/explanations, example sentences,
 * part of speech (if applicable), phonetic transcription (IPA) for terms, and additional information.
 *
 * - generateFlashcardContent - A function that generates comprehensive content for a given term or concept.
 * - GenerateFlashcardContentInput - The input type for the generateFlashcardContent function.
 * - GenerateFlashcardContentOutput - The return type for the generateFlashcardContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFlashcardContentInputSchema = z.object({
  wordOrPhrase: z.string().describe('The term, concept, or question for which to generate content. This may contain typos or be phrased as a question.'),
});
export type GenerateFlashcardContentInput = z.infer<typeof GenerateFlashcardContentInputSchema>;

const GenerateFlashcardContentOutputSchema = z.object({
  correctedWordOrPhrase: z.string().describe('The-auto-corrected or rephrased version of the input term/concept. If no correction was needed, this will be the same as the input.'),
  wasCorrected: z.boolean().describe('Indicates if the input wordOrPhrase was auto-corrected or significantly rephrased.'),
  definition: z.string().describe('A clear and concise primary definition or explanation of the corrected term/concept, suitable for a learner.'),
  exampleSentence: z.string().describe('An example sentence or context demonstrating the usage or application of the corrected term/concept.'),
  partOfSpeech: z.string().optional().describe('The part of speech if the input is a single word or common phrase (e.g., noun, verb, adjective, idiom). Less relevant for broad concepts or questions.'),
  phoneticTranscriptionIPA: z.string().optional().describe('The International Phonetic Alphabet (IPA) transcription, if applicable (primarily for single words/terms).'),
  additionalInfo: z.string().optional().describe('Additional information such as related concepts, synonyms/antonyms (if applicable), different forms, or nuances in usage. Formatted as a string for display.')
});
export type GenerateFlashcardContentOutput = z.infer<typeof GenerateFlashcardContentOutputSchema>;

export async function generateFlashcardContent(input: GenerateFlashcardContentInput): Promise<GenerateFlashcardContentOutput> {
  return generateFlashcardContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFlashcardContentPrompt',
  input: {schema: GenerateFlashcardContentInputSchema},
  output: {schema: GenerateFlashcardContentOutputSchema},
  prompt: `You are an expert tutor and lexicographer with broad knowledge.
Given a term, concept, or question, your tasks are:
1.  **Autocorrect/Rephrase**: Identify if the input ({{{wordOrPhrase}}}) is misspelled, grammatically incorrect, or could be phrased more clearly for a study card. Determine the most likely correct or improved version.
2.  **Provide Comprehensive Information for the Corrected/Rephrased Item**:
    *   A clear, primary definition or explanation suitable for a learner.
    *   A simple example sentence or usage context.
    *   Its part of speech (e.g., noun, verb, adjective, idiom, concept, theory), if applicable.
    *   Its International Phonetic Alphabet (IPA) transcription, if it's a pronounceable word/phrase.
    *   Additional relevant information, including:
        *   Related concepts or terms.
        *   Common synonyms or antonyms (if applicable).
        *   Different forms (e.g., if it's a verb, its noun/adjective form; if noun, its plural or verb form).
        *   Brief notes on nuances or specific contexts of usage if important for learners.

Input Term/Concept/Question: {{{wordOrPhrase}}}

Respond with a JSON object with the following fields:
-   "correctedWordOrPhrase": The corrected or rephrased version of the input. If the input was already optimal, return the original input.
-   "wasCorrected": A boolean (true if a correction or significant rephrasing was made, false otherwise).
-   "definition": The primary definition or explanation.
-   "exampleSentence": An illustrative example or context.
-   "partOfSpeech": The part of speech or item type.
-   "phoneticTranscriptionIPA": The IPA transcription (if applicable).
-   "additionalInfo": A single string containing related concepts, synonyms, antonyms, forms, and nuances, formatted for readability (e.g., using bullet points or clear labels within the string like "Related: ..., Synonyms: ..., Notes: ...").

Example for 'additionalInfo' formatting:
"Related: Osmosis, Active Transport\\nKey Idea: Movement from high to low concentration\\nForms: Diffuses (verb), Diffusible (adjective)"

Ensure the response is tailored for a general learner.
Do not include any explanation text outside the JSON object. Just the JSON object.
`,
});

const generateFlashcardContentFlow = ai.defineFlow(
  {
    name: 'generateFlashcardContentFlow',
    inputSchema: GenerateFlashcardContentInputSchema,
    outputSchema: GenerateFlashcardContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate content.');
    }
    return output;
  }
);


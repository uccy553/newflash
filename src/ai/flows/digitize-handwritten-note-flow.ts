
'use server';
/**
 * @fileOverview AI-powered handwritten note digitization.
 * Extracts text from an image, corrects it, formats it, and suggests a title.
 *
 * - digitizeHandwrittenNote - Processes an image of handwritten notes.
 * - DigitizeHandwrittenNoteInput - Input type for the function.
 * - DigitizeHandwrittenNoteOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DigitizeHandwrittenNoteInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "An image of handwritten notes, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type DigitizeHandwrittenNoteInput = z.infer<typeof DigitizeHandwrittenNoteInputSchema>;

const DigitizeHandwrittenNoteOutputSchema = z.object({
  suggestedTitle: z.string().describe('An AI-generated concise title for the note based on its content.'),
  correctedAndFormattedText: z.string().describe('The extracted text, corrected for errors (spelling, grammar) and formatted for readability (e.g., paragraphs, lists if discernible).'),
  originalExtractedText: z.string().optional().describe('The raw text extracted from the image before any corrections or formatting (for debugging or comparison).'),
});
export type DigitizeHandwrittenNoteOutput = z.infer<typeof DigitizeHandwrittenNoteOutputSchema>;

export async function digitizeHandwrittenNote(input: DigitizeHandwrittenNoteInput): Promise<DigitizeHandwrittenNoteOutput> {
  return digitizeHandwrittenNoteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'digitizeHandwrittenNotePrompt',
  input: {schema: DigitizeHandwrittenNoteInputSchema},
  output: {schema: DigitizeHandwrittenNoteOutputSchema},
  prompt: `You are an expert OCR (Optical Character Recognition) and text processing AI.
Your task is to process the provided image of handwritten notes.

Image of handwritten notes: {{media url=imageDataUri}}

Perform the following steps:
1.  **Extract Text**: Accurately extract all text from the image. Preserve the general structure if possible.
2.  **Correct and Format Text**:
    *   Correct any spelling mistakes and grammatical errors in the extracted text.
    *   Format the corrected text for readability. This might include creating paragraphs where appropriate or identifying potential list items if the handwriting structure suggests them. Maintain the original meaning.
    *   The output should be clean, well-formatted text.
3.  **Generate Title**: Based on the corrected and formatted text, generate a concise and relevant title (3-7 words) that summarizes the main topic or content of the notes.
4.  **Original Extraction (Optional)**: If possible, also provide the raw, uncorrected text as extracted from the image.

Respond with a JSON object matching the output schema.
Focus on accuracy for text.
`,
});

const digitizeHandwrittenNoteFlow = ai.defineFlow(
  {
    name: 'digitizeHandwrittenNoteFlow',
    inputSchema: DigitizeHandwrittenNoteInputSchema,
    outputSchema: DigitizeHandwrittenNoteOutputSchema,
  },
  async (input: DigitizeHandwrittenNoteInput) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI failed to process the handwritten note image.');
    }
    return output;
  }
);


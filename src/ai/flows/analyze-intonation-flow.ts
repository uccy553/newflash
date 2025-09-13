
'use server';
/**
 * @fileOverview AI-powered English sentence intonation analysis.
 * Identifies sentence type, intonation pattern, explains usage, and provides simplified pitch contour data.
 *
 * - analyzeSentenceIntonation - Analyzes an English sentence for its intonation characteristics.
 * - AnalyzeSentenceIntonationInput - Input type for the analyzeSentenceIntonation function.
 * - AnalyzeSentenceIntonationOutput - Output type for the analyzeSentenceIntonation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeSentenceIntonationInputSchema = z.object({
  sentence: z.string().min(1, { message: "Sentence cannot be empty." }).describe('The English sentence to analyze for intonation.'),
});
export type AnalyzeSentenceIntonationInput = z.infer<typeof AnalyzeSentenceIntonationInputSchema>;

const PitchPointSchema = z.object({
  time: z.number().min(0).max(1).describe('Normalized time point in the sentence (0 for start, 1 for end).'),
  pitch: z.number().min(1).max(5).describe('Relative pitch level (e.g., 1=low, 3=mid, 5=high).'),
});

const AnalyzeSentenceIntonationOutputSchema = z.object({
  sentenceType: z.string().describe('The classified type of the sentence (e.g., Statement, Yes/No Question, WH-Question, Command, Exclamation).'),
  intonationPattern: z.string().describe('The identified intonation pattern or pitch tune. MUST be one of: Falling Tune, Rising Tune, Fall-Rise Tune, Rise-Fall Tune.'),
  explanation: z.string().describe('A brief explanation of why this intonation pattern is typically used for this type of sentence, or the specific nuance it conveys.'),
  pitchContourData: z.array(PitchPointSchema).optional().describe('Optional: A simplified series of 2 to 5 data points representing a basic pitch contour for the intonation pattern. Points include "time" (0-1) and "pitch" (1-5).'),
});
export type AnalyzeSentenceIntonationOutput = z.infer<typeof AnalyzeSentenceIntonationOutputSchema>;

export async function analyzeSentenceIntonation(input: AnalyzeSentenceIntonationInput): Promise<AnalyzeSentenceIntonationOutput> {
  return analyzeSentenceIntonationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSentenceIntonationPrompt',
  input: {schema: AnalyzeSentenceIntonationInputSchema},
  output: {schema: AnalyzeSentenceIntonationOutputSchema},
  prompt: `You are an expert in English phonetics, prosody, and intonation, with a keen understanding of how different intonation patterns convey subtle meanings.
Analyze the given English sentence: "{{{sentence}}}"

Your tasks are to:
1.  **Identify Sentence Type**: Classify the sentence (e.g., Statement, Yes/No Question, WH-Question, Command, Exclamation).
2.  **Identify Intonation Pattern**: This is a critical step. You MUST choose one of the following four distinct intonation patterns for the \`intonationPattern\` field. Consider the typical meanings and contexts for each:
    *   **Falling Tune (↘)**: Often used for definitive statements, commands, WH-questions, and exclamations indicating finality or certainty.
    *   **Rising Tune (↗)**: Often used for Yes/No questions, expressions of surprise or doubt, or to indicate non-finality (e.g., in lists, before a pause).
    *   **Fall-Rise Tune (↘︎↗︎)**: This tune is crucial for conveying nuanced meanings. It's often used to express:
        *   Politeness (e.g., "Would you mind ↘︎↗︎closing the window?")
        *   Hesitation or uncertainty (e.g., "Well, I'm not ↘︎↗︎sure.")
        *   Contrast or reservation (e.g., "I like the ↘︎color, but not the ↘︎↗︎style.")
        *   Implication or suggesting something more (e.g., "It's ↘︎good... (but... )↘︎↗︎")
        *   Polite correction or contradiction.
        *   Warnings or admonishments.
        Do NOT misclassify this as a simple Falling Tune. Its rising end component is key.
    *   **Rise-Fall Tune (↗︎↘︎)**: Often used to express strong emotions or attitudes such as:
        *   Surprise or amazement (e.g., "That's /↗︎↘︎wonderful!")
        *   Enthusiasm or strong approval.
        *   Sarcasm or irony (depending on context and tone of voice).
        *   Sometimes, impatience or strong disagreement.
        *   Strong assertions or emphatic statements.

    Determine the most appropriate and common intonation pattern for the given sentence, paying close attention to potential nuances that might indicate a Fall-Rise or Rise-Fall pattern. The value for \`intonationPattern\` must be exactly one of: "Falling Tune", "Rising Tune", "Fall-Rise Tune", "Rise-Fall Tune".
3.  **Explain Usage**: Provide a concise explanation (1-2 sentences) of why the identified intonation pattern (from the four above) is typically used for this sentence type OR for conveying the specific nuance you identified. If you chose Fall-Rise or Rise-Fall, explain the specific meaning it conveys in this context.
4.  **Generate Pitch Contour Data (Optional but Preferred)**: Provide a simplified array of 2 to 5 data points representing a basic pitch contour for the IDENTIFIED intonation pattern.
    *   Each point must have a 'time' field (a number from 0.0 to 1.0, representing normalized time from sentence start to end).
    *   Each point must have a 'pitch' field (an integer from 1 to 5, representing relative pitch level: 1=very low, 2=low, 3=mid, 4=high, 5=very high).
    *   The points should be ordered by time.
    *   Example for Falling Tune: \`[{ "time": 0.1, "pitch": 4 }, { "time": 0.9, "pitch": 1 }]\`
    *   Example for Rising Tune: \`[{ "time": 0.1, "pitch": 2 }, { "time": 0.9, "pitch": 5 }]\`
    *   Example for Rise-Fall Tune: \`[{ "time": 0.1, "pitch": 2 }, { "time": 0.5, "pitch": 5 }, { "time": 0.9, "pitch": 1 }]\`
    *   Example for Fall-Rise Tune: \`[{ "time": 0.1, "pitch": 4 }, { "time": 0.5, "pitch": 1 }, { "time": 0.9, "pitch": 3 }]\`
    *   Ensure the pitch contour data accurately reflects the chosen intonation pattern (e.g., a Fall-Rise must show a fall then a rise).
    *   If you cannot confidently generate pitch contour data, you may omit the 'pitchContourData' field or provide an empty array.

Sentence to analyze: {{{sentence}}}

Respond with a JSON object matching the output schema. Do not include any explanatory text outside the JSON object.
`,
});

const analyzeSentenceIntonationFlow = ai.defineFlow(
  {
    name: 'analyzeSentenceIntonationFlow',
    inputSchema: AnalyzeSentenceIntonationInputSchema,
    outputSchema: AnalyzeSentenceIntonationOutputSchema,
  },
  async (input: AnalyzeSentenceIntonationInput) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate intonation analysis.');
    }
    // Ensure pitchContourData is an array if it exists, or undefined otherwise
    if (output.pitchContourData && !Array.isArray(output.pitchContourData)) {
        output.pitchContourData = undefined; // Or [] if preferred for consistency
    }
    return output;
  }
);

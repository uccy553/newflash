
'use server';
/**
 * @fileOverview AI-powered quiz generation from user notes or PDF content.
 * Generates multiple-choice questions or theory questions based on provided text content and mode.
 * This flow ONLY generates questions and does not save them directly. Saving is handled by the client.
 *
 * - generateQuizFromNotes - Generates a quiz.
 * - GenerateQuizFromNotesInput - Input type for the function.
 * - GenerateQuizFromNotesOutput - Output type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ObjectiveQuizQuestion, TheoryQuizQuestion, GenerateQuizFromNotesInput as AppGenerateQuizFromNotesInput } from '@/types';


// Input schema for the AI flow
const GenerateQuizFromNotesInputSchema = z.object({
  notesContent: z.string().min(50, { message: "Content must be at least 50 characters long to generate a meaningful quiz." }).describe('Concatenated text content of all user notes or extracted PDF content.'),
  questionCount: z.number().min(3).max(20).default(10).describe('The number of questions to generate. For objective mode, aim for 10-20. For theory mode, 3-7 might be more appropriate depending on content depth.'),
  quizMode: z.enum(['objective', 'theory']).default('objective').describe("The desired mode for the quiz: 'objective' (multiple-choice) or 'theory' (written answers)."),
  noteCategory: z.string().optional().describe('The category of notes the quiz should be based on, if applicable (only for "notes" source).'),
  quizSourceType: z.enum(['notes', 'pdf']).optional().default('notes').describe('Indicates if the content source is user notes or an uploaded PDF.'),
  recentQuestionTexts: z.array(z.string()).optional().describe('An optional list of recent question texts provided by the client (from local storage) to avoid repetition, mainly for objective mode.'),
});
export type GenerateQuizFromNotesInput = z.infer<typeof GenerateQuizFromNotesInputSchema>;

const ObjectiveQuizQuestionSchema = z.object({
  id: z.string().describe('A unique client-side ID for the question (e.g., q-obj-<timestamp>-<index>).'),
  questionText: z.string().describe('The text of the quiz question.'),
  options: z.array(z.string()).length(4, { message: "Each question must have exactly 4 options." }).describe('An array of 4 string options (A, B, C, D).'),
  correctOptionIndex: z.number().min(0).max(3).describe('The 0-based index of the correct option in the options array (0 for A, 1 for B, 2 for C, 3 for D).'),
  explanation: z.string().describe('A brief explanation for why the correct answer is correct, ideally referencing the provided content.'),
});

const TheoryQuizQuestionSchema = z.object({
  id: z.string().describe('A unique client-side ID for the question (e.g., q-theory-<timestamp>-<index>).'),
  questionText: z.string().describe('The text of the theory/short-answer question.'),
  idealAnswer: z.string().describe('A comprehensive ideal answer or key points the user\'s answer should cover. This should be detailed enough for a student to compare their answer against.'),
});

const GenerateQuizFromNotesOutputSchema = z.object({
  objectiveQuestions: z.array(ObjectiveQuizQuestionSchema).optional().describe('An array of generated multiple-choice quiz questions. Populated if quizMode was "objective".'),
  theoryQuestions: z.array(TheoryQuizQuestionSchema).optional().describe('An array of generated theory quiz questions. Populated if quizMode was "theory".'),
  generatedQuizMode: z.enum(['objective', 'theory']).describe("Confirms the mode for which questions were generated, matching the input quizMode."),
});
export type GenerateQuizFromNotesOutput = z.infer<typeof GenerateQuizFromNotesOutputSchema>;

export async function generateQuizFromNotes(input: GenerateQuizFromNotesInput): Promise<GenerateQuizFromNotesOutput> {
  return generateQuizFromNotesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizFromNotesPrompt',
  input: { schema: GenerateQuizFromNotesInputSchema },
  output: { schema: GenerateQuizFromNotesOutputSchema },
  prompt: `You are an expert quiz creator for students.
Your task is to generate a set of quiz questions based *only* on the provided "Content"
{{#if noteCategory}} from the '{{noteCategory}}' category{{else if isPdfSource}} from the uploaded PDF document{{/if}}.

Content:
{{{notesContent}}}

Quiz Mode Requested: {{{quizMode}}}
Number of Questions to Generate: {{{questionCount}}}

Instructions for Quiz Generation:
1.  Generate exactly {{{questionCount}}} questions of the type specified by "Quiz Mode Requested".
2.  Each question must be directly and solely based on the information present in the "Content" above. Do not use any external knowledge.
3.  **CRITICAL - Diversity and Uniqueness of Questions**:
    *   Strive to create a DIVERSE set of questions that cover VARIOUS aspects, details, vocabulary, or concepts mentioned in the "Content". Do not focus on just one part of the notes/document.
    *   Each of the {{{questionCount}}} questions generated in this batch MUST be distinct from one another. Avoid asking the same underlying question with slightly different wording within this single generated set.
    *   Use varied question phrasing and structures.
    {{#if recentQuestionTexts.length}}
    *   **VERY IMPORTANT (for objective mode mostly)**: The following questions have been recently generated. Your new questions MUST be substantially different from these. Do NOT repeat concepts or wording from this list:
        {{#each recentQuestionTexts}}
        - "{{this}}"
        {{/each}}
    {{/if}}

IF "Quiz Mode Requested" is 'objective':
    *   Generate multiple-choice questions.
    *   Each question must have exactly four distinct answer options.
    *   For each question, clearly identify the correct answer option by its 0-based index (0 for the first option, 1 for the second, etc.).
    *   For each question, provide a concise explanation (1-2 sentences) for why the correct answer is correct. This explanation should ideally reference the part of the "Content" that supports the answer.
    *   The questions should test understanding of vocabulary, concepts, or details discussed in the content.
    *   Ensure the options are plausible and that there is one single best correct answer among them.
    *   Respond with a JSON object with an "objectiveQuestions" field, an array of question objects. Each object must include "id" (generate a unique string like "q-obj-<timestamp>-<index>"), "questionText", "options" (array of 4 strings), "correctOptionIndex" (0-3), and "explanation". Also include a "generatedQuizMode": "objective" field. Do NOT include a "theoryQuestions" field.

IF "Quiz Mode Requested" is 'theory':
    *   Generate open-ended theory or short-answer questions that require a written response.
    *   For each question, provide an "idealAnswer" detailing what a comprehensive correct response should include (e.g., key points, definitions, explanations, examples if appropriate from the content). This "idealAnswer" should be detailed enough for a student to compare their own answer against for self-assessment.
    *   Aim for questions that encourage understanding, explanation, and application of concepts from the "Content", not just recall of single isolated facts if possible.
    *   For theory questions, if the "Content" is brief or lacks depth for {{{questionCount}}} distinct, high-quality theory questions, it is acceptable to generate fewer than {{{questionCount}}} but make them high quality. Prioritize quality over quantity for theory questions. (e.g., if asked for 5, 3 good theory questions is better than 5 weak ones).
    *   Respond with a JSON object with a "theoryQuestions" field, an array of question objects. Each object must include "id" (generate a unique string like "q-theory-<timestamp>-<index>"), "questionText", and "idealAnswer". Also include a "generatedQuizMode": "theory" field. Do NOT include an "objectiveQuestions" field.

Ensure your entire response is a single JSON object matching the specified output structure for the requested "Quiz Mode Requested".
Do not include any explanatory text outside this JSON object.
`,
});

const generateQuizFromNotesFlow = ai.defineFlow(
  {
    name: 'generateQuizFromNotesFlow',
    inputSchema: GenerateQuizFromNotesInputSchema,
    outputSchema: GenerateQuizFromNotesOutputSchema,
  },
  async (input: GenerateQuizFromNotesInput): Promise<GenerateQuizFromNotesOutput> => {
    const { notesContent, questionCount, quizMode, noteCategory, recentQuestionTexts, quizSourceType } = input;

    const promptInputForTemplate = {
      notesContent,
      questionCount,
      quizMode,
      noteCategory: quizSourceType === 'notes' ? noteCategory : undefined,
      recentQuestionTexts: recentQuestionTexts || [],
      isPdfSource: quizSourceType === 'pdf'
    };

    const aiResponse = await prompt(promptInputForTemplate);

    if (!aiResponse.output) {
      throw new Error('AI failed to generate quiz questions or returned an empty/invalid structure.');
    }

    // Ensure the output structure matches the requested mode and contains questions
    if (quizMode === 'objective' && (!aiResponse.output.objectiveQuestions || aiResponse.output.objectiveQuestions.length === 0)) {
      throw new Error('AI was asked for objective questions but returned none or an invalid format.');
    }
    if (quizMode === 'theory' && (!aiResponse.output.theoryQuestions || aiResponse.output.theoryQuestions.length === 0)) {
       // For theory, AI might return fewer if content is sparse. Check if the response is empty.
       // If output.theoryQuestions is an empty array BUT generatedQuizMode is 'theory', it means AI decided no questions could be formed.
       if (aiResponse.output.generatedQuizMode === 'theory' && Array.isArray(aiResponse.output.theoryQuestions) && aiResponse.output.theoryQuestions.length === 0) {
          // This is an acceptable outcome where AI found no theory questions.
       } else {
        throw new Error('AI was asked for theory questions but returned none or an invalid format.');
       }
    }

    // Add unique IDs if AI didn't provide them (fallback)
    const now = Date.now();
    if (aiResponse.output.objectiveQuestions) {
      aiResponse.output.objectiveQuestions = aiResponse.output.objectiveQuestions.map((q, index) => ({
        ...q,
        id: q.id || `q-obj-${now}-${index}`,
      }));
    }
    if (aiResponse.output.theoryQuestions) {
      aiResponse.output.theoryQuestions = aiResponse.output.theoryQuestions.map((q, index) => ({
        ...q,
        id: q.id || `q-theory-${now}-${index}`,
      }));
    }
    
    // Ensure generatedQuizMode matches the input quizMode.
    // If AI is forced to return a specific mode, this might already be set correctly.
    // If the AI can choose, then its choice is outputted. Here, we expect it to match.
    if (aiResponse.output.generatedQuizMode !== quizMode) {
        console.warn(`AI generated mode (${aiResponse.output.generatedQuizMode}) differs from requested mode (${quizMode}). Using requested mode for output structure.`);
        // This case should ideally not happen if prompt is clear.
        // We will return what the AI generated, but the client needs to handle this discrepancy if it occurs.
        // For now, let's trust the AI's 'generatedQuizMode' if it populates the corresponding question array.
    }


    return {
        objectiveQuestions: aiResponse.output.objectiveQuestions,
        theoryQuestions: aiResponse.output.theoryQuestions,
        generatedQuizMode: aiResponse.output.generatedQuizMode || quizMode, // Fallback to requested mode if AI omits it
    };
  }
);



'use server';
/**
 * @fileOverview AI-powered math problem solver.
 * Takes a math problem statement (text or image), solves it, and provides a detailed explanation.
 *
 * - solveMathProblem - Solves a math problem.
 * - SolveMathProblemInput - Input type for the function.
 * - SolveMathProblemOutput - Output type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
// SolveMathProblemInput and SolveMathProblemOutput are now imported from @/types
import type { SolveMathProblemInput, SolveMathProblemOutput } from '@/types';

const SolveMathProblemInputSchema = z.object({
  problemStatement: z.string().min(1, { message: 'Problem statement must not be empty if provided.' }).optional().describe('The math problem to be solved, as a text string. This field can be omitted if an imageDataUri is provided.'),
  mathContext: z.string().optional().describe('Optional context for the math problem, e.g., "Algebra", "Calculus", "Trigonometry", "Word Problem". This helps the AI understand the domain.'),
  imageDataUri: z.string().optional().describe("An image of the math problem, as a data URI. Used if text problemStatement is not sufficient or if image input is preferred. Format: 'data:<mimetype>;base64,<encoded_data>'."),
}).refine(data => data.problemStatement || data.imageDataUri, {
  message: "Either a problem statement (text) or an image of the problem must be provided.",
  path: ["problemStatement"], 
});


const SolveMathProblemOutputSchema = z.object({
  parsedProblem: z.string().describe("A restatement or parsed version of the input problem, confirming the AI's understanding (from text or transcribed from image). If the AI cannot parse it, this should indicate the issue."),
  extractedProblemFromImage: z.string().optional().describe("The math problem statement as extracted/transcribed by the AI from the uploaded image, if an image was provided. This is the AI's best attempt at OCR."),
  solution: z.string().describe('The final numerical or symbolic solution to the math problem. If unsolvable or ambiguous, explain why.'),
  detailedExplanation: z.string().describe('A comprehensive, step-by-step explanation of how the solution was derived. Each step should be clear and easy for a student to follow. For word problems, explain how the problem was set up.'),
});

export async function solveMathProblem(input: SolveMathProblemInput): Promise<SolveMathProblemOutput> {
  return solveMathProblemFlow(input);
}

const prompt = ai.definePrompt({
  name: 'solveMathProblemPrompt',
  model: 'googleai/gemini-2.0-flash-exp', 
  input: { schema: SolveMathProblemInputSchema },
  output: { schema: SolveMathProblemOutputSchema },
  prompt: `You are an expert Math AI Tutor. Your task is to solve the given math problem and provide a clear, detailed, step-by-step explanation suitable for a student.
The problem might be provided as text, an image, or both. Prioritize the image if provided.

{{#if imageDataUri}}
An image of the math problem is provided:
{{media url=imageDataUri}}

First, meticulously transcribe ALL mathematical expressions and problem statements from this image. Pay close attention to symbols, fractions, exponents, and overall structure. The accuracy of this transcription is CRITICAL.
Populate the 'extractedProblemFromImage' field in your JSON response with this full transcription.

Next, from your transcription, identify the primary math problem that needs to be solved.
- If the image contains an explicit instruction like "Solve for x:", "Find the value of:", or a question mark indicating a value to find, focus on that problem.
- If the image contains multiple distinct math problems or equations, attempt to solve the **first clearly stated solvable problem** or the one that appears to be the main question.
- If the image only contains expressions or equations without an explicit request to solve (e.g., just lists 'y = x^2 + 3x - 2'), then analyze or describe the main expression/equation as shown in one of your examples.
State clearly in 'parsedProblem' which source (image transcription or text input) and which specific part of the transcription you are focusing on for the solution.
NOTE: Math OCR from images is experimental. If the image is unclear or the transcription is difficult, state this in 'parsedProblem' and 'extractedProblemFromImage'. If you cannot identify a solvable problem, indicate this in the 'solution' and 'detailedExplanation'.
{{/if}}

{{#if problemStatement}}
Text Problem Statement (use this if no image, or to supplement/clarify image transcription):
"{{{problemStatement}}}"
{{/if}}

{{#if mathContext}}
Context/Topic: {{{mathContext}}}
{{/if}}

Instructions for Solving:
1.  **Transcribe from Image (if applicable)**: (As detailed above) Put this transcription in the 'extractedProblemFromImage' field.
2.  **Parse and Understand**:
    *   Based on the image transcription (if any) and/or the text problem statement, determine the specific problem to be solved.
    *   In the 'parsedProblem' field, restate the problem you are about to solve in a clear way, or explain your interpretation (especially for word problems or ambiguities). Indicate if you used image transcription or text input, and which part.
    *   If you cannot understand or parse a solvable problem, clearly state this in 'parsedProblem' and provide a brief explanation in 'detailedExplanation', setting 'solution' to "Unable to solve.".
3.  **Solve**: Solve the identified math problem. Show the final answer clearly in the 'solution' field (e.g., "x = 3", "The area is 25 sq units").
4.  **Explain in Detail**: In the 'detailedExplanation' field, provide a thorough, step-by-step walkthrough of how you arrived at the solution for the *specific problem you chose to solve*.
    *   Explain each logical step and mathematical operation.
    *   Define any key terms or concepts used if relevant to the problem's context.
    *   For word problems, explicitly show how you translated the words into mathematical equations or expressions.
    *   Make your explanation easy to understand for someone learning the concept.
    *   Format the explanation for readability (e.g., using newlines for steps). Use markdown-like formatting for clarity (e.g., *for emphasis*, **for important terms**).

Output Format:
Respond with a JSON object matching the SolveMathProblemOutputSchema. Ensure all fields ('parsedProblem', 'solution', 'detailedExplanation') are populated. If an image was provided, 'extractedProblemFromImage' must also be populated.

Example (for "Solve for x: 2x + 5 = 11" - text input):
{
  "parsedProblem": "The problem is to find the value of x in the linear equation 2x + 5 = 11, based on the text input.",
  "solution": "x = 3",
  "detailedExplanation": "To solve for x in the equation 2x + 5 = 11, we follow these steps:\\n1. Isolate the term with x. Subtract 5 from both sides of the equation: 2x + 5 - 5 = 11 - 5, which simplifies to 2x = 6.\\n2. Solve for x. Divide both sides by 2: (2x)/2 = 6/2, which gives x = 3."
}

Example (for an image of ONLY "y = x^2 + 3x - 2", no solve instruction):
{
  "parsedProblem": "The problem, transcribed from the image, is to analyze the quadratic equation y = x^2 + 3x - 2.",
  "extractedProblemFromImage": "y = x^2 + 3x - 2",
  "solution": "This is an equation, not a problem to solve for a specific variable unless more context is given (e.g., 'find roots', 'find vertex'). Stated as is, it defines a parabola.",
  "detailedExplanation": "The equation y = x^2 + 3x - 2 represents a quadratic function. Its graph is a parabola opening upwards. The y-intercept is -2 (when x=0). The x-intercepts (roots) can be found using the quadratic formula. The vertex can be found using x = -b/(2a)."
}

Begin processing the problem now.
`,
});

const solveMathProblemFlow = ai.defineFlow(
  {
    name: 'solveMathProblemFlow',
    inputSchema: SolveMathProblemInputSchema,
    outputSchema: SolveMathProblemOutputSchema,
  },
  async (input: SolveMathProblemInput) => {
    const { output } = await prompt(input);
    if (!output) {
      return {
        parsedProblem: `AI failed to generate a response for the problem: "${input.problemStatement || 'Image provided'}".`,
        solution: "Error: No solution generated.",
        detailedExplanation: "The AI model did not return a valid output structure. Please try rephrasing the problem or try again later.",
        ...(input.imageDataUri && { extractedProblemFromImage: "AI failed to process the image or generate output." }),
      };
    }
    return {
      parsedProblem: output.parsedProblem || "AI did not provide a parsed version of the problem.",
      extractedProblemFromImage: output.extractedProblemFromImage || (input.imageDataUri ? "AI did not provide a transcription from the image." : undefined),
      solution: output.solution || "AI did not provide a solution.",
      detailedExplanation: output.detailedExplanation || "AI did not provide an explanation.",
    };
  }
);


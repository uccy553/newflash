
'use server';
/**
 * @fileOverview AI flow to generate personalized study tips for users.
 *
 * - generatePersonalizedTips - Generates tips based on user's learning data.
 * - GeneratePersonalizedTipsInput - Input type for the function.
 * - GeneratePersonalizedTipsOutput - Output type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { GeneratePersonalizedTipsInput, GeneratePersonalizedTipsOutput, TopicPerformanceStat } from '@/types';

const TopicPerformanceStatSchema = z.object({
  name: z.string().describe('Name of the topic/category.'),
  averageScore: z.number().describe('Average score in this topic (0-100).'),
  quizzesTaken: z.number().describe('Number of quizzes taken in this topic.'),
});

const GeneratePersonalizedTipsInputSchema = z.object({
  userId: z.string().describe('The user ID for whom the tips are being generated. For logging or context, not directly used by AI unless specified in prompt.'),
  excellingTopics: z.array(TopicPerformanceStatSchema).optional().describe('List of topics where the user is performing well.'),
  needsPracticeTopics: z.array(TopicPerformanceStatSchema).optional().describe('List of topics where the user might need more practice.'),
  currentStreak: z.number().describe('User\'s current study streak in days.'),
  newCardsLast7Days: z.number().describe('Number of new study cards created by the user in the last 7 days.'),
  averageQuizScore: z.number().describe('User\'s overall average score in AI-generated quizzes (0-100).'),
  totalStudyCards: z.number().describe('Total number of study cards the user has.'),
});

const GeneratePersonalizedTipsOutputSchema = z.object({
  tips: z.array(z.string()).min(1).max(3).describe('An array of 1 to 3 personalized, actionable study tips.'),
});

export async function generatePersonalizedTips(input: GeneratePersonalizedTipsInput): Promise<GeneratePersonalizedTipsOutput> {
  return generatePersonalizedTipsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePersonalizedTipsPrompt',
  input: { schema: GeneratePersonalizedTipsInputSchema },
  output: { schema: GeneratePersonalizedTipsOutputSchema },
  prompt: `You are an expert, friendly, and encouraging study coach for the FlashFlow app.
Your goal is to provide 2-3 concise, actionable, and personalized study tips to help the user improve their learning.
Base your tips on the following user data:

User Learning Data:
- Excelling Topics (Average Score >= 80%, Min 2 Quizzes):
  {{#if excellingTopics.length}}
    {{#each excellingTopics}}
    - {{name}}: Avg Score {{averageScore}}%, {{quizzesTaken}} quizzes taken.
    {{/each}}
  {{else}}
    No specific topics where the user is currently excelling with enough data.
  {{/if}}

- Topics Needing More Practice (Average Score < 70%, Min 2 Quizzes):
  {{#if needsPracticeTopics.length}}
    {{#each needsPracticeTopics}}
    - {{name}}: Avg Score {{averageScore}}%, {{quizzesTaken}} quizzes taken.
    {{/each}}
  {{else}}
    No specific topics identified as needing more practice with enough data.
  {{/if}}

- Current Study Streak: {{currentStreak}} days.
- New Study Cards Created (Last 7 Days): {{newCardsLast7Days}}.
- Overall Average Score (AI Quizzes from Notes): {{averageQuizScore}}%.
- Total Study Cards: {{totalStudyCards}}.

Guidelines for Tips:
1.  **Be Specific and Actionable:** Instead of "Study more," suggest *what* or *how* to study.
2.  **Be Positive and Encouraging:** Frame suggestions constructively.
3.  **Prioritize based on data:**
    *   If 'needsPracticeTopics' exist, suggest focusing on one, perhaps by reviewing notes for that category or creating more flashcards for it.
    *   If 'excellingTopics' exist, congratulate and suggest deepening knowledge or trying related advanced topics.
    *   If 'currentStreak' is good (e.g., >3 days), praise and encourage maintaining it. If 0 or low, suggest starting a review session to build it.
    *   If 'newCardsLast7Days' is high, suggest using the "Quiz Generator" to test understanding of these new cards. If low and 'totalStudyCards' is also low, suggest creating more cards.
    *   If 'averageQuizScore' is low (e.g., < 60%), gently suggest reviewing fundamental concepts or trying different study strategies for those topics.
4.  **Variety:** Try to offer diverse tips if multiple areas can be addressed.
5.  **Conciseness:** Each tip should be 1-2 sentences.
6.  **Contextual Awareness:** If there's very little data (e.g., few quizzes, few cards), provide more general study advice like "Keep creating study cards for new topics!" or "Try the 'Due Cards Review' daily to build a habit!"

Generate 2 to 3 tips.

Respond with a JSON object matching the output schema, containing a "tips" array.
Example of a tip: "You're acing 'Verb Tenses'! Why not try creating flashcards for more complex sentence structures involving them?"
Another example: "Your average quiz score is solid! To boost it further, focus on the 'Phrasal Verbs' category where you have more room to grow. Try reviewing your notes for that topic."
Another example: "Great job on your 3-day study streak! Keep it going by reviewing your due cards today."
`,
});

const generatePersonalizedTipsFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedTipsFlow',
    inputSchema: GeneratePersonalizedTipsInputSchema,
    outputSchema: GeneratePersonalizedTipsOutputSchema,
  },
  async (input: GeneratePersonalizedTipsInput): Promise<GeneratePersonalizedTipsOutput> => {
    // Handle cases with minimal data by providing default tips if AI struggles
    if (input.totalStudyCards < 5 && input.excellingTopics.length === 0 && input.needsPracticeTopics.length === 0) {
      return {
        tips: [
          "Start building your knowledge base by creating more study cards for topics you're learning!",
          "Try the 'Due Cards Review' feature daily to form a consistent study habit.",
          "Use the 'Quiz Generator' on your notes once you have a few topics covered to test your understanding."
        ].slice(0, Math.random() > 0.5 ? 2:3) // Randomly give 2 or 3 general tips
      };
    }

    const { output } = await prompt(input);
    if (!output || !output.tips || output.tips.length === 0) {
      // Fallback tips if AI fails or returns empty
      return {
        tips: [
          "Regularly review your study cards using the 'Due Cards Review' feature.",
          "Challenge yourself by using the 'Quiz Generator' on different note categories.",
          "Keep adding new study cards as you learn new material. Consistency is key!"
        ].slice(0, Math.random() > 0.5 ? 2:3)
      };
    }
    return output;
  }
);

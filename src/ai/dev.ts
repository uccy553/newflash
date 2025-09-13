
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-flashcard-tags.ts';
import '@/ai/flows/generate-flashcard-content-flow.ts';
import '@/ai/flows/analyze-intonation-flow.ts';
import '@/ai/flows/digitize-handwritten-note-flow.ts';
import '@/ai/tools/fetch-user-notes-tool.ts';
import '@/ai/flows/english-tutor-chat-flow.ts';
import '@/ai/flows/generate-quiz-from-notes-flow.ts';
import '@/ai/flows/solve-math-problem-flow.ts';
import '@/ai/flows/generate-personalized-tips-flow.ts';
import '@/ai/flows/generate-flashcards-from-note-flow.ts'; // Added new flow

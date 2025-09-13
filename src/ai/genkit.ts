
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// IMPORTANT: Replace "YOUR_GOOGLE_AI_API_KEY_HERE" with your actual Google AI API key.
// This is exposed directly in the code as per user request for development.
// For production, it is STRONGLY recommended to use environment variables.
// Also, ensure the "Generative Language API" (or Vertex AI for specific models)
// is enabled in your Google Cloud Project associated with this API key.
const googleAiApiKey = "AIzaSyAW8G0zDpHa2pC3oZOmA8Yn8sPWGZZeyv8"; 

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: googleAiApiKey, // API key provided here
    }),
  ],
  // Updated model to gemini-2.0-flash-exp as requested
  model: 'googleai/gemini-2.0-flash-exp', 
});


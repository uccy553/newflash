
# FlashFlow - Your Smart Study Companion

FlashFlow is a user-friendly Flashcard and Spaced Repetition App designed to help students learn and master information across various subjects. Expand your knowledge, understand complex topics, and learn effectively using text, images, and AI-driven features like tag suggestions and smart review scheduling.

## Core Features

- **Study Card Management**: Create, edit, and delete flashcards for terms, concepts, questions, and facts. Include definitions, explanations, example sentences/contexts, and AI-generated content.
- **Due Cards Review (Spaced Repetition - SM-2 Algorithm)**: Our smart algorithm schedules flashcard reviews at optimal intervals, helping you commit information to long-term memory. Review cards that are due.
- **AI Quiz Generator**: Generate multiple-choice quizzes from your saved notes. Test your understanding and see AI-generated explanations for answers.
- **AI Tag Suggestions**: Get intelligent tag suggestions (e.g., "biology", "formula", "history chapter 1") for your study cards to improve organization and search.
- **Scoreboard**: Track your "Due Cards Review" history and overall progress in mastering your subjects.
- **Note-Taking**: Create, edit, and delete text-based notes for any subject. Organize notes into categories/folders.
- **Handwritten Note Digitization**: Upload images of handwritten notes. AI will extract the text, correct errors, format it, and auto-generate a title. Save digitized notes to specific categories.
- **Authentication**: Securely sign in with Google or Email/Password to save and sync your study materials and notes across devices.
- **Intonation Analyzer (English Specific)**: Analyze English sentence intonation patterns. (This feature remains English-focused).
- **Math Solver**: Input math problems (text or image) for AI-powered solutions and explanations.
- **AI Chat Tutor**: Interact with an AI tutor for help with various subjects.

## Tech Stack

- **Frontend**: Next.js (App Router) with React and TypeScript
- **Styling**: Tailwind CSS with ShadCN UI components
- **Backend & Database**: Firebase (Authentication, Firestore, Storage)
- **AI**: Google AI (via Genkit) for tag suggestions, content generation, note digitization, math solving, and chat.
- **Deployment**: Vercel

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn
- A Firebase project
- A Google Cloud project (for Genkit AI, if self-hosting the AI part or for API keys)

### Setup Commands

1.  **Clone the repository (if applicable, otherwise use your existing project):**
    ```bash
    # git clone [your-repo-url]
    # cd [your-repo-name]
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Set up Firebase:**
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Click on "Add project" and follow the steps to create a new Firebase project.
    *   Once your project is created, navigate to **Project settings** (click the gear icon).
    *   Under the "General" tab, find "Your apps" and click the Web icon (`</>`) to add a web app.
    *   Register your app (give it a nickname, e.g., "FlashFlow Web"). You don't need to set up Firebase Hosting here if you plan to use Vercel.
    *   Firebase will provide you with a `firebaseConfig` object. Copy these values.

4.  **Configure Environment Variables:**
    *   Create a `.env.local` file in the root of your project. You can copy from `.env.local.template` if it exists, or create it manually.
    *   Fill in the Firebase configuration values you copied:
        ```env
        NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
        NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
        NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id # Optional, for Analytics
        ```
    *   **For AI Features (Genkit with Google AI):**
        *   You'll need a Google AI API key. Obtain this from the [Google Cloud Console](https://console.cloud.google.com/) by enabling the "Generative Language API" for your project and creating an API key under "APIs & Services" > "Credentials".
        *   Update `src/ai/genkit.ts` with your API key:
            ```typescript
            // src/ai/genkit.ts
            // ...
            const googleAiApiKey = "YOUR_ACTUAL_GOOGLE_AI_API_KEY_HERE"; 
            // ...
            ```
        *   **For Firebase Admin SDK (used by some server-side Genkit flows):**
            *   In the Firebase Console, go to Project settings > Service accounts.
            *   Generate a new private key and download the JSON file.
            *   Open `src/lib/firebase-admin-init.ts`.
            *   Replace the placeholder `serviceAccount` object with the entire content of the JSON file you downloaded.
            *   **Important:** Keep this service account file secure. For production, it's better to use environment variables for the service account credentials.

5.  **Enable Firebase Services:**
    *   In the Firebase Console, navigate to your project.
    *   **Authentication**:
        *   Go to "Authentication" (under Build) from the left sidebar.
        *   Click "Get started".
        *   On the "Sign-in method" tab:
            *   Enable "Google" as a sign-in provider. Provide a project support email and save.
            *   Enable "Email/Password" as a sign-in provider and save.
        *   Go to the "Settings" tab within Authentication.
        *   Under "Authorized domains", click "Add domain" and enter `localhost`. Click "Add".
    *   **Firestore Database**:
        *   Go to "Firestore Database" (under Build) from the left sidebar.
        *   Click "Create database".
        *   Start in **production mode**.
        *   Choose a Firestore location (e.g., `us-central` or one near your users). Click "Enable".
        *   Go to the "Rules" tab and paste the content from the `firestore.rules` file in this project. Click "Publish".
    *   **Storage**:
        *   Go to "Storage" (under Build) from the left sidebar.
        *   Click "Get started".
        *   Follow the prompts to set up Cloud Storage (choose production mode, select location).
        *   Go to the "Rules" tab and paste the content from the `storage.rules` file in this project. Click "Publish". (Note: Storage rules currently cover flashcard images and note source images).

6.  **Run the development server:**
    ```bash
    npm run dev
    # or
    # yarn dev
    ```
    The app should now be running on `http://localhost:9002` (or the port specified in your `package.json`).

7.  **(Optional) Run Genkit development server for AI flows (if modifying AI logic):**
    ```bash
    npm run genkit:dev
    ```
    The AI flows are part of the Next.js app and should work with server actions if your Google API key and Firebase Admin setup are correct.

### Firestore Rules (`firestore.rules`)

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own user profile document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Flashcards
    match /users/{userId}/flashcards/{flashcardId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/flashcards {
        allow list, create: if request.auth != null && request.auth.uid == userId;
    }
    // Quiz History (from Due Cards Review / Spaced Repetition)
    match /users/{userId}/quizHistory/{quizEntryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
     match /users/{userId}/quizHistory {
        allow list, create: if request.auth != null && request.auth.uid == userId;
    }
    // Notes
    match /users/{userId}/notes/{noteId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/notes {
      allow list, create, get: if request.auth != null && request.auth.uid == userId;
    }
    // Generated Quizzes (from AI Quiz Generator)
    match /users/{userId}/generatedQuizzes/{quizId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/generatedQuizzes {
      allow list, create: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Storage Rules (`storage.rules`)

```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Users can write their own note source images (for digitization)
    match /users/{userId}/note_source_images/{imageId} {
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && request.resource.size < 10 * 1024 * 1024  // Max 10MB for note images
                   && request.resource.contentType.matches('image/.*'); // Only images
    }
  }
}
```

## Deployment to Vercel

1.  **Push your project to a GitHub repository.**
2.  **Sign up or log in to [Vercel](https://vercel.com) with your GitHub account.**
3.  **Import your project.**
4.  **Configure Environment Variables in Vercel:**
    *   Add all `NEXT_PUBLIC_FIREBASE_*` variables.
    *   **Important for AI & Admin SDK:**
        *   Create an environment variable named `GOOGLE_AI_API_KEY` and set its value to your Google AI API key.
        *   Create an environment variable named `FIREBASE_SERVICE_ACCOUNT_JSON`. For its value, paste the **entire JSON content** of your Firebase service account key file.
5.  **Deploy.**

## User Guide

Hello! Welcome to **FlashFlow**, your new study buddy! Here’s how to use it to boost your learning:

1.  **Sign Up / Sign In**:
    *   When you first open the app, you'll go to the Login page.
    *   **New User?** Click "Sign Up". Enter your email and pick a password.
    *   **Existing User?** Enter your email/password, or click "Sign In with Google".
    *   This saves your study cards and notes so you can use them anywhere!

2.  **Dashboard**:
    *   After signing in, you'll see your Dashboard.
    *   Get a quick overview of your learning progress and quick links.

3.  **Adding a New Study Card**:
    *   Click "Create New Study Card" or "New Card" from the navigation.
    *   **Term/Question**: Type the term, concept, or question you want to learn (e.g., "Photosynthesis", "What is the capital of Japan?").
        *   Click the ✨ (sparkles) icon next to the input field to automatically generate a definition/explanation and example if you're unsure!
    *   **Answer/Definition/Details**: Type its definition, explanation, or answer (e.g., "The process by which green plants use sunlight...", "Tokyo").
    *   **Example/Context (Optional)**: Add an example or context to see how it's used.
    *   **IPA (Optional)**: If it's a specific term with a tricky pronunciation, you can add its International Phonetic Alphabet transcription. AI can help with this too.
    *   **Tags (Optional)**:
        *   Type a tag (like "biology", "history", "formula") and click "Add Tag".
        *   Click "Suggest Tags with AI". The app will give you ideas! Click a suggestion to add it.
    *   Click "Create Card" when you're done.

4.  **Viewing Your Study Cards**:
    *   Click "All Cards" in the navigation.
    *   You'll see your list of study cards. Click one to see details.
    *   You can "Edit" or "Delete" cards.
    *   When viewing a card, click the "flip" icon (two arrows) to see the other side.

5.  **Due Cards Review (Spaced Repetition)**:
    *   Click "Due Cards Review" in the navigation.
    *   The app will show you cards that are due for review based on the spaced repetition algorithm.
    *   Read the front of the card.
    *   Click "Reveal Answer".
    *   After seeing the answer, rate how well you remembered it (from "Blackout" if you forgot, to "Perfect recall" if it was easy).
    *   The app uses your rating to decide when to show you that card again for optimal learning.

6.  **Generating a Quiz from Your Notes (AI Quiz Generator)**:
    *   Go to "Quiz Generator" from the navigation.
    *   Fetch your notes. You can choose to generate a quiz from "All Notes" or a specific category/folder.
    *   Click "Generate Quiz". AI will create multiple-choice questions based on your note content.
    *   Answer the questions and submit to see your score and explanations for each answer.

7.  **Checking Your Scores (from Due Cards Review)**:
    *   Click "Scores" in the navigation.
    *   See your past "Due Cards Review" results and how you're progressing. *Note: Scores from the AI Quiz Generator are not tracked here currently.*

8.  **Taking Notes**:
    *   Click "My Notes" in the navigation.
    *   **Create a New Note**: Click "Create New Note" to type out your notes. You can assign them to categories/folders.
    *   **Digitize Handwritten Notes**: Click "Digitize Handwritten Note". Upload picture(s) of your handwritten notes. AI will convert it to text, correct it, suggest a title, and you can then edit and save it to a category.
    *   View, edit, or delete your notes. Notes are organized by category.

9.  **Intonation Analyzer (English Specific)**:
    *   Click "Intonation Analyzer" in the navigation.
    *   Type an English sentence. The AI will analyze its intonation pattern, classify the sentence type, and show a visual pitch graph. (This feature is specifically for English intonation).

10. **Math Solver**:
    *   Go to "Math Solver".
    *   Type in a math problem or upload an image of one.
    *   The AI will attempt to solve it and provide a step-by-step explanation.

11. **AI Chat Tutor**:
    *   Click the chat bubble icon (usually bottom right).
    *   Ask "Flash", your AI tutor, questions about various subjects.

**Tips for Effective Learning**:
*   **Be Consistent**: Review your cards regularly using the "Due Cards Review" feature.
*   **Be Honest**: Rate your recall honestly during reviews. It helps the app schedule reviews better.
*   **Use Tags**: Tags help you find specific sets of cards.
*   **Use Examples**: They are key to understanding context and usage.
*   **Digitize Your Class Notes**: Quickly turn your handwritten notes from class into organized digital notes.
*   **Utilize the AI Tutor**: Don't hesitate to ask questions or request explanations from the AI tutor.
*   **Test Yourself**: Use the "Quiz Generator" to check your understanding of your notes.

Happy learning with FlashFlow!

## Troubleshooting

*   **Cannot Sign In / "auth/unauthorized-domain" error (for Google Sign-In)**: Ensure `localhost` (for local dev) and your Vercel deployment domain (e.g., `your-app-name.vercel.app`) are in "Authorized domains" in Firebase Authentication settings.
*   **Image Upload Fails (Note Digitization)**: Check if the image is under 10MB and is a JPG, PNG, or GIF.
*   **AI Features Not Working (Tag Suggestions, Content Generation, Note Digitization, Math Solver, Chatbot, Quiz Generator)**:
    *   Needs an internet connection.
    *   Ensure card fields (Term/Question, Answer/Definition for tags) or uploaded image (for notes) have enough content.
    *   Verify your Google AI API key is correct (in `src/ai/genkit.ts` for local dev, or as environment variable `GOOGLE_AI_API_KEY` in Vercel).
    *   Ensure the "Generative Language API" (or Vertex AI, depending on the model) is enabled in your Google Cloud Project associated with this API key.
    *   Ensure billing is enabled for your Google Cloud Project.
    *   **For Firebase Admin-dependent features (like AI Chatbot accessing notes, Quiz Generator saving quizzes):**
        *   Ensure your Firebase service account JSON is correctly placed in `src/lib/firebase-admin-init.ts` (for local dev) or set as the `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable in Vercel.
        *   The service account needs appropriate IAM permissions in Google Cloud (e.g., "Firebase Admin SDK Administrator Service Agent" or more granular Firestore/Storage permissions).
*   **Data Not Syncing / Cannot Create Cards or Notes / "Create Card" or "Save Note" button does nothing**:
    *   Ensure you're signed in.
    *   **Check Browser Console:** Open your browser's developer tools (usually F12) and look at the "Console" and "Network" tabs for error messages or failed requests to Firebase. This is the most important step for debugging "nothing happens" issues.
    *   If creating items fails, check Firebase Firestore rules in the Firebase Console to ensure 'create' permissions are allowed for the relevant paths (e.g., `/users/{userId}/flashcards` or `/users/{userId}/notes`). The rules in `firestore.rules` in this project should be correct if applied.
    *   An issue with Firebase project configuration might be present.
*   **Sidebar Not Staying Open/Closed:** This might be a cookie issue or a browser setting that clears site data. Try clearing your browser cache for the site.

If you encounter other issues, try refreshing or signing out and back in.

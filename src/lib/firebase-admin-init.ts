
// src/lib/firebase-admin-init.ts
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// IMPORTANT: REPLACE THIS ENTIRE serviceAccount OBJECT WITH YOUR ACTUAL SERVICE ACCOUNT JSON CONTENT
// FROM THE FILE YOU DOWNLOADED FROM THE FIREBASE CONSOLE.
// KEEP THIS FILE SECURE AND DO NOT COMMIT IT TO PUBLIC REPOSITORIES IF IT CONTAINS REAL CREDENTIALS.
const serviceAccount = {
  "type": "service_account",
  "project_id": "YOUR_PROJECT_ID_HERE", // e.g., "flashflow-12345"
  "private_key_id": "YOUR_PRIVATE_KEY_ID_HERE",
  "private_key": "YOUR_PRIVATE_KEY_HERE-----BEGIN PRIVATE KEY-----\\nEXAMPLE_KEY_CONTENT\\n-----END PRIVATE KEY-----\\n",
  "client_email": "YOUR_SERVICE_ACCOUNT_EMAIL_HERE@YOUR_PROJECT_ID.iam.gserviceaccount.com",
  "client_id": "YOUR_CLIENT_ID_HERE",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/YOUR_SERVICE_ACCOUNT_EMAIL_HERE%40YOUR_PROJECT_ID.iam.gserviceaccount.com"
  // Note: The client_x509_cert_url often contains the project_id and client_email dynamically.
  // Ensure your actual JSON content is pasted here.
};

let adminApp: admin.app.App;
// Initialize with a type that allows undefined for stricter checks before use
let adminDb: admin.firestore.Firestore | undefined;
let adminAuth: admin.auth.Auth | undefined;
let adminStorage: admin.storage.Storage | undefined;

if (!admin.apps.length) {
  try {
    console.log("Initializing Firebase Admin SDK with embedded service account...");
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as ServiceAccount),
      // If you have a specific databaseURL (e.g. for Realtime Database, not Firestore usually), add it here:
      // databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (e: any) {
    console.error('Firebase Admin SDK initialization error:', e.message);
    // console.error('Details:', e); // Uncomment for more detailed error logging if needed
    console.error('Ensure the serviceAccount object in src/lib/firebase-admin-init.ts is correctly populated with your service account JSON.');
  }
} else {
  adminApp = admin.app(); // Get the default app if already initialized
  console.log('Firebase Admin SDK already initialized.');
}

// Assign Firestore, Auth, Storage instances only if adminApp was successfully initialized
if (adminApp!) { // The non-null assertion operator assumes adminApp will be defined if initialization didn't throw a blocking error.
  adminDb = admin.firestore();
  adminAuth = admin.auth();
  adminStorage = admin.storage();
} else {
  // Log a warning if adminApp is not defined, indicating initialization failure.
  // This check helps in debugging if process is undefined in certain environments.
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
     console.warn("Firebase Admin SDK could not be initialized. Admin features will not work. Check server logs for details.");
  } else if (typeof process === 'undefined') {
    // For environments where process might not be defined (e.g., some edge runtimes if not careful)
    console.warn("Firebase Admin SDK initialization failed (process undefined). Admin features may not work.");
  }
}

export { adminDb, adminAuth, adminStorage, adminApp };

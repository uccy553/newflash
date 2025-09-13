import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyD5qPGGCRpa3RCk_haLe77OyKEG9_Ugyh8",
  authDomain: "flash-8bc5e.firebaseapp.com",
  projectId: "flash-8bc5e",
  storageBucket: "flash-8bc5e.firebasestorage.app",
  messagingSenderId: "909777181439",
  appId: "1:909777181439:web:f52137bfed3ed310ec8aca",
  measurementId: "G-KY662BJE7L"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleAuthProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleAuthProvider };

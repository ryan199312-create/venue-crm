import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCNJ-TZcqTres8fXcZr3rLaH5x2xLsk3Os",
  authDomain: "event-management-system-9f764.firebaseapp.com",
  projectId: "event-management-system-9f764",
  storageBucket: "event-management-system-9f764.firebasestorage.app",
  messagingSenderId: "281238143424",
  appId: "1:281238143424:web:b463511f0b3c4d68f84825",
  measurementId: "G-WK60NDKPT0"
};

// 🛑 PREVENT CRASH: Only initialize if no app exists
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'asia-east2');
export default app;

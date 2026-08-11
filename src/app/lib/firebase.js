// lib/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC-PGS75JIfsUV5OvjGBM_6coC6KxLH7pc",
  authDomain: "haylacaphe-158ea.firebaseapp.com",
  projectId: "haylacaphe-158ea",
  storageBucket: "haylacaphe-158ea.firebasestorage.app",
  messagingSenderId: "510491719603",
  appId: "1:510491719603:web:4f5849c6fab28138d8bdc6",
  measurementId: "G-T4K86PEF44"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app, 'haylacaphe');
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
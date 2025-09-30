import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';
import Constants from 'expo-constants';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBKUuxxDkY5VnmqiDdLmL1eM0AqFaUGO6E",
  authDomain: "havas-football-league.firebaseapp.com",
  projectId: "havas-football-league",
  storageBucket: "havas-football-league.firebasestorage.app",
  messagingSenderId: "602318189245",
  appId: "1:602318189245:web:8fde2a3d0bb2a7801ffdd4",
  measurementId: "G-80HTJFBW99"
};

// Initialize Firebase - check if app already exists to prevent duplicate initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const analytics = getAnalytics(app);
export const storage = getStorage(app);

export default app;

const admin = require('firebase-admin');

let firebaseApp = null;

const initializeFirebaseAdmin = () => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      firebaseApp = admin.apps[0];
      console.log('🔥 Firebase Admin already initialized');
      return firebaseApp;
    }

    // Initialize Firebase Admin SDK
    // In production, you should use service account key
    // For now, we'll use default credentials
    firebaseApp = admin.initializeApp({
      // Add your Firebase config here
      // For now, we'll use default credentials
    });

    console.log('🔥 Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error);
    return null;
  }
};

const getFirebaseApp = () => {
  return firebaseApp;
};

const getAuth = () => {
  if (!firebaseApp) {
    throw new Error('Firebase Admin not initialized');
  }
  return admin.auth();
};

const getFirestore = () => {
  if (!firebaseApp) {
    throw new Error('Firebase Admin not initialized');
  }
  return admin.firestore();
};

module.exports = {
  initializeFirebaseAdmin,
  getFirebaseApp,
  getAuth,
  getFirestore
};
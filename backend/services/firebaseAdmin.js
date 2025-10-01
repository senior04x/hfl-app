const admin = require('firebase-admin');

// Firebase Admin SDK initialization
const initializeFirebaseAdmin = () => {
  try {
    // Initialize Firebase Admin SDK
    admin.initializeApp({
      projectId: 'havas-football-league',
      // In production, you should use service account key
      // For development, we'll use default credentials
    });

    console.log('🔥 Firebase Admin SDK initialized successfully');
    return admin;
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    throw error;
  }
};

// Get Firestore instance
const getFirestore = () => {
  return admin.firestore();
};

// Get Auth instance
const getAuth = () => {
  return admin.auth();
};

module.exports = {
  initializeFirebaseAdmin,
  getFirestore,
  getAuth,
  admin
};

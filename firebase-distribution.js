// Firebase App Distribution setup
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function distributeAPK() {
  try {
    // Upload APK to Firebase App Distribution
    const appId = 'your-app-id';
    const apkPath = './builds/hfl-app-v1.1.0.apk';
    
    const result = await admin.appDistribution().uploadRelease({
      appId: appId,
      releaseNotes: 'Yangi versiya: 1.1.0\n• Bug fixes\n• Performance improvements',
      groups: ['testers', 'beta-users']
    });
    
    console.log('APK distributed successfully:', result);
  } catch (error) {
    console.error('Distribution failed:', error);
  }
}

distributeAPK();


# Firestore Rules for HFL Mobile App

## Current Rules (Default - Restrictive)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Recommended Rules for HFL App
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Players collection - allow read/write for authenticated users
    match /players/{playerId} {
      allow read, write: if request.auth != null;
    }
    
    // Teams collection - allow read for all, write for authenticated users
    match /teams/{teamId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Matches collection - allow read for all, write for authenticated users
    match /matches/{matchId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Standings collection - allow read for all, write for authenticated users
    match /standings/{standingId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Transfer requests - allow read/write for authenticated users
    match /transferRequests/{requestId} {
      allow read, write: if request.auth != null;
    }
    
    // Team applications - allow read/write for authenticated users
    match /teamApplications/{applicationId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Temporary Open Rules (For Testing)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## How to Update Rules:
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Click on "Rules" tab
4. Replace the rules with the recommended rules above
5. Click "Publish"


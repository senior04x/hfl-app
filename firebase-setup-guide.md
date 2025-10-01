# Firebase Authentication Setup Guide

## 1. Firebase Console Setup

### Step 1: Enable Email/Password Authentication
1. Go to https://console.firebase.google.com/
2. Select your HFL project: `havas-football-league`
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Email/Password**
5. Enable **Email/Password** provider
6. Click **Save**

### Step 2: Create Test Users
1. Go to **Authentication** → **Users**
2. Click **Add user**
3. Create test users:

#### Test User 1:
- Email: `+998933786886@hfl.com`
- Password: `123456`

#### Test User 2:
- Email: `+998901234567@hfl.com`
- Password: `password123`

## 2. Firebase Rules Setup

### Firestore Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Players collection
    match /players/{playerId} {
      allow read, write: if request.auth != null && request.auth.uid == playerId;
    }
    
    // Teams collection
    match /teams/{teamId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Matches collection
    match /matches/{matchId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Standings collection
    match /standings/{standingId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## 3. Test Data Creation

### Create Test Player in Firestore:
```javascript
// Collection: players
// Document ID: Firebase Auth UID
{
  id: "firebase_auth_uid",
  firstName: "John",
  lastName: "Doe",
  phone: "+998933786886",
  email: "+998933786886@hfl.com",
  teamName: "Real Madrid",
  teamId: "team_123",
  position: "Forward",
  number: 10,
  goals: 15,
  assists: 8,
  yellowCards: 2,
  redCards: 0,
  matchesPlayed: 20,
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
}
```

## 4. Mobile App Configuration

### Update Firebase Config:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBKUuxxDkY5VnmqiDdLmL1eM0AqFaUGO6E",
  authDomain: "havas-football-league.firebaseapp.com",
  projectId: "havas-football-league",
  storageBucket: "havas-football-league.appspot.com",
  messagingSenderId: "602318189245",
  appId: "1:602318189245:web:8fde2a3d0bb2a7801ffdd4",
  measurementId: "G-80HTJFBW99"
};
```

## 5. Testing

### Test Login:
- Phone: `+998 93 378 68 86`
- Password: `123456`

### Expected Flow:
1. Phone converted to email: `+998933786886@hfl.com`
2. Firebase Auth signInWithEmailAndPassword()
3. Get player data from Firestore
4. Return player data to app


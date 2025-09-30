# Mobile App Integration Guide

This document explains how the HFL mobile app (located at `../hfl-mobile`) should connect to the admin panel's Firestore database and implement real-time data synchronization.

## 🔗 Connection Overview

The mobile app connects to the same Firebase project as the admin panel, using Firestore real-time listeners to automatically sync data changes made by admins.

## 📊 Data Collections

### 1. Seasons Collection (`seasons`)

**Purpose**: Display current and past football seasons

**Mobile App Usage**:
```typescript
// Listen to active seasons
const seasonsRef = collection(db, 'seasons');
const q = query(seasonsRef, where('isActive', '==', true));
const unsubscribe = onSnapshot(q, (snapshot) => {
  const seasons = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  // Update UI with seasons
});
```

**Data Structure**:
```typescript
interface Season {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}
```

### 2. Teams Collection (`teams`)

**Purpose**: Display team information and rosters

**Mobile App Usage**:
```typescript
// Listen to teams for current season
const teamsRef = collection(db, 'teams');
const q = query(teamsRef, where('seasonId', '==', currentSeasonId));
const unsubscribe = onSnapshot(q, (snapshot) => {
  const teams = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  // Update teams list
});
```

**Data Structure**:
```typescript
interface Team {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  colors: {
    primary: string;
    secondary: string;
  };
  seasonId: string;
  isActive: boolean;
}
```

### 3. Players Collection (`players`)

**Purpose**: Display player profiles, statistics, and transfer history

**Mobile App Usage**:
```typescript
// Listen to players for a specific team
const playersRef = collection(db, 'players');
const q = query(
  playersRef, 
  where('teamId', '==', teamId),
  where('isActive', '==', true)
);
const unsubscribe = onSnapshot(q, (snapshot) => {
  const players = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  // Update players list
});
```

**Data Structure**:
```typescript
interface Player {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  jerseyNumber: number;
  teamId: string;
  seasonId: string;
  phoneNumber?: string;
  isActive: boolean;
  joinedAt: string;
  transferHistory: Transfer[];
}
```

### 4. Matches Collection (`matches`)

**Purpose**: Display match fixtures, results, and live scores

**Mobile App Usage**:
```typescript
// Listen to matches for current season
const matchesRef = collection(db, 'matches');
const q = query(
  matchesRef, 
  where('seasonId', '==', currentSeasonId),
  orderBy('date', 'asc')
);
const unsubscribe = onSnapshot(q, (snapshot) => {
  const matches = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  // Update matches list
});
```

**Data Structure**:
```typescript
interface Match {
  id: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  date: string;
  time: string;
  venue: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  homeScore?: number;
  awayScore?: number;
  events: MatchEvent[];
}
```

### 5. Statistics Collection (`statistics`)

**Purpose**: Display player performance statistics

**Mobile App Usage**:
```typescript
// Listen to player statistics
const statsRef = collection(db, 'statistics');
const q = query(
  statsRef, 
  where('seasonId', '==', currentSeasonId),
  where('playerId', '==', playerId)
);
const unsubscribe = onSnapshot(q, (snapshot) => {
  const stats = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  // Update player stats
});
```

**Data Structure**:
```typescript
interface Statistics {
  id: string;
  seasonId: string;
  playerId: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  updatedAt: string;
}
```

## 🔄 Real-time Synchronization

### Live Score Updates

When admins update match scores in the admin panel, the mobile app automatically receives updates:

```typescript
// Listen to specific match for live updates
const matchRef = doc(db, 'matches', matchId);
const unsubscribe = onSnapshot(matchRef, (doc) => {
  if (doc.exists()) {
    const match = { id: doc.id, ...doc.data() };
    // Update match display with new score
    updateMatchDisplay(match);
  }
});
```

### Player Statistics Updates

When match events are logged, Cloud Functions automatically recalculate player statistics:

```typescript
// Listen to player statistics changes
const statsRef = doc(db, 'statistics', `${seasonId}_${playerId}`);
const unsubscribe = onSnapshot(statsRef, (doc) => {
  if (doc.exists()) {
    const stats = { id: doc.id, ...doc.data() };
    // Update player stats display
    updatePlayerStats(stats);
  }
});
```

## 📱 Mobile App Implementation

### 1. Firebase Configuration

Use the same Firebase project configuration as the admin panel:

```typescript
// firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

### 2. Data Hooks

Create custom hooks for data fetching:

```typescript
// hooks/useSeasons.ts
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function useSeasons() {
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const seasonsRef = collection(db, 'seasons');
    const q = query(seasonsRef, where('isActive', '==', true));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const seasonsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSeasons(seasonsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { seasons, loading };
}
```

### 3. Offline Support

Implement offline caching for better user experience:

```typescript
// Enable offline persistence
import { enableNetwork, disableNetwork } from 'firebase/firestore';

// Disable network for offline mode
await disableNetwork(db);

// Re-enable network
await enableNetwork(db);
```

## 🔐 Security Considerations

### Firestore Rules

The mobile app has read-only access to public data:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Mobile app read access
    match /seasons/{seasonId} {
      allow read: if request.auth != null;
    }
    
    match /teams/{teamId} {
      allow read: if request.auth != null;
    }
    
    match /players/{playerId} {
      allow read: if request.auth != null;
    }
    
    match /matches/{matchId} {
      allow read: if request.auth != null;
    }
    
    match /statistics/{statId} {
      allow read: if request.auth != null;
    }
  }
}
```

### Authentication

Mobile app users authenticate with phone numbers:

```typescript
// Phone authentication
import { signInWithPhoneNumber } from 'firebase/auth';

const phoneAuth = async (phoneNumber: string) => {
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber);
  // Handle SMS verification
};
```

## 📊 Performance Optimization

### 1. Data Pagination

Implement pagination for large datasets:

```typescript
// Paginated queries
const getTeams = async (lastDoc?: DocumentSnapshot) => {
  let q = query(
    collection(db, 'teams'),
    orderBy('name'),
    limit(20)
  );
  
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  
  const snapshot = await getDocs(q);
  return snapshot;
};
```

### 2. Selective Listening

Only listen to necessary data:

```typescript
// Listen only to active players
const activePlayersQuery = query(
  collection(db, 'players'),
  where('isActive', '==', true),
  where('teamId', '==', selectedTeamId)
);
```

### 3. Data Caching

Cache frequently accessed data:

```typescript
// Cache team data
const teamCache = new Map();

const getTeam = async (teamId: string) => {
  if (teamCache.has(teamId)) {
    return teamCache.get(teamId);
  }
  
  const teamDoc = await getDoc(doc(db, 'teams', teamId));
  const teamData = { id: teamDoc.id, ...teamDoc.data() };
  teamCache.set(teamId, teamData);
  return teamData;
};
```

## 🚨 Error Handling

### Network Errors

Handle network connectivity issues:

```typescript
// Error handling for real-time listeners
const unsubscribe = onSnapshot(
  query(collection(db, 'matches')),
  (snapshot) => {
    // Handle data
  },
  (error) => {
    console.error('Firestore error:', error);
    // Show offline message
  }
);
```

### Data Validation

Validate data before using:

```typescript
// Validate match data
const validateMatch = (match: any): Match | null => {
  if (!match.id || !match.homeTeamId || !match.awayTeamId) {
    console.error('Invalid match data:', match);
    return null;
  }
  return match;
};
```

## 🔄 Data Flow Examples

### 1. Admin Creates Season → Mobile App Updates

1. Admin creates season in admin panel
2. Season document created in Firestore
3. Mobile app listener detects change
4. Mobile app updates season list
5. User sees new season in app

### 2. Admin Logs Match Event → Statistics Update

1. Admin logs goal in match
2. Match document updated with event
3. Cloud Function triggers statistics recalculation
4. Statistics document updated
5. Mobile app listener detects statistics change
6. Player stats updated in mobile app

### 3. Player Transfer → Mobile App Updates

1. Admin transfers player to new team
2. Player document updated with transfer history
3. Mobile app listener detects player change
4. Player appears in new team roster
5. Transfer history updated in player profile

## 📝 Implementation Checklist

- [ ] Configure Firebase project connection
- [ ] Implement authentication with phone numbers
- [ ] Set up real-time listeners for all collections
- [ ] Create data hooks for each collection
- [ ] Implement offline support
- [ ] Add error handling and loading states
- [ ] Test real-time synchronization
- [ ] Optimize performance with pagination
- [ ] Add data validation
- [ ] Test offline/online transitions

## 🧪 Testing Integration

### Test Real-time Updates

```typescript
// Test that mobile app receives updates
const testRealTimeUpdate = async () => {
  // Make change in admin panel
  await updateMatchScore(matchId, 2, 1);
  
  // Verify mobile app receives update
  const match = await getMatch(matchId);
  expect(match.homeScore).toBe(2);
  expect(match.awayScore).toBe(1);
};
```

### Test Offline Functionality

```typescript
// Test offline data access
const testOfflineAccess = async () => {
  // Disable network
  await disableNetwork(db);
  
  // Should still access cached data
  const teams = await getCachedTeams();
  expect(teams.length).toBeGreaterThan(0);
  
  // Re-enable network
  await enableNetwork(db);
};
```

---

This integration ensures seamless data synchronization between the admin panel and mobile app, providing users with real-time updates and a consistent experience across platforms.


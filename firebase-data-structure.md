# Firebase Data Structure - HFL Mobile App

## Collections (Ma'lumotlar to'plamlari)

### 1. `players` Collection
```javascript
// Document ID: Firebase Auth UID
{
  id: "firebase_auth_uid",
  firstName: "John",
  lastName: "Doe", 
  phone: "+998901234567",
  email: "+998901234567@hfl.com", // Firebase Auth email
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
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 2. `teams` Collection
```javascript
{
  id: "team_123",
  name: "Real Madrid",
  logo: "https://firebase-storage-url/logo.png",
  color: "#FFFFFF",
  players: ["player_uid_1", "player_uid_2"],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 3. `matches` Collection
```javascript
{
  id: "match_123",
  homeTeamId: "team_123",
  awayTeamId: "team_456", 
  homeTeamName: "Real Madrid",
  awayTeamName: "Barcelona",
  homeScore: 2,
  awayScore: 1,
  matchDate: Timestamp,
  venue: "Santiago Bernabeu",
  status: "finished",
  leagueType: "HFL Super Liga",
  youtubeLink: "https://youtube.com/watch?v=...",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 4. `standings` Collection
```javascript
{
  id: "standing_123",
  teamId: "team_123",
  teamName: "Real Madrid",
  leagueType: "HFL Super Liga",
  matchesPlayed: 20,
  wins: 15,
  draws: 3,
  losses: 2,
  goalsFor: 45,
  goalsAgainst: 20,
  points: 48,
  position: 1,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Firebase Authentication

### User Registration Flow:
1. User enters phone: `+998901234567`
2. Convert to email: `+998901234567@hfl.com`
3. Create Firebase Auth user with email/password
4. Save player data to `players` collection
5. Link Firebase Auth UID with player document

### Login Flow:
1. User enters phone: `+998901234567`
2. Convert to email: `+998901234567@hfl.com`
3. Firebase Auth signInWithEmailAndPassword()
4. Get player data from `players` collection using UID
5. Return player data to app

## Offline Support

Firebase automatically handles:
- **Offline Cache**: Data cached locally
- **Sync**: When online, syncs with server
- **Real-time**: Live updates across devices
- **APK Support**: Works in APK files


// Firebase Test User Creation Script
// Run this in Firebase Console → Firestore → Start collection

// Collection: players
// Document ID: firebase_auth_uid (will be created when user registers)

const testPlayerData = {
  id: "test_player_uid", // This will be replaced with actual Firebase Auth UID
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
};

// Instructions:
// 1. Go to Firebase Console → Firestore Database
// 2. Click "Start collection"
// 3. Collection ID: "players"
// 4. Document ID: "test_player_uid"
// 5. Add fields with the above data
// 6. Save

console.log('Test player data:', testPlayerData);


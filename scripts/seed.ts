<<<<<<< HEAD
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'demo-app-id',
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

// Connect to emulators
if (process.env.NODE_ENV === 'development') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
  } catch (error) {
    console.log('Emulators already connected');
  }
}

async function seedData() {
  try {
    console.log('🌱 Starting seed process...');

    // Create admin user
    console.log('Creating admin user...');
    const adminUser = await createUserWithEmailAndPassword(auth, 'admin@hfl.com', 'admin123');
    console.log('✅ Admin user created:', adminUser.user.uid);

    // Create admin document
    await setDoc(doc(db, 'admins', adminUser.user.uid), {
      email: 'admin@hfl.com',
      name: 'HFL Admin',
      role: 'super_admin',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create season
    console.log('Creating season...');
    const seasonRef = await addDoc(collection(db, 'seasons'), {
      name: 'HFL Season 2024',
      year: 2024,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Season created:', seasonRef.id);

    // Create teams
    console.log('Creating teams...');
    const teams = [
      { name: 'Real Madrid', shortName: 'RMA', primaryColor: '#FFFFFF', secondaryColor: '#000000' },
      { name: 'Barcelona', shortName: 'BAR', primaryColor: '#004D98', secondaryColor: '#A50044' },
      { name: 'Manchester United', shortName: 'MUN', primaryColor: '#DA020E', secondaryColor: '#FFE500' },
      { name: 'Liverpool', shortName: 'LIV', primaryColor: '#C8102E', secondaryColor: '#F6EB61' },
      { name: 'Bayern Munich', shortName: 'BAY', primaryColor: '#DC052D', secondaryColor: '#FFFFFF' },
      { name: 'PSG', shortName: 'PSG', primaryColor: '#004170', secondaryColor: '#ED1C24' },
    ];

    const teamRefs = [];
    for (const team of teams) {
      const teamRef = await addDoc(collection(db, 'teams'), {
        ...team,
        seasonId: seasonRef.id,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      teamRefs.push({ id: teamRef.id, ...team });
    }
    console.log('✅ Teams created:', teamRefs.length);

    // Create players
    console.log('Creating players...');
    const positions = ['GK', 'DEF', 'MID', 'FWD'] as const;
    const firstNames = ['Lionel', 'Cristiano', 'Kylian', 'Erling', 'Kevin', 'Luka', 'Virgil', 'Mohamed', 'Sadio', 'Neymar'];
    const lastNames = ['Messi', 'Ronaldo', 'Mbappe', 'Haaland', 'De Bruyne', 'Modric', 'Van Dijk', 'Salah', 'Mane', 'Jr'];

    const players = [];
    for (let i = 0; i < 60; i++) {
      const teamIndex = i % teamRefs.length;
      const team = teamRefs[teamIndex];
      
      const player = {
        firstName: firstNames[i % firstNames.length],
        lastName: lastNames[i % lastNames.length],
        dateOfBirth: new Date(1990 + (i % 15), i % 12, (i % 28) + 1).toISOString().split('T')[0],
        position: positions[i % positions.length],
        jerseyNumber: (i % 30) + 1,
        teamId: team.id,
        seasonId: seasonRef.id,
        phoneNumber: `+123456789${i.toString().padStart(2, '0')}`,
        isActive: true,
        joinedAt: new Date().toISOString(),
        transferHistory: [{
          id: `transfer_${i}`,
          playerId: '', // Will be set after player creation
          toTeamId: team.id,
          date: new Date().toISOString(),
          type: 'join' as const,
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const playerRef = await addDoc(collection(db, 'players'), player);
      players.push({ id: playerRef.id, ...player });
    }
    console.log('✅ Players created:', players.length);

    // Create matches
    console.log('Creating matches...');
    const matches = [];
    for (let i = 0; i < 30; i++) {
      const homeTeam = teamRefs[i % teamRefs.length];
      const awayTeam = teamRefs[(i + 1) % teamRefs.length];
      
      const matchDate = new Date();
      matchDate.setDate(matchDate.getDate() + i);

      const match = {
        seasonId: seasonRef.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        date: matchDate.toISOString().split('T')[0],
        time: '15:00',
        venue: `Stadium ${i + 1}`,
        status: i < 10 ? 'completed' : i < 20 ? 'live' : 'scheduled',
        homeScore: i < 10 ? Math.floor(Math.random() * 4) : undefined,
        awayScore: i < 10 ? Math.floor(Math.random() * 4) : undefined,
        events: i < 10 ? [
          {
            id: `event_${i}_1`,
            type: 'goal',
            playerId: players[i * 2].id,
            minute: 15 + (i * 3),
            teamId: homeTeam.id,
            description: 'Goal scored',
            timestamp: new Date().toISOString(),
          }
        ] : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const matchRef = await addDoc(collection(db, 'matches'), match);
      matches.push({ id: matchRef.id, ...match });
    }
    console.log('✅ Matches created:', matches.length);

    // Create admin log
    await addDoc(collection(db, 'adminLogs'), {
      action: 'seed_data',
      userId: adminUser.user.uid,
      details: 'Demo data seeded successfully',
      timestamp: new Date().toISOString(),
      resourceType: 'system',
    });

    console.log('🎉 Seed process completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - 1 Admin user (admin@hfl.com / admin123)`);
    console.log(`   - 1 Season`);
    console.log(`   - ${teams.length} Teams`);
    console.log(`   - ${players.length} Players`);
    console.log(`   - ${matches.length} Matches`);

  } catch (error) {
    console.error('❌ Seed process failed:', error);
=======
#!/usr/bin/env tsx

import { seedDatabase, getMockData } from '../src/utils/seedData';

async function main() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Check if Firebase is configured
    const hasFirebaseConfig = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID && 
                             process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID !== 'your_project_id';
    
    if (!hasFirebaseConfig) {
      console.log('⚠️  Firebase not configured. Using mock data for development.');
      const mockData = getMockData();
      console.log('📊 Mock data generated:');
      console.log(`   - ${mockData.teams.length} teams`);
      console.log(`   - ${mockData.matches.length} matches`);
      console.log('✅ Mock data is ready for development!');
      return;
    }
    
    await seedDatabase();
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
>>>>>>> dbdd47d97b5a64ad90e5c0be04a565b03b184043
    process.exit(1);
  }
}

<<<<<<< HEAD
// Run the seed function
seedData().then(() => {
  console.log('✅ Seed script completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Seed script failed:', error);
  process.exit(1);
});

=======
main();
>>>>>>> dbdd47d97b5a64ad90e5c0be04a565b03b184043

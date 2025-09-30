import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedApplications() {
  try {
    console.log('Seeding applications...');

    // Player applications
    const playerApplications = [
      {
        firstName: 'Ahmad',
        lastName: 'Karimov',
        phone: '+998901234567',
        photo: null,
        teamId: 'team1',
        teamName: 'Real Madrid',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        firstName: 'Sardor',
        lastName: 'Umarov',
        phone: '+998901234568',
        photo: null,
        teamId: 'team2',
        teamName: 'Barcelona',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        firstName: 'Javlon',
        lastName: 'Rahimov',
        phone: '+998901234569',
        photo: null,
        teamId: 'team1',
        teamName: 'Real Madrid',
        status: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    // Team applications
    const teamApplications = [
      {
        teamName: 'Dinamo Toshkent',
        foundedDate: '2020-01-15',
        logo: null,
        teamColor: '#FF0000',
        description: 'Toshkent shahridan professional futbol jamoasi',
        contactPerson: 'Akmal Karimov',
        contactPhone: '+998901234570',
        contactEmail: 'akmal@dinamo.uz',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        teamName: 'Paxtakor',
        foundedDate: '2019-03-20',
        logo: null,
        teamColor: '#00FF00',
        description: 'O\'zbekistonning eng qadimiy futbol jamoasi',
        contactPerson: 'Bakhtiyor Rahimov',
        contactPhone: '+998901234571',
        contactEmail: 'bakhtiyor@paxtakor.uz',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        teamName: 'Lokomotiv',
        foundedDate: '2021-06-10',
        logo: null,
        teamColor: '#0000FF',
        description: 'Yosh va istiqbolli jamoa',
        contactPerson: 'Dilshod Umarov',
        contactPhone: '+998901234572',
        contactEmail: 'dilshod@lokomotiv.uz',
        status: 'rejected',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    // Add player applications
    for (const app of playerApplications) {
      await addDoc(collection(db, 'leagueApplications'), app);
      console.log('Added player application:', app.firstName, app.lastName);
    }

    // Add team applications
    for (const app of teamApplications) {
      await addDoc(collection(db, 'teamApplications'), app);
      console.log('Added team application:', app.teamName);
    }

    console.log('Applications seeded successfully!');
  } catch (error) {
    console.error('Error seeding applications:', error);
  }
}

seedApplications();

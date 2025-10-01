import { collection, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const seedStandings = async () => {
  const standingsData = [
    {
      teamId: 'team1',
      team: {
        id: 'team1',
        name: 'Real Madrid',
        logo: '',
        color: '#FFFFFF',
        description: 'Real Madrid Club de Fútbol',
      },
      matchesPlayed: 10,
      wins: 8,
      draws: 1,
      losses: 1,
      goalsFor: 25,
      goalsAgainst: 8,
      goalDifference: 17,
      points: 25,
    },
    {
      teamId: 'team2',
      team: {
        id: 'team2',
        name: 'Barcelona',
        logo: '',
        color: '#A50044',
        description: 'FC Barcelona',
      },
      matchesPlayed: 10,
      wins: 7,
      draws: 2,
      losses: 1,
      goalsFor: 22,
      goalsAgainst: 10,
      goalDifference: 12,
      points: 23,
    },
    {
      teamId: 'team3',
      team: {
        id: 'team3',
        name: 'Atletico Madrid',
        logo: '',
        color: '#CE1126',
        description: 'Club Atlético de Madrid',
      },
      matchesPlayed: 10,
      wins: 6,
      draws: 3,
      losses: 1,
      goalsFor: 18,
      goalsAgainst: 9,
      goalDifference: 9,
      points: 21,
    },
    {
      teamId: 'team4',
      team: {
        id: 'team4',
        name: 'Sevilla',
        logo: '',
        color: '#FFFFFF',
        description: 'Sevilla FC',
      },
      matchesPlayed: 10,
      wins: 5,
      draws: 4,
      losses: 1,
      goalsFor: 16,
      goalsAgainst: 12,
      goalDifference: 4,
      points: 19,
    },
    {
      teamId: 'team5',
      team: {
        id: 'team5',
        name: 'Valencia',
        logo: '',
        color: '#FF6600',
        description: 'Valencia CF',
      },
      matchesPlayed: 10,
      wins: 4,
      draws: 3,
      losses: 3,
      goalsFor: 14,
      goalsAgainst: 13,
      goalDifference: 1,
      points: 15,
    },
  ];

  try {
    console.log('Seeding standings data...');
    
    for (const standing of standingsData) {
      await addDoc(collection(db, 'standings'), {
        ...standing,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    console.log('Standings data seeded successfully!');
  } catch (error) {
    console.error('Error seeding standings:', error);
  }
};

export default seedStandings;


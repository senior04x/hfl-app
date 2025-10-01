import { collection, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const seedTournamentData = async () => {
  try {
    console.log('Seeding tournament data...');
    
    // HFL 3-liga uchun test ma'lumotlari
    const hfl3LigaStandings = [
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
        leagueType: 'HFL 3-liga',
        createdAt: new Date(),
        updatedAt: new Date(),
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
        leagueType: 'HFL 3-liga',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // HFL Pro Liga uchun test ma'lumotlari
    const hflProLigaStandings = [
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
        leagueType: 'HFL Pro Liga',
        createdAt: new Date(),
        updatedAt: new Date(),
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
        leagueType: 'HFL Pro Liga',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // HFL Super Liga uchun test ma'lumotlari
    const hflSuperLigaStandings = [
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
        leagueType: 'HFL Super Liga',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // HFL Chempions Liga uchun test ma'lumotlari
    const hflChempionsLigaStandings = [
      {
        teamId: 'team6',
        team: {
          id: 'team6',
          name: 'Manchester United',
          logo: '',
          color: '#FF0000',
          description: 'Manchester United FC',
        },
        matchesPlayed: 10,
        wins: 9,
        draws: 0,
        losses: 1,
        goalsFor: 28,
        goalsAgainst: 5,
        goalDifference: 23,
        points: 27,
        leagueType: 'HFL Chempions Liga',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Barcha standings ma'lumotlarini qo'shish
    const allStandings = [
      ...hfl3LigaStandings,
      ...hflProLigaStandings,
      ...hflSuperLigaStandings,
      ...hflChempionsLigaStandings,
    ];

    for (const standing of allStandings) {
      await addDoc(collection(db, 'standings'), standing);
    }

    // Test matches ma'lumotlarini qo'shish
    const testMatches = [
      {
        homeTeamId: 'team1',
        awayTeamId: 'team2',
        homeTeamName: 'Real Madrid',
        awayTeamName: 'Barcelona',
        homeScore: 2,
        awayScore: 1,
        matchDate: new Date('2024-10-15'),
        venue: 'Santiago Bernabéu',
        status: 'finished',
        youtubeLink: 'https://youtube.com/watch?v=example1',
        leagueType: 'HFL 3-liga',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        homeTeamId: 'team3',
        awayTeamId: 'team4',
        homeTeamName: 'Atletico Madrid',
        awayTeamName: 'Sevilla',
        homeScore: 1,
        awayScore: 0,
        matchDate: new Date('2024-10-14'),
        venue: 'Wanda Metropolitano',
        status: 'finished',
        youtubeLink: 'https://youtube.com/watch?v=example2',
        leagueType: 'HFL Pro Liga',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        homeTeamId: 'team5',
        awayTeamId: 'team6',
        homeTeamName: 'Valencia',
        awayTeamName: 'Manchester United',
        homeScore: 0,
        awayScore: 3,
        matchDate: new Date('2024-10-13'),
        venue: 'Mestalla',
        status: 'finished',
        youtubeLink: 'https://youtube.com/watch?v=example3',
        leagueType: 'HFL Super Liga',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const match of testMatches) {
      await addDoc(collection(db, 'matches'), match);
    }
    
    console.log('Tournament data seeded successfully!');
  } catch (error) {
    console.error('Error seeding tournament data:', error);
  }
};

export default seedTournamentData;


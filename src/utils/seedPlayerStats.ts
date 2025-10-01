import { collection, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const seedPlayerStats = async () => {
  try {
    console.log('Seeding player stats data...');
    
    const playerStatsData = [
      // HFL 3-liga o'yinchilari
      {
        playerId: 'player1',
        playerName: 'Эркинов Аваз',
        playerPhoto: '',
        teamId: 'team1',
        teamName: 'Real Madrid',
        teamLogo: '',
        leagueType: 'HFL 3-liga',
        matchesPlayed: 10,
        goals: 7,
        assists: 3,
        yellowCards: 2,
        redCards: 0,
        minutesPlayed: 900,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        playerId: 'player2',
        playerName: 'Омонжонов Эльер',
        playerPhoto: '',
        teamId: 'team2',
        teamName: 'Barcelona',
        teamLogo: '',
        leagueType: 'HFL 3-liga',
        matchesPlayed: 10,
        goals: 5,
        assists: 4,
        yellowCards: 1,
        redCards: 0,
        minutesPlayed: 850,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        playerId: 'player3',
        playerName: 'Умаржонов Ахрор',
        playerPhoto: '',
        teamId: 'team1',
        teamName: 'Real Madrid',
        teamLogo: '',
        leagueType: 'HFL 3-liga',
        matchesPlayed: 9,
        goals: 5,
        assists: 2,
        yellowCards: 3,
        redCards: 0,
        minutesPlayed: 810,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        playerId: 'player4',
        playerName: 'Таиров Агзам',
        playerPhoto: '',
        teamId: 'team2',
        teamName: 'Barcelona',
        teamLogo: '',
        leagueType: 'HFL 3-liga',
        matchesPlayed: 10,
        goals: 5,
        assists: 1,
        yellowCards: 2,
        redCards: 0,
        minutesPlayed: 880,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // HFL Pro Liga o'yinchilari
      {
        playerId: 'player5',
        playerName: 'Байбурин Алиакбар',
        playerPhoto: '',
        teamId: 'team3',
        teamName: 'Atletico Madrid',
        teamLogo: '',
        leagueType: 'HFL Pro Liga',
        matchesPlayed: 10,
        goals: 6,
        assists: 2,
        yellowCards: 1,
        redCards: 0,
        minutesPlayed: 900,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        playerId: 'player6',
        playerName: 'Увраимов Амал',
        playerPhoto: '',
        teamId: 'team4',
        teamName: 'Sevilla',
        teamLogo: '',
        leagueType: 'HFL Pro Liga',
        matchesPlayed: 9,
        goals: 4,
        assists: 3,
        yellowCards: 2,
        redCards: 0,
        minutesPlayed: 810,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // HFL Super Liga o'yinchilari
      {
        playerId: 'player7',
        playerName: 'Ахмеджанов Маруф',
        playerPhoto: '',
        teamId: 'team5',
        teamName: 'Valencia',
        teamLogo: '',
        leagueType: 'HFL Super Liga',
        matchesPlayed: 10,
        goals: 8,
        assists: 1,
        yellowCards: 1,
        redCards: 0,
        minutesPlayed: 900,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // HFL Chempions Liga o'yinchilari
      {
        playerId: 'player8',
        playerName: 'Хуррамов Хуршид',
        playerPhoto: '',
        teamId: 'team6',
        teamName: 'Manchester United',
        teamLogo: '',
        leagueType: 'HFL Chempions Liga',
        matchesPlayed: 10,
        goals: 9,
        assists: 2,
        yellowCards: 0,
        redCards: 0,
        minutesPlayed: 900,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const playerStat of playerStatsData) {
      await addDoc(collection(db, 'playerStats'), playerStat);
    }
    
    console.log('Player stats data seeded successfully!');
  } catch (error) {
    console.error('Error seeding player stats:', error);
  }
};

export default seedPlayerStats;


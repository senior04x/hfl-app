import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Team, Player, Match } from '../types';
// Demo teams data
const teamsData = [
  {
    name: 'Havas United',
    color: '#FF3B30',
    players: [
      { name: 'John Smith', position: 'GK', number: 1 },
      { name: 'Mike Johnson', position: 'DEF', number: 2 },
      { name: 'David Wilson', position: 'DEF', number: 3 },
      { name: 'Chris Brown', position: 'DEF', number: 4 },
      { name: 'Alex Davis', position: 'DEF', number: 5 },
      { name: 'Tom Miller', position: 'MID', number: 6 },
      { name: 'James Garcia', position: 'MID', number: 7 },
      { name: 'Ryan Martinez', position: 'MID', number: 8 },
      { name: 'Kevin Anderson', position: 'MID', number: 9 },
      { name: 'Steve Taylor', position: 'FWD', number: 10 },
      { name: 'Paul Thomas', position: 'FWD', number: 11 },
    ],
  },
  {
    name: 'Creative FC',
    color: '#007AFF',
    players: [
      { name: 'Luis Rodriguez', position: 'GK', number: 1 },
      { name: 'Carlos Lopez', position: 'DEF', number: 2 },
      { name: 'Miguel Gonzalez', position: 'DEF', number: 3 },
      { name: 'Jose Martinez', position: 'DEF', number: 4 },
      { name: 'Antonio Garcia', position: 'DEF', number: 5 },
      { name: 'Francisco Perez', position: 'MID', number: 6 },
      { name: 'Juan Sanchez', position: 'MID', number: 7 },
      { name: 'Roberto Ramirez', position: 'MID', number: 8 },
      { name: 'Fernando Torres', position: 'MID', number: 9 },
      { name: 'Diego Costa', position: 'FWD', number: 10 },
      { name: 'Sergio Aguero', position: 'FWD', number: 11 },
    ],
  },
  {
    name: 'Digital Dynamos',
    color: '#34C759',
    players: [
      { name: 'Emma Watson', position: 'GK', number: 1 },
      { name: 'Sophie Brown', position: 'DEF', number: 2 },
      { name: 'Olivia Davis', position: 'DEF', number: 3 },
      { name: 'Isabella Wilson', position: 'DEF', number: 4 },
      { name: 'Amelia Johnson', position: 'DEF', number: 5 },
      { name: 'Mia Garcia', position: 'MID', number: 6 },
      { name: 'Charlotte Martinez', position: 'MID', number: 7 },
      { name: 'Harper Anderson', position: 'MID', number: 8 },
      { name: 'Evelyn Taylor', position: 'MID', number: 9 },
      { name: 'Abigail Thomas', position: 'FWD', number: 10 },
      { name: 'Emily Jackson', position: 'FWD', number: 11 },
    ],
  },
  {
    name: 'Innovation FC',
    color: '#FF9500',
    players: [
      { name: 'Ahmed Hassan', position: 'GK', number: 1 },
      { name: 'Omar Ali', position: 'DEF', number: 2 },
      { name: 'Youssef Ibrahim', position: 'DEF', number: 3 },
      { name: 'Mohamed Salah', position: 'DEF', number: 4 },
      { name: 'Tariq Ahmed', position: 'DEF', number: 5 },
      { name: 'Khalid Omar', position: 'MID', number: 6 },
      { name: 'Hassan Youssef', position: 'MID', number: 7 },
      { name: 'Ali Mohamed', position: 'MID', number: 8 },
      { name: 'Ibrahim Tariq', position: 'MID', number: 9 },
      { name: 'Salah Khalid', position: 'FWD', number: 10 },
      { name: 'Ahmed Hassan Jr', position: 'FWD', number: 11 },
    ],
  },
];

// Demo matches data
const matchesData = [
  {
    homeTeamIndex: 0,
    awayTeamIndex: 1,
    status: 'finished' as const,
    score: { home: 2, away: 1 },
    scheduledAt: new Date('2024-01-15T15:00:00Z'),
    startedAt: new Date('2024-01-15T15:05:00Z'),
    finishedAt: new Date('2024-01-15T16:50:00Z'),
  },
  {
    homeTeamIndex: 2,
    awayTeamIndex: 3,
    status: 'live' as const,
    score: { home: 1, away: 1 },
    scheduledAt: new Date('2024-01-20T14:00:00Z'),
    startedAt: new Date('2024-01-20T14:05:00Z'),
  },
  {
    homeTeamIndex: 0,
    awayTeamIndex: 2,
    status: 'scheduled' as const,
    score: { home: 0, away: 0 },
    scheduledAt: new Date('2024-01-25T16:00:00Z'),
  },
  {
    homeTeamIndex: 1,
    awayTeamIndex: 3,
    status: 'scheduled' as const,
    score: { home: 0, away: 0 },
    scheduledAt: new Date('2024-01-27T15:30:00Z'),
  },
  {
    homeTeamIndex: 2,
    awayTeamIndex: 0,
    status: 'scheduled' as const,
    score: { home: 0, away: 0 },
    scheduledAt: new Date('2024-02-01T17:00:00Z'),
  },
  {
    homeTeamIndex: 3,
    awayTeamIndex: 1,
    status: 'scheduled' as const,
    score: { home: 0, away: 0 },
    scheduledAt: new Date('2024-02-03T14:30:00Z'),
  },
];

export const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // Create teams and players
    const createdTeams: Team[] = [];
    
    for (const teamData of teamsData) {
      const { players, ...teamInfo } = teamData;
      
      // Create team document
      const teamRef = await addDoc(collection(db, 'teams'), {
        ...teamInfo,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Create players for this team
      const playersData = players.map(player => ({
        ...player,
        teamId: teamRef.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }));

      for (const playerData of playersData) {
        await addDoc(collection(db, 'players'), playerData);
      }

      // Store team with ID for matches
      createdTeams.push({
        id: teamRef.id,
        ...teamInfo,
        players: playersData.map(p => ({ ...p, id: '' })), // Players will have IDs from Firestore
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`Created team: ${teamInfo.name}`);
    }

    // Create matches
    for (const matchData of matchesData) {
      const homeTeam = createdTeams[matchData.homeTeamIndex];
      const awayTeam = createdTeams[matchData.awayTeamIndex];

      const matchDoc = {
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeTeam,
        awayTeam,
        status: matchData.status,
        score: matchData.score,
        scheduledAt: Timestamp.fromDate(matchData.scheduledAt),
        startedAt: matchData.startedAt ? Timestamp.fromDate(matchData.startedAt) : null,
        finishedAt: matchData.finishedAt ? Timestamp.fromDate(matchData.finishedAt) : null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'matches'), matchDoc);
      console.log(`Created match: ${homeTeam.name} vs ${awayTeam.name}`);
    }

    // Create initial standings
    const standingsData = createdTeams.map((team, index) => ({
      teamId: team.id,
      team,
      matchesPlayed: index < 2 ? 1 : 0, // First two teams have played
      wins: index === 0 ? 1 : 0, // Havas United won
      draws: index === 1 ? 1 : 0, // Creative FC drew
      losses: index === 1 ? 0 : (index === 0 ? 0 : 1),
      goalsFor: index === 0 ? 2 : (index === 1 ? 1 : 0),
      goalsAgainst: index === 0 ? 1 : (index === 1 ? 2 : 0),
      goalDifference: index === 0 ? 1 : (index === 1 ? -1 : 0),
      points: index === 0 ? 3 : (index === 1 ? 1 : 0),
    }));

    for (const standing of standingsData) {
      await addDoc(collection(db, 'standings'), standing);
    }

    console.log('Database seeding completed successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

// Mock data for development when Firebase is not configured
export const getMockData = () => {
  const mockTeams: Team[] = teamsData.map((team, index) => ({
    id: `team-${index}`,
    name: team.name,
    color: team.color,
    players: team.players.map((player, playerIndex) => ({
      id: `player-${index}-${playerIndex}`,
      name: player.name,
      position: player.position as 'GK' | 'DEF' | 'MID' | 'FWD',
      number: player.number,
      teamId: `team-${index}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const mockMatches: Match[] = matchesData.map((match, index) => ({
    id: `match-${index}`,
    homeTeamId: mockTeams[match.homeTeamIndex].id,
    awayTeamId: mockTeams[match.awayTeamIndex].id,
    homeTeam: mockTeams[match.homeTeamIndex],
    awayTeam: mockTeams[match.awayTeamIndex],
    status: match.status,
    score: match.score,
    scheduledAt: match.scheduledAt,
    startedAt: match.startedAt,
    finishedAt: match.finishedAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  return { teams: mockTeams, matches: mockMatches };
};


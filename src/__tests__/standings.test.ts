import { calculateStandings } from '../utils/standings';

// Mock data for testing
const mockTeams = [
  { id: 'team1', name: 'Team A', color: '#FF0000' },
  { id: 'team2', name: 'Team B', color: '#00FF00' },
  { id: 'team3', name: 'Team C', color: '#0000FF' },
];

const mockMatches = [
  {
    id: 'match1',
    homeTeamId: 'team1',
    awayTeamId: 'team2',
    status: 'finished',
    score: { home: 2, away: 1 },
  },
  {
    id: 'match2',
    homeTeamId: 'team2',
    awayTeamId: 'team3',
    status: 'finished',
    score: { home: 1, away: 1 },
  },
  {
    id: 'match3',
    homeTeamId: 'team1',
    awayTeamId: 'team3',
    status: 'finished',
    score: { home: 0, away: 2 },
  },
];

describe('Standings Calculation', () => {
  test('should calculate standings correctly', () => {
    const standings = calculateStandings(mockTeams, mockMatches);

    expect(standings).toHaveLength(3);

    // Team C should be first (2 wins, 6 points)
    expect(standings[0].teamId).toBe('team3');
    expect(standings[0].points).toBe(6);
    expect(standings[0].wins).toBe(2);
    expect(standings[0].draws).toBe(0);
    expect(standings[0].losses).toBe(0);
    expect(standings[0].goalsFor).toBe(3);
    expect(standings[0].goalsAgainst).toBe(1);

    // Team A should be second (1 win, 1 loss, 3 points)
    expect(standings[1].teamId).toBe('team1');
    expect(standings[1].points).toBe(3);
    expect(standings[1].wins).toBe(1);
    expect(standings[1].draws).toBe(0);
    expect(standings[1].losses).toBe(1);
    expect(standings[1].goalsFor).toBe(2);
    expect(standings[1].goalsAgainst).toBe(3);

    // Team B should be third (1 draw, 1 loss, 1 point)
    expect(standings[2].teamId).toBe('team2');
    expect(standings[2].points).toBe(1);
    expect(standings[2].wins).toBe(0);
    expect(standings[2].draws).toBe(1);
    expect(standings[2].losses).toBe(1);
    expect(standings[2].goalsFor).toBe(2);
    expect(standings[2].goalsAgainst).toBe(3);
  });

  test('should handle teams with no matches', () => {
    const teamsWithNoMatches = [
      { id: 'team1', name: 'Team A', color: '#FF0000' },
      { id: 'team2', name: 'Team B', color: '#00FF00' },
    ];

    const standings = calculateStandings(teamsWithNoMatches, []);

    expect(standings).toHaveLength(2);
    expect(standings[0].points).toBe(0);
    expect(standings[0].matchesPlayed).toBe(0);
    expect(standings[1].points).toBe(0);
    expect(standings[1].matchesPlayed).toBe(0);
  });

  test('should sort by points, then goal difference, then goals for', () => {
    const teams = [
      { id: 'team1', name: 'Team A', color: '#FF0000' },
      { id: 'team2', name: 'Team B', color: '#00FF00' },
      { id: 'team3', name: 'Team C', color: '#0000FF' },
    ];

    const matches = [
      {
        id: 'match1',
        homeTeamId: 'team1',
        awayTeamId: 'team2',
        status: 'finished',
        score: { home: 3, away: 0 },
      },
      {
        id: 'match2',
        homeTeamId: 'team2',
        awayTeamId: 'team3',
        status: 'finished',
        score: { home: 2, away: 1 },
      },
      {
        id: 'match3',
        homeTeamId: 'team1',
        awayTeamId: 'team3',
        status: 'finished',
        score: { home: 1, away: 2 },
      },
    ];

    const standings = calculateStandings(teams, matches);

    // All teams have 3 points, but different goal differences
    expect(standings[0].teamId).toBe('team1'); // GD: +1
    expect(standings[1].teamId).toBe('team3'); // GD: 0
    expect(standings[2].teamId).toBe('team2'); // GD: -1
  });
});

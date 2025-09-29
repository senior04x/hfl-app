import { Team, Match, TeamStanding } from '../types';

/**
 * Calculate standings for all teams based on finished matches
 */
export const calculateStandings = (teams: Team[], matches: Match[]): TeamStanding[] => {
  // Filter only finished matches
  const finishedMatches = matches.filter(match => match.status === 'finished');

  // Calculate standings for each team
  const standings: TeamStanding[] = teams.map(team => {
    const teamMatches = finishedMatches.filter(match => 
      match.homeTeamId === team.id || match.awayTeamId === team.id
    );

    let matchesPlayed = teamMatches.length;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    teamMatches.forEach(match => {
      const isHome = match.homeTeamId === team.id;
      const teamScore = isHome ? match.score.home : match.score.away;
      const opponentScore = isHome ? match.score.away : match.score.home;

      goalsFor += teamScore;
      goalsAgainst += opponentScore;

      if (teamScore > opponentScore) {
        wins++;
      } else if (teamScore === opponentScore) {
        draws++;
      } else {
        losses++;
      }
    });

    const goalDifference = goalsFor - goalsAgainst;
    const points = (wins * 3) + (draws * 1);

    return {
      teamId: team.id,
      team,
      matchesPlayed,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference,
      points,
    };
  });

  // Sort by points (descending), then goal difference (descending), then goals for (descending)
  return standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
};

/**
 * Get team position in standings
 */
export const getTeamPosition = (standings: TeamStanding[], teamId: string): number => {
  const index = standings.findIndex(standing => standing.teamId === teamId);
  return index === -1 ? 0 : index + 1;
};

/**
 * Get teams around a specific team in standings
 */
export const getTeamsAround = (standings: TeamStanding[], teamId: string, range: number = 2): TeamStanding[] => {
  const index = standings.findIndex(standing => standing.teamId === teamId);
  if (index === -1) return [];

  const start = Math.max(0, index - range);
  const end = Math.min(standings.length, index + range + 1);
  
  return standings.slice(start, end);
};

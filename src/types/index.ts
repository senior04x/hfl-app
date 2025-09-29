// User types
export interface User {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Team types
export interface Team {
  id: string;
  name: string;
  logo?: string;
  color: string;
  players: Player[];
  createdAt: Date;
  updatedAt: Date;
}

// Player types
export interface Player {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  number: number;
  teamId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Match types
export type MatchStatus = 'scheduled' | 'live' | 'finished';

export interface Score {
  home: number;
  away: number;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: Team;
  awayTeam: Team;
  status: MatchStatus;
  score: Score;
  scheduledAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Standings types
export interface TeamStanding {
  teamId: string;
  team: Team;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  MatchDetail: { matchId: string };
  TeamDetail: { teamId: string };
  AdminMatchEdit: { matchId?: string };
  AdminScoreUpdate: { matchId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Matches: undefined;
  Teams: undefined;
  Standings: undefined;
  Admin: undefined;
};

// Auth types
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Store types
export interface AppState {
  auth: AuthState;
  matches: Match[];
  teams: Team[];
  standings: TeamStanding[];
  isLoading: boolean;
}

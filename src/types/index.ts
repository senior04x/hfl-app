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
  description?: string;
  players: Player[];
  createdAt: Date;
  updatedAt: Date;
}

// Player types
export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  photo?: string;
  teamId: string;
  teamName: string;
  position?: string;
  number?: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
  status: 'active' | 'inactive' | 'suspended';
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
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  matchDate: Date;
  status: MatchStatus;
  venue?: string;
  referee?: string;
  youtubeLink?: string;
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
  PlayerStats: { playerId: string; playerName?: string };
  TeamSelection: undefined;
  PlayerRegistration: { team: Team };
  PlayerLogin: undefined;
  PlayerVerification: { phoneNumber: string; verificationCode: string; playerId: string };
  PlayerDashboard: { playerId: string };
  TeamApplication: undefined;
  TransferRequest: { playerId: string; currentTeamId: string; currentTeamName: string };
};

export type MainTabParamList = {
  Home: undefined;
  Matches: undefined;
  Teams: undefined;
  Standings: undefined;
  Account: undefined;
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

<<<<<<< HEAD
export interface Season {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  colors: {
    primary: string;
    secondary: string;
  };
  seasonId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

=======
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
>>>>>>> dbdd47d97b5a64ad90e5c0be04a565b03b184043
export interface Player {
  id: string;
  firstName: string;
  lastName: string;
<<<<<<< HEAD
  dateOfBirth: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  jerseyNumber: number;
  teamId: string;
  seasonId: string;
  phoneNumber?: string;
  isActive: boolean;
  joinedAt: string;
  transferHistory: Transfer[];
  createdAt: string;
  updatedAt: string;
}

export interface Transfer {
  id: string;
  playerId: string;
  fromTeamId?: string;
  toTeamId: string;
  date: string;
  type: 'join' | 'transfer' | 'release';
  notes?: string;
}

export interface Match {
  id: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  date: string;
  time: string;
  venue: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  homeScore?: number;
  awayScore?: number;
  events: MatchEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface MatchEvent {
  id: string;
  type: 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'substitution' | 'penalty';
  playerId: string;
  substitutePlayerId?: string;
  minute: number;
  teamId: string;
  description?: string;
  timestamp: string;
}

export interface Statistics {
  id: string;
  seasonId: string;
  playerId: string;
  gamesPlayed: number;
=======
  phone: string;
  email?: string;
  photo?: string;
  teamId: string;
  teamName: string;
  position?: string;
  number?: number;
>>>>>>> dbdd47d97b5a64ad90e5c0be04a565b03b184043
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
<<<<<<< HEAD
  minutesPlayed: number;
  updatedAt: string;
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLog {
  id: string;
  action: string;
  userId: string;
  details: string;
  timestamp: string;
  resourceType?: string;
  resourceId?: string;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  admin: boolean;
  role?: string;
}

// Form types
export interface SeasonFormData {
  name: string;
  year: number;
  startDate: string;
  endDate: string;
}

export interface TeamFormData {
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  seasonId: string;
}

export interface PlayerFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  position: string;
  jerseyNumber: number;
  teamId: string;
  phoneNumber?: string;
}

export interface MatchFormData {
  homeTeamId: string;
  awayTeamId: string;
  date: string;
  time: string;
  venue: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

=======
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
>>>>>>> dbdd47d97b5a64ad90e5c0be04a565b03b184043

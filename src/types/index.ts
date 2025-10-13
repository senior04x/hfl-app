// User types
export interface User {
  id: string;
  uid?: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  admin?: boolean;
  role?: string;
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
  minutesPlayed?: number;
  status: 'active' | 'inactive' | 'suspended';
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
  foundedDate?: string;
  players: Player[];
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
  leagueType?: string;
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

// Player Stats types
export interface PlayerStats {
  id: string;
  playerId: string;
  playerName: string;
  playerPhoto?: string;
  teamId: string;
  teamName: string;
  teamLogo?: string;
  leagueType: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  createdAt: Date;
  updatedAt: Date;
}

// Navigation types
export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
  Home: undefined;
  Matches: undefined;
  Teams: undefined;
  Standings: undefined;
  Account: undefined;
  MatchDetail: { matchId: string };
  LeagueMatches: { leagueType: string; dateString: string; matches: Match[] };
  TeamDetail: { teamId: string };
  PlayerStats: { playerId: string; playerName?: string };
  PlayerRegistration: { team?: Team };
  PlayerLogin: undefined;
  PlayerVerification: { phoneNumber: string; verificationCode: string; playerId: string };
  PlayerDashboard: { playerId: string };
  TeamApplication: undefined;
  LeagueApplication: undefined;
  TransferRequest: { playerId: string; currentTeamId: string; currentTeamName: string };
  Settings: undefined;
  PlayerTransferRequest: undefined;
  TeamTransferRequest: undefined;
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

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API Error types
export interface ApiError {
  success: false;
  error: string;
  details?: string;
}

// Slider types
export interface SliderItem {
  id: string;
  title: string;
  imageUrl?: string;
  link?: string;
  linkType?: 'internal' | 'external';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Navigation types
export type RootStackParamList = {
  Splash: undefined;
  Main: undefined;
  MatchDetail: { matchId: string; matchName?: string };
  LeagueMatches: { leagueId: string; leagueName?: string };
  TeamDetail: { teamId: string; teamName?: string };
  PlayerStats: { playerId: string; playerName?: string };
  PlayerRegistration: undefined;
  PlayerLogin: undefined;
  PlayerVerification: { phone: string };
  PlayerDashboard: undefined;
  TeamApplication: undefined;
  LeagueApplication: undefined;
  TransferRequest: undefined;
  Settings: undefined;
  PlayerTransferRequest: undefined;
  TeamTransferRequest: undefined;
  LeagueTournaments: { leagueId: string; leagueName: string; tournaments: any[] };
  TournamentDetail: { tournamentId: string; tournamentName: string; leagueName?: string };
};

export type MainTabParamList = {
  Home: undefined;
  Matches: undefined;
  Teams: undefined;
  Standings: undefined;
  Account: undefined;
};


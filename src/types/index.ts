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

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
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
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
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


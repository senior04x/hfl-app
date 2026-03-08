export interface Player {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    position?: string;
    number?: number;
    team?: string | Team;
    avatar?: string;
    stats?: {
        goals: number;
        assists: number;
        yellowCards: number;
        redCards: number;
        matchesPlayed: number;
    };
}

export interface Team {
    _id: string;
    name: string;
    logo?: string;
    description?: string;
    players?: string[] | Player[];
    stats?: {
        played: number;
        won: number;
        drawn: number;
        lost: number;
        goalsFor: number;
        goalsAgainst: number;
        points: number;
    };
}

export interface Tournament {
    _id: string;
    name: string;
    season: string;
    status: 'upcoming' | 'ongoing' | 'completed';
    teams: string[] | Team[];
    matches: string[];
}

export interface Player {
    _id: string;
    firstName: string;
    lastName: string;
    fatherName?: string;
    photo?: string;
    avatar?: string;
    number?: string;
    position?: string;
    positionUz?: string;
    age?: number;
    height?: number;
    weight?: number;
    citizenship?: string;
    status: 'active' | 'inactive' | 'suspended';
    team?: string | Team;
    instagram?: string;
    facebook?: string;
    youtube?: string;
    bestGame?: string;
    biggestWin?: string;
    biggestDefeat?: string;
    playedStadiums?: string[];

    careerGoals?: number;
    careerAssists?: number;
    careerMatches?: number;
    winPercentage?: number;
    rating?: number;
    
    stats?: {
        goals: number;
        assists: number;
        yellowCards: number;
        redCards: number;
        matchesPlayed: number;
    };

    statsByTeam?: {
        [teamId: string]: {
            matchesPlayed: number;
            goals: number;
            assists: number;
            yellowCards: number;
            redCards: number;
            wins: number;
            teamName?: string;
            teamLogo?: string;
        };
    };
    careerHistory?: CareerHistoryYear[];
}

export interface CareerHistoryYear {
    year: string;
    teams: CareerTeamHistory[];
}

export interface CareerTeamHistory {
    teamId: string;
    teamName: string;
    teamLogo?: string;
    total: {
        matchesPlayed: number;
        goals: number;
        assists: number;
        yellowCards: number;
        redCards: number;
        wins: number;
    };
    tournaments: CareerTourHistory[];
}

export interface CareerTourHistory {
    name: string;
    matchesPlayed: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    wins: number;
}

export interface Team {
    _id: string;
    name: string;
    logo?: string;
    color?: string;
    description?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
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
    leagueId: string;
    teams: string[] | Team[];
    matches: string[];
}

export interface League {
    _id: string;
    name: string;
    logo?: string;
    description?: string;
    location?: string;
    status?: 'active' | 'inactive' | 'completed';
    maxTeams?: number;
    instagram?: string;
    facebook?: string;
    youtube?: string;
    teamCount?: number;
    playerCount?: number;
    tournaments?: Tournament[];
}

export interface News {
    _id: string;
    title: string;
    content: string;
    imageUrl?: string;
    category?: string;
    author?: string;
    views?: number;
    createdAt: string;
    updatedAt: string;
}

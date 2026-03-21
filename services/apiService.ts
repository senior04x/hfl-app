import axios from 'axios';

// Production Render URL
// const BASE_URL = 'https://hfl-backend.onrender.com/api';

// Local development URL (Use your machine IP for mobile connectivity)
const BASE_URL = 'http://192.168.0.111:3002/api';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const apiService = {
    // Players
    getPlayers: (page = 1, limit = 20, teamId?: string, tournamentId?: string) =>
        api.get('/players', { params: { page, limit, teamId, tournamentId } }).then(res => res.data.data),
    getPlayerById: (id: string) =>
        api.get(`/players/${id}`).then(res => res.data.data),
    getPlayerStats: (id: string) =>
        api.get(`/players/${id}/stats`).then(res => res.data.data),
    getPlayerMatches: (id: string) =>
        api.get(`/players/${id}/matches`).then(res => res.data.data),

    // Teams
    getTeams: async (page = 1, limit = 20, tournamentId?: string) => {
        try {
            let url = `/teams?page=${page}&limit=${limit}`;
            if (tournamentId) url += `&tournamentId=${tournamentId}`;
            const res = await api.get(url);
            return res.data.data;
        } catch (error) {
            console.error('Error fetching teams:', error);
            return [];
        }
    },
    getTeamById: (id: string) =>
        api.get(`/teams/${id}`).then(res => res.data.data),
    getPlayersByTeam: async (teamId: string) => {
        try {
            const res = await api.get(`/teams/${teamId}/players`);
            return res.data.data;
        } catch (error) {
            console.error('Error fetching players by team:', error);
            return [];
        }
    },
    updateFormation: (id: string, formationData: any) =>
        api.put(`/teams/${id}/formation`, formationData).then(res => res.data),

    // Transfers
    createTransferRequest: (data: any) =>
        api.post('/transfers/player', data).then(res => res.data),

    // Chat
    getChatMessages: (teamId: string) =>
        api.get(`/chats/team/${teamId}`).then(res => res.data.data),

    // Tournaments
    getTournaments: (page = 1, limit = 20, leagueId?: string) =>
        api.get('/tournaments', { params: { page, limit, leagueId } }).then(res => res.data.data),
    getTournamentById: (id: string) =>
        api.get(`/tournaments/${id}`).then(res => res.data.data),

    // Leagues
    getLeagues: () =>
        api.get('/leagues').then(res => res.data.data),

    // Matches
    getMatches: (params?: any) =>
        api.get('/matches', { params }).then(res => res.data.data),
    getMatchById: (id: string) =>
        api.get(`/matches/${id}`).then(res => res.data.data),

    // Slider
    getSliderItems: () =>
        api.get('/slider').then(res => res.data.data),

    // News
    getNews: (page = 1, limit = 20, category?: string) =>
        api.get('/news', { params: { page, limit, category } }).then(res => res.data.data),
    getNewsById: (id: string) =>
        api.get(`/news/${id}`).then(res => res.data.data),

    // Applications
    createApplication: (data: any) =>
        api.post('/applications', data).then(res => res.data),
    getApplicationsByPhone: (phone: string) =>
        api.get(`/applications/${phone}`).then(res => res.data.data),

    // Auth
    simpleLogin: (phone: string) =>
        api.post('/simple-login', { phone }).then(res => res.data),
};

export default api;

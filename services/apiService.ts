import axios from 'axios';

// Production Render URL
const BASE_URL = 'https://hfl-backend.onrender.com/api';
// Local development URL (uncomment if needed)
// const BASE_URL = 'http://192.168.0.111:3001/api';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const apiService = {
    // Players
    getPlayers: (page = 1, limit = 20) => api.get(`/players?page=${page}&limit=${limit}`),
    getPlayerById: (id: string) => api.get(`/players/${id}`),
    getPlayerStats: (id: string) => api.get(`/players/${id}/stats`),

    // Teams
    getTeams: (page = 1, limit = 20, tournamentId?: string) =>
        api.get(`/teams?page=${page}&limit=${limit}${tournamentId ? `&tournamentId=${tournamentId}` : ''}`),
    getTeamById: (id: string) => api.get(`/teams/${id}`),
    updateFormation: (id: string, formationData: any) => api.put(`/teams/${id}/formation`, formationData),

    // Transfers
    createTransferRequest: (data: any) => api.post('/transfers/player', data),

    // Chat
    getChatMessages: (teamId: string) => api.get(`/chats/team/${teamId}`),

    // Tournaments
    getTournaments: () => api.get('/tournaments'),

    // Matches
    getMatches: () => api.get('/matches'),

    // Slider
    getSliderItems: () => api.get('/slider'),

    // Applications
    createApplication: (data: any) => api.post('/applications', data),
    getApplicationsByPhone: (phone: string) => api.get(`/applications/${phone}`),
};

export default api;

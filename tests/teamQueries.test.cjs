const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function loadService(teams, matches, matchError = null) {
    const calls = [];
    const supabase = { from(table) {
        let ids, start = 0, end = Infinity, columns;
        const filters = [];
        const q = {
            select(value) { columns = value; return q; },
            in() { return q; }, neq() { return q; }, eq() { return q; },
            ilike() { return q; }, order() { return q; },
            or(value) {
                ids = value.includes('.eq.')
                    ? [value.split('.eq.')[1].split(',')[0]]
                    : [...value.matchAll(/"([^"]+)"/g)].map(m => m[1]);
                return q;
            },
            gte(k, v) { filters.push(r => r[k] >= v); return q; },
            lt(k, v) { filters.push(r => r[k] < v); return q; },
            range(a, b) { start = a; end = b; return q; },
            then(resolve) {
                calls.push({ table, ids, start, end, columns });
                const rows = table === 'teams' ? teams : table === 'sponsors' ? [] : matches.filter(m =>
                    (!ids || ids.includes(String(m.home_team_id)) || ids.includes(String(m.away_team_id))) && filters.every(f => f(m)));
                return Promise.resolve({ data: rows.slice(start, end + 1), error: table === 'matches' ? matchError : null }).then(resolve);
            },
        };
        return q;
    } };
    const dependencies = {
        './matchCompetitionMetadata': { loadMatchCompetitionMetadata: async () => new Map() },
        axios: { default: { create: () => ({ get: async () => { throw new Error('Unexpected fallback'); } }) } },
        './supabase': { supabase },
        '../store/useOrganizationStore': { useOrganizationStore: { getState: () => ({ selectedOrganizationId: 1 }) } },
        '../store/useJuniorStore': { useJuniorStore: { getState: () => ({ isJuniorMode: false }) } },
        '../store/useAuthStore': { useAuthStore: { getState: () => ({ user: null, isGuest: true }) } },
    };
    const exports = {};
    const source = ts.transpileModule(fs.readFileSync('services/apiService.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    new Function('exports', 'require', source)(exports, name => dependencies[name]);
    return { service: exports.apiService, calls };
}

test('keeps home/away results and penalties while excluding unrelated matches', async () => {
    const { service, calls } = loadService([{ id: 1, penalty_points: -2 }, { id: 2 }], [
        { id: 1, home_team_id: 1, away_team_id: 2, home_score: 3, away_score: 1 },
        { id: 2, home_team_id: 2, away_team_id: 1, home_score: 2, away_score: 2 },
        { id: 3, home_team_id: 9, away_team_id: 10, home_score: 8, away_score: 0 },
    ]);
    const rows = await service.getTeams();
    assert.deepEqual(rows[0].stats, { points: 2, played: 2, won: 1, drawn: 1, lost: 0, goalsFor: 5, goalsAgainst: 3, goalDifference: 2 });
    assert.equal(rows[1].stats.points, 1);
    assert.equal(rows[1].stats.lost, 1);
    assert.equal(calls.find(c => c.table === 'matches').columns, 'id, home_team_id, away_team_id, home_score, away_score');
});

test('loads later pages and counts cross-batch matches only once', async () => {
    const teams = Array.from({ length: 101 }, (_, i) => ({ id: i + 1 }));
    const matches = Array.from({ length: 501 }, (_, i) => ({ id: i + 1, home_team_id: 1, away_team_id: 101, home_score: 1, away_score: 0 }));
    const { service, calls } = loadService(teams, matches);
    const rows = await service.getTeams();
    assert.equal(rows[0].stats.played, 501);
    assert.equal(rows[100].stats.played, 501);
    assert.equal(rows[0].stats.points, 1503);
    assert.ok(calls.some(c => c.table === 'matches' && c.start === 500));
    assert.ok(calls.filter(c => c.table === 'matches').every(c => new Set(c.ids).size <= 100));
});

test('empty team list sends no match request', async () => {
    const { service, calls } = loadService([], []);
    assert.deepEqual(await service.getTeams(), []);
    assert.equal(calls.length, 1);
});

test('match pages respect date and team scope before enrichment', async () => {
    const matches = [
        { id: 1, home_team_id: 1, away_team_id: 2, match_date: '2026-10-01' },
        { id: 2, home_team_id: 1, away_team_id: 3, match_date: '2026-10-02' },
        { id: 3, home_team_id: 1, away_team_id: 4, match_date: '2026-10-03' },
        { id: 4, home_team_id: 2, away_team_id: 3, match_date: '2026-10-02' },
    ];
    const { service, calls } = loadService([], matches);
    const params = { dateFrom: '2026-10-01', dateBefore: '2026-10-03', teamId: 1, pageSize: 1 };
    assert.deepEqual((await service.getMatches({ ...params, page: 1 })).map(m => m.id), [1]);
    assert.deepEqual((await service.getMatches({ ...params, page: 2 })).map(m => m.id), [2]);
    assert.deepEqual(await service.getMatches({ ...params, page: 3 }), []);
    assert.deepEqual(calls.filter(c => c.table === 'matches').map(c => [c.start, c.end]), [[0, 0], [1, 1], [2, 2]]);
});

test('failed paged request preserves the error instead of returning an empty or unpaged fallback', async () => {
    const failure = new Error('Simulated network failure');
    const { service } = loadService([], [], failure);
    await assert.rejects(service.getMatches({ page: 2, pageSize: 200 }), error => error === failure);
});

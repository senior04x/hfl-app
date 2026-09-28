const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('exports', 'require', source)(exports, name => dependencies[name]);
  return exports;
}
const { groupPlayerMatches } = load('utils/playerCompetitions.ts');
test('league and tournament totals remain separate, count only finished player goals', () => {
  const goal = { event_type: 'goal' };
  const league = { id: 1, status: 'finished', league: 'Cup', organization_id: 1, playerEvents: [goal, goal, { event_type: 'own_goal' }] };
  const groups = groupPlayerMatches([league, league,
    { id: 2, status: 'finished', tournament_id: 7, tournament: { name: 'Cup' }, playerEvents: [goal] },
    { id: 3, status: 'live', tournament_id: 7, playerEvents: [goal] },
    { id: 4, status: 'finished', tournament_id: 8, playerEvents: [{ event_type: 'penalty_goal' }] },
    { id: 5, status: 'scheduled', league: 'Cup', organization_id: 1, playerEvents: [] },
  ]);
  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map(g => g.goals), [2, 1, 1]);
  assert.equal(groups[0].data.length, 2);
  assert.deepEqual(groupPlayerMatches([]), []);
});
test('history pages player events, includes former team matches, requests only referenced teams, caches concurrent calls', async () => {
  const db = {
    applications: [{ id: 'p1', team_id: 10 }],
    match_events: Array.from({ length: 501 }, (_, i) => ({ id: i + 1, player_id: 'p1', match_id: 2, event_type: 'goal' })),
    matches: [{ id: 1, home_team_id: 10, away_team_id: 11, match_date: '2026-09-02' }, { id: 2, home_team_id: 20, away_team_id: 21, tournament_id: 7, match_date: '2026-09-01' }],
    teams: [10, 11, 20, 21, 999].map(id => ({ id, name: String(id) })),
    tournaments: [{ id: 7, name: 'Champions' }],
  };
  const calls = [];
  const supabase = { from(table) {
    const filters = []; let start = 0, end = 999, single = false, columns;
    const q = {
      select(value) { columns = value; return q; },
      eq(key, value) { filters.push(row => String(row[key]) === String(value)); return q; },
      in(key, values) { filters.push(row => values.map(String).includes(String(row[key]))); return q; },
      or() { filters.push(row => row.home_team_id === 10 || row.away_team_id === 10); return q; },
      order() { return q; }, range(a, b) { start = a; end = b; return q; }, single() { single = true; return q; },
      then(resolve) { calls.push({ table, start, columns, filtered: filters.length > 0 }); const rows = db[table].filter(row => filters.every(f => f(row))).slice(start, end + 1); return Promise.resolve({ data: single ? rows[0] : rows, error: null }).then(resolve); },
    }; return q;
  } };
  const { getPlayerHistory } = load('services/playerHistory.ts', { './supabase': { supabase } });
  const [a, b] = await Promise.all([getPlayerHistory('p1'), getPlayerHistory('p1')]);
  assert.equal(a, b);
  assert.equal(a.length, 2);
  assert.equal(a[1].playerEvents.length, 501);
  assert.equal(a[1].tournament.name, 'Champions');
  assert.equal(calls.filter(c => c.table === 'match_events').length, 2);
  assert.ok(calls.every(c => !c.columns.includes('*') && c.filtered));
  const count = calls.length; await getPlayerHistory('p1'); assert.equal(calls.length, count);
});

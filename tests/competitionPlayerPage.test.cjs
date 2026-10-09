const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(supabase) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('services/competitionPlayerPage.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  new Function('exports', 'require', source)(exports, () => ({ supabase }));
  return exports;
}
test('page RPC uses bounded requests, global filter/search and maps ranked stats', async () => {
  const calls = [];
  const { loadCompetitionPlayerPage } = load({ async rpc(name, args) {
    calls.push({ name, args });
    return { data: { players: [{ id: 'a', first_name: 'Ali', goals: 4, assists: 2, yellow: 1,
      red: 0, matches_played: 3, rating: 7.4, rank: args.p_offset + 1 }], hasMore: true, snapshot: 'unchanged', viewer: null } };
  } });
  const scope = { tournament: true, id: 7, teamIds: ['t', 't'] };
  const first = await loadCompetitionPlayerPage(scope, 'goals', ' Ali ', 0);
  const next = await loadCompetitionPlayerPage(scope, 'assists', '', 20);
  assert.equal(first.players[0].stats.yellowCards, 1);
  assert.equal(next.players[0].rank, 21);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].args.p_team_ids, ['t']);
  assert.equal(calls[0].args.p_search, 'Ali');
  assert.equal(calls[1].args.p_stat, 'assists');
  assert.equal(calls[1].args.p_offset, 20);
  assert.equal(calls[1].args.p_limit, 20);
});
test('only an absent RPC permits legacy compatibility, errors remain errors', async () => {
  for (const code of ['PGRST202', '42501', '57014']) {
    const { loadCompetitionPlayerPage } = load({ rpc: async () => ({ error: { code } }) });
    const request = loadCompetitionPlayerPage({ tournament: true, id: 1, teamIds: [] }, 'goals', '');
    if (code === 'PGRST202') assert.equal(await request, null);
    else await assert.rejects(request, e => e.code === code);
  }
});
test('request gate blocks duplicate load-more and invalidates stale competition/filter requests', () => {
  const { createPlayerPageGate } = load({});
  const gate = createPlayerPageGate();
  const old = gate.begin();
  assert.equal(gate.begin(), null);
  gate.reset();
  const next = gate.begin();
  assert.equal(gate.current(old), false);
  gate.finish(old);
  assert.equal(gate.begin(), null);
  gate.finish(next);
  assert.notEqual(gate.begin(), null);
});

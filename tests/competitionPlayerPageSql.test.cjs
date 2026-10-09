// Real embedded PostgreSQL; isolated synthetic fixtures, no remote endpoints.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('../../backend/node_modules/@electric-sql/pglite');
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
test('SQL ranks before paging; retains history, formation appearances, league semantics and caller RLS', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE TABLE public.teams(id uuid PRIMARY KEY, name text);
      CREATE TABLE public.applications(id uuid PRIMARY KEY, first_name text,last_name text,photo_url text,
        team_id uuid,status text,is_archived boolean);
      CREATE TABLE public.matches(id uuid PRIMARY KEY,tournament_id bigint,home_team_id uuid,away_team_id uuid,
        home_formation jsonb,away_formation jsonb,status text);
      CREATE TABLE public.match_events(id uuid PRIMARY KEY,player_id uuid,team_id uuid,match_id uuid,event_type text);
    `);
    await db.exec(fs.readFileSync('docs/tournament-player-page.draft.sql', 'utf8'));
    await db.query('INSERT INTO teams VALUES ($1,$2),($3,$4)', [id(1), 'Original', id(2), 'New']);
    for (let n = 10; n < 55; n++) {
      await db.query("INSERT INTO applications VALUES ($1,$2,'Test',NULL,$3,'approved',false)", [id(n), `Player ${n}`, id(1)]);
    }
    await db.query("INSERT INTO applications VALUES ($1,'Historical','Scorer',NULL,$2,'archived',true)", [id(99), id(2)]);
    const formation = JSON.stringify({ players: [{ id: id(10) }, { id: id(10) }] });
    await db.query("INSERT INTO matches VALUES ($1,7,$2,$3,$4,NULL,'finished'),($5,8,$2,$3,NULL,NULL,'finished'),($6,7,$2,$3,NULL,NULL,'scheduled')",
      [id(100), id(1), id(2), formation, id(101), id(102)]);
    const events = [[200,99,100,'goal'],[201,99,100,'penalty_goal'],[202,99,100,'assist'],
      [203,11,100,'goal'],[204,11,100,'yellow_card'],[205,11,100,'red_card'],
      [206,12,101,'goal'],[207,12,102,'goal']];
    for (const [e,p,m,kind] of events) await db.query('INSERT INTO match_events VALUES ($1,$2,$3,$4,$5)', [id(e),id(p),id(1),id(m),kind]);
    async function page({ tournament = true, competition = '7', stat = 'goals', search = '', offset = 0, viewer = id(54), teams = [id(1)] } = {}) {
      const r = await db.query('SELECT public.competition_player_page_v1($1,$2,$3::uuid[],$4,$5,$6,20,$7::uuid) AS result',
        [tournament,competition,teams,stat,search,offset,viewer]);
      return r.rows[0].result;
    }
    const first = await page();
    assert.equal(first.players.length,20); assert.equal(first.hasMore,true);
    assert.equal(first.players[0].id,id(99)); assert.equal(first.players[0].goals,2);
    assert.equal(first.players[0].team_name,'Original');
    assert.equal(first.viewer.rank,46);
    const all = [...first.players, ...(await page({ offset:20 })).players, ...(await page({ offset:40 })).players];
    assert.equal(all.length,46); assert.equal(new Set(all.map(p=>p.id)).size,46);
    assert.equal((await page({offset:40})).hasMore,false);
    assert.equal((await page({offset:20})).snapshot,first.snapshot);
    await db.query('UPDATE match_events SET event_type = $1 WHERE id = $2', ['assist',id(201)]);
    assert.notEqual((await page({offset:20})).snapshot,first.snapshot);
    await db.query('UPDATE match_events SET event_type = $1 WHERE id = $2', ['penalty_goal',id(201)]);
    assert.equal(all.find(p=>p.id===id(10)).matches_played,1);
    assert.equal(all.find(p=>p.id===id(12)).goals,0);
    assert.equal(all.find(p=>p.id===id(11)).rating,4.8);
    assert.equal((await page({search:'historical'})).players.length,1);
    assert.equal((await page({stat:'assists'})).players[0].id,id(99));
    assert.equal((await page({stat:'redCards'})).players[0].id,id(11));
    const league = await page({tournament:false,competition:null});
    assert.equal(league.players[0].id,id(12)); assert.equal(league.players[0].goals,2);
    assert.equal(league.players.some(p=>p.id===id(99)),false);
    assert.equal((await page({competition:'999'})).players.length,20); // supplied roster, even without matches
    assert.equal((await page({competition:'999',teams:[]})).players.length,0);
    await assert.rejects(page({stat:'invalid'}));
    await db.exec(`
      GRANT SELECT ON teams,applications,matches,match_events TO anon;
      ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
      CREATE POLICY visible_players ON applications FOR SELECT TO anon USING (first_name = 'Player 10');
      SET ROLE anon;
    `);
    const restricted = await page();
    assert.deepEqual(restricted.players.map(p=>p.id),[id(10)]);
    assert.equal(restricted.viewer,null);
    await db.exec('RESET ROLE');
    // JSON encoded string and malformed string both follow existing tolerant lineup behavior.
    assert.equal((await db.query('SELECT * FROM public.competition_lineup_ids_v1($1::jsonb)', [JSON.stringify(formation)])).rows.length,2);
    assert.equal((await db.query('SELECT * FROM public.competition_lineup_ids_v1($1::jsonb)', ['"broken"'])).rows.length,0);
  } finally { await db.close(); }
});

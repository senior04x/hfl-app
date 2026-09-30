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

test('tournament ranks historical scorers, pages events, excludes other competitions; league keeps roster totals', async () => {
 const db={matches:[{id:'m1',tournament_id:1,status:'finished',home_team_id:10,away_team_id:11},{id:'m2',tournament_id:2,status:'finished',home_team_id:10},{id:'m3',tournament_id:1,status:'scheduled'}],match_events:[...Array.from({length:501},(_,i)=>({id:i+1,match_id:'m1',player_id:'past',team_id:10,event_type:'goal'})),{id:502,match_id:'m2',player_id:'active',team_id:10,event_type:'goal'}],applications:[{id:'past',team_id:99,status:'archived',is_archived:true},{id:'active',team_id:10,status:'approved'}],teams:[{id:10,name:'Original'},{id:99,name:'New'}]};
 const calls=[];const supabase={from(table){const filters=[];let start=0,end=499;const q={select(){return q},eq(k,v){filters.push(r=>String(r[k])===String(v));return q},in(k,vs){filters.push(r=>vs.map(String).includes(String(r[k])));return q},or(){filters.push(r=>r.home_team_id===10||r.away_team_id===10);return q},order(){return q},range(a,b){start=a;end=b;return q},then(resolve){calls.push({table,start});return Promise.resolve({data:db[table].filter(r=>filters.every(f=>f(r))).slice(start,end+1),error:null}).then(resolve)}};return q}};
 const {loadCompetitionPlayerStats}=load('services/competitionPlayerStats.ts',{'./supabase':{supabase}});
 const t=await loadCompetitionPlayerStats({tournament:true,id:1,name:'Cup',teamIds:[10]});
 assert.equal(t.events.length,501);assert.equal(t.matches.length,1);assert.equal(t.players.find(p=>p.id==='past').team_id,10);assert.ok(calls.some(c=>c.table==='match_events'&&c.start===500));
 const league=await loadCompetitionPlayerStats({tournament:false,id:null,name:'League',teamIds:[10]});assert.deepEqual(league.players.map(p=>p.id),['active']);assert.equal(league.events.length,1);
 await assert.rejects(loadCompetitionPlayerStats({tournament:true,id:null,name:'Cup',teamIds:[]}),/not resolved/);
});

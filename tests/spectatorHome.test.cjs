const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const ts=require('typescript');
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
function split(text){let depth=0,quoted=false,start=0,result=[];for(let i=0;i<text.length;i++){
 if(text[i]==='"'&&text[i-1]!=='\\')quoted=!quoted;
 if(!quoted){if(text[i]==='(')depth++;if(text[i]===')')depth--;if(text[i]===','&&!depth){result.push(text.slice(start,i));start=i+1;}}
 }return [...result,text.slice(start)];}
function condition(row,expression){
 if(expression.startsWith('and('))return split(expression.slice(4,-1)).every(e=>condition(row,e));
 const [,field,op,raw]=expression.match(/^(\w+)\.(eq|gt|lt|is)\.(.*)$/);
 const value=raw==='null'?null:raw.startsWith('"')?JSON.parse(raw):raw;
 if(op==='is')return row[field]==null;
 if(row[field]==null)return false;
 if(op==='eq')return row[field]===value;
 return op==='gt'?row[field]>value:row[field]<value;
}
function setup(){
 const matches=[];for(let n=1;n<=55;n++)matches.push({id:id(n),organization_id:n%2?1:2,league:'Super',tournament_id:1,
  home_team_id:'home',away_team_id:'away',status:'finished',match_date:n<=31?'2099-10-09':null,
  match_time:n%3?'18:00:00':null,home_score:2,away_score:1});
 for(let n=100;n<145;n++)matches.push({...matches[0],id:id(n),status:'scheduled',match_date:'2099-10-10',match_time:n%2?'19:00:00':'10:00:00'});
 matches.push({...matches[0],id:id(200),status:'scheduled',match_date:'2000-01-01'});
 matches.push({...matches[0],id:id(201),status:'cancelled'});
 const tables={matches,teams:[{id:'home',name:'Home'},{id:'away',name:'Away'}],organizations:[{id:1,name:'Org A'},{id:2,name:'Org B'}],tournaments:[{id:1,name:'Cup'}]};
 const calls=[];const supabase={from(table){const filters=[],orders=[];let limit=Infinity;
  const q={select(fields){assert.ok(!fields.includes('*'));return q;},
   eq(k,v){filters.push(r=>r[k]===v);return q;},in(k,vs){filters.push(r=>vs.includes(r[k]));return q;},
   gte(k,v){filters.push(r=>r[k]!=null&&r[k]>=v);return q;},
   or(expr){filters.push(r=>split(expr).some(e=>condition(r,e)));return q;},
   order(k,o){orders.push([k,o]);return q;},limit(n){limit=n;return q;},
   then(resolve,reject){calls.push({table,limit});const rows=tables[table].filter(r=>filters.every(f=>f(r))).sort((a,b)=>{
    for(const[k,o]of orders){if(a[k]===b[k])continue;if(a[k]==null)return 1;if(b[k]==null)return -1;return(a[k]<b[k]?-1:1)*(o.ascending?1:-1);}return 0;
   });return Promise.resolve({data:rows.slice(0,limit),error:null}).then(resolve,reject);}};return q;
 }};
 const exports={};new Function('exports','require',ts.transpileModule(fs.readFileSync('services/spectatorHomeService.ts','utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}
 }).outputText)(exports,()=>({supabase}));
 return {api:exports,calls};
}
test('results use stable keyset pages across equal dates/times and null dates',async()=>{
 const {api,calls}=setup();let cursor=null;const all=[];let pages=0;
 do{const result=await api.loadSpectatorMatches(null,'results',cursor);all.push(...result.rows);cursor=result.cursor;pages++;}while(cursor);
 assert.equal(pages,3);assert.equal(all.length,55);assert.equal(new Set(all.map(m=>m.id)).size,55);
 assert.ok(all.slice(31).every(m=>m.match_date===null));
 assert.equal(all[0].competitionName,'Cup');assert.equal(all[0].homeTeam.name,'Home');
 assert.deepEqual(new Set(all.map(m=>m.organizationName)),new Set(['Org A','Org B']));
 assert.ok(calls.filter(c=>c.table==='matches').every(c=>c.limit===21));
});
test('upcoming games are chronologically ordered, past schedules excluded, organization filter exact',async()=>{
 const {api}=setup();const first=await api.loadSpectatorMatches(null,'upcoming');
 assert.equal(first.rows.length,20);assert.equal(first.rows[0].match_time,'10:00:00');
 assert.ok(first.rows.every(m=>m.match_date==='2099-10-10'));
 const next=await api.loadSpectatorMatches(null,'upcoming',first.cursor);
 assert.equal(new Set([...first.rows,...next.rows].map(m=>m.id)).size,40);
 const filtered=await api.loadSpectatorMatches(2,'results');
 assert.ok(filtered.rows.every(m=>m.organization_id===2));
 assert.equal((await api.loadSpectatorMatches(null,'live')).rows.length,0);
});
test('feed caches coalesce requests, remain separate by organization and allow refresh',async()=>{
 const {api,calls}=setup();const [a,b]=await Promise.all([api.loadSpectatorMatches(null,'results'),api.loadSpectatorMatches(null,'results')]);
 assert.equal(a,b);assert.equal(calls.filter(c=>c.table==='matches').length,1);
 await api.loadSpectatorMatches(2,'results');await api.loadSpectatorMatches(null,'upcoming');
 await api.loadSpectatorMatches(null,'results',null,true);
 assert.equal(calls.filter(c=>c.table==='matches').length,4);
});

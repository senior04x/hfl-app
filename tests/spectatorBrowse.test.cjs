const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, dependencies = {}) {
    const exports = {};
    const js = ts.transpileModule(fs.readFileSync(file,'utf8'), {
        compilerOptions: { module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020 }
    }).outputText;
    new Function('exports','require',js)(exports,name=>dependencies[name]);
    return exports;
}
test('personal spectator mode depends on selected profile, never overrides sports accounts', () => {
    const {isSpectatorProfile}=load('utils/spectatorProfile.ts');
    assert.equal(isSpectatorProfile({appUserId:'identity',role:'user'}),true);
    for (const user of [null,{}, {role:'user'}, {appUserId:'identity',role:'player'},
        {appUserId:'identity',role:'captain'}, {appUserId:'identity',role:'team'}]) {
        assert.equal(isSpectatorProfile(user),false);
    }
});
function database() {
    const calls=[];
    const tables={tournaments:[],leagues:[],organizations:[{id:1,name:'Org A'},{id:2,name:'Org B'}]};
    for (let id=1;id<=47;id++) for(const table of ['tournaments','leagues'])
        tables[table].push({id,name:`${table} ${id}`,organization_id:id%2?1:2,status:'active',is_active:true});
    const supabase={from(table) {
        let limit=Infinity;const filters=[];let ascending=false;
        const q={select(fields){assert.ok(!fields.includes('*'));return q;},or(){return q;},
            eq(k,v){filters.push(r=>r[k]===v);return q;},in(k,vs){filters.push(r=>vs.includes(r[k]));return q;},
            lt(k,v){filters.push(r=>r[k]<Number(v));return q;},gt(k,v){filters.push(r=>r[k]>v);return q;},
            order(k,options){ascending=options.ascending;return q;},limit(n){limit=n;return q;},
            then(resolve,reject){calls.push({table,limit});const data=tables[table].filter(r=>filters.every(f=>f(r))).sort((a,b)=>ascending?a.id-b.id:b.id-a.id).slice(0,limit);return Promise.resolve({data,error:null}).then(resolve,reject);}};
        return q;
    }};
    return {supabase,calls};
}
test('all organizations are truly paged, org filter is exact and streams stay distinct', async () => {
    const {supabase,calls}=database();
    const {loadSpectatorCompetitions}=load('services/spectatorBrowseService.ts',{'./supabase':{supabase}});
    const first=await loadSpectatorCompetitions(null);
    assert.equal(first.rows.length,40);
    assert.deepEqual(new Set(first.rows.map(r=>r.organizationName)),new Set(['Org A','Org B']));
    const second=await loadSpectatorCompetitions(null,first.cursor);
    const third=await loadSpectatorCompetitions(null,second.cursor);
    const all=[...first.rows,...second.rows,...third.rows];
    assert.equal(all.length,94);
    assert.equal(new Set(all.map(r=>`${r.is_tournament}:${r.id}`)).size,94);
    assert.deepEqual(third.cursor,{tournament:false,league:false});
    const before=calls.length;
    assert.deepEqual((await loadSpectatorCompetitions(null,third.cursor)).rows,[]);
    assert.equal(calls.length,before);
    const filtered=await loadSpectatorCompetitions(2);
    assert.ok(filtered.rows.every(r=>r.organization_id===2));
    assert.ok(calls.filter(c=>c.table!=='organizations').every(c=>c.limit===21));
});
test('organization picker is bounded, and query failures are surfaced', async () => {
    const {supabase}=database();
    const {loadSpectatorOrganizations}=load('services/spectatorBrowseService.ts',{'./supabase':{supabase}});
    assert.equal((await loadSpectatorOrganizations()).rows.length,2);
    assert.equal((await loadSpectatorOrganizations(1)).rows[0].id,2);
    const error={code:'42501'};
    const broken={from(){const q={select(){return q},order(){return q},limit(){return q},or(){return q},then(resolve){return Promise.resolve({error}).then(resolve)}};return q}};
    const service=load('services/spectatorBrowseService.ts',{'./supabase':{supabase:broken}});
    await assert.rejects(service.loadSpectatorCompetitions(null),e=>e===error);
});

test('first-page cache coalesces requests and refresh fetches new data', async () => {
    const {supabase,calls}=database();
    const {loadSpectatorCompetitions}=load('services/spectatorBrowseService.ts',{'./supabase':{supabase}});
    const [first,duplicate]=await Promise.all([loadSpectatorCompetitions(null),loadSpectatorCompetitions(null)]);
    assert.equal(first,duplicate);
    assert.equal(calls.length,3);
    await loadSpectatorCompetitions(null);
    assert.equal(calls.length,3);
    await loadSpectatorCompetitions(null,undefined,true);
    assert.equal(calls.length,6);
});

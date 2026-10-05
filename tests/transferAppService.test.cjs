const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load() {
    const exports = {};
    new Function('exports', ts.transpileModule(fs.readFileSync('services/transferAppService.ts','utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText)(exports);
    return exports;
}
const id = '12345678-1234-1234-1234-123456789abc';
const token = 'a'.repeat(64);
const success = body => ({ ok: true, status: 200, json: async () => body });

test('roster controls use captain credentials and never send a delete request', async t => {
    const api = load(), calls = [];
    t.mock.method(global, 'fetch', async (url, options) => {
        calls.push({url, options}); return success({success:true});
    });
    const session = {actor:'captain',subjectId:id,token};
    await assert.rejects(api.transferAppService.roster({...session,actor:'player'},'archive',id), e => e.status === 403);
    assert.equal(calls.length,0);
    await api.transferAppService.roster(session,'archive',id);
    assert.equal(calls[0].options.method,'POST');
    assert.equal(calls[0].options.headers.Authorization,`Bearer ${token}`);
    assert.deepEqual(JSON.parse(calls[0].options.body),{team_id:id,action:'archive',player_id:id});
    await api.transferAppService.roster(session,'number',id,17);
    assert.equal(JSON.parse(calls[1].options.body).number,17);
});

test('team readiness ignores historical player decisions and requires both teams', () => {
    const api = load();
    const transfer = { id, status:'pending', actor_party:'old_team', consents:[{party:'player',decision:'rejected'}] };
    assert.deepEqual(api.getTransferConsentState(transfer,'captain'), {allApproved:false,rejected:false,canDecide:true});
    transfer.consents.push({party:'new_team',decision:'approved'},{party:'old_team',decision:'approved'});
    assert.deepEqual(api.getTransferConsentState(transfer,'captain'), {allApproved:true,rejected:false,canDecide:false});
    transfer.consents[2].decision='rejected';
    assert.deepEqual(api.getTransferConsentState(transfer,'captain'), {allApproved:false,rejected:true,canDecide:false});
});

test('player viewers and decided or rejected requests cannot send consent writes', async t => {
    const api = load();
    const fetch = t.mock.method(global,'fetch',async()=>assert.fail('Unauthorized write'));
    const session={actor:'captain',subjectId:id,token,expiresAt:Date.now()+60000};
    const transfer={id,status:'pending',actor_party:'old_team',consents:[]};
    for (const [actor, change] of [
        ['player',{}], ['captain',{actor_party:'player'}], ['captain',{status:'approved'}],
        ['captain',{status:'rejected'}], ['captain',{consents:[{party:'old_team',decision:'approved'}]}],
        ['captain',{consents:[{party:'new_team',decision:'rejected'}]}]
    ]) await assert.rejects(api.transferAppService.decide({...session,actor},{...transfer,...change},'approved'),error=>error.status===403);
    assert.equal(fetch.mock.callCount(),0);
});

test('historical player rejection does not block a team decision and remains readable', async t => {
    const api = load(); const calls=[];
    const transfer={id,status:'pending',actor_party:'old_team',consents:[{party:'player',decision:'rejected'}]};
    t.mock.method(global,'fetch',async(url,options)=>{calls.push(JSON.parse(options.body));return success({success:true});});
    await api.transferAppService.decide({actor:'captain',token},transfer,'approved');
    assert.deepEqual(calls[0],{transfer_id:id,party:'old_team',decision:'approved'});
    global.fetch=async()=>success({items:[{...transfer,actor_party:'player'}],next_cursor:null});
    const page=await api.transferAppService.page({actor:'player',token},'all');
    assert.equal(page.items[0].consents[0].decision,'rejected');
    assert.equal(api.getTransferConsentState(page.items[0],'player').canDecide,false);
});
test('verified sessions stay scoped to an actor and account and can be cleared', async t => {
    const api = load();
    t.mock.method(global, 'fetch', async () => success({ sessionToken: token, playerId: id, expiresAt: new Date(Date.now()+60000).toISOString() }));
    await api.transferAppService.verify('player',id,'901234567','1234');
    assert.equal(api.getTransferSession('player',id).token, token);
    assert.equal(api.getTransferSession('captain',id), null);
    assert.equal(api.getTransferSession('player','other'), null);
    api.clearTransferSessions();
    assert.equal(api.getTransferSession('player',id), null);
});
test('a server session bound to another profile is rejected', async t => {
    const api = load();
    t.mock.method(global,'fetch',async () => success({ sessionToken: token, team:{id:'other'}, expiresAt:new Date(Date.now()+60000).toISOString() }));
    await assert.rejects(api.transferAppService.verify('captain',id,'901234567','1234'), error => error.status===500);
    assert.equal(api.getTransferSession('captain',id), null);
});
test('transfer writes use the opaque bearer and do not send actor subject IDs', async t => {
    const api=load(); const calls=[];
    t.mock.method(global,'fetch',async (url,options) => { calls.push({url,options}); return success({success:true}); });
    const session={actor:'captain',subjectId:id,token,expiresAt:Date.now()+60000};
    await api.transferAppService.request(session,id,'  Recruit  ');
    await api.transferAppService.decide(session,{id,status:'pending',consents:[],actor_party:'old_team'},'approved');
    assert.match(calls[0].url,/request-transfer-app$/);
    assert.deepEqual(JSON.parse(calls[0].options.body),{player_id:id,reason:'Recruit'});
    assert.equal(calls[1].options.headers.Authorization,`Bearer ${token}`);
    assert.deepEqual(JSON.parse(calls[1].options.body),{transfer_id:id,party:'old_team',decision:'approved'});
});
test('network loss remains an unknown result; conflicting decisions remain 409',async t => {
    const api=load();
    const session={actor:'captain',subjectId:id,token,expiresAt:Date.now()+60000};
    t.mock.method(global,'fetch',async () => { throw Error('private details'); });
    await assert.rejects(api.transferAppService.decide(session,{id,status:'pending',consents:[],actor_party:'old_team'},'approved'),error => error.status===0 && !error.message.includes('private'));
    global.fetch=async () => ({ok:false,status:409,json:async()=>({error:'decision already exists'})});
    await assert.rejects(api.transferAppService.decide(session,{id,status:'pending',consents:[],actor_party:'old_team'},'rejected'),error => error.status===409);
});
test('aborted reads never send a request',async t => {
    const api=load();const controller=new AbortController();controller.abort();
    const mock=t.mock.method(global,'fetch',async()=>assert.fail('Unexpected request'));
    await assert.rejects(api.transferAppService.page({token,actor:'player'},'all',null,undefined,controller.signal));
    assert.equal(mock.mock.callCount(),0);
});

test('malformed or oversized transfer pages fail safely before reaching screen rendering', async t => {
 const api=load();const session={token,actor:'player',subjectId:id};
 const valid={id,status:'pending',actor_party:'player',consents:[]};
 for(const body of [{items:null,next_cursor:null},{items:[{...valid,consents:null}],next_cursor:null},{items:[{...valid,status:'unknown'}],next_cursor:null},{items:Array(21).fill(valid),next_cursor:null}]) {
  t.mock.method(global,'fetch',async()=>success(body));
  await assert.rejects(api.transferAppService.page(session,'all'),error=>error.status===500);
 }
 t.mock.method(global,'fetch',async()=>success({items:[valid],next_cursor:null,transfer_window_open:false}));
 assert.equal((await api.transferAppService.page(session,'all')).items.length,1);
});

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
    await api.transferAppService.decide(session,{id,actor_party:'old_team'},'approved');
    assert.match(calls[0].url,/request-transfer-app$/);
    assert.deepEqual(JSON.parse(calls[0].options.body),{player_id:id,reason:'Recruit'});
    assert.equal(calls[1].options.headers.Authorization,`Bearer ${token}`);
    assert.deepEqual(JSON.parse(calls[1].options.body),{transfer_id:id,party:'old_team',decision:'approved'});
});
test('network loss remains an unknown result; conflicting decisions remain 409',async t => {
    const api=load();
    const session={actor:'player',subjectId:id,token,expiresAt:Date.now()+60000};
    t.mock.method(global,'fetch',async () => { throw Error('private details'); });
    await assert.rejects(api.transferAppService.decide(session,{id,actor_party:'player'},'approved'),error => error.status===0 && !error.message.includes('private'));
    global.fetch=async () => ({ok:false,status:409,json:async()=>({error:'decision already exists'})});
    await assert.rejects(api.transferAppService.decide(session,{id,actor_party:'player'},'rejected'),error => error.status===409);
});
test('aborted reads never send a request',async t => {
    const api=load();const controller=new AbortController();controller.abort();
    const mock=t.mock.method(global,'fetch',async()=>assert.fail('Unexpected request'));
    await assert.rejects(api.transferAppService.page({token,actor:'player'},'all',null,undefined,controller.signal));
    assert.equal(mock.mock.callCount(),0);
});

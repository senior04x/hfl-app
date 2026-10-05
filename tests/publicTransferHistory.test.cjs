const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
function load(){const exports={};new Function('exports',ts.transpileModule(fs.readFileSync('services/publicTransferHistory.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(exports);return exports;}
const player='00000000-0000-0000-0000-000000000001',cursor='00000000-0000-0000-0000-000000000002';
const row={id:cursor,player_id:player,status:'approved',created_at:'2026-01-01'};
test('public history uses bounded API, coalesces duplicate requests and caches pages',async t=>{
 const api=load();const calls=[];t.mock.method(global,'fetch',async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return{ok:true,json:async()=>({items:[row],next_cursor:cursor})};});
 await Promise.all([api.loadTransferCareer(player),api.loadTransferCareer(player)]);await api.loadTransferCareer(player);
 assert.equal(calls.length,1);assert.ok(calls[0].url.endsWith('/transfer-public-history'));assert.deepEqual(calls[0].body,{player_id:player,after:null});
 await api.loadTransferCareer(player,cursor);assert.equal(calls[1].body.after,cursor);
 await api.loadTransferCareer(player,null,true);assert.equal(calls.length,3);
});
test('wrong player, private status, oversized pages and invalid cursors fail safely',async t=>{
 const api=load();let data;t.mock.method(global,'fetch',async()=>({ok:true,json:async()=>data}));
 for(data of [{items:[{...row,player_id:cursor}],next_cursor:null},{items:[{...row,status:'pending'}],next_cursor:null},{items:Array(21).fill(row),next_cursor:null},{items:[row],next_cursor:'bad'}]) await assert.rejects(api.loadTransferCareer(player));
 await assert.rejects(api.loadTransferCareer('bad'));
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const ts=require('typescript');
function setup(){
 const values=new Map();const cache=new Map();
 const secure={getItemAsync:async k=>values.get(k)||null,setItemAsync:async(k,v)=>values.set(k,v),deleteItemAsync:async k=>values.delete(k)};
 const api={clearTransferSessions:()=>cache.clear(),installTransferSession:s=>{
  if(!['player','captain'].includes(s.actor)||!/^a{64}$/.test(s.token)||s.expiresAt<=Date.now())return null;
  cache.set(s.actor+':'+s.subjectId,s);return s;
 }};
 const out={};new Function('require','exports',ts.transpileModule(fs.readFileSync('services/transferLoginStorage.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(name=>name==='expo-secure-store'?secure:api,out);
 return {out,values,cache,secure};
}
const item={actor:'player',subjectId:'12345678-1234-1234-1234-123456789abc',token:'a'.repeat(64),expiresAt:new Date(Date.now()+60000).toISOString()};
test('verified credentials are stored separately and removed on logout',async()=>{
 const {out,values,cache}=setup();await out.saveTransferLoginSessions([item]);assert.equal(values.size,2);assert.equal(cache.size,1);
 await out.clearTransferLoginStorage();assert.equal(values.size,0);assert.equal(cache.size,0);
});
test('logout followed by new login preserves only new credentials',async()=>{
 const {out,values}=setup();await out.saveTransferLoginSessions([item]);
 await Promise.all([out.clearTransferLoginStorage(),out.saveTransferLoginSessions([{...item,actor:'captain'}])]);
 assert.equal([...values.keys()].some(k=>k.includes('.player.')),false);assert.equal([...values.keys()].some(k=>k.includes('.captain.')),true);
});
test('failed secure write clears cached credentials and partial storage',async()=>{
 const {out,values,cache,secure}=setup();const original=secure.setItemAsync;secure.setItemAsync=async(k,v)=>{if(k.includes('.player.'))throw Error('storage unavailable');return original(k,v);};
 await assert.rejects(out.saveTransferLoginSessions([item]));assert.equal(cache.size,0);assert.equal(values.size,0);
});

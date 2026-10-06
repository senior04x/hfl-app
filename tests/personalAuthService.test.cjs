const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load({ result = { type: 'success', url: 'hflsoccerapp://auth/telegram?code=one-use-code' }, configured = true, profileFailure = false, openBrowser, exchangeFailure = false } = {}) {
 const values = new Map(); const calls = { exchange: 0, signOut: 0, saved: 0 }; let logout; let out;
 const state = { user: null, isGuest: false, setAuth: async user => { state.user = user; }, logout: () => { state.user = null; } };
 const storage = { getItem: async k => values.get(k) ?? null, setItem: async (k,v)=>{values.set(k,v);}, removeItem:async k=>{values.delete(k);} };
 const client = { auth: { signOut:async()=>{calls.signOut++;},getSession:async()=>({data:{session:{access_token:'private-token',user:{id:'user-id'}}}}),exchangeCodeForSession:async()=>{calls.exchange++;return exchangeFailure ? {error:{message:'private backend error'},data:{session:null}} : {data:{session:{user:{id:'user-id'}}}};} } };
 const imports = { 'react-native': { Platform:{OS:'android'},AppState:{} }, 'expo-web-browser':{ maybeCompleteAuthSession(){},openAuthSessionAsync:async(url,redirect,options)=>{calls.browserOptions=options;return openBrowser ? openBrowser(out) : result;} },
  '@supabase/supabase-js':{createClient:()=>client},'./supabase':{SUPABASE_URL:'https://project.supabase.co',SUPABASE_ANON_KEY:'public-key'},'../constants/ApiConfig':{API_BASE_URL:'https://backend.invalid'},
  './personalSessionStorage':{personalSessionStorage:storage},'../store/useAuthStore':{useAuthStore:{getState:()=>state},registerPersonalLogout:fn=>{logout=fn;}},
  './transferLoginStorage':{saveTransferLoginSessions:async()=>{calls.saved++;}},'../store/useOrganizationStore':{useOrganizationStore:{getState:()=>({setSelectedOrganizationId(){}})}} };
 const response = data => ({ ok:true,status:200,json:async()=>data });
 const fetch = async url => {
  if(url.endsWith('/telegram/start')) return configured ? response({success:true,verifier:'a'.repeat(43),url:'https://project.supabase.co/auth/v1/authorize'}) : {ok:false,status:503,json:async()=>({success:false,code:'LOGIN_NOT_CONFIGURED'})};
  if(profileFailure) return {ok:false,status:503,json:async()=>({success:false,code:'PROFILE_UNAVAILABLE'})};
  return response({success:true,user:{appUserId:'user-id',id:'user-id',role:'user'},accounts:[{appUserId:'user-id',id:'user-id',role:'user'}],transferSessions:[]});
 };
 out = {};
 new Function('require','exports','fetch',ts.transpileModule(fs.readFileSync('services/personalAuthService.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(name=>{assert.ok(name in imports,name);return imports[name];},out,fetch);
 return { ...out, values, calls, logout:()=>logout(), state };
}
test('successful Telegram callback exchanges code and returns a permanent account without persisting API tokens in profile',async()=>{
 const auth=load();const profile=await auth.loginWithTelegram();
 assert.equal(profile.user.appUserId,'user-id');assert.equal(auth.calls.exchange,1);assert.equal(auth.calls.saved,1);
 assert.equal(auth.calls.browserOptions.createTask,false);
 assert.equal(auth.values.has('telegram-pending'),false);assert.equal(JSON.stringify(profile).includes('private-token'),false);
});
test('cancellation removes pending intent and verifier without exchanging code',async()=>{
 const auth=load({result:{type:'cancel'}});assert.equal(await auth.loginWithTelegram(),null);assert.equal(auth.values.size,0);assert.equal(auth.calls.exchange,0);
});
test('unconfigured provider fails safely before opening/exchanging a login',async()=>{
 const auth=load({configured:false});await assert.rejects(auth.loginWithTelegram(),e=>e.code==='LOGIN_NOT_CONFIGURED');assert.equal(auth.calls.exchange,0);
});
test('untrusted callback origin is rejected before code exchange',async()=>{
 const auth=load({result:{type:'success',url:'https://attacker.invalid/?code=stolen'}});await assert.rejects(auth.loginWithTelegram(),e=>e.code==='INVALID_CALLBACK');assert.equal(auth.calls.exchange,0);
});
test('profile failure does not leave an authenticated app state or new session',async()=>{
 const auth=load({profileFailure:true});await assert.rejects(auth.loginWithTelegram(),e=>e.code==='PROFILE_UNAVAILABLE');assert.equal(auth.calls.signOut,1);assert.equal(auth.state.user,null);
});
test('cold-start callback without matching saved login intent is ignored',async()=>{
 const auth=load();assert.equal(await auth.resumePersonalLogin('hflsoccerapp://auth/telegram?code=unsolicited'),false);assert.equal(auth.calls.exchange,0);assert.equal(auth.state.user,null);
});

test('Android live callback wins even when browser reports dismissal', async()=>{
 const auth=load({openBrowser:async api=>{await api.resumePersonalLogin('hflsoccerapp://auth/telegram?code=one-use-code');return {type:'dismiss'};}});
 const profile=await auth.loginWithTelegram();assert.equal(profile.user.appUserId,'user-id');assert.equal(auth.calls.exchange,1);
});
test('Android dismissal before the link keeps PKCE and completes a late callback', async()=>{
 const auth=load({result:{type:'dismiss'}});await assert.rejects(auth.loginWithTelegram(),e=>e.code==='CALLBACK_NOT_RECEIVED');
 assert.equal(auth.calls.signOut,0);
 assert.equal(auth.values.has('telegram-pending'),true);assert.equal(auth.values.has('amatora-personal-auth-v1-code-verifier'),true);
 assert.equal(await auth.resumePersonalLogin('hflsoccerapp://auth/telegram?code=one-use-code'),true);
 assert.equal(auth.state.user.appUserId,'user-id');assert.equal(auth.calls.exchange,1);
 assert.equal(await auth.resumePersonalLogin('hflsoccerapp://auth/telegram?code=one-use-code'),false);
});
test('provider errors in URL fragments surface safely and clear the intent', async()=>{
 const auth=load({result:{type:'success',url:'hflsoccerapp://auth/telegram#error=server_error&error_description=private-data'}});
 await assert.rejects(auth.loginWithTelegram(),e=>e.code==='PROVIDER_CALLBACK_FAILED');
 assert.equal(auth.calls.exchange,0);assert.equal(auth.values.size,0);assert.ok(!auth.personalLoginMessage('PROVIDER_CALLBACK_FAILED','uz').includes('private-data'));
});
test('cold-start provider errors are reported instead of silently returning to welcome', async()=>{
 const auth=load();auth.values.set('telegram-pending',String(Date.now()));
 await assert.rejects(auth.resumePersonalLogin('hflsoccerapp://auth/telegram#error=server_error'),e=>e.code==='PROVIDER_CALLBACK_FAILED');assert.equal(auth.calls.exchange,0);
});
test('session exchange failures have a separate diagnostic', async()=>{
 const auth=load({exchangeFailure:true});await assert.rejects(auth.loginWithTelegram(),e=>e.code==='SESSION_EXCHANGE_FAILED');assert.equal(auth.calls.signOut,1);
});

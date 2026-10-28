const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load({ result = { type: 'success', url: 'hflsoccerapp://auth/telegram?code=one-use-code' }, configured = true, profileFailure = false, openBrowser, exchangeFailure = false, platform = 'android', appleResult = {token:'apple-test-token',nonce:'raw-test-nonce'}, appleProfile, staging = false, googleEnabled = false, pkceFailure = false, profileWriteError = false } = {}) {
 const values = new Map(); const calls = { exchange: 0, signOut: 0, saved: 0 }; let logout; let out;
 const state = { user: null, isGuest: false, setAuth: async user => { state.user = user; }, logout: () => { state.user = null; } };
 const storage = { getItem: async k => values.get(k) ?? null, setItem: async (k,v)=>{values.set(k,v);}, removeItem:async k=>{values.delete(k);} };
 const client = { auth: { signOut:async()=>{calls.signOut++;},getSession:async()=>({data:{session:{access_token:'private-token',user:{id:'user-id'}}}}),exchangeCodeForSession:async()=>{calls.exchange++;return exchangeFailure ? {error:{message:'private backend error'},data:{session:null}} : {data:{session:{user:{id:'user-id'}}}};} } };
 client.auth.signInWithIdToken=async options=>{calls.appleExchange=options;return exchangeFailure?{error:{message:'private error'},data:{session:null}}:{data:{session:{user:{id:'user-id'}}}};};
 client.from=table=>{calls.profileTable=table;return {update:patch=>{calls.profilePatch=patch;calls.profileFilters=[];const query={eq:(...args)=>{calls.profileFilters.push(args);return query;},select:()=>query,maybeSingle:async()=>profileWriteError?{error:{message:'private database error'}}:{data:{id:'user-id',display_name:patch.display_name}}};return query;}};};
 const originalSession=client.auth.getSession;
 client.auth.getSession=async()=>{const result=await originalSession();if(calls.googleStarted)result.data.session.user.identities=[{provider:'google'}];return result;};
 const imports = { './nativeOAuthPkce':{createNativePkce:async()=>{if(pkceFailure)throw Error('crypto unavailable');return {verifier:'b'.repeat(64),challenge:'c'.repeat(43)};}}, '../constants/PersonalAuthEnvironment':{PERSONAL_AUTH_IS_TEST:staging,PERSONAL_AUTH_URL:staging?'https://hgdezpjtdfndepseitfh.supabase.co':'https://project.supabase.co',PERSONAL_AUTH_KEY:'public-key',PERSONAL_AUTH_STORAGE_KEY:staging?'amatora-personal-auth-test-v1':'amatora-personal-auth-v1'}, './nativeAppleAuth':{requestAppleIdentity:async()=>appleResult,NativeAppleLoginError:class extends Error{}}, 'react-native': { Platform:{OS:platform},AppState:{} }, 'expo-web-browser':{ maybeCompleteAuthSession(){},openAuthSessionAsync:async(url,redirect,options)=>{calls.browserOptions=options;calls.browserUrl=url;calls.googleStarted=new URL(url).searchParams.get('provider')==='google';calls.browserVerifier=values.get((staging?'amatora-personal-auth-test-v1':'amatora-personal-auth-v1')+'-code-verifier');return openBrowser ? openBrowser(out) : result;} },
  '@supabase/supabase-js':{createClient:(url,key,options)=>{calls.client={url,storageKey:options.auth.storageKey};return client;}},'./supabase':{SUPABASE_URL:'https://project.supabase.co',SUPABASE_ANON_KEY:'public-key'},'../constants/ApiConfig':{API_BASE_URL:'https://backend.invalid'},
  './personalSessionStorage':{personalSessionStorage:storage},'../store/useAuthStore':{useAuthStore:{getState:()=>state},registerPersonalLogout:fn=>{logout=fn;}},
  './transferLoginStorage':{saveTransferLoginSessions:async()=>{calls.saved++;}},'../store/useOrganizationStore':{useOrganizationStore:{getState:()=>({setSelectedOrganizationId(){}})}} };
 const response = data => ({ ok:true,status:200,json:async()=>data });
 calls.fetchUrls=[];
 const profile=()=>appleProfile || {success:true,user:{appUserId:'user-id',id:'user-id',role:'user',authProvider:calls.googleStarted?'google':calls.appleExchange?'apple':'telegram'},accounts:[{appUserId:'user-id',id:'user-id',role:'user'}],transferSessions:[]};
 client.rpc=async name=>{calls.rpc=name;return profileFailure?{error:{code:'42501'}}:{data:profile()};};
 const fetch = async url => {
  calls.fetchUrls.push(url);
  if(url.endsWith('/telegram/start')) return configured ? response({success:true,verifier:'a'.repeat(43),url:'https://project.supabase.co/auth/v1/authorize'}) : {ok:false,status:503,json:async()=>({success:false,code:'LOGIN_NOT_CONFIGURED'})};
  if(profileFailure) return {ok:false,status:503,json:async()=>({success:false,code:'PROFILE_UNAVAILABLE'})};
  return response(profile());
 };
 out = {};
 new Function('require','exports','fetch','process',ts.transpileModule(fs.readFileSync('services/personalAuthService.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(name=>{assert.ok(name in imports,name);return imports[name];},out,fetch,{env:{EXPO_PUBLIC_GOOGLE_LOGIN_ENABLED:googleEnabled?'true':'false'}});
 return { ...out, values, calls, logout:()=>logout(), state };
}
test('successful Telegram callback exchanges code and returns a permanent account without persisting API tokens in profile',async()=>{
 const auth=load();const profile=await auth.loginWithTelegram();
 assert.equal(profile.user.appUserId,'user-id');assert.equal(auth.calls.exchange,1);assert.equal(auth.calls.saved,1);
 assert.equal(auth.calls.browserOptions.createTask,false);
 assert.equal(auth.values.has('telegram-pending'),false);assert.equal(JSON.stringify(profile).includes('private-token'),false);
});

test('cold start preserves public browsing without restoring a personal identity',async()=>{
 const auth=load();
 let loggedOut=false;
 auth.state.isGuest=true;
 auth.state.logout=()=>{loggedOut=true;auth.state.isGuest=false;};
 auth.personalAuthClient.auth.getSession=async()=>{assert.fail('Guest must not restore a personal session');};
 await auth.restorePersonalSession();
 assert.equal(loggedOut,false);
 assert.equal(auth.state.isGuest,true);
 assert.equal(auth.state.user,null);
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

test('native Apple token uses nonce verification and returns only the permanent personal profile',async()=>{
 const auth=load({platform:'ios'});
 const profile=await auth.loginWithApple();
 assert.equal(profile.user.authProvider,'apple');
 assert.deepEqual(auth.calls.appleExchange,{provider:'apple',token:'apple-test-token',nonce:'raw-test-nonce'});
 assert.equal(auth.calls.exchange,0);
 assert.equal(auth.calls.saved,1);
 assert.equal(auth.state.user,null); // Welcome persists only after successful bootstrap.
});
test('Apple cancellation or unsupported platform never exchanges a token',async()=>{
 const cancelled=load({platform:'ios',appleResult:null});
 assert.equal(await cancelled.loginWithApple(),null);
 assert.equal(cancelled.calls.appleExchange,undefined);
 await assert.rejects(load().loginWithApple(),e=>e.code==='APPLE_UNAVAILABLE');
});
test('failed Apple bootstrap clears the newly created session and hides private errors',async()=>{
 const auth=load({platform:'ios',profileFailure:true});
 await assert.rejects(auth.loginWithApple());
 assert.equal(auth.calls.signOut,1);assert.equal(auth.calls.saved,0);
 assert.ok(!auth.personalLoginMessage('APPLE_SIGN_IN_FAILED','en').includes('private'));
});
test('Apple cannot accept sports privileges or save transfer sessions from a malformed response',async()=>{
 const auth=load({platform:'ios',appleProfile:{success:true,user:{appUserId:'user-id',role:'manager',authProvider:'apple'},
  accounts:[{appUserId:'user-id',role:'manager'}],transferSessions:[{token:'never-save'}]}});
 await assert.rejects(auth.loginWithApple(),e=>e.code==='APPLE_SIGN_IN_FAILED');
 assert.equal(auth.calls.saved,0);assert.equal(auth.calls.signOut,1);
});
test('shared gate blocks another personal login while Apple sheet is pending',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const auth=load({platform:'ios',appleResult:pending});
 const apple=auth.loginWithApple();
 assert.equal(await auth.loginWithTelegram(),null);
 release(null);assert.equal(await apple,null);
});

test('staging Apple auth uses only its isolated client/RPC and cannot send tokens to production',async()=>{
 const auth=load({platform:'ios',staging:true});
 assert.equal((await auth.loginWithApple()).user.authProvider,'apple');
 assert.equal(auth.calls.client.url,'https://hgdezpjtdfndepseitfh.supabase.co');
 assert.equal(auth.calls.client.storageKey,'amatora-personal-auth-test-v1');
 assert.equal(auth.calls.rpc,'bootstrap_personal_account');
 assert.equal(auth.calls.fetchUrls.length,0);assert.equal(auth.calls.saved,0);assert.equal(auth.state.user,null);
 await assert.rejects(auth.loginWithTelegram(),e=>e.code==='APPLE_TEST_ONLY');
 await assert.rejects(auth.deletePersonalAccount(),e=>e.code==='APPLE_TEST_ONLY');
 assert.equal(auth.calls.fetchUrls.length,0);
});

test('failed staging session cleanup preserves the existing app profile',async()=>{
 const auth=load({platform:'ios',staging:true,profileFailure:true});
 auth.state.user={appUserId:'existing-production-profile'};
 await assert.rejects(auth.loginWithApple());
 assert.equal(auth.calls.signOut,1);assert.equal(auth.state.user.appUserId,'existing-production-profile');
 assert.equal(auth.calls.fetchUrls.length,0);
});


test('Google uses PKCE browser callback and validates a personal-only provider result',async()=>{
 const auth=load({googleEnabled:true,platform:'ios',result:{type:'success',url:'hflsoccerapp://auth/google?code=one-use'}});
 const profile=await auth.loginWithGoogle();assert.equal(profile.user.authProvider,'google');assert.equal(auth.calls.exchange,1);
 const authorization=new URL(auth.calls.browserUrl);
 assert.equal(authorization.origin,'https://project.supabase.co');
 assert.equal(authorization.searchParams.get('provider'),'google');
 assert.equal(authorization.searchParams.get('redirect_to'),auth.GOOGLE_RETURN_URL);
 assert.equal(authorization.searchParams.get('code_challenge_method'),'s256');
 assert.equal(authorization.searchParams.get('code_challenge'),'c'.repeat(43));
 assert.equal(auth.calls.browserVerifier,JSON.stringify('b'.repeat(64)));
 assert.equal(auth.calls.browserUrl.includes('b'.repeat(64)),false);
 assert.equal(auth.values.has('amatora-personal-auth-v1-google-pending'),false);
});
test('Google fails closed until configured and never opens a browser when native PKCE fails',async()=>{
 const disabled=load();await assert.rejects(disabled.loginWithGoogle(),e=>e.code==='GOOGLE_NOT_CONFIGURED');assert.equal(disabled.calls.exchange,0);
 const unsafe=load({googleEnabled:true,pkceFailure:true});
 await assert.rejects(unsafe.loginWithGoogle(),e=>e.code==='GOOGLE_SIGN_IN_FAILED');assert.equal(unsafe.calls.exchange,0);
});
test('Google cancellation and wrong callback never create an app identity',async()=>{
 const cancel=load({googleEnabled:true,platform:'ios',result:{type:'cancel'}});assert.equal(await cancel.loginWithGoogle(),null);assert.equal(cancel.values.size,0);
 const wrong=load({googleEnabled:true,platform:'ios'});await assert.rejects(wrong.loginWithGoogle());assert.equal(wrong.calls.exchange,0);
});
test('Google refuses a sports profile and clears the new session',async()=>{
 const auth=load({googleEnabled:true,platform:'ios',result:{type:'success',url:'hflsoccerapp://auth/google?code=one-use'},appleProfile:{success:true,user:{appUserId:'user-id',role:'captain',authProvider:'google'},accounts:[{appUserId:'user-id',role:'captain'}]}});
 await assert.rejects(auth.loginWithGoogle(),e=>e.code==='GOOGLE_SIGN_IN_FAILED');assert.equal(auth.state.user,null);assert.ok(auth.calls.signOut>0);
});

test('Google provider failure retains a safe diagnostic without exposing callback details',async()=>{
 const auth=load({googleEnabled:true,platform:'ios',result:{type:'success',url:'hflsoccerapp://auth/google?error=server_error&error_description=private-database-message'}});
 await assert.rejects(auth.loginWithGoogle(),e=>e.code==='GOOGLE_PROVIDER_CALLBACK_FAILED');
 assert.equal(auth.calls.exchange,0);assert.equal(auth.values.size,0);
 assert.match(auth.personalLoginMessage('GOOGLE_PROVIDER_CALLBACK_FAILED','ru'),/GP01/);
 assert.ok(!auth.personalLoginMessage('GOOGLE_PROVIDER_CALLBACK_FAILED','ru').includes('private'));
});

const applePersonalProfile=name=>({success:true,user:{id:'user-id',appUserId:'user-id',role:'user',authProvider:'apple',name},
 accounts:[{id:'user-id',appUserId:'user-id',role:'user',name}]});
test('first Apple name fills only the owner placeholder and never grants privileges',async()=>{
 const auth=load({platform:'ios',appleResult:{token:'test-token',nonce:'test-nonce',fullName:'Test Player'},appleProfile:applePersonalProfile('AMATORA foydalanuvchisi')});
 const profile=await auth.loginWithApple();
 assert.equal(auth.calls.profileTable,'app_users');assert.deepEqual(auth.calls.profilePatch,{display_name:'Test Player'});
 assert.deepEqual(auth.calls.profileFilters,[['id','user-id'],['display_name','AMATORA foydalanuvchisi']]);
 assert.equal(profile.user.name,'Test Player');assert.equal(profile.accounts[0].name,'Test Player');assert.equal(profile.user.role,'user');
});
test('Apple does not replace edited names, and optional metadata failure does not break login',async()=>{
 const edited=load({platform:'ios',appleResult:{token:'test-token',nonce:'test-nonce',fullName:'Provider Name'},appleProfile:applePersonalProfile('Chosen Name')});
 assert.equal((await edited.loginWithApple()).user.name,'Chosen Name');assert.equal(edited.calls.profilePatch,undefined);
 const failed=load({platform:'ios',profileWriteError:true,appleResult:{token:'test-token',nonce:'test-nonce',fullName:'Test Player'},appleProfile:applePersonalProfile('AMATORA foydalanuvchisi')});
 assert.equal((await failed.loginWithApple()).user.name,'AMATORA foydalanuvchisi');assert.equal(failed.calls.signOut,0);
});

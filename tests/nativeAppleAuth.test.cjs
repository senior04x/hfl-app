const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript'),crypto=require('node:crypto');
function load({platform='ios',cancel=false,badState=false,available=true}={}){
 let options;
 const deps={
  'react-native':{Platform:{OS:platform}},
  'expo-crypto':{getRandomBytesAsync:async()=>new Uint8Array(32).fill(7),randomUUID:()=> 'unique-state',
   CryptoDigestAlgorithm:{SHA256:'SHA256'},digestStringAsync:async(_,value)=>crypto.createHash('sha256').update(value).digest('hex')},
  'expo-apple-authentication':{isAvailableAsync:async()=>available,AppleAuthenticationScope:{EMAIL:0},signInAsync:async value=>{
   options=value;if(cancel)throw {code:'ERR_REQUEST_CANCELED'};
   return {identityToken:'private-apple-token',state:badState?'wrong':value.state};
  }},
 };
 const output={};
 new Function('require','exports',ts.transpileModule(fs.readFileSync('services/nativeAppleAuth.ts','utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
 }).outputText)(name=>{if(platform!=='ios'&&name!=='react-native')assert.fail('Native module loaded outside iOS');return deps[name];},output);
 return {...output,options:()=>options};
}
test('Apple receives hashed fresh nonce and Supabase receives only the matching raw nonce',async()=>{
 const api=load(),credential=await api.requestAppleIdentity();
 assert.equal(credential.token,'private-apple-token');
 assert.equal(credential.nonce.length,64);
 assert.equal(api.options().nonce,crypto.createHash('sha256').update(credential.nonce).digest('hex'));
 assert.notEqual(api.options().nonce,credential.nonce);
 assert.equal(api.options().state,'unique-state');
});
test('cancellation does not create a token and mismatched state is rejected',async()=>{
 assert.equal(await load({cancel:true}).requestAppleIdentity(),null);
 await assert.rejects(load({badState:true}).requestAppleIdentity(),/APPLE_INVALID_RESPONSE/);
});
test('unsupported/unavailable platforms cannot invoke native sign-in',async()=>{
 const android=load({platform:'android'});assert.equal(android.getAppleAuthModule(),null);
 await assert.rejects(android.requestAppleIdentity(),/APPLE_UNAVAILABLE/);
 await assert.rejects(load({available:false}).requestAppleIdentity(),/APPLE_UNAVAILABLE/);
});

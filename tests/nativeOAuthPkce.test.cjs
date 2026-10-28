const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const fs=require('node:fs'),ts=require('typescript');
const api={};
const source=ts.transpileModule(fs.readFileSync('services/nativeOAuthPkce.ts','utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
}).outputText;
new Function('require','exports',source)(name=>{
 assert.equal(name,'expo-crypto');
 return {getRandomBytesAsync:async n=>crypto.randomBytes(n),CryptoDigestAlgorithm:{SHA256:'sha256'},CryptoEncoding:{BASE64:'base64'},
  digestStringAsync:async(algorithm,value,options)=>crypto.createHash(algorithm).update(value).digest(options.encoding)};
},api);
test('native PKCE uses fresh cryptographic verifiers and the RFC7636 S256 transform without WebCrypto',async()=>{
 const first=await api.createNativePkce(),second=await api.createNativePkce();
 assert.match(first.verifier,/^[a-f0-9]{64}$/);assert.match(first.challenge,/^[A-Za-z0-9_-]{43}$/);
 assert.equal(first.challenge,crypto.createHash('sha256').update(first.verifier).digest('base64url'));
 assert.notEqual(first.challenge,first.verifier);assert.notEqual(first.verifier,second.verifier);
});

const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function env(values={}){
 const output={};
 new Function('require','exports','process',ts.transpileModule(fs.readFileSync('constants/PersonalAuthEnvironment.ts','utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
 }).outputText)(()=>({SUPABASE_URL:'https://production.invalid',SUPABASE_ANON_KEY:'prod-public'}),output,{env:values});
 return output;
}
test('release uses existing production config and test uses fixed URL/separate session',()=>{
 const prod=env(),stage=env({EXPO_PUBLIC_PERSONAL_AUTH_STAGE:'cloud-test',EXPO_PUBLIC_PERSONAL_AUTH_TEST_KEY:'sb_publishable_test'});
 assert.equal(prod.PERSONAL_AUTH_URL,'https://production.invalid');
 assert.equal(stage.PERSONAL_AUTH_URL,'https://hgdezpjtdfndepseitfh.supabase.co');
 assert.notEqual(stage.PERSONAL_AUTH_STORAGE_KEY,prod.PERSONAL_AUTH_STORAGE_KEY);
 assert.throws(()=>env({EXPO_PUBLIC_PERSONAL_AUTH_STAGE:'cloud-test'}));
 assert.throws(()=>env({EXPO_PUBLIC_PERSONAL_AUTH_STAGE:'unknown'}));
});

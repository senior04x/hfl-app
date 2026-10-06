const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(fail) {
 const values = new Map();
 const secure = { getItemAsync: async key => values.get(key) ?? null,
  setItemAsync: async (key, value) => { if (fail?.(key)) throw Error('disk'); values.set(key, value); },
  deleteItemAsync: async key => { values.delete(key); } };
 const out = {};
 new Function('require', 'exports', ts.transpileModule(fs.readFileSync('services/personalSessionStorage.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(name => { assert.equal(name, 'expo-secure-store'); return secure; }, out);
 return { storage: out.personalSessionStorage, values };
}
test('large sessions survive restart-sized reads and are deleted completely', async () => {
 const { storage, values } = load(); const session = 'private-session'.repeat(900);
 await storage.setItem('auth', session); assert.equal(await storage.getItem('auth'), session);
 assert.ok([...values.values()].every(v => v.length <= 1500));
 await storage.removeItem('auth'); assert.equal(await storage.getItem('auth'), null); assert.equal(values.size, 0);
});
test('failed chunk write preserves previously committed session', async () => {
 let fail = false; const { storage } = load(key => fail && key.endsWith('.1'));
 await storage.setItem('auth', 'previous'); fail = true;
 await assert.rejects(storage.setItem('auth', 'new'.repeat(1000)));
 assert.equal(await storage.getItem('auth'), 'previous');
});
test('logout queued during a write leaves no persisted session', async () => {
 const { storage, values } = load(); await Promise.all([storage.setItem('auth', 'private'.repeat(600)), storage.removeItem('auth')]);
 assert.equal(values.size, 0); assert.equal(await storage.getItem('auth'), null);
});
test('non-Latin names and emoji remain intact within native byte limits', async () => {
 const { storage, values } = load(); const session = '漢'.repeat(449) + '⚽🦁'.repeat(900);
 await storage.setItem('auth',session); assert.equal(await storage.getItem('auth'),session);
 assert.ok([...values.values()].every(v=>Buffer.byteLength(v,'utf8')<=1800));
});

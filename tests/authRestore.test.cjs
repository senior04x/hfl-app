const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function diagnostic() {
  const out = {};
  new Function('exports', ts.transpileModule(fs.readFileSync('utils/authStorageDiagnostic.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(out);
  return out;
}
function load(values, customStorage) {
  const storage = { getItem: async k => values.get(k) || null, setItem: async (k,v) => { values.set(k,v); }, removeItem: async k => { values.delete(k); } };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('store/useAuthStore.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  new Function('require','exports',code)(name => name === '@react-native-async-storage/async-storage' ? (customStorage || storage) : name === '../services/transferLoginStorage' ? { clearTransferLoginStorage: async () => {} } : name === '../utils/authStorageDiagnostic' ? diagnostic() : require(name), exports);
  return exports.useAuthStore;
}
test('cold restart restores the selected account and logout stays logged out', async () => {
  const values = new Map();
  const initial = load(values);
  const account = { id: 'test-player', role: 'player' };
  await initial.getState().setAuth(account, [account]);
  const restarted = load(values);
  assert.equal(restarted.persist.hasHydrated(), false);
  await restarted.persist.rehydrate();
  assert.equal(restarted.getState().isAuthenticated, true);
  assert.equal(restarted.getState().user.id, account.id);
  assert.deepEqual(restarted.getState().userAccounts, [account]);
  restarted.getState().logout();
  await new Promise(resolve => setImmediate(resolve));
  const afterLogout = load(values);
  await afterLogout.persist.rehydrate();
  assert.equal(afterLogout.getState().isAuthenticated, false);
  assert.equal(afterLogout.getState().user, null);
});

test('a slow login write finishes before authenticated navigation is enabled', async () => {
  const values = new Map();
  let release;
  const storage = { getItem: async k => values.get(k) || null, setItem: (k,v) => new Promise(resolve => { release = () => { values.set(k,v); resolve(); }; }), removeItem: async () => {} };
  const store = load(values, storage);
  const pending = store.getState().setAuth({ id: 'slow-player' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(store.getState().isAuthenticated, false);
  release();
  await pending;
  assert.equal(store.getState().isAuthenticated, true);
  assert.equal(JSON.parse(values.get('amatora-auth-storage')).state.user.id, 'slow-player');
});
test('failed storage does not claim a successful login', async () => {
  const store = load(new Map(), { getItem: async () => null, setItem: async () => { throw Error('disk full'); }, removeItem: async () => {} });
  await assert.rejects(store.getState().setAuth({ id: 'unsaved' }), /AUTH-DISK-FULL/);
  assert.equal(store.getState().isAuthenticated, false);
  assert.equal(store.getState().user, null);
});

test('diagnostic codes never disclose native error contents', () => {
 const d = diagnostic();
 assert.equal(d.authStorageDiagnostic(new Error('SQLite database is locked: secret')), 'AUTH-DB-LOCKED');
 assert.equal(d.authStorageDiagnostic(new Error('secret phone token')), 'AUTH-WRITE-UNKNOWN');
 assert.equal(d.safeAuthStorageCode(new Error('secret phone token')), 'AUTH-WRITE-UNKNOWN');
 assert.equal(d.authStorageDiagnostic(new Error('circular secret'), 'serialize'), 'AUTH-SERIALIZE');
});

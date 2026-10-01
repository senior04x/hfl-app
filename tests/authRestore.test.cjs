const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(values) {
  const storage = { getItem: async k => values.get(k) || null, setItem: async (k,v) => { values.set(k,v); }, removeItem: async k => { values.delete(k); } };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('store/useAuthStore.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  new Function('require','exports',code)(name => name === '@react-native-async-storage/async-storage' ? storage : name === '../services/transferLoginStorage' ? { clearTransferLoginStorage: async () => {} } : require(name), exports);
  return exports.useAuthStore;
}
test('cold restart restores the selected account and logout stays logged out', async () => {
  const values = new Map();
  const initial = load(values);
  const account = { id: 'test-player', role: 'player' };
  initial.getState().setAuth(account, [account]);
  const restarted = load(values);
  assert.equal(restarted.persist.hasHydrated(), false);
  await restarted.persist.rehydrate();
  assert.equal(restarted.getState().isAuthenticated, true);
  assert.equal(restarted.getState().user.id, account.id);
  assert.deepEqual(restarted.getState().userAccounts, [account]);
  restarted.getState().logout();
  const afterLogout = load(values);
  await afterLogout.persist.rehydrate();
  assert.equal(afterLogout.getState().isAuthenticated, false);
  assert.equal(afterLogout.getState().user, null);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(options = {}) {
    const state = { user: { id: 'owner', role: 'player' }, isAuthenticated: true };
    const calls = [];
    const media = { requestPermissionsAsync: async (...args) => { calls.push(['permission', ...args]); return { granted: options.granted !== false }; }, saveToLibraryAsync: async uri => calls.push(['save', uri]) };
    const files = { cacheDirectory: 'file:///cache/', downloadAsync: async (uri, path) => { calls.push(['download', uri]); if (options.fail) throw new Error('network'); return { uri: path, status: 200 }; }, deleteAsync: async uri => calls.push(['delete', uri]) };
    const out = {};
    const code = ts.transpileModule(fs.readFileSync('services/saveOwnGoal.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    new Function('require', 'exports', code)(name => {
        if (name === './androidReplaySource') return { resolveAndroidReplay: async uri => uri };
        if (name === 'react-native') return { Platform: { OS: 'android' } };
        if (name === 'expo-modules-core') return { requireOptionalNativeModule: () => options.native === false ? null : {} };
        if (name === '../store/useAuthStore') return { useAuthStore: { getState: () => state } };
        if (name === 'expo-media-library') return media;
        if (name === 'expo-file-system/legacy') return files;
        throw new Error(name);
    }, out);
    return { ...out, calls, state };
}
test('only authenticated player can save their exact profile goal', async () => {
    const api = load();
    await assert.rejects(api.saveOwnGoal('another-profile', 'https://example.com/clip.mp4'), /not_owner/);
    api.state.user.role = 'manager';
    await assert.rejects(api.saveOwnGoal('owner', 'https://example.com/clip.mp4'), /not_owner/);
    assert.equal(api.calls.length, 0);
});
test('save requests add-only permission and cleans temporary clip', async () => {
    const api = load(); await api.saveOwnGoal('owner', 'https://example.com/clip.mp4');
    assert.deepEqual(api.calls[0], ['permission', true, []]);
    assert.deepEqual(api.calls.map(call => call[0]), ['permission', 'download', 'save', 'delete']);
});
test('denied permission never downloads', async () => {
    const api = load({ granted: false }); await assert.rejects(api.saveOwnGoal('owner', 'https://example.com/clip.mp4'), /permission/);
    assert.deepEqual(api.calls.map(call => call[0]), ['permission']);
});
test('failed transfer cleans partial file and permits retry', async () => {
    const api = load({ fail: true });
    for (let i = 0; i < 2; i++) await assert.rejects(api.saveOwnGoal('owner', 'https://example.com/clip.mp4'), /network/);
    assert.equal(api.calls.filter(call => call[0] === 'delete').length, 2);
});
test('old native build and insecure URL fail without download', async () => {
    await assert.rejects(load({ native: false }).saveOwnGoal('owner', 'https://example.com/clip.mp4'), /unavailable/);
    const api = load(); await assert.rejects(api.saveOwnGoal('owner', 'http://example.com/clip.mp4'), /failed/);
    assert.equal(api.calls.length, 0);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('services/notificationsRuntime.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function load(platform, environment, ownership) {
    let imports = 0;
    const native = {};
    const out = {};
    new Function('require', 'exports', code)(name => {
        if (name === 'react-native') return { Platform: { OS: platform } };
        if (name === 'expo') return { isRunningInExpoGo: () =>
            platform === 'android' && (environment === 'storeClient' || ownership === 'expo' || ownership === 'guest') };
        if (name === 'expo-constants') return { __esModule: true,
            default: { executionEnvironment: environment, appOwnership: ownership },
            ExecutionEnvironment: { StoreClient: 'storeClient' } };
        assert.equal(name, 'expo-notifications');
        imports++;
        if (platform === 'android' && (environment === 'storeClient' || ownership === 'expo' || ownership === 'guest')) {
            throw new Error('Android Expo Go native module must never initialize');
        }
        return native;
    }, out);
    return { result: out.notifications, imports, native };
}

test('Android Expo Go skips native module initialization for current and legacy detection', () => {
    for (const [environment, ownership] of [['storeClient', null], [null, 'expo'], [null, 'guest']]) {
        const value = load('android', environment, ownership);
        assert.equal(value.imports, 0); assert.equal(value.result, null);
    }
});
test('Android builds and iOS retain the real notification module', () => {
    for (const [platform, environment, ownership] of [['android', 'standalone', null], ['android', 'bare', null], ['ios', 'storeClient', 'expo']]) {
        const value = load(platform, environment, ownership);
        assert.equal(value.imports, 1); assert.equal(value.result, value.native);
    }
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load() {
    let state;
    const exports = {};
    const deps = {
        zustand: { create: () => init => {
            state = init(values => Object.assign(state, values));
            return { getState: () => state };
        } },
        'zustand/middleware': { persist: init => init, createJSONStorage: () => ({}) },
        '@react-native-async-storage/async-storage': { default: {} },
    };
    new Function('exports', 'require', ts.transpileModule(fs.readFileSync('store/usePublicOrganizationStore.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText)(exports, name => deps[name]);
    return exports;
}
test('ordinary user has no implicit organization and another account cannot inherit the choice', () => {
    const { usePublicOrganizationStore: store, publicOrganizationForUser: selected } = load();
    assert.equal(selected(store.getState(), 'a'), null);
    store.getState().select('a', { id: 12, name: 'Organization' });
    assert.equal(selected(store.getState(), 'a').id, 12);
    assert.equal(selected(store.getState(), 'b'), null);
    store.getState().select('a', { id: 25, name: 'Other' });
    assert.equal(selected(store.getState(), 'a').id, 25);
    store.getState().clear();
    assert.equal(selected(store.getState(), 'a'), null);
});
test('invalid selection cannot create an implicit organization fallback', () => {
    const { usePublicOrganizationStore: store } = load();
    for (const id of [0, -1, NaN, 1.5]) assert.throws(() => store.getState().select('a', { id, name: 'Org' }));
    assert.throws(() => store.getState().select('', { id: 1, name: 'Org' }));
    assert.equal(store.getState().selectedOrganization, null);
});

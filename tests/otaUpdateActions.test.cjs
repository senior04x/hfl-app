const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const exportsObject = {};
const source = ts.transpileModule(fs.readFileSync('services/otaUpdateActions.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
new Function('exports', source)(exportsObject);
const { createOtaUpdateActions } = exportsObject;

test('failed download never reloads; a retry can succeed', async () => {
    let downloads = 0, reloads = 0;
    const actions = createOtaUpdateActions({
        checkForUpdateAsync: async () => {},
        fetchUpdateAsync: async () => {
            if (++downloads === 1) throw new Error('offline');
            return { isNew: true, isRollBackToEmbedded: false };
        },
        reloadAsync: async () => { reloads++; },
    });
    await assert.rejects(actions.apply(false), /offline/);
    assert.equal(reloads, 0);
    await actions.apply(false);
    assert.equal(reloads, 1);
});

test('concurrent taps cannot download or reload twice', async () => {
    let finish, downloads = 0, reloads = 0;
    const actions = createOtaUpdateActions({
        checkForUpdateAsync: async () => {},
        fetchUpdateAsync: () => { downloads++; return new Promise(resolve => { finish = resolve; }); },
        reloadAsync: async () => { reloads++; },
    });
    const first = actions.apply(false);
    await assert.rejects(actions.apply(false), /pending/);
    finish({ isNew: true, isRollBackToEmbedded: false });
    await first;
    assert.equal(downloads, 1);
    assert.equal(reloads, 1);
});

test('pending update works offline without a second download; reload failure remains retryable', async () => {
    let reloads = 0;
    const actions = createOtaUpdateActions({
        checkForUpdateAsync: async () => {},
        fetchUpdateAsync: async () => { throw new Error('must not download'); },
        reloadAsync: async () => { if (++reloads === 1) throw new Error('reload failed'); },
    });
    await assert.rejects(actions.apply(true), /reload failed/);
    await actions.apply(true);
    assert.equal(reloads, 2);
});

test('withdrawn update is not applied; rollback can restore embedded bundle', async () => {
    let reloads = 0, rollback = false;
    const actions = createOtaUpdateActions({
        checkForUpdateAsync: async () => {},
        fetchUpdateAsync: async () => ({ isNew: false, isRollBackToEmbedded: rollback }),
        reloadAsync: async () => { reloads++; },
    });
    await assert.rejects(actions.apply(false), /No downloaded update/);
    assert.equal(reloads, 0);
    rollback = true;
    await actions.apply(false);
    assert.equal(reloads, 1);
});

test('foreground checks do not overlap downloads and failed checks release the lock', async () => {
    let checks = 0, finish;
    const actions = createOtaUpdateActions({
        checkForUpdateAsync: async () => { checks++; throw new Error('offline'); },
        fetchUpdateAsync: () => new Promise(resolve => { finish = resolve; }),
        reloadAsync: async () => {},
    });
    await assert.rejects(actions.check(), /offline/);
    const download = actions.apply(false);
    await actions.check();
    assert.equal(checks, 1);
    finish({ isNew: true, isRollBackToEmbedded: false });
    await download;
    await assert.rejects(actions.check(), /offline/);
    assert.equal(checks, 2);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('services/apiService.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function loadCache() {
    const exports = {};
    let now = 1000;
    class Clock extends Date { static now() { return now; } }
    new Function('exports', 'require', 'Date', source)(exports, name =>
        name === 'axios' ? { default: { create: () => ({}) } } : {}, Clock);
    return { ...exports, setTime: value => { now = value; } };
}
function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

test('concurrent callers share one request; different keys stay independent', async () => {
    const { getCachedData } = loadCache();
    const pending = deferred();
    let calls = 0;
    const results = Array.from({ length: 20 }, () => getCachedData('teams_1', () => { calls++; return pending.promise; }));
    assert.equal(await getCachedData('teams_2', async () => 'other'), 'other');
    assert.equal(calls, 1);
    pending.resolve('shared');
    assert.deepEqual(await Promise.all(results), Array(20).fill('shared'));
    assert.equal(await getCachedData('teams_1', assert.fail), 'shared');
});

test('TTL starts after the slow request completes', async () => {
    const { getCachedData, setTime } = loadCache();
    const pending = deferred();
    const result = getCachedData('slow', () => pending.promise, 100);
    await Promise.resolve();
    setTime(5000);
    pending.resolve('fresh');
    await result;
    setTime(5099);
    assert.equal(await getCachedData('slow', assert.fail, 100), 'fresh');
    setTime(5100);
    assert.equal(await getCachedData('slow', async () => 'new', 100), 'new');
});

test('rejected and synchronously thrown requests allow retries', async () => {
    const { getCachedData } = loadCache();
    const failure = new Error('offline');
    const pending = deferred();
    const first = getCachedData('retry', () => pending.promise);
    const second = getCachedData('retry', assert.fail);
    pending.reject(failure);
    assert.deepEqual((await Promise.allSettled([first, second])).map(r => r.status), ['rejected', 'rejected']);
    await assert.rejects(getCachedData('retry', () => { throw failure; }), /offline/);
    assert.equal(await getCachedData('retry', async () => 'recovered'), 'recovered');
});

test('prefix clearing prevents old results from replacing or deleting a new request', async () => {
    const { getCachedData, clearApiCache } = loadCache();
    await getCachedData('news_1', async () => 'news');
    const old = deferred(), current = deferred();
    const first = getCachedData('teams_1', () => old.promise);
    await Promise.resolve();
    clearApiCache('teams_');
    const next = getCachedData('teams_1', () => current.promise);
    old.resolve('old');
    assert.equal(await first, 'old');
    const joined = getCachedData('teams_1', assert.fail);
    current.resolve('current');
    assert.deepEqual(await Promise.all([next, joined]), ['current', 'current']);
    assert.equal(await getCachedData('teams_1', assert.fail), 'current');
    assert.equal(await getCachedData('news_1', assert.fail), 'news');
});

test('full clearing also invalidates pending requests', async () => {
    const { getCachedData, clearApiCache } = loadCache();
    const old = deferred();
    const result = getCachedData('one', () => old.promise);
    clearApiCache();
    old.resolve('old');
    await result;
    assert.equal(await getCachedData('one', async () => 'new'), 'new');
});

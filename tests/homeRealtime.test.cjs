const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const exportsObject = {};
new Function('exports', ts.transpileModule(fs.readFileSync('services/homeRealtime.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText)(exportsObject);
const { getHomeMatchEventFilters, createHomeStoryRefresh } = exportsObject;
const waitForTimer = () => new Promise(resolve => setTimeout(resolve, 20));

test('subscriptions are scoped, deduplicated and split at the 100-value limit', () => {
    const ids = Array.from({ length: 201 }, (_, i) => String(i + 1));
    const filters = getHomeMatchEventFilters([...ids, '1', '', 'bad,value']);
    assert.equal(filters.length, 3);
    assert.ok(filters.every(f => f.startsWith('match_id=in.(')));
    const values = filters.flatMap(f => f.slice(13, -1).split(','));
    assert.equal(new Set(values).size, 201);
    assert.ok(filters.every(f => f.slice(13, -1).split(',').length <= 100));
    assert.deepEqual(getHomeMatchEventFilters([]), []);
});

test('event bursts merge and an in-flight refresh queues only one follow-up', async () => {
    let calls = 0, finish;
    const applied = [];
    const refresh = createHomeStoryRefresh(() => {
        calls++;
        if (calls === 1) return new Promise(resolve => { finish = resolve; });
        return Promise.resolve('latest');
    }, data => applied.push(data), assert.fail, 0);
    for (let i = 0; i < 20; i++) refresh.schedule();
    await waitForTimer();
    assert.equal(calls, 1);
    for (let i = 0; i < 20; i++) refresh.schedule();
    await waitForTimer();
    assert.equal(calls, 1);
    finish('first');
    await waitForTimer();
    assert.equal(calls, 2);
    assert.deepEqual(applied, ['first', 'latest']);
    refresh.dispose();
});

test('leaving the screen cancels pending work and ignores late results', async () => {
    let calls = 0, finish;
    const refresh = createHomeStoryRefresh(() => {
        calls++;
        return new Promise(resolve => { finish = resolve; });
    }, assert.fail, assert.fail, 0);
    refresh.schedule();
    await waitForTimer();
    refresh.schedule();
    refresh.dispose();
    finish('stale');
    await waitForTimer();
    assert.equal(calls, 1);
    const pending = createHomeStoryRefresh(async () => { calls++; }, assert.fail, assert.fail, 0);
    pending.schedule();
    pending.dispose();
    await waitForTimer();
    assert.equal(calls, 1);
});

test('a failed refresh can recover on the next event', async () => {
    let calls = 0;
    const errors = [], applied = [];
    const refresh = createHomeStoryRefresh(async () => {
        if (++calls === 1) throw new Error('offline');
        return 'recovered';
    }, value => applied.push(value), error => errors.push(error), 0);
    refresh.schedule();
    await waitForTimer();
    refresh.schedule();
    await waitForTimer();
    assert.equal(errors.length, 1);
    assert.deepEqual(applied, ['recovered']);
    refresh.dispose();
});

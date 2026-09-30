const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const exportsObject = {};
new Function('exports', 'require', ts.transpileModule(fs.readFileSync('services/calendarCache.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText)(exportsObject, () => ({ default: {} }));
const { createCalendarCache } = exportsObject;
const groups = [{ id: '2026-10-1', tournaments: [{ matches: [{ id: 1 }] }] }];

function fixture() {
    let raw = null, writes = 0;
    const cache = createCalendarCache({
        getItem: async () => raw,
        setItem: async (_, value) => { writes++; raw = value; },
    });
    return { cache, setRaw: value => { raw = value; }, writes: () => writes };
}

test('only the matching user, organization, date and tab snapshot is returned', async () => {
    const { cache } = fixture();
    await cache.write('user1/org1/all/day1', groups);
    assert.deepEqual(await cache.read('user1/org1/all/day1'), groups);
    for (const scope of ['user2/org1/all/day1', 'user1/org2/all/day1', 'user1/org1/my/day1', 'user1/org1/all/day2']) {
        assert.equal(await cache.read(scope), null);
    }
    await cache.write('user1/org1/all/day2', []);
    assert.equal(await cache.read('user1/org1/all/day1'), null);
    assert.deepEqual(await cache.read('user1/org1/all/day2'), []);
});

test('corrupt, expired, future and malformed data never reaches the screen', async () => {
    const { cache, setRaw } = fixture();
    setRaw('{broken');
    assert.equal(await cache.read('one'), null);
    for (const savedAt of [Date.now() - 8 * 86400000, Date.now() + 86400000, null]) {
        setRaw(JSON.stringify({ scope: 'one', data: groups, savedAt }));
        assert.equal(await cache.read('one'), null);
    }
    setRaw(JSON.stringify({ scope: 'one', data: [{ id: 'bad', tournaments: [{}] }], savedAt: Date.now() }));
    assert.equal(await cache.read('one'), null);
});

test('oversized snapshots are skipped; cache remains bounded to one snapshot', async () => {
    const { cache, writes } = fixture();
    await cache.write('large', [{ value: 'x'.repeat(128 * 1024) }]);
    assert.equal(writes(), 0);
    assert.equal(await cache.read('large'), null);
    await cache.write('small', groups);
    assert.equal(writes(), 1);
});

test('storage failures do not reject successful network processing', async () => {
    const cache = createCalendarCache({
        getItem: async () => { throw new Error('unavailable'); },
        setItem: async () => { throw new Error('full'); },
    });
    assert.equal(await cache.read('one'), null);
    await assert.doesNotReject(cache.write('one', groups));
});

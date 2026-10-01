const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const BASE = 'https://xzzyhfyazwohdqqbjiiy.supabase.co/storage/v1/object/public/replays/';
function load(fetcher) {
    const out = {};
    const code = ts.transpileModule(fs.readFileSync('services/androidReplaySource.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    new Function('exports', 'fetch', code)(out, fetcher);
    return out;
}
test('only known public replay MP4s get a compatibility URL', () => {
    const api = load();
    assert.equal(api.androidReplayCandidate(BASE + '1/a/b.mp4'), BASE + '1/a/b.android.mp4');
    for (const uri of ['file:///clip.mp4', 'http://evil.test/a.mp4', 'https://evil.test/a.mp4', BASE + 'a.m3u8', BASE + 'a.android.mp4']) assert.equal(api.androidReplayCandidate(uri), null);
});
test('concurrent cards share a single HEAD request and reuse result', async () => {
    let calls = 0;
    const api = load(async (_, options) => { calls++; assert.equal(options.method, 'HEAD'); return { ok: true, headers: new Headers({ 'content-length': '100' }) }; });
    const uri = BASE + 'clip.mp4';
    const result = await Promise.all([api.resolveAndroidReplay(uri), api.resolveAndroidReplay(uri)]);
    assert.deepEqual(result, [BASE + 'clip.android.mp4', BASE + 'clip.android.mp4']);
    await api.resolveAndroidReplay(uri);
    assert.equal(calls, 1);
});
test('missing, empty or offline compatibility files keep original playable source', async () => {
    const uri = BASE + 'clip.mp4';
    for (const fetcher of [async () => ({ ok: false }), async () => ({ ok: true, headers: new Headers({ 'content-length': '0' }) }), async () => { throw new Error('offline'); }]) {
        assert.equal(await load(fetcher).resolveAndroidReplay(uri), uri);
    }
});

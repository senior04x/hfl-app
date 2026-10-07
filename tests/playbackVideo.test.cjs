const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function mount(props = {}) {
    const events = {}, effects = [], cleanups = [], statuses = [], errors = [];
    let appListener, loads = 0, plays = 0, pauses = 0;
    const player = { status: 'loading', playing: false, currentTime: 0, duration: 10,
        play() { plays++; this.playing = true; }, pause() { pauses++; this.playing = false; } };
    const react = {
        forwardRef: fn => fn, useRef: value => ({ current: value }),
        useEffect: fn => effects.push(fn), useImperativeHandle: (ref, fn) => { ref.current = fn(); },
        createElement: (component, props) => ({ component, props }),
    };
    const imports = {
        react: { __esModule: true, default: react, ...react },
        'react-native': { AppState: { currentState: 'active', addEventListener: (_, fn) => {
            appListener = fn; return { remove: () => { appListener = undefined; } };
        } } },
        expo: { useEventListener: (_, event, fn) => { events[event] = fn; } },
        'expo-video': { useVideoPlayer: (_, setup) => { setup(player); return player; }, VideoView: 'VideoView' },
    };
    const out = {};
    const source = ts.transpileModule(fs.readFileSync('components/PlaybackVideo.tsx', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
    }).outputText;
    new Function('require', 'exports', source)(name => { assert.ok(name in imports, name); return imports[name]; }, out);
    const ref = {};
    const view = out.default({ uri: 'file:///clip.mp4', style: {}, playing: true, muted: false,
        onStatus: value => statuses.push(value), onLoad: () => loads++, onError: value => errors.push(value), ...props }, ref);
    for (const effect of effects) { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }
    return { player, events, ref, view, statuses, errors, loads: () => loads,
        plays: () => plays, pauses: () => pauses, background: () => appListener('background'),
        foreground: () => appListener('active'), cleanup: () => cleanups.forEach(fn => fn()), hasListener: () => !!appListener };
}

test('buffering does not report playback; timeline and completion use native events', () => {
    const video = mount({ startSeconds: 1, intervalSeconds: 0.05 });
    video.events.statusChange({ status: 'loading' });
    assert.equal(video.statuses.at(-1).isPlaying, false);
    video.player.status = 'readyToPlay'; video.events.statusChange({ status: 'readyToPlay' });
    assert.equal(video.loads(), 1); assert.equal(video.player.currentTime, 1);
    video.player.currentTime = 4; video.events.timeUpdate();
    assert.equal(video.statuses.at(-1).positionMillis, 4000);
    video.player.status = 'loading'; video.events.statusChange({ status: 'loading' });
    assert.equal(video.statuses.at(-1).isBuffering, true);
    assert.equal(video.statuses.at(-1).isPlaying, false);
    video.player.status = 'readyToPlay'; video.events.statusChange({ status: 'readyToPlay' });
    assert.equal(video.player.currentTime, 4); assert.equal(video.loads(), 1);
    video.events.playToEnd(); assert.equal(video.statuses.at(-1).didJustFinish, true);
});

test('pause, restart, errors and app background lifecycle preserve controls', () => {
    const video = mount({ playing: false, muted: true, controls: true });
    assert.equal(video.plays(), 0); assert.equal(video.player.muted, true);
    assert.equal(video.view.props.nativeControls, true);
    video.background(); video.foreground(); assert.equal(video.plays(), 0);
    video.ref.current.seek(3); assert.equal(video.player.currentTime, 3);
    video.ref.current.restart(); assert.equal(video.player.currentTime, 0); assert.equal(video.plays(), 1);
    video.events.statusChange({ status: 'error', error: { message: 'decoder failed' } });
    assert.deepEqual(video.errors, ['decoder failed']);
    video.cleanup(); assert.equal(video.hasListener(), false);
});

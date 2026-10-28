const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

async function scenario(unmountBeforeCaptureCompletes, failure) {
    const refs = [], effects = [], frames = [], ready = [], released = [], captures = [];
    let complete;
    const pending = new Promise(resolve => { complete = resolve; });
    const React = {
        createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
        useRef: initial => { const ref = { current: initial }; refs.push(ref); return ref; },
        useEffect: effect => effects.push(effect()),
    };
    const imports = {
        react: { __esModule: true, default: React, ...React },
        'react-native': { View: 'View', StyleSheet: { create: value => value } },
        'expo-image': { Image: 'Image' },
        'react-native-view-shot': {
            captureRef: (ref, options) => {
                captures.push(options);
                if (failure === 'capture') throw new Error('Exception in HostFunction: <unknown>');
                return pending;
            },
            releaseCapture: uri => {
                released.push(uri);
                if (failure === 'release') throw new Error('Exception in HostFunction: <unknown>');
            },
        },
    };
    const module = {};
    new Function('require', 'exports', ts.transpileModule(fs.readFileSync('components/NativeTabAvatar.ios.tsx', 'utf8'), {
        compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText)(name => imports[name], module);
    const oldRaf = global.requestAnimationFrame, oldCancel = global.cancelAnimationFrame;
    global.requestAnimationFrame = callback => frames.push(callback);
    global.cancelAnimationFrame = () => {};
    try {
        const tree = module.default({ uri: 'https://example.com/avatar.png', onReady: uri => ready.push(uri) });
        const circle = tree.props.children[0];
        circle.props.ref.current = {};
        const image = circle.props.children[0];
        assert.equal(captures.length, 0); // never capture before the image has actually displayed
        image.props.onDisplay();
        image.props.onDisplay(); // repeated display events must not re-encode the avatar
        assert.doesNotThrow(() => { while (frames.length) frames.shift()(); });
        assert.equal(captures.length, 1);
        assert.equal(captures[0].format, 'png');
        assert.equal(captures[0].result, 'tmpfile');
        // renderInContext draws the layer at its point size; an 84pt canvas
        // around a 28pt view leaves 2/3 of each dimension transparent.
        assert.equal(captures[0].useRenderInContext, true);
        assert.equal(captures[0].width, undefined);
        assert.equal(captures[0].height, undefined);
        assert.equal(circle.props.style.width, 28);
        assert.equal(circle.props.style.height, 28);
        if (failure === 'capture') {
            await Promise.resolve();
            await Promise.resolve();
            assert.deepEqual(ready, []);
            assert.doesNotThrow(() => effects.forEach(cleanup => cleanup()));
            return;
        }
        if (unmountBeforeCaptureCompletes) assert.doesNotThrow(() => effects.forEach(cleanup => cleanup()));
        complete('file:///test-capture.png');
        await pending;
        await Promise.resolve();
        if (unmountBeforeCaptureCompletes) assert.deepEqual(ready, []);
        else {
            assert.deepEqual(ready, ['file:///test-capture.png']);
            assert.deepEqual(released, []);
            assert.doesNotThrow(() => effects.forEach(cleanup => cleanup()));
        }
        assert.deepEqual(released, ['file:///test-capture.png']);
    } finally {
        global.requestAnimationFrame = oldRaf;
        global.cancelAnimationFrame = oldCancel;
    }
}

test('avatar is captured once after display and its temporary image is released on unmount', () => scenario(false));
test('an avatar finishing after account change is released without updating the next account', () => scenario(true));
test('synchronous native capture failure keeps the profile symbol without crashing the app', () => scenario(false, 'capture'));
test('synchronous native cleanup failure cannot crash unmount or account switching', () => scenario(false, 'release'));

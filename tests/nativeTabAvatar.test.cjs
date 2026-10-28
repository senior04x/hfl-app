const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

async function scenario(unmountBeforeCaptureCompletes) {
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
            captureRef: (ref, options) => { captures.push(options); return pending; },
            releaseCapture: uri => released.push(uri),
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
        while (frames.length) frames.shift()();
        assert.equal(captures.length, 1);
        assert.equal(captures[0].format, 'png');
        assert.equal(captures[0].result, 'tmpfile');
        assert.equal(captures[0].width, 84);
        if (unmountBeforeCaptureCompletes) effects.forEach(cleanup => cleanup());
        complete('file:///test-capture.png');
        await pending;
        await Promise.resolve();
        if (unmountBeforeCaptureCompletes) assert.deepEqual(ready, []);
        else {
            assert.deepEqual(ready, ['file:///test-capture.png']);
            assert.deepEqual(released, []);
            effects.forEach(cleanup => cleanup());
        }
        assert.deepEqual(released, ['file:///test-capture.png']);
    } finally {
        global.requestAnimationFrame = oldRaf;
        global.cancelAnimationFrame = oldCancel;
    }
}

test('avatar is captured once after display and its temporary image is released on unmount', () => scenario(false));
test('an avatar finishing after account change is released without updating the next account', () => scenario(true));

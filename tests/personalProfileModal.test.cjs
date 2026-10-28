const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

async function renderProfile(authProvider, phone = null, platform = 'ios') {
    const cells = [], effects = [];
    let cursor = 0, initial = true, closed = 0, finishSave;
    const saving = new Promise(resolve => { finishSave = resolve; });
    const React = {
        Fragment: 'Fragment',
        createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
        useState: value => {
            const index = cursor++;
            if (!(index in cells)) cells[index] = value;
            return [cells[index], next => { cells[index] = next; }];
        },
        useEffect: callback => { if (initial) effects.push(callback); },
    };
    const native = Object.fromEntries(['Modal','View','Text','TextInput','TouchableOpacity','Switch','ScrollView',
        'ActivityIndicator','KeyboardAvoidingView'].map(name => [name, name]));
    const imports = {
        react: { __esModule: true, default: React, ...React },
        'react-native': { ...native, Platform: { OS: platform }, Alert: { alert() {} } },
        'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' },
        'expo-image-picker': {},
        'react-i18next': { useTranslation: () => ({ t: key => key }) },
        '@expo/vector-icons': { Ionicons: 'Icon' },
        './SmartImage': { __esModule: true, default: 'Image' },
        '../store/useThemeStore': { useThemeStore: () => ({ isDark: false }) },
        '../constants/homeTheme': { getHomeScreenColors: () => ({}) },
        '../services/personalProfileService': {
            getPersonalProfile: async () => ({ name: 'Test', bio: '', photo: null, phone, showPhone: false }),
            savePersonalProfile: () => saving,
        },
    };
    const output = {};
    new Function('require','exports',ts.transpileModule(fs.readFileSync('components/PersonalProfileModal.tsx','utf8'), {
        compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText)(name => { assert.ok(name in imports, name); return imports[name]; }, output);
    const render = () => {
        cursor = 0;
        const tree = output.default({ visible: true, authProvider, email: 'own@example.test', onClose: () => { closed++; } });
        initial = false;
        return tree;
    };
    render(); effects.forEach(run => run()); await Promise.resolve();
    return { render, tree: render(), finishSave, get closed() { return closed; } };
}

function nodes(tree) {
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    if (!tree || typeof tree !== 'object') return [];
    return [tree, ...nodes(tree.props.children)];
}
const text = tree => nodes(tree).filter(n => n.type === 'Text').flatMap(n => n.props.children).join(' ');

test('Apple and Google show own email and no telephone visibility setting', async () => {
    for (const provider of ['apple','google']) {
        const { tree } = await renderProfile(provider, '+998900000000');
        assert.match(text(tree), /own@example.test/);
        assert.match(text(tree), /profile.login_method/);
        assert.doesNotMatch(text(tree), /profile.phone_number|profile.show_phone/);
        assert.equal(nodes(tree).filter(n => n.type === 'Switch').length, 0);
    }
});

test('only an existing Telegram phone has a phone visibility switch', async () => {
    const withPhone = await renderProfile('telegram', '+998900000000');
    assert.equal(nodes(withPhone.tree).filter(n => n.type === 'Switch').length, 1);
    assert.doesNotMatch(text(withPhone.tree), /own@example.test/);
    const withoutPhone = await renderProfile('telegram');
    assert.equal(nodes(withoutPhone.tree).filter(n => n.type === 'Switch').length, 0);
});

test('the iOS modal owns its safe area and can swipe closed except while saving', async () => {
    const h = await renderProfile('google');
    assert.equal(h.tree.props.presentationStyle, 'pageSheet');
    assert.equal(h.tree.props.allowSwipeDismissal, true);
    assert.equal(h.tree.props.children[0].type, 'SafeAreaProvider');
    const save = nodes(h.tree).find(n => n.type === 'TouchableOpacity' && text(n).includes('common.save'));
    const pending = save.props.onPress();
    const busy = h.render();
    assert.equal(busy.props.allowSwipeDismissal, false);
    busy.props.onRequestClose();
    assert.equal(h.closed, 0);
    h.finishSave(); await pending;
    assert.equal(h.closed, 1);
    const android = await renderProfile('google', null, 'android');
    assert.equal(android.tree.props.presentationStyle, 'fullScreen');
    assert.equal(android.tree.props.allowSwipeDismissal, false);
});

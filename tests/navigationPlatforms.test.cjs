const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, imports) {
    const api = {};
    new Function('require', 'exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText)(name => {
        if (!(name in imports)) throw Error(`Unexpected import: ${name}`);
        return imports[name];
    }, api);
    return api;
}

test('older iOS uses the legacy panel without initializing native tabs; iOS26+ uses native tabs', () => {
    for (const [os, version, expectedNative, isPad = false] of [
        ['ios', '16.4', false], ['ios', '18.7', false], ['ios', '26.0', true],
        ['ios', 26, true], ['ios', '27.1', true], ['ios', 'unknown', false], ['android', 36, false],
        ['ios', 26, false, true], ['ios', '27.1', false, true], ['ios', '18.7', false, true],
    ]) {
        const legacy = () => {}, native = () => {};
        let nativeLoads = 0;
        const imports = {
            'react-native': { Platform: { OS: os, Version: version, isPad } },
            './SwipeableAppNavigator': { __esModule: true, default: legacy },
        };
        Object.defineProperty(imports, './NativeAppNavigator.ios', {
            get: () => { nativeLoads++; return { default: native }; },
        });
        const api = load('navigation/AppNavigator.ios.tsx', imports);
        assert.equal(api.default, expectedNative ? native : legacy);
        assert.equal(nativeLoads, expectedNative ? 1 : 0);
    }
});

test('Android and web entry preserve the legacy panel', () => {
    const legacy = () => {};
    const api = load('navigation/AppNavigator.tsx', {
        './SwipeableAppNavigator': { __esModule: true, default: legacy },
    });
    assert.equal(api.default, legacy);
});

function legacyPanel(platform) {
    class Value { interpolate(value) { return value; } setValue() {} }
    const React = {
        createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
        useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
        useRef: initial => ({ current: initial }), useEffect() {}, useCallback: callback => callback,
        useImperativeHandle() {},
    };
    const imports = {
        react: { __esModule: true, default: React, ...React },
        'react-native': {
            Platform: { OS: platform }, Dimensions: { get: () => ({ width: 390 }) },
            StyleSheet: { create: value => value },
            Animated: { View: 'AnimatedView', ScrollView: 'Pager', Value, multiply: (a, b) => ({ multiply: [a, b] }), add: (a, b) => ({ add: [a, b] }) },
            PanResponder: { create: () => ({ panHandlers: {} }) },
            View: 'View', TouchableOpacity: 'Button', Text: 'Text', Modal: 'Modal', ScrollView: 'ScrollView',
        },
        '@expo/vector-icons': { Ionicons: 'Icon' },
        '../components/SmartBlurView': { SmartBlurView: 'Blur' }, 'expo-haptics': {},
        '../constants/Colors': { __esModule: true, default: { primary: '#E85002' } },
        '../store/useAuthStore': { useAuthStore: () => ({ user: { photo: 'https://example.com/photo.png' }, userAccounts: [], isGuest: false }) },
        '../store/useOrganizationStore': {}, '../services/apiService': {},
        '../components/SmartImage': { __esModule: true, default: 'Avatar' },
        'react-i18next': { useTranslation: () => ({ t: key => key }) },
        'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 34 }) },
        '../store/useThemeStore': { useThemeStore: () => ({ colors: {}, isDark: false }) },
        '../context/TabSwipeContext': { TabSwipeProvider: 'SwipeProvider' },
        '../context/NavBarScrollContext': { NavBarScrollProvider: 'ScrollProvider', useNavBarScroll: () => ({ shrinkProgress: new Value(), resetNavBarShrink() {} }) },
        '../services/personalAuthService': {},
        './tabRoutes': load('navigation/tabRoutes.ts', {}),
    };
    for (const name of ['HomeScreen', 'TournamentsScreen', 'CalendarScreen', 'NewsScreen', 'AccountScreen']) {
        imports[`../screens/${name}`] = { __esModule: true, default: name };
    }
    return { api: load('navigation/SwipeableAppNavigator.tsx', imports), Value };
}

test('legacy panel keeps icons accessible, avatar and scroll shrink above the system gesture area on both platforms', () => {
    for (const platform of ['ios', 'android']) {
        const { api, Value } = legacyPanel(platform);
        const bar = api.CustomFloatingTabBar({ activeIndex: 4, scrollX: new Value(), onTabPress() {}, navigation: {} });
        assert.equal(bar.props.style[1].bottom, 36); // stays above the 34pt system area
        assert.ok(bar.props.style[1].transform[0].scale.multiply); // scroll motion is active on Android too
        const capsule = bar.props.children[0];
        assert.equal(capsule.props.style[0].borderRadius, 30);
        assert.equal(capsule.props.style[0].width < 390, true);
        const buttons = capsule.props.children[2].props.children[0];
        assert.equal(buttons.length, 5);
        assert.equal(buttons[4].props.accessibilityRole, 'tab');
        assert.equal(buttons[4].props.accessibilityLabel, 'nav.profile');
        assert.equal(buttons[4].props.children[0].props.children[0].type, 'Avatar');
        if (platform === 'android') assert.equal(capsule.props.children[0], false); // no GPU blur for this surface

        const providers = api.default({ navigation: {}, route: {} });
        const main = providers.props.children[0].props.children[0];
        const pager = main.type(main.props).props.children[0];
        assert.equal(pager.props.scrollEnabled, false); // previous tap-only decision is preserved
    }
});

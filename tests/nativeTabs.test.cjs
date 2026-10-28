const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, imports = {}) {
    const api = {};
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    new Function('require', 'exports', code)(name => {
        if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
        return imports[name];
    }, api);
    return api;
}
const routes = load('navigation/tabRoutes.ts');

test('existing destinations resolve without admitting unknown routes', () => {
    assert.deepEqual(routes.APP_TABS.map(tab => tab.name), ['Asosiy', 'Turnirlar', 'Taqvim', 'Yangiliklar', 'Profil']);
    assert.equal(routes.resolveAppTab('pRoFiL'), 'Profil');
    for (const value of [null, {}, 1, 'Admin', '__proto__']) assert.equal(routes.resolveAppTab(value), undefined);
});

test('tab swipes respect edges, vertical scrolling and short/reversed gestures', () => {
    const next = routes.adjacentTabForSwipe;
    assert.equal(next('Asosiy', -100, 10, -0.2, 390), 'Turnirlar');
    assert.equal(next('Turnirlar', 100, 10, 0.2, 390), 'Asosiy');
    assert.equal(next('Turnirlar', -40, 0, -0.9, 390), 'Taqvim');
    for (const args of [
        ['Asosiy', 100, 0, 1, 390], ['Profil', -100, 0, -1, 390],
        ['Turnirlar', 30, 100, 1, 390], ['Turnirlar', 20, 0, 1, 390],
        ['Turnirlar', 40, 0, -1, 390], ['Turnirlar', 40, 0, 0.1, 390],
        ['Turnirlar', NaN, 0, 1, 390], ['Turnirlar', 100, 0, 1, 0],
    ]) assert.equal(next(...args), undefined);
});

function harness() {
    const state = { focused: true, swipeDisabled: false, refs: [], cursor: 0, navigations: [] };
    const React = {
        createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
        useRef: initial => {
            const index = state.cursor++;
            return state.refs[index] ??= { current: initial };
        },
        useMemo: create => create(),
        useEffect: run => run(),
    };
    const imports = {
        react: { __esModule: true, default: React, ...React },
        'react-native': {
            View: 'View', ActivityIndicator: 'Spinner', Animated: { Value: class {} },
            PanResponder: { create: handlers => ({ panHandlers: handlers }) },
            StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width: 390 }),
        },
        '@react-navigation/native': { useIsFocused: () => state.focused },
        '@react-navigation/bottom-tabs/unstable': { createNativeBottomTabNavigator: () => ({ Navigator: 'NativeNavigator', Screen: 'NativeScreen' }) },
        'react-i18next': { useTranslation: () => ({ t: key => `translated:${key}` }) },
        '../constants/Colors': { __esModule: true, default: { primary: '#E85002' } },
        '../store/useThemeStore': { useThemeStore: select => select({ colors: { background: '#FFFFFF' } }) },
        '../context/TabSwipeContext': { TabSwipeProvider: 'SwipeProvider', useTabSwipe: () => ({ isSwipeDisabled: state.swipeDisabled }) },
        '../context/NavBarScrollContext': { NavBarScrollProvider: 'ScrollProvider' },
        './SwipeableAppNavigator': { CustomFloatingTabBar: 'Switcher' },
        './tabRoutes': routes,
    };
    for (const screen of ['HomeScreen', 'TournamentsScreen', 'CalendarScreen', 'NewsScreen', 'AccountScreen']) {
        imports[`../screens/${screen}`] = { __esModule: true, default: screen };
    }
    const module = load('navigation/AppNavigator.ios.tsx', imports);
    const navigation = { navigate: (...args) => state.navigations.push(args) };
    const outer = module.default({ navigation, route: { params: { tab: 'pRoFiL' } } });
    const native = outer.props.children[0].props.children[0];
    const tree = native.type(native.props);
    const [navigator, switcher] = tree.props.children;
    return { state, navigation, tree, navigator, switcher };
}

test('native tabs retain translated destinations, legacy links and account switching', () => {
    const { state, navigator, switcher } = harness();
    assert.equal(navigator.type, 'NativeNavigator');
    assert.equal(navigator.props.initialRouteName, 'Profil');
    assert.deepEqual(state.navigations, [['MainTabs', { screen: 'Profil', tab: undefined }]]);
    assert.equal(navigator.props.screenOptions.headerShown, false);
    assert.equal(navigator.props.screenOptions.lazy, false); // mounted shells, deferred data screens
    const tabs = navigator.props.children[0];
    assert.equal(tabs.length, 5);
    assert.equal(tabs[1].props.options.tabBarLabel, 'translated:nav.tournaments');
    assert.equal(tabs[1].props.options.tabBarIcon({ focused: true }).type, 'sfSymbol');
    let opens = 0;
    switcher.props.switcherRef.current = { open: () => opens++ };
    const profile = tabs[4].props.listeners;
    profile({ navigation: { isFocused: () => false } }).tabPress();
    assert.equal(opens, 0);
    profile({ navigation: { isFocused: () => true } }).tabPress();
    assert.equal(opens, 1);
    assert.equal(switcher.props.nativeOnly, true);
});

test('unvisited native scenes do not mount data screens; focus, slider lock and theme are respected', () => {
    const { state, navigator, navigation } = harness();
    const Scene = navigator.props.children[0][0].props.component;
    const render = () => {
        state.cursor = 0;
        return Scene({ navigation, route: { name: 'Asosiy' } });
    };
    state.refs = [];
    state.focused = false;
    let scene = render();
    assert.equal(scene.props.children[0].type, 'View');
    assert.equal(scene.props.style[1].backgroundColor, '#FFFFFF');
    state.focused = true;
    scene = render();
    assert.equal(scene.props.children[0].type, 'HomeScreen');
    const gesture = { dx: -100, dy: 0, vx: -0.4, numberActiveTouches: 1 };
    assert.equal(scene.props.onMoveShouldSetPanResponder(null, gesture), true);
    scene.props.onPanResponderRelease(null, gesture);
    assert.deepEqual(state.navigations.at(-1), ['Turnirlar']);
    state.swipeDisabled = true;
    scene = render();
    assert.equal(scene.props.onMoveShouldSetPanResponder(null, gesture), false);
    const count = state.navigations.length;
    scene.props.onPanResponderRelease(null, gesture);
    assert.equal(state.navigations.length, count);
    state.focused = false;
    assert.equal(render().props.children[0].type, 'HomeScreen'); // preserve existing screen state
});

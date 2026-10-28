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

const photo = load('navigation/profileTabPhoto.ts');
test('profile photos require a valid HTTPS URL and retain existing source fields', () => {
    assert.equal(photo.profileTabPhoto({ photo: ' https://example.com/avatar.png ' }), 'https://example.com/avatar.png');
    assert.equal(photo.profileTabPhoto({ avatar: 'https://example.com/avatar.png' }), 'https://example.com/avatar.png');
    for (const value of [null, {}, { photo: 1 }, { photo: 'file:///private/data' }, { photo: 'http://example.com/x' },
        { photo: 'https://user:password@example.com/x' }, { photo: 'javascript:alert(1)' }]) {
        assert.equal(photo.profileTabPhoto(value), undefined);
    }
});

function harness(user = null, pixelRatio = 3) {
    const state = { focused: true, user, guest: false, refs: [], cursor: 0, navigations: [] };
    const React = {
        createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
        useRef: initial => {
            const index = state.cursor++;
            return state.refs[index] ??= { current: initial };
        },
        useState: initial => {
            const index = state.cursor++;
            const cell = state.refs[index] ??= { current: initial };
            return [cell.current, value => { cell.current = value; }];
        },
        useCallback: callback => callback,
        useEffect: run => run(),
    };
    const imports = {
        react: { __esModule: true, default: React, ...React },
        'react-native': {
            View: 'View', ActivityIndicator: 'Spinner', Animated: { Value: class {} },
            StyleSheet: { create: value => value }, PixelRatio: { get: () => pixelRatio },
        },
        '@react-navigation/native': { useIsFocused: () => state.focused },
        '@react-navigation/bottom-tabs/unstable': { createNativeBottomTabNavigator: () => ({ Navigator: 'NativeNavigator', Screen: 'NativeScreen' }) },
        'react-i18next': { useTranslation: () => ({ t: key => `translated:${key}` }) },
        '../constants/Colors': { __esModule: true, default: { primary: '#E85002' } },
        '../store/useThemeStore': { useThemeStore: select => select({ colors: { background: '#FFFFFF' } }) },
        '../context/TabSwipeContext': { TabSwipeProvider: 'SwipeProvider' },
        '../context/NavBarScrollContext': { NavBarScrollProvider: 'ScrollProvider' },
        './SwipeableAppNavigator': { CustomFloatingTabBar: 'Switcher' },
        './tabRoutes': routes,
        './profileTabPhoto': photo,
        '../components/NativeTabAvatar.ios': { __esModule: true, default: 'Avatar' },
        '../store/useAuthStore': { useAuthStore: select => select({ user: state.user, isGuest: state.guest }) },
    };
    for (const screen of ['HomeScreen', 'TournamentsScreen', 'CalendarScreen', 'NewsScreen', 'AccountScreen']) {
        imports[`../screens/${screen}`] = { __esModule: true, default: screen };
    }
    const module = load('navigation/NativeAppNavigator.ios.tsx', imports);
    const navigation = { navigate: (...args) => state.navigations.push(args) };
    const outer = module.default({ navigation, route: { params: { tab: 'pRoFiL' } } });
    const native = outer.props.children[0].props.children[0];
    const render = () => {
        state.cursor = 0;
        const tree = native.type(native.props);
        const [navigator, avatar, switcher] = tree.props.children;
        return { tree, navigator, avatar, switcher };
    };
    return { state, navigation, render, ...render() };
}

test('native tabs retain translated destinations, legacy links and account switching', () => {
    const { state, navigator, switcher } = harness();
    assert.equal(navigator.type, 'NativeNavigator');
    assert.equal(navigator.props.initialRouteName, 'Profil');
    assert.deepEqual(state.navigations, [['MainTabs', { screen: 'Profil', tab: undefined }]]);
    assert.equal(navigator.props.screenOptions.headerShown, false);
    assert.equal(navigator.props.screenOptions.lazy, false); // mounted shells, deferred data screens
    assert.equal(navigator.props.screenOptions.tabBarMinimizeBehavior, 'onScrollDown');
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

test('unvisited scenes defer data screens and do not capture gestures for page switching', () => {
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
    assert.equal(scene.props.onMoveShouldSetPanResponder, undefined);
    assert.equal(scene.props.onPanResponderRelease, undefined);
    state.focused = false;
    assert.equal(render().props.children[0].type, 'HomeScreen'); // preserve existing screen state
});

test('a prepared photo preserves its colors and cannot carry over to another account or guest', () => {
    const h = harness({ id: 'first', photo: 'https://example.com/a.png' });
    const icon = result => result.navigator.props.children[0][4].props.options.tabBarIcon({ focused: true });
    assert.equal(icon(h).type, 'sfSymbol');
    h.avatar.props.onReady('file:///temporary/rounded.png');
    let result = h.render();
    assert.deepEqual(icon(result), { type: 'image', source: { uri: 'file:///temporary/rounded.png', width: 28, height: 28, scale: 3 }, tinted: false });
    h.state.user = { id: 'second', photo: 'https://example.com/a.png' };
    result = h.render();
    assert.equal(icon(result).type, 'sfSymbol');
    h.state.guest = true;
    result = h.render();
    assert.equal(result.avatar, undefined);
    assert.equal(icon(result).type, 'sfSymbol');
});

test('the native avatar keeps its 28 point size on both 2x and 3x screens', () => {
    for (const density of [2, 3]) {
        const h = harness({ id: 'first', photo: 'https://example.com/a.png' }, density);
        h.avatar.props.onReady('file:///temporary/avatar.png');
        const icon = h.render().navigator.props.children[0][4].props.options.tabBarIcon({ focused: true });
        assert.equal(icon.source.width, 28);
        assert.equal(icon.source.height, 28);
        assert.equal(icon.source.scale, density);
    }
});

test('scroll marker never loads or mounts inside Expo Go or without its native component', () => {
    const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
    const child = { type: 'VerticalList' };
    for (const environment of [
        { version: '26.0', expoGo: true, registered: true, expected: false },
        { version: '26.0', expoGo: false, registered: false, expected: false },
        { version: '26.0', expoGo: false, nativeThrows: true, expected: false },
        { version: '18.5', expoGo: false, registered: true, expected: false },
        { version: '26.0', expoGo: false, registered: true, expected: true },
        { version: '26.0', isPad: true, expoGo: false, registered: true, expected: false },
    ]) {
        let nativeQueries = 0, experimentalImports = 0;
        const imports = {
            react: { __esModule: true, default: React },
            expo: { isRunningInExpoGo: () => environment.expoGo },
            'react-native': {
                Platform: { Version: environment.version, isPad: environment.isPad }, StyleSheet: { create: value => value },
                UIManager: { hasViewManagerConfig: name => {
                    nativeQueries++;
                    assert.equal(name, 'RNSScrollViewMarker');
                    if (environment.nativeThrows) throw Error('Unavailable native component registry');
                    return environment.registered;
                } },
            },
        };
        Object.defineProperty(imports, 'react-native-screens/experimental', {
            get: () => { experimentalImports++; return { ScrollViewMarker: 'NativeScrollMarker' }; },
        });
        const ios = load('components/NativeTabScroll.ios.tsx', imports);
        const output = ios.default({ children: child });
        assert.equal(environment.expected ? output.type : output, environment.expected ? 'NativeScrollMarker' : child);
        assert.equal(experimentalImports, environment.expected ? 1 : 0);
        if (environment.isPad || environment.expoGo || environment.version === '18.5') assert.equal(nativeQueries, 0);
    }
    assert.equal(load('components/NativeTabScroll.tsx').default({ children: child }), child);
});

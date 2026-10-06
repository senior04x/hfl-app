const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../screens/AccountScreen.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
}).outputText;
const flush = () => new Promise(resolve => setImmediate(resolve));

function nodes(tree) {
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    if (!tree || typeof tree !== 'object') return [];
    return [tree, ...nodes(tree.props?.children)];
}

function mount({ roster = async () => ({ transfer_window_open: true }), session = { token: 'local-test-session' } } = {}) {
    let user = { id: 'captain-a', role: 'captain', teamId: 'team-a', name: 'Captain' };
    let hook = 0, tree, rosterCalls = 0;
    const slots = [], effects = [];
    const react = {
        Fragment: 'Fragment',
        createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    };
    const hooks = {
        __esModule: true, default: react,
        useState: initial => {
            const index = hook++;
            if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial };
            return [slots[index].value, value => { slots[index].value = typeof value === 'function' ? value(slots[index].value) : value; }];
        },
        useRef: initial => {
            const index = hook++;
            if (!slots[index]) slots[index] = { value: { current: initial } };
            return slots[index].value;
        },
        useEffect: (effect, dependencies) => {
            const index = hook++, previous = slots[index]?.dependencies;
            if (!previous || dependencies.some((value, i) => !Object.is(value, previous[i]))) effects.push(effect);
            slots[index] = { dependencies };
        },
    };
    const imports = {
        react: hooks,
        'react-native': { ...Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'ScrollView', 'Switch', 'ActivityIndicator', 'Modal', 'TextInput', 'StatusBar'].map(name => [name, name])), StyleSheet: { create: value => value }, Platform: { OS: 'android' }, Alert: { alert() {} }, Linking: { openURL: async () => {} } },
        'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
        '@expo/vector-icons': { Ionicons: 'Ionicons' },
        'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { language: 'uz' } }) },
        '../constants/Colors': { __esModule: true, default: { danger: '#B91C1C' } },
        '../store/useAuthStore': { useAuthStore: () => ({ isGuest: false, user, logout() {}, unreadCount: 0, isChatMuted: false }) },
        '../store/useLanguageStore': { SUPPORTED_LANGUAGES: [{ code: 'uz', flag: 'UZ' }] },
        '../store/useJuniorStore': { useJuniorStore: () => ({ isJuniorMode: false, setJuniorMode() {}, verifyPin() {} }) },
        '../store/useOrganizationStore': { useOrganizationStore: () => ({ selectedOrganizationId: null, setSelectedOrganizationId() {}, organizations: [] }) },
        '../store/useThemeStore': { useThemeStore: () => ({ theme: 'light', toggleTheme() {}, isDark: false, colors: {} }) },
        '../constants/homeTheme': { getHomeScreenColors: () => ({}) },
        '../utils/localizationUtils': { getLocalizedPosition: () => 'Player' },
        '../context/NavBarScrollContext': { useNavBarScroll: () => ({ handleScroll() {} }) },
        '../services/apiService': { apiService: { getTeamStoryReplays: async () => [], getPlayerById: async () => null, getApplicationsByPhone: async () => [] }, supabase: {} },
        '../services/transferLoginStorage': { restoreTransferLoginSession: async () => session },
        '../services/transferAppService': { transferAppService: { roster: async (...args) => { rosterCalls++; return roster(...args); } } },
    };
    for (const name of ['SmartImage', 'LanguageSelectModal', 'OrganizationSelectModal', 'AppNavbar', 'EditTeamModal', 'PersonalProfileModal', 'RegistrationClosedModal']) {
        imports[`../components/${name}`] = { __esModule: true, default: name };
    }
    const exported = {};
    new Function('require', 'exports', source)(name => {
        assert.ok(name in imports, `Unexpected import: ${name}`);
        return imports[name];
    }, exported);
    function render() {
        hook = 0;
        tree = exported.default({ navigation: { navigate() {} } });
        while (effects.length) effects.shift()();
        return tree;
    }
    render();
    return {
        render,
        press: () => nodes(tree).find(node => node.props?.title === 'profile.edit_team_info').props.onPress(),
        editor: () => nodes(render()).find(node => node.type === 'EditTeamModal'),
        notices: () => nodes(render()).filter(node => node.type === 'Modal' && node.props.visible),
        switchUser: next => { user = { ...user, ...next }; render(); },
        calls: () => rosterCalls,
    };
}

test('team edit opens only after a successful open transfer response', async () => {
    const screen = mount();
    assert.equal(screen.editor().props.visible, false);
    await screen.press();
    assert.equal(screen.editor().props.visible, true);
    assert.equal(screen.notices().length, 0);
});

test('closed transfer shows the Account notice without opening the team editor', async () => {
    const screen = mount({ roster: async () => ({ transfer_window_open: false }) });
    await screen.press();
    assert.equal(screen.editor().props.visible, false);
    assert.equal(screen.notices().length, 1);
    assert.ok(nodes(screen.notices()[0]).some(node => node.props?.children.includes('teams.transfer_edit_closed')));
});

test('missing session and failed transfer request fail closed', async () => {
    for (const options of [{ session: null }, { roster: async () => { throw new Error('Offline'); } }]) {
        const screen = mount(options);
        await screen.press();
        assert.equal(screen.editor().props.visible, false);
        assert.equal(screen.notices().length, 1);
        assert.ok(nodes(screen.notices()[0]).some(node => node.props?.children.includes('teams.load_error')));
    }
});

test('duplicate presses issue one transfer check', async () => {
    let resolve;
    const screen = mount({ roster: () => new Promise(done => { resolve = done; }) });
    const first = screen.press(), second = screen.press();
    await flush();
    assert.equal(screen.calls(), 1);
    assert.equal(screen.editor().props.visible, false);
    resolve({ transfer_window_open: true });
    await Promise.all([first, second]);
    assert.equal(screen.editor().props.visible, true);
});

test('pending edit check cannot open a different team or a player account for the same team', async () => {
    for (const next of [{ id: 'captain-b', teamId: 'team-b' }, { id: 'player-a', role: 'player' }]) {
        let resolve;
        const screen = mount({ roster: () => new Promise(done => { resolve = done; }) });
        const pending = screen.press();
        await flush();
        screen.switchUser(next);
        resolve({ transfer_window_open: true });
        await pending;
        assert.equal(screen.editor().props.visible, false);
        assert.equal(screen.notices().length, 0);
    }
});

test('a transfer-closed callback from the previous team does not warn the current team', () => {
    const screen = mount();
    const oldCallback = screen.editor().props.onTransferClosed;
    screen.switchUser({ id: 'captain-b', teamId: 'team-b' });
    oldCallback();
    assert.equal(screen.notices().length, 0);
});

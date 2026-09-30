const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file) {
    const exports = {};
    new Function('exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText)(exports);
    return exports;
}
const { formatMatchTeamName } = load('utils/stringUtils.ts');
const { resolveMatchAssist } = load('services/matchEventAssist.ts');
test('short, long and multiword team names all get compact match labels', () => {
    for (const [name, result] of [['Paxtakor', 'PAX'], ['Real Madrid', 'RM'], ['FC Navbahor', 'NAV'], ['Bunyodkor U21', 'BU21'], ['  Manchester   United ', 'MU'], ['A', 'A'], ['', '']]) {
        assert.equal(formatMatchTeamName(name), result);
    }
});
test('assists use an explicit link or an unambiguous same-team same-minute event', () => {
    const goal = { id: 1, event_type: 'goal', team_id: 2, minute: 15 };
    const assist = { id: 2, event_type: 'assist', team_id: '2', minute: 15 };
    assert.equal(resolveMatchAssist(goal, [goal, assist]), assist);
    assert.equal(resolveMatchAssist(goal, [goal, { ...assist, minute: 14 }]), null);
    assert.equal(resolveMatchAssist(goal, [goal, assist, { ...goal, id: 3 }]), null);
    assert.equal(resolveMatchAssist(goal, [goal, assist, { ...assist, id: 4 }]), null);
    const linked = { ...assist, minute: 16, goal_event_id: 1 };
    assert.equal(resolveMatchAssist(goal, [goal, linked]), linked);
    assert.equal(resolveMatchAssist(assist, [goal, assist]), null);
});

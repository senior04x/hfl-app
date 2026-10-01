const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const exported = {};
new Function('exports', ts.transpileModule(fs.readFileSync('utils/profileUpdateApplication.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText)(exported);
const { isProfileUpdateForPlayer: matches } = exported;
const comment = data => '[PROFILE_UPDATE]' + JSON.stringify(data);

test('profiles sharing a phone do not share pending requests or cooldown', () => {
    const request = comment({ playerId: 'player-a', oldData: { phone: 'same-phone' } });
    assert.equal(matches(request, 'player-a'), true);
    assert.equal(matches(request, 'player-b'), false);
});
test('only the exact top-level player ID establishes ownership', () => {
    assert.equal(matches(comment({ playerId: 'player-ab', newData: { note: 'player-a' } }), 'player-a'), false);
    assert.equal(matches(comment({ oldData: { playerId: 'player-a' } }), 'player-a'), false);
    assert.equal(matches(comment({ playerId: 'player-a' }), ''), false);
});
test('nested data, escaped quotes and appended metadata remain supported', () => {
    const request = comment({ playerId: 'player-a', newData: { name: 'A "}\\ B' } }) + '[LEAGUE:example][INSTAGRAM:name]';
    assert.equal(matches(request, 'player-a'), true);
    assert.equal(matches('[PROFILE_UPDATE] { "playerId" : "player-a" }', 'player-a'), true);
});
test('malformed and unrelated comments do not restrict a player', () => {
    for (const value of [null, 'player-a', '[PROFILE_UPDATE]{"playerId":"player-a"', '[PROFILE_UPDATE]{broken}']) {
        assert.equal(matches(value, 'player-a'), false);
    }
});

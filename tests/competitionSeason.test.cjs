const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const exportsObject = {};
new Function('exports', ts.transpileModule(fs.readFileSync('utils/competitionSeason.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(exportsObject);
const { competitionSeason } = exportsObject;
test('season follows the end date and defaults to the following year', () => {
    assert.equal(competitionSeason('2026-09-01'), '2026/2027');
    assert.equal(competitionSeason('2027-09-01', null), '2027/2028');
    assert.equal(competitionSeason('2026-09-01', '2028-05-01'), '2026/2028');
    assert.equal(competitionSeason('2026-01-01', '2026-12-01'), '2026/2026');
    assert.equal(competitionSeason(null, '2027-01-01'), '');
    assert.equal(competitionSeason('bad'), '');
    assert.equal(competitionSeason('2026-09-01', '2025-01-01'), '2026/2027');
});

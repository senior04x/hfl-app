const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const exportsObject = {};
new Function('exports', ts.transpileModule(fs.readFileSync('utils/transferAppLink.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText)(exportsObject);
const { parseTransferAppLink } = exportsObject;
const id = '12345678-1234-1234-1234-123456789abc';
test('existing native scheme accepts a transfer ID and normalizes it', () => {
    assert.equal(parseTransferAppLink(`hflsoccerapp://transfers/${id}`), id);
    assert.equal(parseTransferAppLink(`hflsoccerapp://transfers/${id.toUpperCase()}/`), id);
});
test('links cannot provide decisions, credentials, foreign hosts or invalid IDs', () => {
    for (const value of [null, {}, '', `https://attacker.test/transfers/${id}`, `hflsoccerapp://transfers/${id}?approved=true`,
        `hflsoccerapp://transfers/${id}#token`, 'hflsoccerapp://transfers/../../admin', 'hflsoccerapp://transfers/not-an-id']) {
        assert.equal(parseTransferAppLink(value), null);
    }
});

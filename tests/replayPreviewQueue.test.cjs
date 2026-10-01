const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function queue() {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync('services/replayPreviewQueue.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    new Function('exports',code)(exports);
    return exports;
}
test('only one preview decoder is granted, then next card gets it', () => {
    const {acquireReplayPreview} = queue();
    const granted=[];
    const first=acquireReplayPreview(()=>granted.push(1));
    const second=acquireReplayPreview(()=>granted.push(2));
    assert.deepEqual(granted,[1]);
    first(); assert.deepEqual(granted,[1,2]); second();
});
test('leaving a page cancels queued cards and releasing twice is harmless', () => {
    const {acquireReplayPreview} = queue();
    const granted=[];
    const first=acquireReplayPreview(()=>granted.push(1));
    const cancelled=acquireReplayPreview(()=>granted.push(2));
    const third=acquireReplayPreview(()=>granted.push(3));
    cancelled(); first(); first();
    assert.deepEqual(granted,[1,3]); third();
});

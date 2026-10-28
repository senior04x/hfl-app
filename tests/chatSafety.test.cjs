const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const ts=require('typescript');
function safety(){const values=new Map();const out={};new Function('require','exports',ts.transpileModule(fs.readFileSync('services/chatSafety.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(name=>{assert.equal(name,'@react-native-async-storage/async-storage');return {__esModule:true,default:{getItem:async key=>values.get(key),setItem:async(key,value)=>values.set(key,value)}};},out);return {...out,values};}
test('normal football discussion stays intact in Uzbek, Russian and English',()=>{
 const h=safety();for(const text of ['Assalomu alaykum, bugun soat 19:00 da o‘yin bor.','Игра начнется в 19:00. Удачи команде!','Kick off is at 7 pm. Good luck!','Scunthorpe vs Arsenal','AMATORA. https://amatora.uz'])assert.equal(h.objectionableChatText(text),false,text);
});
test('known abusive words are filtered across case, width and invisible-character variants',()=>{
 const h=safety();for(const text of ['FUCK','f\u200buck','ｆｕｃｋ','блять','qotoq','jalab', 'x'.repeat(4001),''])assert.equal(h.objectionableChatText(text),true,text.slice(0,30));
});
test('block state is bounded, persistent and isolated to the signed-in owner',async()=>{
 const h=safety();await h.writeChatBlocks('owner-a',['sender-a','sender-a','sender-b']);await h.writeChatBlocks('owner-b',['sender-c']);
 assert.deepEqual(await h.readChatBlocks('owner-a'),['sender-a','sender-b']);assert.deepEqual(await h.readChatBlocks('owner-b'),['sender-c']);
 await h.writeChatBlocks('owner-a',['sender-b']);assert.deepEqual(await h.readChatBlocks('owner-a'),['sender-b']);
 await assert.rejects(h.writeChatBlocks('owner-a',Array(501).fill('sender')));await assert.rejects(h.readChatBlocks('../other'));
 assert.equal(h.chatSafetyOwner({appUserId:'own-uuid',id:'legacy'}),'own-uuid');assert.equal(h.chatSafetyOwner(null),null);
});
test('a report contains only scoped record IDs and opens a composer, with no automatic message or private chat body',()=>{
 const h=safety();const u=new URL(h.chatReportUrl('team-1','message-2'));assert.equal(u.protocol,'mailto:');assert.equal(u.pathname,'gcccc406@gmail.com');assert.match(u.searchParams.get('body'),/Team: team-1\nMessage: message-2/);
 assert.throws(()=>h.chatReportUrl('team-1','temp-2'));assert.throws(()=>h.chatReportUrl('team-1','message\r\nBcc:other@example.test'));
});
test('send and edit reject disallowed text before any database, API or notification operation',async()=>{
 const source=fs.readFileSync('services/apiService.ts','utf8');const ast=ts.createSourceFile('api.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const h=safety();const found={};function visit(n){if(ts.isPropertyAssignment(n)&&['sendChatMessage','editChatMessage'].includes(n.name.getText(ast))){found[n.name.getText(ast)]=n.initializer.getText(ast);}ts.forEachChild(n,visit);}visit(ast);
 for(const [name,code] of Object.entries(found)){
  const exported={};const output=ts.transpileModule('exports.op='+code,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
  const forbid=()=>assert.fail('disallowed content reached external operation');new Function('exports','objectionableChatText','supabase','api',output)(exported,h.objectionableChatText,{from:forbid},{post:forbid});
  await assert.rejects(name==='sendChatMessage'?exported.op({text:'FUCK'}):exported.op('message-id','FUCK'),/CHAT_CONTENT_REJECTED/);
 }
 assert.deepEqual(Object.keys(found).sort(),['editChatMessage','sendChatMessage']);
});
test('blocked and filtered chat rows never render the original message, and can be unblocked or reported',()=>{
 const source=fs.readFileSync('screens/TeamChatScreen.tsx','utf8');const ast=ts.createSourceFile('chat.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let callback;
 function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='renderMessage')callback=n.initializer.arguments[0].getText(ast);ts.forEachChild(n,visit);}visit(ast);assert.ok(callback);
 const h=safety(),calls=[];const api={};const React={createElement:(type,props,...children)=>({type,props:{...props,children}})};
 const code=ts.transpileModule('exports.render='+callback,{compilerOptions:{target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS}}).outputText;
 const render=(ready)=>{const result={};new Function('exports','React','safetyReady','blockedIds','t','changeBlock','reportMessage','TouchableOpacity','Text','homeColors','objectionableChatText',code)(result,React,ready,new Set(['blocked']),key=>key,(...args)=>calls.push(['unblock',...args]),m=>calls.push(['report',m.id]),'Button','Text',{},h.objectionableChatText);return result.render;};
 const blocked=render(true)({item:{id:'message-a',senderId:'blocked',text:'private text must stay hidden'}});assert.doesNotMatch(JSON.stringify(blocked),/private text/);blocked.props.onPress();assert.deepEqual(calls.at(-1),['unblock','blocked',true]);
 const filtered=render(true)({item:{id:'message-b',senderId:'other',text:'FUCK'}});assert.doesNotMatch(JSON.stringify(filtered),/FUCK/);filtered.props.onPress();assert.deepEqual(calls.at(-1),['report','message-b']);
 assert.equal(render(false)({item:{senderId:'other',text:'hello'}}),null);
});
test('reply quotations do not bypass a sender block or the text filter',()=>{
 const source=fs.readFileSync('screens/TeamChatScreen.tsx','utf8');const ast=ts.createSourceFile('chat.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let expression;
 function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='replyToInfo')expression=n.initializer.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert.ok(expression);
 const h=safety();const preview=new Function('rawReply','blockedIds','t','objectionableChatText','return '+expression);
 for(const reply of [{id:'one',senderId:'blocked',senderName:'hidden name',text:'hidden content'},{id:'two',senderId:'other',text:'FUCK'}]){
  const result=preview(reply,new Set(['blocked']),key=>key,h.objectionableChatText);assert.equal(result.id,reply.id);assert.equal(result.senderName,'');assert.equal(result.text,'chat.hidden_reply');
 }
 const normal={id:'three',senderId:'other',text:'Good game'};assert.equal(preview(normal,new Set(),key=>key,h.objectionableChatText),normal);
});
test('safety actions are translated for all three supported languages',()=>{
 for(const lang of ['uz','ru','en']){const data=JSON.parse(fs.readFileSync('i18n/locales/'+lang+'.json','utf8')).chat;for(const key of ['block_user','unblock_user','blocked_message','filtered_message','report_message','report_explanation','report_email_fallback','content_rejected'])assert.ok(data[key],lang+':'+key);}
});

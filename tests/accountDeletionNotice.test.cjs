const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function screen({provider='apple',personal=true,success=true}={}){
 const calls=[];let alert;
 const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useState:value=>[value,()=>{}],useRef:value=>({current:value})};
 const native=Object.fromEntries(['View','Text','TouchableOpacity','ScrollView','Modal','ActivityIndicator','StatusBar'].map(n=>[n,n]));
 const imports={react:{__esModule:true,default:React,...React},'react-native':{...native,
  Dimensions:{get:()=>({width:390})},StyleSheet:{create:x=>x},Platform:{OS:'ios'},PanResponder:{create:()=>({panHandlers:{}})},Animated:{View:'AnimatedView',Value:class {interpolate(){return 0;}}},
  Alert:{alert:(...args)=>{alert=args;}},Linking:{openURL:async url=>{calls.push(['url',url]);}}},
  'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'@expo/vector-icons':{Ionicons:'Icon'},'react-i18next':{useTranslation:()=>({t:key=>key})},
  '../constants/Colors':{__esModule:true,default:{}},'../store/useAuthStore':{useAuthStore:()=>({user:{id:'legacy-id',appUserId:personal?'verified-id':undefined,authProvider:provider},isGuest:false,logout:async()=>{calls.push(['logout']);}})},
  '../services/apiService':{apiService:{deleteAccount:async()=>{calls.push(['legacy-delete']);return {success};}},clearApiCache:()=>calls.push(['cache-clear'])},
  '../utils/errorParser':{getLocalizedErrorMessage:()=> 'safe-error'},'../store/useThemeStore':{useThemeStore:()=>({isDark:false})},'../constants/homeTheme':{getHomeScreenColors:()=>({})},
  '../components/AppNavbar':{__esModule:true,default:'Navbar'},'../services/personalAuthService':{deletePersonalAccount:async()=>{calls.push(['personal-delete']);return {success,appleAccessRevocationRequired:provider==='apple'};}}};
 const output={};new Function('require','exports',ts.transpileModule(fs.readFileSync('screens/SecuritySettingsScreen.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(name=>{assert.ok(name in imports,name);return imports[name];},output);
 const tree=output.default({navigation:{reset:state=>{calls.push(['reset',state]);}}});
 function nodes(n){return Array.isArray(n)?n.flatMap(nodes):n&&typeof n==='object'?[n,...nodes(n.props?.children)]:[];}
 const button=nodes(tree).find(n=>n.type==='TouchableOpacity'&&n.props.children.some(child=>child?.type==='Text'&&child.props.children.includes('COMMON.DELETE')));
 assert.ok(button,'explicit delete confirmation button');
 return {calls,confirm:button.props.onPress,get alert(){return alert;},tree};
}
test('Apple deletion shows revocation guidance, then clears session before opening the official guide',async()=>{
 const h=screen();await h.confirm();assert.match(h.alert[1],/personal_account_deleted_sub/);assert.match(h.alert[1],/apple_revoke_instructions/);
 assert.deepEqual(h.calls,[['personal-delete']]);
 await h.alert[2].find(b=>b.text==='settings.apple_revoke_guide').onPress();
 assert.deepEqual(h.calls.map(c=>c[0]),['personal-delete','cache-clear','logout','reset','url']);
 assert.equal(h.calls.at(-1)[1],'https://support.apple.com/en-us/102571');
});
test('Google and Telegram deletion do not invent an Apple revocation requirement',async()=>{
 for(const provider of ['google','telegram']){const h=screen({provider});await h.confirm();assert.doesNotMatch(h.alert[1],/apple_revoke/);assert.equal(h.alert[2].length,1);}
});
test('failed deletion never announces success or clears the signed-in account',async()=>{
 const h=screen({success:false});await h.confirm();assert.equal(h.alert[0],'common.error');assert.deepEqual(h.calls,[['personal-delete']]);
});
test('legacy sports deletion keeps its own API and confirmation copy',async()=>{
 const h=screen({personal:false,provider:'telegram'});await h.confirm();assert.equal(h.alert[1],'settings.account_deleted_sub');assert.deepEqual(h.calls,[['legacy-delete']]);
});
test('all supported languages distinguish personal account erasure from retained sports history',()=>{
 for(const lang of ['uz','ru','en']){const s=JSON.parse(fs.readFileSync('i18n/locales/'+lang+'.json','utf8')).settings;
  for(const key of ['personal_delete_account_warning','personal_account_deleted_sub','apple_revoke_instructions','apple_revoke_guide'])assert.ok(s[key]?.length>8,lang+':'+key);
 }
 assert.match(JSON.parse(fs.readFileSync('i18n/locales/en.json','utf8')).settings.personal_delete_account_warning,/Organization-approved player and competition history will remain/);
});

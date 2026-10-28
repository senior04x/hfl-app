const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function render(provider,platform='ios',disabled=true){
 const api={};
 const React={createElement:(type,props,...children)=>({type,props:{...props,children}})};
 const imports={react:{__esModule:true,default:React},'react-native':{ActivityIndicator:'Spinner',Platform:{OS:platform},StyleSheet:{create:x=>x},TouchableOpacity:'Button',View:'View'},
  '@expo/vector-icons':{FontAwesome:'TelegramIcon',MaterialCommunityIcons:'GuestIcon'},'./AppleSignInButton':{__esModule:true,default:'AppleButton'},'./GoogleSignInIcon':{__esModule:true,default:'GoogleIcon'}};
 new Function('require','exports',ts.transpileModule(fs.readFileSync('components/WelcomeSocialButtons.tsx','utf8'),{
  compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
 }).outputText)(name=>imports[name],api);
 return api.default({disabled,loadingProvider:provider,onApple(){},onGuest(){},guestLabel:'Guest',onGoogle(){},onTelegram(){}}).props.children.filter(Boolean);
}
const spinner=button=>button.props.children.some(child=>child?.type==='Spinner');
test('Google loading keeps Telegram icon unchanged and marks only Google busy',()=>{
 const [apple,google,telegram]=render('google');
 assert.equal(apple.props.loading,false);assert.equal(spinner(google),true);assert.equal(spinner(telegram),false);
 assert.equal(google.props.accessibilityState.busy,true);assert.equal(telegram.props.accessibilityState.busy,false);
});
test('Apple and Telegram each show only their own pending state',()=>{
 const [apple,google,telegram]=render('apple');
 assert.equal(apple.props.loading,true);assert.equal(spinner(google),false);assert.equal(spinner(telegram),false);
 const buttons=render('telegram');assert.equal(spinner(buttons[1]),false);assert.equal(spinner(buttons[2]),true);
});
test('OTP-disabled buttons do not pretend Telegram is loading; Android retains Guest and Google',()=>{
 const [guest,google,telegram]=render(null,'android');
 assert.equal(guest.props.accessibilityLabel,'Guest');assert.equal(google.props.accessibilityLabel,'Sign in with Google');
 assert.equal(spinner(google),false);assert.equal(spinner(telegram),false);
});

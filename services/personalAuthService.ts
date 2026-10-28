import { AppState, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './supabase';
import { API_BASE_URL } from '../constants/ApiConfig';
import { personalSessionStorage } from './personalSessionStorage';
import { useAuthStore, registerPersonalLogout } from '../store/useAuthStore';
import { saveTransferLoginSessions } from './transferLoginStorage';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { requestAppleIdentity, NativeAppleLoginError } from './nativeAppleAuth';
import { createNativePkce } from './nativeOAuthPkce';
import { PERSONAL_AUTH_IS_TEST, PERSONAL_AUTH_URL, PERSONAL_AUTH_KEY, PERSONAL_AUTH_STORAGE_KEY } from '../constants/PersonalAuthEnvironment';

export const PERSONAL_RETURN_URL = 'hflsoccerapp://auth/telegram';
export const GOOGLE_RETURN_URL = 'hflsoccerapp://auth/google';
// Enable only after provider configuration and identity isolation are verified.
export const GOOGLE_LOGIN_ENABLED = process.env.EXPO_PUBLIC_GOOGLE_LOGIN_ENABLED === 'true';
// Keep existing public-data clients unchanged; personal JWTs are used only here.
export const personalAuthClient = createClient(PERSONAL_AUTH_URL, PERSONAL_AUTH_KEY, {
 auth: { storage: personalSessionStorage, storageKey: PERSONAL_AUTH_STORAGE_KEY,
  flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
WebBrowser.maybeCompleteAuthSession();
let busy = false;
let captureBrowserCallback: ((url: string) => void) | null = null;
function isPersonalCallback(url: string | null): url is string {
 if (!url) return false;
 try { const parsed = new URL(url); return [PERSONAL_RETURN_URL, GOOGLE_RETURN_URL].includes(`${parsed.protocol}//${parsed.host}${parsed.pathname}`); }
 catch { return false; }
}
let authRevision = 0;
const VERIFIER_KEY = `${PERSONAL_AUTH_STORAGE_KEY}-code-verifier`;
const PENDING_KEY = PERSONAL_AUTH_IS_TEST ? 'apple-test-pending' : 'telegram-pending';
const GOOGLE_PENDING_KEY = `${PERSONAL_AUTH_STORAGE_KEY}-google-pending`;
let logoutTask: Promise<unknown> = Promise.resolve();
registerPersonalLogout(() => {
 authRevision++;
 const task = (async () => {
  await personalSessionStorage.removeItem(PENDING_KEY).catch(() => undefined);
  await personalSessionStorage.removeItem(GOOGLE_PENDING_KEY).catch(() => undefined);
  await personalSessionStorage.removeItem(VERIFIER_KEY).catch(() => undefined);
  try { await personalAuthClient.auth.signOut({ scope: 'local' }); }
  finally { await personalSessionStorage.removeItem(PERSONAL_AUTH_STORAGE_KEY); }
 })();
 logoutTask = task.catch(() => undefined);
 return task;
});
export class PersonalLoginError extends Error {
 constructor(public code: string) { super(code); }
}
export function personalLoginMessage(code: string, language: string): string {
 if (code.startsWith('GOOGLE_')) {
  const diagnostic: Record<string, string> = { GOOGLE_PROVIDER_CALLBACK_FAILED: 'GP01', GOOGLE_SESSION_EXCHANGE_FAILED: 'GP02',
   GOOGLE_PROFILE_UNAVAILABLE: 'GP03', GOOGLE_INVALID_CALLBACK: 'GP04', GOOGLE_PROVIDER_DENIED: 'GP05' };
  const text = language.startsWith('ru') ? 'Не удалось войти через Google. Повторите попытку.'
   : language.startsWith('en') ? 'Unable to sign in with Google. Please try again.' : 'Google orqali kirib bo‘lmadi. Qayta urinib ko‘ring.';
  return `${text} (${diagnostic[code] || 'GP00'})`;
 }
 if (code.startsWith('APPLE_')) {
  return language.startsWith('ru') ? 'Не удалось войти через Apple. Повторите попытку.' : language.startsWith('en')
   ? 'Unable to sign in with Apple. Please try again.' : 'Apple orqali kirib bo‘lmadi. Qayta urinib ko‘ring.';
 }
 const diagnostics: Record<string, string> = { PROVIDER_CALLBACK_FAILED: 'TG01', SESSION_EXCHANGE_FAILED: 'TG02', PROFILE_UNAVAILABLE: 'TG03', INVALID_CALLBACK: 'TG04', PROVIDER_DENIED: 'TG05', CALLBACK_NOT_RECEIVED: 'TG06' };
 if (diagnostics[code]) {
  const text = language.startsWith('ru') ? 'Не удалось завершить вход через Telegram. Повторите попытку.' : language.startsWith('en') ? 'Unable to complete Telegram login. Please try again.' : 'Telegram orqali kirishni yakunlab bo‘lmadi. Qayta urinib ko‘ring.';
  return `${text} (${diagnostics[code]})`;
 }
 const ru = language.startsWith('ru');
 if (language.startsWith('en')) {
  if (code === 'LOGIN_NOT_CONFIGURED') return 'Telegram login is being configured. Please use phone login for now.';
  if (code === 'AUTH_REQUIRED') return 'Your session has ended. Please sign in again.';
  return 'Unable to sign in. Check your connection and try again.';
 }
 if (code === 'LOGIN_NOT_CONFIGURED') return ru ? 'Вход через Telegram пока настраивается. Используйте вход по номеру телефона.' : 'Telegram orqali kirish sozlanmoqda. Hozircha telefon raqami orqali kiring.';
 if (code === 'AUTH_REQUIRED') return ru ? 'Сессия завершилась. Войдите снова.' : 'Sessiya tugagan. Qayta kiring.';
 return ru ? 'Не удалось войти. Проверьте интернет и попробуйте снова.' : 'Kirish amalga oshmadi. Internetni tekshirib, qayta urinib ko‘ring.';
}
export async function deletePersonalAccount() {
 const { data, error } = await personalAuthClient.auth.getSession();
 if (error || !data.session) throw new PersonalLoginError('AUTH_REQUIRED');
 return jsonRequest('personal/account', { method: 'DELETE', headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'DELETE' }) });
}
async function jsonRequest(path: string, options: RequestInit = {}) {
 if (PERSONAL_AUTH_IS_TEST) {
  if (path !== 'personal/bootstrap') throw new PersonalLoginError('APPLE_TEST_ONLY');
  const { data, error } = await personalAuthClient.rpc('bootstrap_personal_account');
  if (error || !data?.success) throw new PersonalLoginError('APPLE_SIGN_IN_FAILED');
  return data;
 }
 const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000);
 try {
  const response = await fetch(`${API_BASE_URL}/api/auth/${path}`, { ...options, signal: controller.signal });
  const data = await response.json();
  if (!response.ok || !data.success) throw new PersonalLoginError(response.status === 401 ? 'AUTH_REQUIRED' : data.code || 'LOGIN_UNAVAILABLE');
  return data;
 } finally { clearTimeout(timer); }
}
export async function refreshPersonalAccounts(expectedProvider?: 'apple' | 'google') {
 const { data, error } = await personalAuthClient.auth.getSession();
 if (error || !data.session) throw new PersonalLoginError('AUTH_REQUIRED');
 const profile = await jsonRequest('personal/bootstrap', { method: 'POST', headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }, body: '{}' });
 if (!Array.isArray(profile.accounts) || profile.user?.appUserId !== data.session.user.id) throw new PersonalLoginError('PROFILE_UNAVAILABLE');
 if (expectedProvider && (profile.user?.authProvider !== expectedProvider || profile.user?.role !== 'user'
  || profile.accounts.length !== 1 || profile.accounts[0]?.appUserId !== data.session.user.id
  || profile.accounts[0]?.role !== 'user' || profile.user?.organizationId || profile.user?.organization_id
  || (profile.transferSessions && profile.transferSessions.length))) throw new PersonalLoginError(expectedProvider === 'google' ? 'GOOGLE_SIGN_IN_FAILED' : 'APPLE_SIGN_IN_FAILED');
 if (expectedProvider === 'google' && (data.session.user.identities?.length !== 1
  || data.session.user.identities[0]?.provider !== 'google')) throw new PersonalLoginError('GOOGLE_SIGN_IN_FAILED');
 if (!PERSONAL_AUTH_IS_TEST) await saveTransferLoginSessions(profile.transferSessions);
 return profile;
}
export async function loginWithApple(): Promise<any | null> {
 if (busy) return null;
 if (Platform.OS !== 'ios') throw new PersonalLoginError('APPLE_UNAVAILABLE');
 busy = true;
 await logoutTask;
 const current = ++authRevision;
 let createdSession = false;
 try {
  const credential = await requestAppleIdentity();
  if (!credential) return null;
  if (current !== authRevision) throw new PersonalLoginError('APPLE_SIGN_IN_FAILED');
  const { data, error } = await personalAuthClient.auth.signInWithIdToken({ provider: 'apple',
   token: credential.token, nonce: credential.nonce });
  createdSession = Boolean(data?.session);
  if (error || !data?.session || current !== authRevision) throw new PersonalLoginError('APPLE_SIGN_IN_FAILED');
  const profile = await refreshPersonalAccounts('apple');
  if (current !== authRevision || profile.user?.authProvider !== 'apple' || profile.user?.role !== 'user'
   || profile.accounts.length !== 1) throw new PersonalLoginError('APPLE_SIGN_IN_FAILED');
  // Apple supplies the name only at first authorization, outside its ID token.
  // This owner-only display field never grants membership or replaces an edited name.
  if (credential.fullName && profile.user.name === 'AMATORA foydalanuvchisi') {
   try {
    const saved = await personalAuthClient.from('app_users').update({ display_name: credential.fullName })
     .eq('id', data.session.user.id).eq('display_name', 'AMATORA foydalanuvchisi').select('id,display_name').maybeSingle();
    const savedName = saved.data?.display_name;
    if (!saved.error && saved.data?.id === data.session.user.id && typeof savedName === 'string') {
     profile.user = { ...profile.user, name: savedName, title: savedName };
     profile.accounts = profile.accounts.map((account: any) => account.role === 'user' && account.appUserId === data.session.user.id
      ? { ...account, name: savedName, title: savedName } : account);
    }
   } catch { /* Optional display metadata must not invalidate a verified sign-in. */ }
  }
  return profile;
 } catch (error) {
  if (createdSession && (PERSONAL_AUTH_IS_TEST || !useAuthStore.getState().user?.appUserId)) await personalAuthClient.auth.signOut({ scope: 'local' }).catch(() => undefined);
  throw error instanceof PersonalLoginError ? error : new PersonalLoginError(error instanceof NativeAppleLoginError ? error.message : 'APPLE_SIGN_IN_FAILED');
 } finally { busy = false; }
}

export async function loginWithGoogle(): Promise<any | null> {
 if (!GOOGLE_LOGIN_ENABLED) throw new PersonalLoginError('GOOGLE_NOT_CONFIGURED');
 if (busy) return null;
 if (Platform.OS === 'web') throw new PersonalLoginError('NATIVE_APP_REQUIRED');
 busy = true;
 await logoutTask;
 const current = ++authRevision;
 let notifyCallback: (() => void) | undefined;
 let receivedUrl: string | null = null;
 try {
  const pkce = await createNativePkce();
  const authorization = new URL('/auth/v1/authorize', PERSONAL_AUTH_URL);
  authorization.search = new URLSearchParams({ provider: 'google', redirect_to: GOOGLE_RETURN_URL,
   code_challenge: pkce.challenge, code_challenge_method: 's256', prompt: 'select_account' }).toString();
  await personalSessionStorage.setItem(VERIFIER_KEY, JSON.stringify(pkce.verifier));
  await personalSessionStorage.setItem(GOOGLE_PENDING_KEY, String(Date.now()));
  const callbackArrived = new Promise<void>(resolve => { notifyCallback = resolve; });
  captureBrowserCallback = url => { receivedUrl = url; notifyCallback?.(); };
  const result = await WebBrowser.openAuthSessionAsync(authorization.toString(), GOOGLE_RETURN_URL, { createTask: false });
  if (result.type !== 'success' && !receivedUrl && Platform.OS === 'android') {
   let timer: ReturnType<typeof setTimeout> | undefined;
   await Promise.race([callbackArrived, new Promise<void>(resolve => { timer = setTimeout(resolve, 1500); })]);
   if (timer) clearTimeout(timer);
  }
  if (current !== authRevision) throw new PersonalLoginError('GOOGLE_SIGN_IN_FAILED');
  const callbackUrl = result.type === 'success' ? result.url : receivedUrl;
  if (!callbackUrl) return null;
  if (!callbackUrl.startsWith(GOOGLE_RETURN_URL + '?') && !callbackUrl.startsWith(GOOGLE_RETURN_URL + '#'))
   throw new PersonalLoginError('GOOGLE_SIGN_IN_FAILED');
  const profile = await completePersonalCallback(callbackUrl);
  if (current !== authRevision) throw new PersonalLoginError('GOOGLE_SIGN_IN_FAILED');
  return profile;
 } catch (error) {
  if (!useAuthStore.getState().user?.appUserId) await personalAuthClient.auth.signOut({ scope: 'local' }).catch(() => undefined);
  const code = error instanceof PersonalLoginError ? error.code : 'GOOGLE_SIGN_IN_FAILED';
  throw new PersonalLoginError(code.startsWith('GOOGLE_') ? code : `GOOGLE_${code}`);
 } finally {
  captureBrowserCallback = null;
  await personalSessionStorage.removeItem(GOOGLE_PENDING_KEY).catch(() => undefined);
  await personalSessionStorage.removeItem(VERIFIER_KEY).catch(() => undefined);
  busy = false;
 }
}

export async function loginWithTelegram(): Promise<any | null> {
 if (PERSONAL_AUTH_IS_TEST) throw new PersonalLoginError('APPLE_TEST_ONLY');
 if (busy) return null;
 if (Platform.OS === 'web') throw new PersonalLoginError('NATIVE_APP_REQUIRED');
 busy = true;
 await logoutTask;
 const current = ++authRevision;
 try {
  const start = await jsonRequest('telegram/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (!/^[A-Za-z0-9_-]{43}$/.test(start.verifier) || new URL(start.url).origin !== SUPABASE_URL) throw new PersonalLoginError('LOGIN_UNAVAILABLE');
  await personalSessionStorage.setItem(VERIFIER_KEY, JSON.stringify(start.verifier));
  await personalSessionStorage.setItem(PENDING_KEY, String(Date.now()));
  let receivedUrl: string | null = null;
  let notifyCallback: (() => void) | undefined;
  const callbackArrived = new Promise<void>(resolve => { notifyCallback = resolve; });
  captureBrowserCallback = url => { receivedUrl = url; notifyCallback?.(); };
  // Expo's Android default adds NEW_TASK + NO_HISTORY. Opening Telegram can
  // destroy that browser activity before it returns to Supabase's callback.
  // Keep the browser in this task so approval can resume the OAuth page.
  const result = await WebBrowser.openAuthSessionAsync(start.url, PERSONAL_RETURN_URL, { createTask: false });
  // Android can report dismissal before delivering the deep link.
  if (result.type !== 'success' && !receivedUrl && Platform.OS === 'android') {
   let timer: ReturnType<typeof setTimeout> | undefined;
   await Promise.race([callbackArrived, new Promise<void>(resolve => { timer = setTimeout(resolve, 1500); })]);
   if (timer) clearTimeout(timer);
  }
  const callbackUrl = result.type === 'success' ? result.url : receivedUrl;
  if (!callbackUrl) {
   // A delayed Android link can still finish this intent before its ten-minute expiry.
   if (Platform.OS !== 'android' || result.type !== 'dismiss') {
    await personalSessionStorage.removeItem(PENDING_KEY);
    await personalSessionStorage.removeItem(VERIFIER_KEY);
   }
   if (Platform.OS === 'android' && result.type === 'dismiss') throw new PersonalLoginError('CALLBACK_NOT_RECEIVED');
   return null;
  }
  const profile = await completePersonalCallback(callbackUrl);
  if (current !== authRevision) throw new PersonalLoginError('LOGIN_UNAVAILABLE');
  return profile;
 } catch (error) {
  // An incomplete login must not leave a new privileged session behind.
  // No code was exchanged when the browser vanished. Keep PKCE for a late link;
  // auth.signOut also deletes Supabase's verifier, preventing that recovery.
  if (!(error instanceof PersonalLoginError && error.code === 'CALLBACK_NOT_RECEIVED') && !useAuthStore.getState().user?.appUserId) await personalAuthClient.auth.signOut({ scope: 'local' }).catch(() => undefined);
  throw error instanceof PersonalLoginError ? error : new PersonalLoginError('LOGIN_UNAVAILABLE');
 } finally { captureBrowserCallback = null; busy = false; }
}
async function completePersonalCallback(url: string) {
 const callback = new URL(url);
 const target = `${callback.protocol}//${callback.host}${callback.pathname}`;
 if (target !== PERSONAL_RETURN_URL && target !== GOOGLE_RETURN_URL) throw new PersonalLoginError('INVALID_CALLBACK');
 const isGoogle = target === GOOGLE_RETURN_URL;
 if (isGoogle && !GOOGLE_LOGIN_ENABLED) throw new PersonalLoginError('GOOGLE_NOT_CONFIGURED');
 const pendingKey = isGoogle ? GOOGLE_PENDING_KEY : PENDING_KEY;
 const startedAt = Number(await personalSessionStorage.getItem(pendingKey));
 if (!startedAt || Date.now() - startedAt > 10 * 60 * 1000 || startedAt > Date.now() + 30000) throw new PersonalLoginError('INVALID_CALLBACK');
 const fragment = new URLSearchParams(callback.hash.replace(/^#/, ''));
 if (callback.searchParams.has('error') || fragment.has('error')) {
  const errorCode = callback.searchParams.get('error_code') || fragment.get('error_code');
  await personalSessionStorage.removeItem(pendingKey);
  await personalSessionStorage.removeItem(VERIFIER_KEY);
  throw new PersonalLoginError(errorCode === 'access_denied' ? 'PROVIDER_DENIED' : 'PROVIDER_CALLBACK_FAILED');
 }
 const code = callback.searchParams.get('code');
 if (!code) throw new PersonalLoginError('INVALID_CALLBACK');
 // Consume local intent first; Supabase also consumes the authorization code.
 await personalSessionStorage.removeItem(pendingKey);
 const exchange = await personalAuthClient.auth.exchangeCodeForSession(code);
 if (exchange.error || !exchange.data.session) throw new PersonalLoginError('SESSION_EXCHANGE_FAILED');
 return refreshPersonalAccounts(isGoogle ? 'google' : undefined);
}
export async function resumePersonalLogin(url: string | null): Promise<boolean> {
 if (!isPersonalCallback(url)) return false;
 if (captureBrowserCallback) { captureBrowserCallback(url); return false; }
 const pendingKey = url?.startsWith(GOOGLE_RETURN_URL) ? GOOGLE_PENDING_KEY : PENDING_KEY;
 if (busy || !await personalSessionStorage.getItem(pendingKey)) return false;
 busy = true;
 try {
  const profile = await completePersonalCallback(url);
  const sports = profile.accounts.filter((a: any) => a.role !== 'user');
  const selected = sports.length === 1 ? sports[0] : profile.user;
  if (selected.organization_id) useOrganizationStore.getState().setSelectedOrganizationId(selected.organization_id);
  await useAuthStore.getState().setAuth(selected, profile.accounts);
  return true;
 } catch (error) {
  if (!useAuthStore.getState().user?.appUserId) await personalAuthClient.auth.signOut({ scope: 'local' }).catch(() => undefined);
  throw error instanceof PersonalLoginError ? error : new PersonalLoginError('LOGIN_UNAVAILABLE');
 } finally { busy = false; }
}
export async function restorePersonalSession(): Promise<void> {
 const state = useAuthStore.getState();
 // Public browsing has no personal session to restore or authenticate.
 if (state.isGuest) return;
 if (!state.user?.appUserId) return; // Preserve existing OTP logins.
 try {
  const { data, error } = await personalAuthClient.auth.getSession();
  if (error || !data.session || data.session.user.id !== state.user.appUserId) state.logout();
 } catch { state.logout(); }
}
export function startPersonalSessionLifecycle(): () => void {
 if (AppState.currentState === 'active') personalAuthClient.auth.startAutoRefresh();
 const listener = AppState.addEventListener('change', state => {
  if (state === 'active') personalAuthClient.auth.startAutoRefresh(); else personalAuthClient.auth.stopAutoRefresh();
 });
 const { data: { subscription } } = personalAuthClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' && useAuthStore.getState().user?.appUserId) {
   authRevision++; useAuthStore.getState().logout();
  } else if (session && useAuthStore.getState().user?.appUserId && session.user.id !== useAuthStore.getState().user.appUserId) {
   useAuthStore.getState().logout();
  }
 });
 return () => { listener.remove(); subscription.unsubscribe(); personalAuthClient.auth.stopAutoRefresh(); };
}

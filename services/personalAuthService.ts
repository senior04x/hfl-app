import { AppState, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import { API_BASE_URL } from '../constants/ApiConfig';
import { personalSessionStorage } from './personalSessionStorage';
import { useAuthStore, registerPersonalLogout } from '../store/useAuthStore';
import { saveTransferLoginSessions } from './transferLoginStorage';
import { useOrganizationStore } from '../store/useOrganizationStore';

export const PERSONAL_RETURN_URL = 'hflsoccerapp://auth/telegram';
// Keep existing public-data clients unchanged; personal JWTs are used only here.
export const personalAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
 auth: { storage: personalSessionStorage, storageKey: 'amatora-personal-auth-v1',
  flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
WebBrowser.maybeCompleteAuthSession();
let busy = false;
let authRevision = 0;
const VERIFIER_KEY = 'amatora-personal-auth-v1-code-verifier';
const PENDING_KEY = 'telegram-pending';
let logoutTask: Promise<unknown> = Promise.resolve();
registerPersonalLogout(() => {
 authRevision++;
 const task = (async () => {
  await personalSessionStorage.removeItem(PENDING_KEY).catch(() => undefined);
  await personalSessionStorage.removeItem(VERIFIER_KEY).catch(() => undefined);
  try { await personalAuthClient.auth.signOut({ scope: 'local' }); }
  finally { await personalSessionStorage.removeItem('amatora-personal-auth-v1'); }
 })();
 logoutTask = task.catch(() => undefined);
 return task;
});
export class PersonalLoginError extends Error {
 constructor(public code: string) { super(code); }
}
export function personalLoginMessage(code: string, language: string): string {
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
 const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000);
 try {
  const response = await fetch(`${API_BASE_URL}/api/auth/${path}`, { ...options, signal: controller.signal });
  const data = await response.json();
  if (!response.ok || !data.success) throw new PersonalLoginError(response.status === 401 ? 'AUTH_REQUIRED' : data.code || 'LOGIN_UNAVAILABLE');
  return data;
 } finally { clearTimeout(timer); }
}
export async function refreshPersonalAccounts() {
 const { data, error } = await personalAuthClient.auth.getSession();
 if (error || !data.session) throw new PersonalLoginError('AUTH_REQUIRED');
 const profile = await jsonRequest('personal/bootstrap', { method: 'POST', headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }, body: '{}' });
 if (!Array.isArray(profile.accounts) || profile.user?.appUserId !== data.session.user.id) throw new PersonalLoginError('PROFILE_UNAVAILABLE');
 await saveTransferLoginSessions(profile.transferSessions);
 return profile;
}
export async function loginWithTelegram(): Promise<any | null> {
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
  const result = await WebBrowser.openAuthSessionAsync(start.url, PERSONAL_RETURN_URL);
  if (result.type !== 'success') {
   await personalSessionStorage.removeItem(PENDING_KEY);
   await personalSessionStorage.removeItem(VERIFIER_KEY);
   return null;
  }
  const profile = await completePersonalCallback(result.url);
  if (current !== authRevision) throw new PersonalLoginError('LOGIN_UNAVAILABLE');
  return profile;
 } catch (error) {
  // An incomplete login must not leave a new privileged session behind.
  if (!useAuthStore.getState().user?.appUserId) await personalAuthClient.auth.signOut({ scope: 'local' }).catch(() => undefined);
  throw error instanceof PersonalLoginError ? error : new PersonalLoginError('LOGIN_UNAVAILABLE');
 } finally { busy = false; }
}
async function completePersonalCallback(url: string) {
 const callback = new URL(url);
 if (`${callback.protocol}//${callback.host}${callback.pathname}` !== PERSONAL_RETURN_URL) throw new PersonalLoginError('INVALID_CALLBACK');
 const startedAt = Number(await personalSessionStorage.getItem(PENDING_KEY));
 if (!startedAt || Date.now() - startedAt > 10 * 60 * 1000 || startedAt > Date.now() + 30000) throw new PersonalLoginError('INVALID_CALLBACK');
 const code = callback.searchParams.get('code');
 if (!code || callback.searchParams.has('error')) throw new PersonalLoginError('INVALID_CALLBACK');
 // Consume local intent first; Supabase also consumes the authorization code.
 await personalSessionStorage.removeItem(PENDING_KEY);
 const exchange = await personalAuthClient.auth.exchangeCodeForSession(code);
 if (exchange.error || !exchange.data.session) throw new PersonalLoginError('LOGIN_UNAVAILABLE');
 return refreshPersonalAccounts();
}
export async function resumePersonalLogin(url: string | null): Promise<boolean> {
 if (!url || busy || !url.startsWith(PERSONAL_RETURN_URL + '?')) return false;
 busy = true;
 try {
  const profile = await completePersonalCallback(url);
  const sports = profile.accounts.filter((a: any) => a.role !== 'user');
  const selected = sports.length === 1 ? sports[0] : profile.user;
  if (selected.organization_id) useOrganizationStore.getState().setSelectedOrganizationId(selected.organization_id);
  await useAuthStore.getState().setAuth(selected, profile.accounts);
  return true;
 } catch {
  if (!useAuthStore.getState().user?.appUserId) await personalAuthClient.auth.signOut({ scope: 'local' }).catch(() => undefined);
  return false;
 } finally { busy = false; }
}
export async function restorePersonalSession(): Promise<void> {
 const state = useAuthStore.getState();
 if (state.isGuest) { state.logout(); return; }
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

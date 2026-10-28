import { Platform } from 'react-native';

export class NativeAppleLoginError extends Error {}

export function getAppleAuthModule(): typeof import('expo-apple-authentication') | null {
 if (Platform.OS !== 'ios') return null;
 try { return require('expo-apple-authentication'); } catch { return null; }
}

export async function requestAppleIdentity(): Promise<{ token: string; nonce: string; fullName: string | null } | null> {
 const apple = getAppleAuthModule();
 if (!apple || !await apple.isAvailableAsync()) throw new NativeAppleLoginError('APPLE_UNAVAILABLE');
 try {
  const crypto = require('expo-crypto') as typeof import('expo-crypto');
  const nonce = Array.from(await crypto.getRandomBytesAsync(32), byte => byte.toString(16).padStart(2, '0')).join('');
  const hashedNonce = await crypto.digestStringAsync(crypto.CryptoDigestAlgorithm.SHA256, nonce);
  const state = crypto.randomUUID();
  const credential = await apple.signInAsync({
   requestedScopes: [apple.AppleAuthenticationScope.FULL_NAME, apple.AppleAuthenticationScope.EMAIL], nonce: hashedNonce, state,
  });
  if (!credential.identityToken || credential.state !== state) throw new NativeAppleLoginError('APPLE_INVALID_RESPONSE');
  // Raw nonce goes only to Supabase for verification; never persist or log it.
  const name = [credential.fullName?.givenName, credential.fullName?.middleName, credential.fullName?.familyName]
   .filter((part): part is string => typeof part === 'string').join(' ')
   .replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  return { token: credential.identityToken, nonce, fullName: name || null };
 } catch (error) {
  if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return null;
  throw error instanceof NativeAppleLoginError ? error : new NativeAppleLoginError('APPLE_SIGN_IN_FAILED');
 }
}

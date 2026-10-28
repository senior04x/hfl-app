// React Native may not expose WebCrypto.subtle. Never fall back to plain PKCE.
export async function createNativePkce(): Promise<{ verifier: string; challenge: string }> {
 const crypto = require('expo-crypto') as typeof import('expo-crypto');
 const verifier = Array.from(await crypto.getRandomBytesAsync(32), byte => byte.toString(16).padStart(2, '0')).join('');
 const digest = await crypto.digestStringAsync(crypto.CryptoDigestAlgorithm.SHA256, verifier, {
  encoding: crypto.CryptoEncoding.BASE64,
 });
 const challenge = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
 if (!/^[a-f0-9]{64}$/.test(verifier) || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) throw Error('PKCE_UNAVAILABLE');
 return { verifier, challenge };
}

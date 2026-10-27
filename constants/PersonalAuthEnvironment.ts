import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../services/supabase';

const mode = process.env.EXPO_PUBLIC_PERSONAL_AUTH_STAGE;
if (mode && mode !== 'production' && mode !== 'cloud-test') throw new Error('Unknown personal auth environment');
export const PERSONAL_AUTH_IS_TEST = mode === 'cloud-test';
const testKey = process.env.EXPO_PUBLIC_PERSONAL_AUTH_TEST_KEY;
if (PERSONAL_AUTH_IS_TEST && (!testKey || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(testKey))) {
 throw new Error('Missing public staging auth configuration');
}
export const PERSONAL_AUTH_URL = PERSONAL_AUTH_IS_TEST ? 'https://hgdezpjtdfndepseitfh.supabase.co' : SUPABASE_URL;
export const PERSONAL_AUTH_KEY = PERSONAL_AUTH_IS_TEST ? testKey! : SUPABASE_ANON_KEY;
export const PERSONAL_AUTH_STORAGE_KEY = PERSONAL_AUTH_IS_TEST ? 'amatora-personal-auth-test-v1' : 'amatora-personal-auth-v1';

import { personalAuthClient, PersonalLoginError } from './personalAuthService';
import { useAuthStore } from '../store/useAuthStore';

export type PersonalProfile = { name: string; bio: string; photo: string | null; phone: string | null; showPhone: boolean };
export type ProfilePhoto = { base64: string; mimeType: string };
const bucket = 'personal-avatars';
const fields = 'id,display_name,avatar_url,bio,phone,show_phone';
const profile = (row: any): PersonalProfile => ({ name: row.display_name, bio: row.bio || '', photo: row.avatar_url, phone: row.phone, showPhone: row.show_phone === true });
async function identity() {
 const { data, error } = await personalAuthClient.auth.getSession();
 const id = data.session?.user.id;
 if (error || !id || useAuthStore.getState().user?.appUserId !== id) throw new PersonalLoginError('AUTH_REQUIRED');
 return id;
}
export async function getPersonalProfile(): Promise<PersonalProfile> {
 const id = await identity();
 const { data, error } = await personalAuthClient.from('app_users').select(fields).eq('id', id).single();
 if (error || !data) throw new PersonalLoginError('PROFILE_UNAVAILABLE');
 return profile(data);
}
export function validatePersonalProfile(name: string, bio: string) {
 const clean = name.trim();
 if (!clean || clean.length > 120 || /[\x00-\x1f\x7f]/.test(clean) || bio.length > 280) throw new Error('INVALID_PROFILE');
 return { name: clean, bio: bio.trim() };
}
export async function savePersonalProfile(input: PersonalProfile, photo?: ProfilePhoto): Promise<PersonalProfile> {
 const id = await identity(); const clean = validatePersonalProfile(input.name, input.bio);
 let uploaded: string | null = null;
 let avatar = input.photo;
 try {
  if (photo) {
   const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string,string>)[photo.mimeType];
   if (!ext || photo.base64.length > 4194304) throw new Error('INVALID_PHOTO');
   const binary = atob(photo.base64); const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
   const valid = ext === 'jpg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : ext === 'png' ? bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 : binary.startsWith('RIFF') && binary.slice(8,12) === 'WEBP';
   if (!valid || !bytes.length || bytes.length > 3145728) throw new Error('INVALID_PHOTO');
   const key = `${id}/${Date.now()}.${ext}`;
   const result = await personalAuthClient.storage.from(bucket).upload(key, bytes.buffer as ArrayBuffer, { contentType: photo.mimeType, upsert: false });
   if (result.error) throw new Error('PHOTO_UPLOAD_FAILED');
   uploaded = key; avatar = personalAuthClient.storage.from(bucket).getPublicUrl(key).data.publicUrl;
  }
  const { data, error } = await personalAuthClient.from('app_users').update({ display_name: clean.name, bio: clean.bio, avatar_url: avatar, show_phone: input.showPhone === true }).eq('id',id).select(fields).single();
  if (error || !data) throw new PersonalLoginError('PROFILE_UNAVAILABLE');
  const saved = profile(data);
  const state = useAuthStore.getState();
  if (state.user?.appUserId === id) {
   const patch = { name: saved.name, title: saved.name, photo: saved.photo, bio: saved.bio, showPhone: saved.showPhone, phone: saved.phone };
   const accounts = state.userAccounts.map(a => a.appUserId === id && a.role === 'user' ? { ...a, ...patch } : a);
   if (state.user.role === 'user') await state.setAuth({ ...state.user, ...patch },accounts);
   else state.setUserAccounts(accounts);
  }
  // Delete only this user's previous uploaded avatar after the DB commits.
  if (uploaded && input.photo) {
   const prefix = personalAuthClient.storage.from(bucket).getPublicUrl(`${id}/`).data.publicUrl;
   if (input.photo.startsWith(prefix)) {
    const old = `${id}/${input.photo.slice(prefix.length)}`;
    if (/^[a-f0-9-]+\/[0-9]+\.(jpg|png|webp)$/.test(old)) await personalAuthClient.storage.from(bucket).remove([old]).catch(() => undefined);
   }
  }
  return saved;
 } catch (error) {
  // A saved profile must never point to an object removed during UI persistence failure.
  if (uploaded) {
   const check = await Promise.resolve(personalAuthClient.from('app_users').select('avatar_url').eq('id',id).maybeSingle()).catch(() => ({ data: null, error: true }));
   if (!check.error && check.data?.avatar_url !== avatar) await personalAuthClient.storage.from(bucket).remove([uploaded]).catch(() => undefined);
  }
  throw error;
 }
}

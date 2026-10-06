import * as SecureStore from 'expo-secure-store';

// Supabase sessions can exceed SecureStore's single-value size on older builds.
// Publish the manifest last so interrupted writes cannot expose half a session.
let queue: Promise<unknown> = Promise.resolve();
let revision = 0;
const CHUNK_SIZE = 450; // <=1800 UTF-8 bytes, including non-Latin profile names.
const serial = <T>(work: () => Promise<T>): Promise<T> => {
 const next = queue.then(work, work); queue = next.catch(() => undefined); return next;
};
const base = (key: string) => `amatora.personal.${key.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
type Manifest = { generation: string; count: number };
async function manifest(key: string): Promise<Manifest | null> {
 const raw = await SecureStore.getItemAsync(base(key));
 if (!raw) return null;
 const parsed = JSON.parse(raw);
 if (!/^[0-9]+-[0-9]+$/.test(parsed.generation) || !Number.isInteger(parsed.count) || parsed.count < 1 || parsed.count > 128) throw Error('Invalid session storage');
 return parsed;
}
async function removeChunks(key: string, value: Manifest | null) {
 if (value) for (let i = 0; i < value.count; i++) await SecureStore.deleteItemAsync(`${base(key)}.${value.generation}.${i}`);
}
export const personalSessionStorage = {
 getItem: (key: string): Promise<string | null> => serial(async () => {
  const m = await manifest(key); if (!m) return null;
  let result = '';
  for (let i = 0; i < m.count; i++) {
   const chunk = await SecureStore.getItemAsync(`${base(key)}.${m.generation}.${i}`);
   if (chunk === null) throw Error('Incomplete session storage');
   result += chunk;
  }
  return result;
 }),
 setItem: (key: string, value: string): Promise<void> => serial(async () => {
  const previous = await manifest(key);
  const characters = Array.from(value); // Do not split UTF-16 surrogate pairs.
  const next = { generation: `${Date.now()}-${++revision}`, count: Math.ceil(characters.length / CHUNK_SIZE) };
  if (next.count < 1 || next.count > 128) throw Error('Session exceeds storage limit');
  try {
   for (let i = 0; i < next.count; i++) await SecureStore.setItemAsync(`${base(key)}.${next.generation}.${i}`, characters.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE).join(''));
   await SecureStore.setItemAsync(base(key), JSON.stringify(next));
  } catch (error) { await removeChunks(key, next).catch(() => undefined); throw error; }
  await removeChunks(key, previous).catch(() => undefined);
 }),
 removeItem: (key: string): Promise<void> => serial(async () => {
  const previous = await manifest(key);
  await SecureStore.deleteItemAsync(base(key)); await removeChunks(key, previous);
 }),
};

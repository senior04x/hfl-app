import AsyncStorage from '@react-native-async-storage/async-storage';

// Small, bounded text filter. Reports cover context and abuse a word list cannot.
const forbidden = /(?:^|[^\p{L}\p{N}])(?:fuck(?:ing|er|ers)?|motherfucker|shit|bitch(?:es)?|cunt|nigger|блядь|блять|пизда|пиздец|хуй|хуйня|сука|ебать|нахуй|jalab|qotoq|qo['’ʻ]toq)(?=$|[^\p{L}\p{N}])/iu;
export function objectionableChatText(value: unknown): boolean {
 if (typeof value !== 'string' || !value.trim() || value.length > 4000) return true;
 return forbidden.test(value.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, ''));
}
const validId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id);
export function chatSafetyOwner(user: any): string | null {
 const id = String(user?.appUserId || user?._id || user?.id || '');
 return validId(id) ? id : null;
}
const key = (owner: string) => {
 if (!validId(owner)) throw Error('INVALID_CHAT_OWNER');
 return `@amatora_chat_blocks_v1:${owner}`;
};
export async function readChatBlocks(owner: string): Promise<string[]> {
 const raw = await AsyncStorage.getItem(key(owner));
 if (!raw) return [];
 const data: unknown = JSON.parse(raw);
 if (!Array.isArray(data) || data.length > 500 || !data.every(validId)) throw Error('INVALID_CHAT_BLOCKS');
 return [...new Set(data)];
}
export async function writeChatBlocks(owner: string, ids: string[]): Promise<void> {
 if (ids.length > 500 || !ids.every(validId)) throw Error('INVALID_CHAT_BLOCKS');
 await AsyncStorage.setItem(key(owner), JSON.stringify([...new Set(ids)]));
}
// The composer opens visibly; the app never silently sends an email or copies
// private chat text, phone numbers, session tokens or profile data into it.
export function chatReportUrl(teamId: unknown, messageId: unknown): string {
 const team = String(teamId || ''); const message = String(messageId || '');
 if (!validId(team) || !validId(message) || message.startsWith('temp-') || message.startsWith('local-')) throw Error('INVALID_CHAT_REPORT');
 return 'mailto:gcccc406@gmail.com?subject=' + encodeURIComponent('AMATORA chat report')
  + '&body=' + encodeURIComponent(`Team: ${team}\nMessage: ${message}\n\nPlease describe the problem:\n`);
}

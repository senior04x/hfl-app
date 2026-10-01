import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { useAuthStore } from '../store/useAuthStore';

export type GoalSaveError = 'unavailable' | 'permission' | 'failed' | 'not_owner';
let saving = false;

export function canSaveOwnGoal(playerId?: string): boolean {
    const { user, isAuthenticated } = useAuthStore.getState();
    return Boolean(isAuthenticated && user?.role === 'player' && playerId && String(user.id || user._id) === String(playerId));
}

export async function saveOwnGoal(playerId: string, uri: string): Promise<void> {
    if (!canSaveOwnGoal(playerId)) throw new Error('not_owner');
    if (saving) throw new Error('busy');
    if (Platform.OS === 'web' || !requireOptionalNativeModule('ExpoMediaLibrary')) throw new Error('unavailable');
    if (!/^https:\/\/[^\s]+$/i.test(uri)) throw new Error('failed');
    saving = true;
    let file: string | undefined;
    let fileSystem: typeof import('expo-file-system/legacy') | undefined;
    try {
        const media = await import('expo-media-library');
        fileSystem = await import('expo-file-system/legacy');
        // Add-only access: no photo/video library browsing permissions.
        const permission = await media.requestPermissionsAsync(true, []);
        if (!permission.granted) throw new Error('permission');
        if (!fileSystem.cacheDirectory) throw new Error('failed');
        file = `${fileSystem.cacheDirectory}amatora-goal-${Date.now()}.mp4`;
        const result = await fileSystem.downloadAsync(uri, file);
        if (result.status < 200 || result.status >= 300) throw new Error('failed');
        if (!canSaveOwnGoal(playerId)) throw new Error('not_owner');
        await media.saveToLibraryAsync(result.uri);
    } finally {
        if (file && fileSystem) await fileSystem.deleteAsync(file, { idempotent: true }).catch(() => undefined);
        saving = false;
    }
}

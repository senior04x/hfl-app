import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';

interface UpdateInfo {
  version: string;
  downloadUrl: string;
  forceUpdate: boolean;
  releaseNotes: string;
  updateType: 'ota' | 'manual';
}

interface OTAUpdateInfo {
  isAvailable: boolean;
  manifest?: any;
}

class UpdateService {
  private static readonly UPDATE_CHECK_URL = 'https://hfl-backend.onrender.com/api/check-update';
  private static readonly CURRENT_VERSION = Constants.expoConfig?.version || '1.0.0';
  private static updateModalCallback: ((updateInfo: UpdateInfo) => void) | null = null;

  static async checkForUpdates(): Promise<void> {
    try {
      console.log('🔄 Checking for updates...');

      // First check for OTA updates (Expo Updates)
      const otaUpdate = await this.checkForOTAUpdates();
      if (otaUpdate.isAvailable) {
        console.log('📱 OTA update available');
        const updateInfo: UpdateInfo = {
          version: otaUpdate.manifest?.version || 'New version',
          downloadUrl: '',
          forceUpdate: false,
          releaseNotes: otaUpdate.manifest?.releaseNotes || 'Bug fixes and improvements',
          updateType: 'ota'
        };
        this.showUpdateDialog(updateInfo);
        return;
      }

      // Then check for manual APK updates
      try {
        const response = await fetch(`${this.UPDATE_CHECK_URL}?version=${this.CURRENT_VERSION}`);
        const updateInfo: UpdateInfo = await response.json();

        if (updateInfo && updateInfo.version && this.isNewVersionAvailable(updateInfo.version)) {
          console.log('📦 Manual update available:', updateInfo.version);
          updateInfo.updateType = 'manual';
          this.showUpdateDialog(updateInfo);
        } else {
          console.log('✅ App is up to date');
        }
      } catch (serverError) {
        console.log('📱 Server update check failed (development mode)');
        // In development, we'll skip server checks
      }
    } catch (error) {
      console.error('❌ Update check failed:', error);
    }
  }

  private static async checkForOTAUpdates(): Promise<OTAUpdateInfo> {
    try {
      if (!Updates.isEnabled) {
        console.log('📱 OTA updates not enabled (development mode)');
        return { isAvailable: false };
      }

      // Check if we're in Expo Go (development)
      if (__DEV__ || !Updates.isEnabled) {
        console.log('📱 Skipping OTA check in development mode');
        return { isAvailable: false };
      }

      const update = await Updates.checkForUpdateAsync();
      return { isAvailable: update.isAvailable, manifest: update.manifest };
    } catch (error) {
      console.log('📱 OTA update check skipped (development mode)');
      return { isAvailable: false };
    }
  }

  private static isNewVersionAvailable(serverVersion: string): boolean {
    return this.compareVersions(serverVersion, this.CURRENT_VERSION) > 0;
  }

  private static compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }

    return 0;
  }

  private static showUpdateDialog(updateInfo: UpdateInfo): void {
    const title = updateInfo.updateType === 'ota' ? 'OTA Yangilanish' : 'Yangilanish mavjud';
    const message = updateInfo.updateType === 'ota'
      ? `Yangi versiya ${updateInfo.version} mavjud.\n\n${updateInfo.releaseNotes}\n\nOTA yangilanish tez va xavfsiz.`
      : `Yangi versiya ${updateInfo.version} chiqarildi.\n\n${updateInfo.releaseNotes}`;

    Alert.alert(
      title,
      message,
      [
        {
          text: 'Keyinroq',
          style: 'cancel',
          onPress: () => this.scheduleReminder(updateInfo)
        },
        {
          text: updateInfo.updateType === 'ota' ? 'OTA Yangilash' : 'Yangilash',
          onPress: () => this.downloadUpdate(updateInfo)
        }
      ],
      { cancelable: !updateInfo.forceUpdate }
    );
  }

  private static async scheduleReminder(updateInfo: UpdateInfo): Promise<void> {
    if (updateInfo.forceUpdate) {
      // Force update - show again in 1 hour
      setTimeout(() => this.showUpdateDialog(updateInfo), 60 * 60 * 1000);
    }
  }

  private static async downloadUpdate(updateInfo: UpdateInfo): Promise<void> {
    try {
      if (updateInfo.updateType === 'ota') {
        await this.performOTAUpdate();
      } else {
        await Linking.openURL(updateInfo.downloadUrl);
      }
    } catch (error) {
      console.error('❌ Update failed:', error);
      Alert.alert('Xatolik', 'Yangilanishni yuklab olishda xatolik yuz berdi');
    }
  }

  private static async performOTAUpdate(): Promise<void> {
    try {
      console.log('🔄 Starting OTA update...');

      if (!Updates.isEnabled) {
        Alert.alert('Xatolik', 'OTA yangilanish development rejimida ishlamaydi');
        return;
      }

      const update = await Updates.fetchUpdateAsync();

      if (update.isNew) {
        console.log('✅ OTA update downloaded, restarting app...');
        await Updates.reloadAsync();
      } else {
        console.log('ℹ️ No new OTA update available');
      }
    } catch (error) {
      console.error('❌ OTA update failed:', error);
      Alert.alert('Xatolik', 'OTA yangilanishda xatolik yuz berdi');
    }
  }

  static async checkUpdateOnAppStart(): Promise<void> {
    const lastCheck = await AsyncStorage.getItem('lastUpdateCheck');
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (!lastCheck || (now - parseInt(lastCheck)) > oneDay) {
      await this.checkForUpdates();
      await AsyncStorage.setItem('lastUpdateCheck', now.toString());
    }
  }

  // Manual update check (for settings screen)
  static async manualUpdateCheck(): Promise<boolean> {
    try {
      console.log('🔄 Manual update check...');
      await this.checkForUpdates();
      await AsyncStorage.setItem('lastUpdateCheck', Date.now().toString());
      return true;
    } catch (error) {
      console.error('❌ Manual update check failed:', error);
      return false;
    }
  }

  // Get current app version
  static getCurrentVersion(): string {
    return this.CURRENT_VERSION;
  }

  // Check if updates are enabled
  static isUpdatesEnabled(): boolean {
    return Updates.isEnabled;
  }

  // Set update modal callback (for custom UI)
  static setUpdateModalCallback(callback: (updateInfo: UpdateInfo) => void): void {
    this.updateModalCallback = callback;
  }

  // Show update modal with custom UI
  static showUpdateModal(updateInfo: UpdateInfo): void {
    if (this.updateModalCallback) {
      this.updateModalCallback(updateInfo);
    } else {
      this.showUpdateDialog(updateInfo);
    }
  }

  // Get update info for display
  static async getUpdateInfo(): Promise<{ hasUpdate: boolean; version?: string; releaseNotes?: string }> {
    try {
      const otaUpdate = await this.checkForOTAUpdates();
      if (otaUpdate.isAvailable) {
        return {
          hasUpdate: true,
          version: otaUpdate.manifest?.version,
          releaseNotes: otaUpdate.manifest?.releaseNotes
        };
      }

      try {
        const response = await fetch(`${this.UPDATE_CHECK_URL}?version=${this.CURRENT_VERSION}`);
        const updateInfo: UpdateInfo = await response.json();

        if (updateInfo && updateInfo.version && this.isNewVersionAvailable(updateInfo.version)) {
          return {
            hasUpdate: true,
            version: updateInfo.version,
            releaseNotes: updateInfo.releaseNotes
          };
        }
      } catch (serverError) {
        console.log('📱 Server update info check failed (development mode)');
      }

      return { hasUpdate: false };
    } catch (error) {
      console.log('📱 Get update info skipped (development mode)');
      return { hasUpdate: false };
    }
  }
}

export default UpdateService;



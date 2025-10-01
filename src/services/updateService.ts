import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UpdateInfo {
  version: string;
  downloadUrl: string;
  forceUpdate: boolean;
  releaseNotes: string;
}

class UpdateService {
  private static readonly UPDATE_CHECK_URL = 'https://your-server.com/api/check-update';
  private static readonly CURRENT_VERSION = '1.0.0';

  static async checkForUpdates(): Promise<void> {
    try {
      const response = await fetch(this.UPDATE_CHECK_URL);
      const updateInfo: UpdateInfo = await response.json();
      
      if (this.isNewVersionAvailable(updateInfo.version)) {
        this.showUpdateDialog(updateInfo);
      }
    } catch (error) {
      console.error('Update check failed:', error);
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
    Alert.alert(
      'Yangilanish mavjud',
      `Yangi versiya ${updateInfo.version} chiqarildi.\n\n${updateInfo.releaseNotes}`,
      [
        {
          text: 'Keyinroq',
          style: 'cancel',
          onPress: () => this.scheduleReminder(updateInfo)
        },
        {
          text: 'Yangilash',
          onPress: () => this.downloadUpdate(updateInfo.downloadUrl)
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

  private static async downloadUpdate(downloadUrl: string): Promise<void> {
    try {
      await Linking.openURL(downloadUrl);
    } catch (error) {
      Alert.alert('Xatolik', 'Yangilanishni yuklab olishda xatolik yuz berdi');
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
}

export default UpdateService;


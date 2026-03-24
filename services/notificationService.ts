import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { apiService } from './apiService';

// Configure how notifications should be handled when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  /**
   * Registers the device for push notifications and sends the token to the backend
   * @param userId The ID of the currently logged-in user
   */
  registerForPushNotificationsAsync: async (userId: string) => {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return null;
      }

      // Get the token from Expo
      // Project ID is required for SDK 49+
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId
      });
      
      const token = tokenData.data;
      console.log('Expo Push Token:', token);

      // Register with our backend
      if (userId) {
        await apiService.registerPushToken({
          token,
          userId,
          platform: Platform.OS,
          deviceId: Constants.installationId || Device.osBuildId || 'unknown'
        });
      }

      return token;
    } catch (error) {
      console.error('Error during push notification registration:', error);
      return null;
    }
  },

  /**
   * Sets up notification channels (required for Android)
   */
  setupAndroidChannel: async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  }
};

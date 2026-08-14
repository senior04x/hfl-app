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
   * @param userId The ID of the currently logged-in user (optional)
   */
  registerForPushNotificationsAsync: async (userId?: string) => {
    if (!Device.isDevice) {
      console.log('NOTICE: Must use physical device for Push Notifications');
      return null;
    }

    // Check if running in Expo Go (remote notifications not supported in SDK 53+)
    const isExpoGo = Constants.appOwnership === 'expo' || Constants.appOwnership === 'guest';
    console.log(`DEBUG: appOwnership=${Constants.appOwnership}, platform=${Platform.OS}`);
    
    if (isExpoGo && Platform.OS === 'android') {
       console.log('NOTICE: Android Push Notifications (remote) are not supported in Expo Go (SDK 53+). Please use a development build.');
       // We still try to get the token for internal use, but handle errors silently
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
      
      console.log(`DEBUG: Fetching Expo token for project ${projectId}...`);
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId
      });
      
      const token = tokenData.data;
      console.log('Expo Push Token:', token);
      
      // DIAGNOSTIC ALERT (Temporary)
      // Alert.alert('Push Registration', `Expo Token: ${token.substring(0, 20)}...`);

      // Get native device token (FCM/APNs) for direct Firebase messaging
      try {
        const deviceTokenData = await Notifications.getDevicePushTokenAsync();
        console.log('Device Push Token (FCM/APNs):', deviceTokenData.data);
      } catch (e) {
        console.log('NOTICE: Could not get device push token (expected in Expo Go)');
      }

      // Register with our backend
      // Register Expo Token with our backend
      if (userId) {
        const { useAuthStore } = require('../store/useAuthStore');
        const { useOrganizationStore } = require('../store/useOrganizationStore');
        const currentUser = useAuthStore.getState().user;
        const orgId = useOrganizationStore.getState().selectedOrganizationId || 1;
        const teamId = currentUser?.teamId || (currentUser as any)?.team_id;

        const registrationData = {
          token,
          userId: userId || 'anonymous',
          platform: Platform.OS,
          deviceId: Constants.installationId || Device.osBuildId || 'unknown',
          teamId,
          organizationId: orgId
        };
        
        await apiService.registerPushToken(registrationData);
        console.log('Registered Expo Token with backend:', registrationData.userId);

        // Also register native device token (FCM/APNs) for direct Firebase messaging
        try {
          const deviceTokenData = await Notifications.getDevicePushTokenAsync();
          if (deviceTokenData.data && deviceTokenData.data !== token) {
            await apiService.registerPushToken({
              token: deviceTokenData.data,
              userId,
              platform: Platform.OS,
              deviceId: (Constants.installationId || Device.osBuildId || 'unknown') + '_fcm'
            });
            console.log('Registered Native Token with backend');
          }
        } catch (e) {
          console.log('NOTICE: Direct FCM registration skipped in current environment');
        }
      }

      return token;
    } catch (error) {
       const isExpoGo = Constants.appOwnership === 'expo' || Constants.appOwnership === 'guest';
       if (isExpoGo) {
         console.log('NOTICE: Push orientation failed in Expo Go (expected). Use Dev Build for full support.');
       } else {
         console.error('Error during push notification registration:', error);
         Alert.alert('Push Error', (error as any)?.message || 'Unknown registration error');
       }
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

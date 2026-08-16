import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { apiService } from './apiService';

// Active chat tracking to suppress native banners when user is already inside that chat room
let activeTeamChatId: string | number | null = null;

// Configure how notifications should be handled when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification?.request?.content?.data;
    // If user is currently active inside this specific team chat, suppress foreground banner
    if (data && (data.type === 'team_chat' || data.type === 'chat') && activeTeamChatId && String(data.teamId) === String(activeTeamChatId)) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export const notificationService = {
  setActiveTeamChatId: (id: string | number | null) => {
    activeTeamChatId = id;
  },

  getActiveTeamChatId: () => activeTeamChatId,

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
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? "14fddb89-af52-47b3-90ab-f437d786254b";
      
      console.log(`DEBUG: Fetching Expo token for project ${projectId}...`);
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId
      });
      
      const token = tokenData.data;
      console.log('Expo Push Token:', token);

      // Register Expo Token with our backend
      if (userId) {
        const { useAuthStore } = require('../store/useAuthStore');
        const { useOrganizationStore } = require('../store/useOrganizationStore');
        const currentUser = useAuthStore.getState().user;
        const orgId = useOrganizationStore.getState().selectedOrganizationId || 1;
        const teamId = currentUser?.teamId || (currentUser as any)?.team_id;

        let currentLang = 'uz';
        try {
          const i18n = require('../i18n').default;
          if (i18n && i18n.language) currentLang = i18n.language;
        } catch (_) {}

        const registrationData = {
          token,
          userId: userId || 'anonymous',
          platform: Platform.OS,
          deviceId: (Constants.installationId || Device.osBuildId || 'unknown') + '_' + currentLang,
          teamId,
          organizationId: orgId,
          language: currentLang
        };
        
        await apiService.registerPushToken(registrationData);
        console.log('✅ Registered Expo Token with backend:', registrationData.userId, 'lang:', currentLang);
      }

      return token;
    } catch (error) {
       const isExpoGo = Constants.appOwnership === 'expo' || Constants.appOwnership === 'guest';
       if (isExpoGo) {
         console.log('NOTICE: Push orientation failed in Expo Go (expected). Use Dev Build for full support.');
       } else {
         console.warn('Push notification registration notice:', (error as any)?.message || error);
       }
       return null;
    }
  },

  /**
   * Sets up notification channels (required for Android)
   */
  setupAndroidChannel: async () => {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00DF82',
        });
      } catch (err) {
        console.warn('Could not setup Android notification channel:', err);
      }
    }
  }
};

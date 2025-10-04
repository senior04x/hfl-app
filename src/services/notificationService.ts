// Push Notification Service for HFL Mobile App
// Uses Firebase Cloud Messaging (FCM)

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: boolean;
  badge?: number;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  // Initialize notification service
  async initialize(): Promise<boolean> {
    try {
      // Register for push notifications
      const token = await this.registerForPushNotifications();
      if (token) {
        this.expoPushToken = token;
        await this.saveTokenToStorage(token);
        console.log('✅ Push notification token registered:', token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
      return false;
    }
  }

  // Register for push notifications
  private async registerForPushNotifications(): Promise<string | null> {
    try {
      // Web platformada push notifications uchun alohida tekshirish
      if (Platform.OS === 'web') {
        console.log('🌐 Web platform detected - checking VAPID configuration');
        
        // Web uchun VAPID key mavjudligini tekshirish
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('❌ Web push notifications permission denied');
          return null;
        }

        try {
          const token = (await Notifications.getExpoPushTokenAsync()).data;
          console.log('📱 Web push token:', token);
          return token;
        } catch (vapidError) {
          console.error('❌ VAPID configuration error:', vapidError);
          console.log('💡 Make sure VAPID key is properly configured in app.json');
          return null;
        }
      }

      // Mobile platformalar uchun
      if (!Device.isDevice) {
        console.log('📱 Must use physical device for Push Notifications on mobile');
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Failed to get push token for push notification!');
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('📱 Mobile push token:', token);
      
      return token;
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      return null;
    }
  }

  // Save token to storage
  private async saveTokenToStorage(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('expo_push_token', token);
    } catch (error) {
      console.error('Error saving token to storage:', error);
    }
  }

  // Get stored token
  async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('expo_push_token');
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  // Send token to server
  async sendTokenToServer(userId?: string): Promise<boolean> {
    try {
      const token = this.expoPushToken || await this.getStoredToken();
      if (!token) {
        console.log('No push token available');
        return false;
      }

      const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${apiBaseUrl}/api/notifications/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          userId,
          platform: Platform.OS,
          deviceId: Device.osInternalBuildId,
        }),
      });

      if (response.ok) {
        console.log('✅ Push token sent to server');
        return true;
      } else {
        console.error('❌ Failed to send token to server');
        return false;
      }
    } catch (error) {
      console.error('Error sending token to server:', error);
      return false;
    }
  }

  // Setup notification listeners
  setupNotificationListeners(): void {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📨 Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Listener for user interactions with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }

  // Handle notification received
  private handleNotificationReceived(notification: any): void {
    const { title, body, data } = notification.request.content;
    console.log('📨 Notification received:', { title, body, data });
    
    // You can add custom logic here to handle different notification types
    if (data?.type) {
      switch (data.type) {
        case 'match_update':
          console.log('Match update notification');
          break;
        case 'application_status':
          console.log('Application status notification');
          break;
        case 'transfer_update':
          console.log('Transfer update notification');
          break;
        default:
          console.log('Unknown notification type:', data.type);
      }
    }
  }

  // Handle notification response (when user taps notification)
  private handleNotificationResponse(response: any): void {
    const { data } = response.notification.request.content;
    console.log('👆 Notification tapped:', data);
    
    // You can add navigation logic here based on notification data
    if (data?.type) {
      switch (data.type) {
        case 'match_update':
          // Navigate to match details
          console.log('Navigate to match:', data.matchId);
          break;
        case 'application_status':
          // Navigate to application status
          console.log('Navigate to application status');
          break;
        case 'transfer_update':
          // Navigate to transfer status
          console.log('Navigate to transfer status');
          break;
        default:
          console.log('Unknown notification type:', data.type);
      }
    }
  }

  // Schedule local notification
  async scheduleLocalNotification(notification: NotificationData): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: notification.sound !== false,
          badge: notification.badge,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }

  // Get notification permissions
  async getPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
    try {
      return await Notifications.getPermissionsAsync();
    } catch (error) {
      console.error('Error getting notification permissions:', error);
      return { status: 'undetermined' };
    }
  }

  // Request notification permissions
  async requestPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
    try {
      return await Notifications.requestPermissionsAsync();
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return { status: 'denied' };
    }
  }

  // Cleanup listeners
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // Get expo push token
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default NotificationService;

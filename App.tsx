import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

import AppNavigator from './src/navigation/AppNavigator';
import { initializePlayerStore } from './src/store/usePlayerStore';
import ErrorBoundary from './src/components/ErrorBoundary';
import { notificationService } from './src/services/notificationService';
import { syncService } from './src/services/syncService';
import { offlineService } from './src/services/offlineService';

export default function App() {
  useEffect(() => {
    // Initialize player store in background
    initializePlayerStore().catch(error => {
      console.error('Error initializing player store:', error);
    });
    
    // Initialize notification service
    const initNotifications = async () => {
      try {
        console.log('🔔 Initializing notification service...');
        
        // Web platformada push notifications uchun alohida tekshirish
        if (Platform.OS === 'web') {
          console.log('🌐 Web platform detected - initializing web push notifications');
          
          // Web uchun permission tekshirish
          const permissions = await notificationService.getPermissions();
          console.log('📋 Current permissions:', permissions);
          
          if (permissions.status !== 'granted') {
            console.log('🔔 Requesting notification permissions...');
            const newPermissions = await notificationService.requestPermissions();
            console.log('📋 New permissions:', newPermissions);
          }
        }
        
        const success = await notificationService.initialize();
        if (success) {
          console.log('✅ Notification service initialized');
          notificationService.setupNotificationListeners();
          
          // Send token to server
          await notificationService.sendTokenToServer();
        } else {
          console.log('❌ Notification service initialization failed - this is normal for web development');
        }
      } catch (error) {
        console.error('❌ Error initializing notifications:', error);
        console.log('💡 This is normal for web development - push notifications work on mobile devices');
      }
    };
    
    initNotifications();
    
    // Initialize sync service
    const initSync = async () => {
      try {
        console.log('🔄 Initializing sync service...');
        syncService.setOnlineStatus(true);
        await syncService.forceSync();
        console.log('✅ Sync service initialized');
      } catch (error) {
        console.error('Error initializing sync service:', error);
      }
    };
    
    initSync();
    
    // Ensure Platform is available
    if (Platform.OS) {
      console.log('Platform detected:', Platform.OS);
    }
    
    // Cleanup on unmount
    return () => {
      notificationService.cleanup();
      syncService.cleanup();
    };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

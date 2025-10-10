import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

import AppNavigator from './src/navigation/AppNavigator';
import { initializePlayerStore } from './src/store/usePlayerStore';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { notificationService } from './src/services/notificationService';
import { syncService } from './src/services/syncService';
import { offlineService } from './src/services/offlineService';
import { realTimeService } from './src/services/realTimeService';
import { ThemeProvider } from './src/providers/ThemeProvider';
import { UpdateModal } from './src/components/UpdateModal';
import { useUpdateModal } from './src/hooks/useUpdateModal';
import UpdateService from './src/services/updateService';

export default function App() {
  const updateModal = useUpdateModal();

  useEffect(() => {
    // Set up update modal callback
    updateModal.setupUpdateCallback();
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
    
    // Initialize real-time service
    const initRealTime = async () => {
      try {
        console.log('🔌 Initializing real-time service...');
        await realTimeService.connect();
        console.log('✅ Real-time service connected');
        
        // Set up real-time listeners
        realTimeService.subscribe('match_update', (data) => {
          console.log('📊 Match update received:', data);
          // Trigger sync when real-time update received
          syncService.forceSync();
        });
        
        realTimeService.subscribe('team_update', (data) => {
          console.log('👥 Team update received:', data);
          syncService.forceSync();
        });
        
        realTimeService.subscribe('player_update', (data) => {
          console.log('⚽ Player update received:', data);
          syncService.forceSync();
        });
        
      } catch (error) {
        console.error('❌ Error initializing real-time service:', error);
        console.log('💡 Real-time updates will not be available');
      }
    };
    
    initRealTime();
    
    // Initialize update checking
    const initUpdates = async () => {
      try {
        console.log('🔄 Initializing update service...');
        await UpdateService.checkUpdateOnAppStart();
        console.log('✅ Update service initialized');
      } catch (error) {
        console.error('❌ Error initializing update service:', error);
      }
    };
    
    initUpdates();
    
    // Ensure Platform is available
    if (Platform.OS) {
      console.log('Platform detected:', Platform.OS);
    }
    
    // Cleanup on unmount
    return () => {
      notificationService.cleanup();
      syncService.cleanup();
      realTimeService.disconnect();
    };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider style={{ backgroundColor: 'transparent' }}>
        <ThemeProvider>
          <AppNavigator />
          <StatusBar style="auto" backgroundColor="transparent" translucent />
          
          {/* Update Modal */}
          <UpdateModal
            visible={updateModal.isVisible}
            updateInfo={updateModal.updateInfo}
            onUpdate={updateModal.handleUpdate}
            onLater={updateModal.handleLater}
            onClose={updateModal.hideUpdateModal}
            isUpdating={updateModal.isUpdating}
            updateProgress={updateModal.updateProgress}
          />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

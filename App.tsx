if (typeof global !== 'undefined' && (global as any).ErrorUtils) {
  const defaultHandler = (global as any).ErrorUtils.getGlobalHandler();
  (global as any).ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    console.error('=== EXPLICIT ERROR STACK TRACE ===\n', error, '\nSTACK:\n', error?.stack);
    if (defaultHandler) defaultHandler(error, isFatal);
  });
}

import 'expo-dev-client';
import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './store/useAuthStore';
import { createStackNavigator } from '@react-navigation/stack';
import AppNavigator from './navigation/AppNavigator';
import AuthNavigator from './navigation/AuthNavigator';
import WelcomeScreen from './screens/WelcomeScreen';
import JoinApplicationScreen from './screens/JoinApplicationScreen';
import MyStatsScreen from './screens/MyStatsScreen';
import TransferRequestScreen from './screens/TransferRequestScreen';
import FormationBoard from './screens/FormationBoard';
import TeamChatScreen from './screens/TeamChatScreen';
import StandingsScreen from './screens/StandingsScreen';
import TeamsScreen from './screens/TeamsScreen';
import PlayersScreen from './screens/PlayersScreen';
import PlayerStatsScreen from './screens/PlayerStatsScreen';
import TournamentDetailScreen from './screens/TournamentDetailScreen';
import NewsDetailScreen from './screens/NewsDetailScreen';
import MatchDetailScreen from './screens/MatchDetailScreen';
import CalendarMatchesScreen from './screens/CalendarMatchesScreen';
import TeamProfileScreen from './screens/TeamProfileScreen';
import MyTeamScreen from './screens/MyTeamScreen';
import ApplicationsScreen from './screens/ApplicationsScreen';
import SecuritySettingsScreen from './screens/SecuritySettingsScreen';
import Colors from './constants/Colors';
import { SocketProvider } from './context/SocketContext';
import { notificationService } from './services/notificationService';
import VideoBackground from './components/VideoBackground';

import * as SplashScreenExpo from 'expo-splash-screen';
import SplashScreen from './screens/SplashScreen';

// Keep the splash screen visible while we fetch resources on native devices
if (Platform.OS !== 'web') {
    SplashScreenExpo.preventAutoHideAsync().catch(() => {});
}

import NotificationsScreen from './screens/NotificationsScreen';

const Stack = createStackNavigator();
export const navigationRef = createNavigationContainerRef();

function App() {
    const { isAuthenticated, isGuest, user } = useAuthStore();
    const [isSplashVisible, setIsSplashVisible] = React.useState(Platform.OS !== 'web');

    React.useEffect(() => {
        if (Platform.OS === 'web') return;

        const setupNotifications = async () => {
            try {
                const userId = user ? ((user as any)._id || (user as any).id) : 'guest';
                
                await notificationService.setupAndroidChannel();
                await notificationService.registerForPushNotificationsAsync(userId);
                console.log('🔔 Push system initialized for:', userId);
            } catch (error) {
                console.warn('⚠️ Push setup error:', error);
            }
        };
        setupNotifications();

        // 📱 Handle tapping on Push Notifications (Deep Linking)
        const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
            try {
                const data = response?.notification?.request?.content?.data;
                console.log('📱 Notification Tapped with data:', data);
                if (!data) return;

                if (data.type === 'news' || data.newsId) {
                    if (navigationRef.isReady()) {
                        (navigationRef as any).navigate('NewsDetail', { newsId: data.newsId });
                    }
                } else if (data.type === 'match_scheduled' || data.matchId) {
                    if (navigationRef.isReady()) {
                        (navigationRef as any).navigate('MatchDetail', { matchId: data.matchId });
                    }
                } else if (data.type === 'profile_update_status' || data.type === 'application') {
                    if (navigationRef.isReady()) {
                        (navigationRef as any).navigate('Applications');
                    }
                } else if (data.type === 'transfer_status' || data.type === 'transfer') {
                    if (navigationRef.isReady()) {
                        (navigationRef as any).navigate('TransferRequest');
                    }
                }
            } catch (err) {
                console.warn('Push notification navigation error:', err);
            }
        });

        // Cold-start notification check (when app was closed and opened via notification)
        Notifications.getLastNotificationResponseAsync().then((response) => {
            if (response) {
                const data = response?.notification?.request?.content?.data;
                if (!data) return;

                setTimeout(() => {
                    if (navigationRef.isReady()) {
                        if (data.type === 'news' || data.newsId) {
                            (navigationRef as any).navigate('NewsDetail', { newsId: data.newsId });
                        } else if (data.type === 'match_scheduled' || data.matchId) {
                            (navigationRef as any).navigate('MatchDetail', { matchId: data.matchId });
                        } else if (data.type === 'profile_update_status') {
                            (navigationRef as any).navigate('Applications');
                        } else if (data.type === 'transfer_status') {
                            (navigationRef as any).navigate('TransferRequest');
                        }
                    }
                }, 1200);
            }
        });

        return () => {
            responseListener.remove();
        };
    }, [isAuthenticated, user]);

    if (isSplashVisible) {
        return (
            <SplashScreen 
                onFinish={() => {
                    setIsSplashVisible(false);
                }} 
            />
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider style={{ backgroundColor: '#000' }}>
                <SocketProvider>
                    <VideoBackground
                        source={require('./assets/images/welcomeScreenVideo1.mp4')}
                        overlayOpacity={0.78}
                        style={StyleSheet.absoluteFill}
                    >
                        <NavigationContainer 
                            ref={navigationRef}
                            key={isAuthenticated ? `auth_user_${(user as any)?._id || (user as any)?.id}` : (isGuest ? 'guest' : 'unauth')}
                            theme={{
                            ...DarkTheme,
                            colors: {
                                ...DarkTheme.colors,
                                primary: Colors.primary,
                                background: 'transparent',
                                card: 'transparent',
                                text: Colors.text,
                                border: Colors.border,
                                notification: Colors.danger,
                            }
                        }}>
                            {isAuthenticated || isGuest ? (
                                <Stack.Navigator 
                                    screenOptions={{ 
                                        headerShown: false,
                                        cardStyle: { backgroundColor: 'transparent' }
                                    }}
                                >
                                    <Stack.Screen name="MainTabs" component={AppNavigator} />
                                    <Stack.Screen name="Welcome" component={WelcomeScreen} />
                                    <Stack.Screen name="JoinApplication" component={JoinApplicationScreen} />
                                    <Stack.Screen name="MyStats" component={MyStatsScreen} />
                                    <Stack.Screen name="TransferRequest" component={TransferRequestScreen} />
                                    <Stack.Screen name="Applications" component={ApplicationsScreen} />
                                    <Stack.Screen name="FormationBoard" component={FormationBoard} />
                                    <Stack.Screen name="TeamChat" component={TeamChatScreen} />
                                    <Stack.Screen name="Standings" component={StandingsScreen} />
                                    <Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} />
                                    <Stack.Screen name="NewsDetail" component={NewsDetailScreen} />
                                    <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
                                    <Stack.Screen name="CalendarMatches" component={CalendarMatchesScreen} />
                                    <Stack.Screen name="Teams" component={TeamsScreen} />
                                    <Stack.Screen name="TeamProfile" component={TeamProfileScreen} />
                                    <Stack.Screen name="MyTeam" component={MyTeamScreen} />
                                    <Stack.Screen name="Players" component={PlayersScreen} />
                                    <Stack.Screen name="PlayerStats" component={PlayerStatsScreen} />
                                    <Stack.Screen name="Notifications" component={NotificationsScreen} />
                                    <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
                                </Stack.Navigator>
                            ) : (
                                <AuthNavigator />
                            )}
                            <StatusBar style="light" />
                        </NavigationContainer>
                    </VideoBackground>
                </SocketProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

export default App;

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
import { useThemeStore } from './store/useThemeStore';
import { createStackNavigator, CardStyleInterpolators, TransitionPresets } from '@react-navigation/stack';
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
import SystemSettingsScreen from './screens/SystemSettingsScreen';
import Colors from './constants/Colors';
import { SocketProvider } from './context/SocketContext';
import { notificationService } from './services/notificationService';

import * as SplashScreenExpo from 'expo-splash-screen';
import SplashScreen from './screens/SplashScreen';

// Keep the splash screen visible while we fetch resources on native devices
if (Platform.OS !== 'web') {
    SplashScreenExpo.preventAutoHideAsync().catch(() => {});
}

import NotificationsScreen from './screens/NotificationsScreen';
import './i18n';
import { initI18n } from './i18n';

const Stack = createStackNavigator();
export const navigationRef = createNavigationContainerRef();

function App() {
    const { isAuthenticated, isGuest, user } = useAuthStore();
    const [isSplashVisible, setIsSplashVisible] = React.useState(Platform.OS !== 'web');

    React.useEffect(() => {
        initI18n().catch((e) => console.warn('i18n init error:', e));
        useThemeStore.getState().loadTheme().catch((e) => console.warn('theme init error:', e));
    }, []);

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
                } else if (data.type === 'team_chat' || data.type === 'chat' || data.teamId) {
                    if (navigationRef.isReady() && data.teamId) {
                        (navigationRef as any).navigate('TeamChat', { teamId: data.teamId });
                    }
                }
            } catch (err) {
                console.warn('Push notification navigation error:', err);
            }
        });

        // Cold-start notification check (when app was closed and opened via notification)
        Notifications.getLastNotificationResponseAsync()
            .then((response) => {
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
                            } else if (data.type === 'team_chat' || data.type === 'chat' || data.teamId) {
                                (navigationRef as any).navigate('TeamChat', { teamId: data.teamId });
                            }
                        }
                    }, 1200);
                }
            })
            .catch((err) => {
                console.warn('Cold start notification check notice:', err);
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
                    <NavigationContainer 
                        ref={navigationRef}
                        key={isAuthenticated ? `auth_user_${(user as any)?._id || (user as any)?.id}` : (isGuest ? 'guest' : 'unauth')}
                        theme={{
                        ...DarkTheme,
                        colors: {
                            ...DarkTheme.colors,
                            primary: Colors.primary,
                            background: '#000000',
                            card: '#000000',
                            text: Colors.text,
                            border: Colors.border,
                            notification: Colors.danger,
                        }
                    }}>
                        {isAuthenticated || isGuest ? (
                            <Stack.Navigator 
                                screenOptions={{ 
                                    headerShown: false,
                                    cardStyle: { backgroundColor: '#000000' },
                                    cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                                    gestureEnabled: true,
                                    gestureDirection: 'horizontal',
                                }}
                            >
                                <Stack.Screen name="MainTabs" component={AppNavigator} />
                                    <Stack.Screen name="Welcome" component={WelcomeScreen} />
                                    <Stack.Screen 
                                        name="JoinApplication" 
                                        component={JoinApplicationScreen} 
                                        options={{ 
                                            presentation: 'transparentModal',
                                            cardStyle: { backgroundColor: 'transparent' },
                                            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                                            gestureEnabled: true,
                                            gestureDirection: 'horizontal',
                                        }} 
                                    />
                                    <Stack.Screen name="MyStats" component={MyStatsScreen} />
                                    <Stack.Screen name="TransferRequest" component={TransferRequestScreen} />
                                    <Stack.Screen name="Applications" component={ApplicationsScreen} />
                                    <Stack.Screen 
                                        name="FormationBoard" 
                                        component={FormationBoard} 
                                        options={{ 
                                            presentation: 'transparentModal',
                                            cardStyle: { backgroundColor: 'transparent' },
                                            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                                            gestureEnabled: true,
                                            gestureDirection: 'horizontal',
                                        }} 
                                    />
                                    <Stack.Screen 
                                        name="TeamChat" 
                                        component={TeamChatScreen} 
                                        options={{ 
                                            presentation: 'transparentModal',
                                            cardStyle: { backgroundColor: 'transparent' },
                                            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                                            gestureEnabled: true,
                                            gestureDirection: 'horizontal',
                                        }} 
                                    />
                                    <Stack.Screen name="Standings" component={StandingsScreen} />
                                    <Stack.Screen 
                                        name="TournamentDetail" 
                                        component={TournamentDetailScreen} 
                                        options={{ 
                                            presentation: 'transparentModal',
                                            cardStyle: { backgroundColor: 'transparent' },
                                            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                                            gestureEnabled: true,
                                            gestureDirection: 'horizontal',
                                        }} 
                                    />
                                    <Stack.Screen 
                                        name="NewsDetail" 
                                        component={NewsDetailScreen} 
                                        options={{ 
                                            presentation: 'transparentModal',
                                            cardStyle: { backgroundColor: 'transparent' },
                                            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                                            gestureEnabled: true,
                                            gestureDirection: 'horizontal',
                                        }} 
                                    />
                                    <Stack.Screen 
                                        name="MatchDetail" 
                                        component={MatchDetailScreen} 
                                        options={{ 
                                            presentation: 'transparentModal',
                                            cardStyle: { backgroundColor: 'transparent' },
                                            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                                            gestureEnabled: true,
                                            gestureDirection: 'horizontal',
                                        }} 
                                    />
                                    <Stack.Screen 
                                        name="CalendarMatches" 
                                        component={CalendarMatchesScreen} 
                                        options={{ 
                                            presentation: 'transparentModal',
                                            cardStyle: { backgroundColor: 'transparent' },
                                            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                                            gestureEnabled: true,
                                            gestureDirection: 'horizontal',
                                        }} 
                                    />
                                    <Stack.Screen name="Teams" component={TeamsScreen} />
                                    <Stack.Screen 
                                        name="TeamProfile" 
                                        component={TeamProfileScreen} 
                                        options={{ 
                                            presentation: 'transparentModal',
                                            cardStyle: { backgroundColor: 'transparent' },
                                            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                                            gestureEnabled: true,
                                            gestureDirection: 'horizontal',
                                        }} 
                                    />
                                    <Stack.Screen 
                                        name="MyTeam" 
                                        component={MyTeamScreen} 
                                        options={{ 
                                            presentation: 'transparentModal',
                                            cardStyle: { backgroundColor: 'transparent' },
                                            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                                            gestureEnabled: true,
                                            gestureDirection: 'horizontal',
                                        }} 
                                    />
                                    <Stack.Screen name="Players" component={PlayersScreen} />
                                    <Stack.Screen 
                                        name="PlayerStats" 
                                        component={PlayerStatsScreen} 
                                        options={{ 
                                            presentation: 'transparentModal',
                                            cardStyle: { backgroundColor: 'transparent' },
                                            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                                            gestureEnabled: true,
                                            gestureDirection: 'horizontal',
                                        }} 
                                    />
                                    <Stack.Screen 
                                        name="Notifications" 
                                        component={NotificationsScreen} 
                                        options={{ 
                                            presentation: 'transparentModal',
                                            cardStyle: { backgroundColor: 'transparent' },
                                            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                                            gestureEnabled: true,
                                            gestureDirection: 'horizontal',
                                        }} 
                                    />
                                    <Stack.Screen 
                                        name="SecuritySettings" 
                                        component={SecuritySettingsScreen} 
                                        options={{ 
                                            presentation: 'transparentModal',
                                            cardStyle: { backgroundColor: 'transparent' },
                                            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                                            gestureEnabled: true,
                                            gestureDirection: 'horizontal',
                                        }} 
                                    />
                                    <Stack.Screen 
                                        name="SystemSettings" 
                                        component={SystemSettingsScreen} 
                                        options={{ 
                                            presentation: 'transparentModal',
                                            cardStyle: { backgroundColor: 'transparent' },
                                            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                                            gestureEnabled: true,
                                            gestureDirection: 'horizontal',
                                        }} 
                                    />
                                </Stack.Navigator>
                            ) : (
                                <AuthNavigator />
                            )}
                            <StatusBar style="light" />
                        </NavigationContainer>
                </SocketProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

export default App;

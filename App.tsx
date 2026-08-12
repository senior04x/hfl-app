import 'expo-dev-client';
import React from 'react';
import { StyleSheet } from 'react-native';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://dummy@sentry.io/1234567',
  tracesSampleRate: 1.0,
});
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
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
import Colors from './constants/Colors';
import { SocketProvider } from './context/SocketContext';
import { notificationService } from './services/notificationService';
import VideoBackground from './components/VideoBackground';

import * as SplashScreenExpo from 'expo-splash-screen';
import SplashScreen from './screens/SplashScreen';

// Keep the splash screen visible while we fetch resources
SplashScreenExpo.preventAutoHideAsync().catch(() => {
    /* reloading the app might cause this error, safe to ignore */
});

import NotificationsScreen from './screens/NotificationsScreen';

const Stack = createStackNavigator();

function App() {
    const { isAuthenticated, isGuest, user } = useAuthStore();
    const [isSplashVisible, setIsSplashVisible] = React.useState(true);

    React.useEffect(() => {
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

export default Sentry.wrap(App);

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './store/useAuthStore';
import { createStackNavigator } from '@react-navigation/stack';
import AppNavigator from './navigation/AppNavigator';
import AuthNavigator from './navigation/AuthNavigator';
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
import Colors from './constants/Colors';
import { SocketProvider } from './context/SocketContext';

import SplashScreen from './screens/SplashScreen';

const Stack = createStackNavigator();

export default function App() {
    const { isAuthenticated, isGuest } = useAuthStore();
    const [isSplashVisible, setIsSplashVisible] = React.useState(true);

    if (isSplashVisible) {
        return <SplashScreen onFinish={() => setIsSplashVisible(false)} />;
    }

    return (
        <SafeAreaProvider style={{ backgroundColor: Colors.background }}>
            <SocketProvider>
                <NavigationContainer theme={{
                    ...DarkTheme,
                    colors: {
                        ...DarkTheme.colors,
                        primary: Colors.primary,
                        background: Colors.background,
                        card: Colors.surface,
                        text: Colors.text,
                        border: Colors.border,
                        notification: Colors.danger,
                    }
                }}>
                    {isAuthenticated || isGuest ? (
                        <Stack.Navigator screenOptions={{ headerShown: false }}>
                            <Stack.Screen name="MainTabs" component={AppNavigator} />
                            <Stack.Screen name="JoinApplication" component={JoinApplicationScreen} />
                            <Stack.Screen name="MyStats" component={MyStatsScreen} />
                            <Stack.Screen name="TransferRequest" component={TransferRequestScreen} />
                            <Stack.Screen name="FormationBoard" component={FormationBoard} />
                            <Stack.Screen name="TeamChat" component={TeamChatScreen} />
                            <Stack.Screen name="Standings" component={StandingsScreen} />
                            <Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} />
                            <Stack.Screen name="NewsDetail" component={NewsDetailScreen} />
                            <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
                            <Stack.Screen name="CalendarMatches" component={CalendarMatchesScreen} />
                            <Stack.Screen name="Teams" component={TeamsScreen} />
                            <Stack.Screen name="TeamProfile" component={TeamProfileScreen} />
                            <Stack.Screen name="Players" component={PlayersScreen} />
                            <Stack.Screen name="PlayerStats" component={PlayerStatsScreen} />
                        </Stack.Navigator>
                    ) : (
                        <AuthNavigator />
                    )}
                    <StatusBar style="light" />
                </NavigationContainer>
            </SocketProvider>
        </SafeAreaProvider>
    );
}

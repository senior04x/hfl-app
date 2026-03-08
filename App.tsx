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
import Colors from './constants/Colors';
import { SocketProvider } from './context/SocketContext';

const Stack = createStackNavigator();

export default function App() {
    const { isAuthenticated, isGuest } = useAuthStore();

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

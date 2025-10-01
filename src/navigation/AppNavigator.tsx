import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList, MainTabParamList } from '../types';
import SplashScreen from '../screens/SplashScreen';
import SimpleHomeScreen from '../screens/SimpleHomeScreen';
import MatchesScreen from '../screens/MatchesScreen';
import TeamsScreen from '../screens/TeamsScreen';
import StandingsScreen from '../screens/StandingsScreen';
import UserAccountScreen from '../screens/UserAccountScreen';
import MatchDetailScreen from '../screens/MatchDetailScreen';
import TeamDetailScreen from '../screens/TeamDetailScreen';
import PlayerStatsScreen from '../screens/PlayerStatsScreen';
import TeamSelectionScreen from '../screens/TeamSelectionScreen';
import PlayerRegistrationScreen from '../screens/PlayerRegistrationScreen';
import PlayerLoginScreen from '../screens/PlayerLoginScreen';
import PlayerVerificationScreen from '../screens/PlayerVerificationScreen';
import PlayerDashboardScreen from '../screens/PlayerDashboardScreen';
import TeamApplicationScreen from '../screens/TeamApplicationScreen';
import TransferRequestScreen from '../screens/TransferRequestScreen';

import LoadingScreen from '../components/LoadingScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Matches') {
            iconName = focused ? 'football' : 'football-outline';
          } else if (route.name === 'Teams') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Standings') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Account') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={SimpleHomeScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Teams" component={TeamsScreen} />
      <Tab.Screen name="Standings" component={StandingsScreen} />
      <Tab.Screen name="Account" component={UserAccountScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen 
          name="MatchDetail" 
          component={MatchDetailScreen}
          options={{ headerShown: true, title: 'Match Details' }}
        />
        <Stack.Screen 
          name="TeamDetail" 
          component={TeamDetailScreen}
          options={{ headerShown: true, title: 'Team Details' }}
        />
        <Stack.Screen 
          name="PlayerStats" 
          component={PlayerStatsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="TeamSelection" 
          component={TeamSelectionScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PlayerRegistration" 
          component={PlayerRegistrationScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PlayerLogin" 
          component={PlayerLoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PlayerVerification" 
          component={PlayerVerificationScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PlayerDashboard" 
          component={PlayerDashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="TeamApplication" 
          component={TeamApplicationScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="TransferRequest" 
          component={TransferRequestScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';

import { RootStackParamList, MainTabParamList } from '../types';
import SplashScreen from '../screens/SplashScreen';
import SimpleHomeScreen from '../screens/SimpleHomeScreen';
import MatchesScreen from '../screens/MatchesScreen';
import TeamsScreen from '../screens/TeamsScreen';
import StandingsScreen from '../screens/StandingsScreen';
import UserAccountScreen from '../screens/UserAccountScreen';
import MatchDetailScreen from '../screens/MatchDetailScreen';
import LeagueMatchesScreen from '../screens/LeagueMatchesScreen';
import TeamDetailScreen from '../screens/TeamDetailScreen';
import PlayerStatsScreen from '../screens/PlayerStatsScreen';
import TeamSelectionScreen from '../screens/TeamSelectionScreen';
import PlayerRegistrationScreen from '../screens/PlayerRegistrationScreen';
import PlayerLoginScreen from '../screens/PlayerLoginScreen';
import PlayerVerificationScreen from '../screens/PlayerVerificationScreen';
import PlayerDashboardScreen from '../screens/PlayerDashboardScreen';
import TeamApplicationScreen from '../screens/TeamApplicationScreen';
import LeagueApplicationScreen from '../screens/LeagueApplicationScreen';
import TransferRequestScreen from '../screens/TransferRequestScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PlayerTransferRequestScreen from '../screens/PlayerTransferRequestScreen';
import TeamTransferRequestScreen from '../screens/TeamTransferRequestScreen';

import LoadingScreen from '../components/LoadingScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  const { colors } = useTheme();
  const { getText } = useLanguage();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let iconName: string;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Matches') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Teams') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Standings') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Account') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName as any} size={26} color={color} />;
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          height: 50,
          paddingBottom: 6,
          paddingTop: 3,
          marginHorizontal: 6,
          marginBottom: 25,
          marginTop: 0,
          borderRadius: 60,
          justifyContent: 'center',
          alignItems: 'center',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarShowLabel: false,
        headerShown: false,
        tabBarBackground: () => null,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={SimpleHomeScreen} 
        options={{ title: '' }}
      />
      <Tab.Screen 
        name="Matches" 
        component={MatchesScreen} 
        options={{ title: '' }}
      />
      <Tab.Screen 
        name="Teams" 
        component={TeamsScreen} 
        options={{ title: '' }}
      />
      <Tab.Screen 
        name="Standings" 
        component={StandingsScreen} 
        options={{ title: '' }}
      />
      <Tab.Screen 
        name="Account" 
        component={UserAccountScreen}
        options={{ title: '' }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { colors, isDarkMode } = useTheme();
  const { getText } = useLanguage();
  
  return (
    <NavigationContainer
      theme={{
        dark: isDarkMode,
        colors: {
          primary: colors.primary,
          background: 'transparent',
          card: colors.card,
          text: colors.text,
          border: colors.border,
          notification: colors.primary,
        },
      }}
    >
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          cardStyle: { backgroundColor: colors.background },
        }} 
        initialRouteName="Splash"
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen 
          name="MatchDetail" 
          component={MatchDetailScreen}
          options={{ 
            headerShown: true, 
            title: getText('matchDetails'),
            headerStyle: { backgroundColor: colors.header },
            headerTintColor: colors.headerText,
            headerTitleStyle: { color: colors.headerText },
          }}
        />
        <Stack.Screen 
          name="LeagueMatches" 
          component={LeagueMatchesScreen}
          options={{ 
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="TeamDetail" 
          component={TeamDetailScreen}
          options={{ 
            headerShown: true, 
            title: getText('teamDetails'),
            headerStyle: { backgroundColor: colors.header },
            headerTintColor: colors.headerText,
            headerTitleStyle: { color: colors.headerText },
          }}
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
          name="LeagueApplication" 
          component={LeagueApplicationScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="TransferRequest" 
          component={TransferRequestScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PlayerTransferRequest" 
          component={PlayerTransferRequestScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="TeamTransferRequest" 
          component={TeamTransferRequestScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

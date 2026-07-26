import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from '../screens/WelcomeScreen';
import JoinApplicationScreen from '../screens/JoinApplicationScreen';

const Stack = createStackNavigator();

export default function AuthNavigator() {
    return (
        <Stack.Navigator 
            screenOptions={{ 
                headerShown: false,
                cardStyle: { backgroundColor: 'transparent' }
            }}
        >
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="JoinApplication" component={JoinApplicationScreen} />
        </Stack.Navigator>
    );
}

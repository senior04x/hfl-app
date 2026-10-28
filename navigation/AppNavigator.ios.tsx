import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, PanResponder, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { useTranslation } from 'react-i18next';
import Colors from '../constants/Colors';
import { useThemeStore } from '../store/useThemeStore';
import { TabSwipeProvider, useTabSwipe } from '../context/TabSwipeContext';
import { NavBarScrollProvider } from '../context/NavBarScrollContext';
import HomeScreen from '../screens/HomeScreen';
import TournamentsScreen from '../screens/TournamentsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import NewsScreen from '../screens/NewsScreen';
import AccountScreen from '../screens/AccountScreen';
import { CustomFloatingTabBar, type AccountSwitcherHandle } from './SwipeableAppNavigator';
import { APP_TABS, adjacentTabForSwipe, resolveAppTab, type AppTabName, type AppTabParamList } from './tabRoutes';

const Tab = createNativeBottomTabNavigator<AppTabParamList>();
const SCREENS: Record<AppTabName, React.ComponentType<any>> = {
    Asosiy: HomeScreen,
    Turnirlar: TournamentsScreen,
    Taqvim: CalendarScreen,
    Yangiliklar: NewsScreen,
    Profil: AccountScreen,
};

function TabScene({ navigation, route }: any) {
    const { isSwipeDisabled } = useTabSwipe();
    const isFocused = useIsFocused();
    const visited = useRef(isFocused);
    if (isFocused) visited.current = true;
    const { width } = useWindowDimensions();
    const backgroundColor = useThemeStore(state => state.colors.background);
    const pan = useMemo(() => PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => isFocused && !isSwipeDisabled
            && gesture.numberActiveTouches === 1 && Math.abs(gesture.dx) > 28
            && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
        onPanResponderRelease: (_, gesture) => {
            if (!isFocused || isSwipeDisabled) return;
            const next = adjacentTabForSwipe(route.name, gesture.dx, gesture.dy, gesture.vx, width);
            if (next) navigation.navigate(next);
        },
    }), [isFocused, isSwipeDisabled, navigation, route.name, width]);
    const Screen = SCREENS[route.name as AppTabName];
    return <View style={[styles.scene, { backgroundColor }]} {...pan.panHandlers}>
        {visited.current ? <Screen navigation={navigation} route={route} />
            : <View style={styles.placeholder}><ActivityIndicator color={Colors.primary} /></View>}
    </View>;
}

function NativeTabs({ navigation, route }: any) {
    const { t } = useTranslation();
    const switcher = useRef<AccountSwitcherHandle>(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const targetTab = resolveAppTab(route?.params?.screen ?? route?.params?.tab);
    useEffect(() => {
        // Preserve case-insensitive destinations and the previous `tab` alias.
        if (targetTab && route?.params?.screen !== targetTab) {
            navigation.navigate('MainTabs', { screen: targetTab, tab: undefined });
        }
    }, [navigation, targetTab, route?.params?.screen]);
    return <View style={styles.scene}>
        <Tab.Navigator initialRouteName={targetTab ?? 'Asosiy'} backBehavior="none"
            screenOptions={{
                headerShown: false,
                // Mount lightweight, themed shells up front; data screens wait for focus.
                // UIKit can then switch immediately without exposing an empty/black scene.
                lazy: false,
                tabBarActiveTintColor: Colors.primary,
                tabBarControllerMode: 'tabBar',
                tabBarMinimizeBehavior: 'onScrollDown',
                // UIKit chooses its own glass material on iOS 26+. Do not paint over it.
                tabBarBlurEffect: 'systemDefault',
            }}>
            {APP_TABS.map(tab => <Tab.Screen key={tab.key} name={tab.name}
                component={TabScene}
                options={{
                    title: t(tab.nameKey, tab.defaultName),
                    tabBarLabel: t(tab.nameKey, tab.defaultName),
                    tabBarIcon: ({ focused }) => ({ type: 'sfSymbol', name: focused ? tab.selectedSymbol : tab.sfSymbol }),
                }}
                listeners={({ navigation }) => ({
                    tabPress: () => {
                        // UIKit has no JS long-press event. Re-tap Profile for the same switcher.
                        if (tab.name === 'Profil' && navigation.isFocused()) switcher.current?.open();
                    },
                })}
            />)}
        </Tab.Navigator>
        <CustomFloatingTabBar nativeOnly switcherRef={switcher} activeIndex={0}
            scrollX={scrollX} onTabPress={() => {}} navigation={null} />
    </View>;
}

export default function AppNavigator(props: any) {
    return <TabSwipeProvider><NavBarScrollProvider>
        <NativeTabs {...props} />
    </NavBarScrollProvider></TabSwipeProvider>;
}

const styles = StyleSheet.create({
    scene: { flex: 1 },
    placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { useTranslation } from 'react-i18next';
import Colors from '../constants/Colors';
import { useThemeStore } from '../store/useThemeStore';
import { TabSwipeProvider } from '../context/TabSwipeContext';
import { NavBarScrollProvider } from '../context/NavBarScrollContext';
import HomeScreen from '../screens/HomeScreen';
import TournamentsScreen from '../screens/TournamentsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import NewsScreen from '../screens/NewsScreen';
import AccountScreen from '../screens/AccountScreen';
import { CustomFloatingTabBar, type AccountSwitcherHandle } from './SwipeableAppNavigator';
import { APP_TABS, resolveAppTab, type AppTabName, type AppTabParamList } from './tabRoutes';
import { useAuthStore } from '../store/useAuthStore';
import NativeTabAvatar from '../components/NativeTabAvatar.ios';
import { profileTabPhoto } from './profileTabPhoto';

const Tab = createNativeBottomTabNavigator<AppTabParamList>();
const SCREENS: Record<AppTabName, React.ComponentType<any>> = {
    Asosiy: HomeScreen,
    Turnirlar: TournamentsScreen,
    Taqvim: CalendarScreen,
    Yangiliklar: NewsScreen,
    Profil: AccountScreen,
};

function TabScene({ navigation, route }: any) {
    const isFocused = useIsFocused();
    const visited = useRef(isFocused);
    if (isFocused) visited.current = true;
    const backgroundColor = useThemeStore(state => state.colors.background);
    const Screen = SCREENS[route.name as AppTabName];
    return <View style={[styles.scene, { backgroundColor }]}>
        {visited.current ? <Screen navigation={navigation} route={route} />
            : <View style={styles.placeholder}><ActivityIndicator color={Colors.primary} /></View>}
    </View>;
}

function NativeTabs({ navigation, route }: any) {
    const { t } = useTranslation();
    const switcher = useRef<AccountSwitcherHandle>(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const user = useAuthStore(state => state.isGuest ? null : state.user);
    const photo = profileTabPhoto(user);
    const photoKey = `${user?.appUserId ?? user?.id ?? user?._id ?? ''}:${photo ?? ''}`;
    const [preparedPhoto, setPreparedPhoto] = useState<{ key: string; uri: string } | null>(null);
    const photoReady = useCallback((uri: string) => setPreparedPhoto({ key: photoKey, uri }), [photoKey]);
    const photoIcon = photo && preparedPhoto?.key === photoKey ? preparedPhoto.uri : undefined;
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
                    tabBarIcon: ({ focused }) => tab.name === 'Profil' && photoIcon
                        ? { type: 'image', source: { uri: photoIcon, width: 28, height: 28, scale: 3 }, tinted: false }
                        : { type: 'sfSymbol', name: focused ? tab.selectedSymbol : tab.sfSymbol },
                }}
                listeners={({ navigation }) => ({
                    tabPress: () => {
                        // UIKit has no JS long-press event. Re-tap Profile for the same switcher.
                        if (tab.name === 'Profil' && navigation.isFocused()) switcher.current?.open();
                    },
                })}
            />)}
        </Tab.Navigator>
        {photo && <NativeTabAvatar key={photoKey} uri={photo} onReady={photoReady} />}
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

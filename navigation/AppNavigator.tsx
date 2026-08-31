import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    Platform,
    StyleSheet,
    View,
    TouchableOpacity,
    Dimensions,
    Animated,
    PanResponder,
    Text,
    Modal,
    ActivityIndicator,
    Image,
    Alert,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SmartBlurView as BlurView } from '../components/SmartBlurView';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/Colors';
import { useAuthStore } from '../store/useAuthStore';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { apiService, clearApiCache } from '../services/apiService';
import SmartImage from '../components/SmartImage';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../store/useThemeStore';
import { TabSwipeProvider, useTabSwipe } from '../context/TabSwipeContext';

import HomeScreen from '../screens/HomeScreen';
import TournamentsScreen from '../screens/TournamentsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import NewsScreen from '../screens/NewsScreen';
import AccountScreen from '../screens/AccountScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_ANDROID = Platform.OS === 'android';
const CAPSULE_WIDTH = IS_ANDROID ? SCREEN_WIDTH : SCREEN_WIDTH - 72;
const TAB_COUNT = 5;
const TAB_ITEM_WIDTH = (CAPSULE_WIDTH - 8) / TAB_COUNT;
const HIGHLIGHT_WIDTH = TAB_ITEM_WIDTH - (IS_ANDROID ? 4 : 2);
const HIGHLIGHT_OFFSET = IS_ANDROID ? 2 : 1;

const TABS = [
    { key: 'Asosiy', name: 'Asosiy', icon: 'home-outline' },
    { key: 'Turnirlar', name: 'Turnirlar', icon: 'trophy-outline' },
    { key: 'Taqvim', name: 'Taqvim', icon: 'calendar-outline' },
    { key: 'Yangiliklar', name: 'Yangiliklar', icon: 'newspaper-outline' },
    { key: 'Profil', name: 'Profil', icon: 'person-outline' },
];

interface CustomFloatingTabBarProps {
    activeIndex: number;
    scrollX: Animated.Value;
    onTabPress: (index: number) => void;
    navigation: any;
}

function CustomFloatingTabBar({ activeIndex, scrollX, onTabPress, navigation }: CustomFloatingTabBarProps) {
    const { user, setAuth, isGuest } = useAuthStore();
    const { colors, isDark } = useThemeStore();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const userAvatarUri = user?.photo || user?.photo_url || user?.avatar || user?.logo || user?.logo_url;

    const inactiveIconColor = isDark ? 'rgba(255, 255, 255, 0.40)' : '#64748B';

    // Quick Account Switcher Modal state
    const [showSwitcherModal, setShowSwitcherModal] = useState(false);
    const [accountOptions, setAccountOptions] = useState<any[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    // Modal Y displacement for swipe down gesture
    const modalY = useRef(new Animated.Value(0)).current;

    const modalPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
            onMoveShouldSetPanResponderCapture: (_, gestureState) => gestureState.dy > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    modalY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 40 || gestureState.vy > 0.2) {
                    setShowSwitcherModal(false);
                } else {
                    Animated.spring(modalY, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 4,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(modalY, {
                    toValue: 0,
                    useNativeDriver: true,
                    bounciness: 4,
                }).start();
            },
        })
    ).current;

    // Real-time interpolated translateX driven directly by horizontal scroll offset (1:1 with finger swipe)
    const translateX = scrollX.interpolate({
        inputRange: [
            0,
            SCREEN_WIDTH,
            SCREEN_WIDTH * 2,
            SCREEN_WIDTH * 3,
            SCREEN_WIDTH * 4,
        ],
        outputRange: [
            0 * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4,
            1 * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4,
            2 * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4,
            3 * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4,
            4 * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4,
        ],
        extrapolate: 'clamp',
    });

    const deduplicateAccountsList = (list: any[]) => {
        if (!list || !Array.isArray(list)) return [];
        const seen = new Set();
        return list.filter((item: any) => {
            const key = `${item.id || item._id}_${item.organizationId || item.organization_id || 1}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    const handleProfilLongPress = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (e) {}

        setShowSwitcherModal(true);
        setLoadingAccounts(true);
        try {
            const phone = user?.phone || user?.phoneNumber || user?.phone_number;
            if (!phone) {
                setAccountOptions(deduplicateAccountsList([user]));
                setLoadingAccounts(false);
                return;
            }
            const fullPhone = `+998${phone.replace(/\D/g, '').slice(-9)}`;
            const res = await apiService.findAccountsByPhone(fullPhone).catch(() => ({ success: false, accounts: [] }));
            const accounts = res?.accounts || [];
            const validAccounts = Array.isArray(accounts) && accounts.length > 0 ? accounts : [user];
            setAccountOptions(deduplicateAccountsList(validAccounts));
        } catch (e) {
            setAccountOptions(deduplicateAccountsList([user]));
        } finally {
            setLoadingAccounts(false);
        }
    };

    const handleSwitchAccount = (acc: any) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {}

        try {
            clearApiCache();
        } catch (e) {}

        const orgId = acc.organization_id || acc.organizationId || acc.team?.organization_id || acc.organizations?.id || 1;
        useOrganizationStore.getState().setSelectedOrganizationId(Number(orgId));
        setAuth({
            ...acc,
            organizationId: Number(orgId),
            organization_id: Number(orgId),
        });
        setShowSwitcherModal(false);
    };

    return (
        <View 
            style={[
                styles.floatingContainer,
                Platform.OS === 'android' && {
                    paddingBottom: insets.bottom,
                    backgroundColor: isDark ? '#131F37' : '#FFFFFF',
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                }
            ]} 
            pointerEvents="box-none"
        >
            <View style={[
                styles.floatingCapsuleWrapper,
                {
                    backgroundColor: isDark ? 'rgba(19, 31, 55, 0.94)' : 'rgba(255, 255, 255, 0.94)',
                    borderColor: colors.border,
                }
            ]}>
                {Platform.OS === 'ios' && isDark && (
                    <BlurView
                        intensity={Platform.OS === 'ios' ? 45 : 55}
                        tint="dark"
                        style={StyleSheet.absoluteFill}
                    />
                )}

                {/* Real-time Smooth Sliding Highlight Pill */}
                <Animated.View
                    style={[
                        styles.activeTabIndicator,
                        {
                            backgroundColor: isDark ? 'rgba(232, 80, 2, 0.18)' : 'rgba(232, 80, 2, 0.15)',
                            transform: [{ translateX }]
                        },
                    ]}
                />

                <View style={styles.tabRow}>
                    {TABS.map((tab, index) => {
                        const isFocused = activeIndex === index;

                        return (
                            <TouchableOpacity
                                key={tab.key}
                                accessibilityRole="button"
                                accessibilityState={isFocused ? { selected: true } : {}}
                                onPress={() => onTabPress(index)}
                                onLongPress={tab.key === 'Profil' ? handleProfilLongPress : undefined}
                                delayLongPress={300}
                                activeOpacity={0.7}
                                style={styles.tabItem}
                            >
                                <View style={styles.iconWrapper}>
                                    {tab.key === 'Profil' ? (
                                        userAvatarUri ? (
                                            <SmartImage
                                                uri={userAvatarUri}
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: 12,
                                                    borderWidth: isFocused ? 2 : 1,
                                                    borderColor: isFocused ? Colors.primary : inactiveIconColor,
                                                }}
                                                contentFit="cover"
                                                fallbackIcon="person-outline"
                                                fallbackIconSize={22}
                                            />
                                        ) : (
                                            <Ionicons
                                                name="person-outline"
                                                size={isFocused ? 24 : 22}
                                                color={isFocused ? Colors.primary : inactiveIconColor}
                                                style={isFocused && Platform.OS === 'ios' ? {
                                                    textShadowColor: Colors.primary,
                                                    textShadowOffset: { width: 0, height: 0 },
                                                    textShadowRadius: 8,
                                                } : undefined}
                                            />
                                        )
                                    ) : (
                                        <Ionicons
                                            name={tab.icon as any}
                                            size={isFocused ? 24 : 22}
                                            color={isFocused ? Colors.primary : inactiveIconColor}
                                            style={isFocused && Platform.OS === 'ios' ? {
                                                textShadowColor: Colors.primary,
                                                textShadowOffset: { width: 0, height: 0 },
                                                textShadowRadius: 8,
                                            } : undefined}
                                        />
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Bottom Sheet Quick Account Switcher Modal */}
            <Modal
                visible={showSwitcherModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowSwitcherModal(false)}
            >
                <View style={styles.modalOverlay} {...modalPanResponder.panHandlers}>
                    <TouchableOpacity
                        style={{ flex: 1, width: '100%' }}
                        activeOpacity={1}
                        onPress={() => setShowSwitcherModal(false)}
                    />
                    <Animated.View
                        style={[
                            styles.switcherModalCard,
                            { backgroundColor: colors.surface, borderColor: colors.border },
                            { transform: [{ translateY: modalY }] }
                        ]}
                        {...modalPanResponder.panHandlers}
                    >
                        {Platform.OS === 'ios' && isDark && <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />}
                        
                        <View style={styles.headerDragZone}>
                            <View style={[styles.grabberBar, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)' }]} />
                            <View style={styles.modalHeaderRow}>
                                <Text style={[styles.switcherTitle, { color: colors.text }]}>{t('common.switch_account', 'Akkountni Almashtirish')}</Text>
                            </View>
                        </View>

                        <View style={{ paddingHorizontal: 22, paddingTop: 2, paddingBottom: Platform.OS === 'ios' ? 34 : 20 }}>
                            {loadingAccounts ? (
                                <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                                    <ActivityIndicator size="small" color={colors.text} />
                                    <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 13 }}>
                                        Yuklanmoqda...
                                    </Text>
                                </View>
                            ) : (
                                <ScrollView style={{ maxHeight: 320, marginTop: 8 }} showsVerticalScrollIndicator={false}>
                                    {accountOptions.map((acc, idx) => {
                                        const isCurrent = (acc.id === user?.id || acc._id === user?._id) && (acc.organizationId === user?.organizationId || acc.organization_id === user?.organization_id);
                                        const orgName = acc.orgName || acc.organizations?.name || 'Amatora Liga';
                                        const avatarUri = acc.photo || acc.photo_url || acc.avatar || acc.logo || acc.logo_url;

                                        return (
                                            <TouchableOpacity
                                                key={idx}
                                                style={[
                                                    styles.accountOptionCard,
                                                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)', borderColor: colors.border },
                                                    isCurrent && [styles.accountOptionCardActive, { borderColor: Colors.primary, backgroundColor: isDark ? 'rgba(232, 80, 2, 0.12)' : 'rgba(232, 80, 2, 0.08)' }]
                                                ]}
                                                activeOpacity={0.75}
                                                onPress={() => handleSwitchAccount(acc)}
                                            >
                                                {/* Avatar */}
                                                <View style={styles.accountOptionAvatarContainer}>
                                                    {avatarUri ? (
                                                        <Image
                                                            source={{ uri: avatarUri }}
                                                            style={styles.accountOptionAvatar}
                                                            resizeMode="cover"
                                                        />
                                                    ) : (
                                                        <View style={[styles.accountOptionAvatarFallback, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)' }]}>
                                                            <Text style={[styles.avatarInitial, { color: colors.text }]}>
                                                                {(acc.name || 'F').charAt(0).toUpperCase()}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>

                                                {/* Name and Organization */}
                                                <View style={{ flex: 1, marginLeft: 14, justifyContent: 'center' }}>
                                                    <Text style={[styles.accountOptionName, { color: colors.text }]}>{acc.name}</Text>
                                                    <Text style={[styles.accountOptionOrg, { color: isDark ? 'rgba(255, 255, 255, 0.55)' : '#64748B' }]}>{orgName}</Text>
                                                </View>

                                                {/* Active Indicator */}
                                                {isCurrent && (
                                                    <View style={[styles.activeCheckBadge, { borderColor: Colors.primary }]}>
                                                        <View style={[styles.activeCheckDot, { backgroundColor: Colors.primary }]} />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

function MainSwipeableTabs({ navigation, route }: any) {
    const { isSwipeDisabled } = useTabSwipe();
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const activeIndexRef = useRef(0);
    const isManualScrolling = useRef(false);

    // Sync external navigation requests (e.g. navigation.navigate('MainTabs', { screen: 'Profil' }))
    useEffect(() => {
        const targetScreen = route?.params?.screen || route?.params?.tab;
        if (targetScreen) {
            const targetIdx = TABS.findIndex(t => 
                t.name.toLowerCase() === String(targetScreen).toLowerCase() || 
                t.key.toLowerCase() === String(targetScreen).toLowerCase()
            );
            if (targetIdx !== -1 && targetIdx !== activeIndexRef.current) {
                handleTabPress(targetIdx);
            }
        }
    }, [route?.params?.screen, route?.params?.tab]);

    const handleTabPress = useCallback((targetIndex: number) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}
        isManualScrolling.current = true;
        activeIndexRef.current = targetIndex;
        setActiveIndex(targetIndex);
        scrollViewRef.current?.scrollTo({
            x: targetIndex * SCREEN_WIDTH,
            animated: false,
        });
        requestAnimationFrame(() => {
            isManualScrolling.current = false;
        });
    }, []);

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: false }
    );

    const handleMomentumScrollEnd = (e: any) => {
        const offsetX = e.nativeEvent.contentOffset.x;
        const newIndex = Math.max(0, Math.min(TABS.length - 1, Math.round(offsetX / SCREEN_WIDTH)));
        if (newIndex !== activeIndexRef.current) {
            activeIndexRef.current = newIndex;
            setActiveIndex(newIndex);
            try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (e) {}
        }
        isManualScrolling.current = false;
    };

    return (
        <View style={styles.mainContainer}>
            {/* Real-time 60/120fps Continuous Horizontal Paging on iOS, Click-only on Android */}
            <Animated.ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                scrollEnabled={Platform.OS === 'android' ? false : !isSwipeDisabled}
                showsHorizontalScrollIndicator={false}
                bounces={false}
                scrollEventThrottle={16}
                decelerationRate="fast"
                onScroll={handleScroll}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                style={styles.pagerScrollView}
                contentContainerStyle={{ width: SCREEN_WIDTH * 5 }}
            >
                <View style={{ width: SCREEN_WIDTH, height: '100%' }}>
                    <HomeScreen navigation={navigation} route={route} />
                </View>
                <View style={{ width: SCREEN_WIDTH, height: '100%' }}>
                    <TournamentsScreen navigation={navigation} route={route} />
                </View>
                <View style={{ width: SCREEN_WIDTH, height: '100%' }}>
                    <CalendarScreen navigation={navigation} route={route} />
                </View>
                <View style={{ width: SCREEN_WIDTH, height: '100%' }}>
                    <NewsScreen />
                </View>
                <View style={{ width: SCREEN_WIDTH, height: '100%' }}>
                    <AccountScreen navigation={navigation} route={route} />
                </View>
            </Animated.ScrollView>

            {/* Custom Floating Tab Bar with live 1:1 animated highlight */}
            <CustomFloatingTabBar
                activeIndex={activeIndex}
                scrollX={scrollX}
                onTabPress={handleTabPress}
                navigation={navigation}
            />
        </View>
    );
}

export default function AppNavigator(props: any) {
    return (
        <TabSwipeProvider>
            <MainSwipeableTabs {...props} />
        </TabSwipeProvider>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    pagerScrollView: {
        flex: 1,
    },
    floatingContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 36 : 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingCapsuleWrapper: {
        width: CAPSULE_WIDTH,
        height: Platform.OS === 'ios' ? 56 : 60,
        borderRadius: Platform.OS === 'ios' ? 16 : 0,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderBottomLeftRadius: Platform.OS === 'ios' ? 16 : 0,
        borderBottomRightRadius: Platform.OS === 'ios' ? 16 : 0,
        overflow: 'hidden',
        borderTopWidth: 1,
        borderLeftWidth: Platform.OS === 'ios' ? 1 : 0,
        borderRightWidth: Platform.OS === 'ios' ? 1 : 0,
        borderBottomWidth: Platform.OS === 'ios' ? 1 : 0,
        borderColor: 'rgba(255, 255, 255, 0.16)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45,
        shadowRadius: 20,
        elevation: 12,
        position: 'relative',
    },
    activeTabIndicator: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 5 : 7,
        width: HIGHLIGHT_WIDTH,
        height: 46,
        borderRadius: 10,
        backgroundColor: 'rgba(232, 80, 2, 0.16)',
        borderWidth: 1,
        borderColor: 'rgba(232, 80, 2, 0.38)',
    },
    tabRow: {
        flexDirection: 'row',
        width: '100%',
        height: Platform.OS === 'ios' ? 56 : 60,
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 4,
        paddingBottom: Platform.OS === 'ios' ? 0 : 2,
    },
    tabItem: {
        flex: 1,
        height: Platform.OS === 'ios' ? 56 : 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapper: {
        width: 48,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.60)',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    switcherModalCard: {
        width: '100%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        overflow: 'hidden',
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.14)',
        backgroundColor: Platform.OS === 'android' ? 'rgba(15, 23, 42, 0.95)' : 'transparent',
    },
    headerDragZone: {
        paddingTop: 12,
        paddingHorizontal: 22,
        width: '100%',
        alignItems: 'center',
    },
    grabberBar: {
        width: 38,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        alignSelf: 'center',
        marginBottom: 8,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
        marginTop: 4,
    },
    switcherTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.2,
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    accountOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 18,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    accountOptionCardActive: {
        borderColor: 'rgba(255, 255, 255, 0.28)',
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    accountOptionAvatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
    },
    accountOptionAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    accountOptionAvatarFallback: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
    },
    accountOptionName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    accountOptionOrg: {
        fontSize: 12,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.55)',
        marginTop: 2,
    },
    activeCheckBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3,
    },
    activeCheckDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FFFFFF',
    },
});

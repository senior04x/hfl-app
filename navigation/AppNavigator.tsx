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
    Easing,
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
import { NavBarScrollProvider, useNavBarScroll } from '../context/NavBarScrollContext';

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

// Capsule's own corner radius (iOS = fully-rounded stadium since height 60 -> radius 30;
// Android = top-only-rounded docked bar). The active-tab pill is inset 6px from the
// capsule's edges (top:6 / bottom:60-6-48=6), so its "ideal" concentric radius is simply
// the capsule radius minus that same inset — a single mathematically-derived source of
// truth instead of a hand-picked number.
const CAPSULE_RADIUS_IOS = 30;
const CAPSULE_RADIUS_ANDROID = 16;
const PILL_INSET = 6;
const HIGHLIGHT_RADIUS = Math.max(0, (IS_ANDROID ? CAPSULE_RADIUS_ANDROID : CAPSULE_RADIUS_IOS) - PILL_INSET);
const BLUR_INTENSITY = 55;

// Scroll-linked resize: how much the navbar shrinks/sinks at full shrinkProgress (1).
const NAVBAR_SHRINK_SCALE = 0.88;
const NAVBAR_SHRINK_TRANSLATE_Y = 14;

// "Liquid" pill flow while swiping page-to-page:
// Svayp (slide) paytida pill ikkita tab o'rtasida suyuqlik tomchisi kabi gorizontal
// cho'zilib (scaleX: 1.28) va vertikal ingichkalashib (scaleY: 0.80) oqib o'tadi,
// tab ustiga yetganda esa yana to'liq normal o'lchamga (1.0) qaytadi.
const SWIPE_LIQUID_SCALE_X = 1.28;
const SWIPE_LIQUID_SCALE_Y = 0.80;

const SWIPE_LIQUID_INPUT_RANGE: number[] = [];
const SWIPE_LIQUID_OUTPUT_SCALE_X: number[] = [];
const SWIPE_LIQUID_OUTPUT_SCALE_Y: number[] = [];

for (let i = 0; i < TAB_COUNT; i++) {
    SWIPE_LIQUID_INPUT_RANGE.push(i * SCREEN_WIDTH);
    SWIPE_LIQUID_OUTPUT_SCALE_X.push(1.0);
    SWIPE_LIQUID_OUTPUT_SCALE_Y.push(1.0);
    if (i < TAB_COUNT - 1) {
        SWIPE_LIQUID_INPUT_RANGE.push(i * SCREEN_WIDTH + SCREEN_WIDTH / 2);
        SWIPE_LIQUID_OUTPUT_SCALE_X.push(SWIPE_LIQUID_SCALE_X);
        SWIPE_LIQUID_OUTPUT_SCALE_Y.push(SWIPE_LIQUID_SCALE_Y);
    }
}

const TABS = [
    { key: 'Asosiy', name: 'Asosiy', nameKey: 'nav.home', defaultName: 'Asosiy', icon: 'home-outline' },
    { key: 'Turnirlar', name: 'Turnirlar', nameKey: 'nav.tournaments', defaultName: 'Turnirlar', icon: 'trophy-outline' },
    { key: 'Taqvim', name: 'Taqvim', nameKey: 'nav.calendar', defaultName: 'Taqvim', icon: 'calendar-outline' },
    { key: 'Yangiliklar', name: 'Yangiliklar', nameKey: 'nav.news', defaultName: 'Yangiliklar', icon: 'newspaper-outline' },
    { key: 'Profil', name: 'Profil', nameKey: 'nav.profile', defaultName: 'Profil', icon: 'person-outline' },
];

interface CustomFloatingTabBarProps {
    activeIndex: number;
    scrollX: Animated.Value;
    onTabPress: (index: number) => void;
    navigation: any;
}

function CustomFloatingTabBar({ activeIndex, scrollX, onTabPress, navigation }: CustomFloatingTabBarProps) {
    const { user, setAuth, userAccounts, isGuest } = useAuthStore();
    const { colors, isDark } = useThemeStore();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { shrinkProgress } = useNavBarScroll();
    const userAvatarUri = user?.photo || user?.photo_url || user?.avatar || user?.logo || user?.logo_url;

    // Floating tab bar — endi kunduzgi/kechki rejimga mos, rangi yengil/tiniq
    // (deyarli rangsiz), asosiy vizual og'irlik esa haqiqiy blur'ga (SmartBlurView —
    // iOS'da UIVisualEffectView/Liquid Glass, Android'da GPU blur) yuklangan.
    // Floating tab bar — Liquid Glass (kunduzgi rejimda qora, tungi rejimda oq iconlar):
    const TAB_ACTIVE_COLOR = isDark ? '#FFFFFF' : '#0B0B0C';
    const TAB_INACTIVE_COLOR = isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)';

    // Liquid Glass fon ranglari:
    const capsuleBg = isDark ? 'rgba(16, 16, 16, 0.88)' : 'rgba(255, 255, 255, 0.65)';
    const capsuleBorderColor = isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.08)';
    const activePillBg = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
    const blurFallbackColor = isDark ? 'rgba(16, 16, 16, 0.95)' : 'rgba(255, 255, 255, 0.85)';

    // Blur/qirralarning konteynerdagi bilan ANIQ bir xil radiusi — ba'zi RN/expo-blur
    // versiyalarida native blur qatlami ota-view'ning overflow:hidden'iga to'liq
    // bo'ysunmasligi mumkin ("qirrali" ko'rinish sababi), shuning uchun radiusni
    // blur'ning o'ziga ham to'g'ridan-to'g'ri beramiz (ikki qavat himoya).
    const capsuleRadiusStyle = Platform.OS === 'ios'
        ? { borderRadius: CAPSULE_RADIUS_IOS, overflow: 'hidden' as const }
        : {
            borderTopLeftRadius: CAPSULE_RADIUS_ANDROID,
            borderTopRightRadius: CAPSULE_RADIUS_ANDROID,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            overflow: 'hidden' as const,
        };

    // Android'da xavfsiz zona (safe-area) endi alohida to'rtburchak "quyruq" emas,
    // kapsulaning o'zi bilan bir butun — shu bois qirrali ko'rinish yo'qoladi va
    // blur pastgacha uzluksiz davom etadi.
    const androidExtraHeight = Platform.OS === 'android' ? insets.bottom : 0;

    // Scroll-linked resize: shrinks/sinks as the active screen scrolls down,
    // returns to its original size when scrolling back up toward the top.
    const shrinkScale = shrinkProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, NAVBAR_SHRINK_SCALE],
        extrapolate: 'clamp',
    });
    const shrinkTranslateY = shrinkProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, NAVBAR_SHRINK_TRANSLATE_Y],
        extrapolate: 'clamp',
    });

    // Quick Account Switcher Modal state
    const [showSwitcherModal, setShowSwitcherModal] = useState(false);
    const [accountOptions, setAccountOptions] = useState<any[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    // Modal Sheet Animations (Orqa fon birdaniga qorayadi, faqat pastki karta slide bo'ladi)
    const modalY = useRef(new Animated.Value(0)).current;
    const sheetSlideAnim = useRef(new Animated.Value(350)).current;

    const closeSwitcherModal = () => {
        Animated.timing(sheetSlideAnim, {
            toValue: 380,
            duration: 180,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start(() => {
            setShowSwitcherModal(false);
            modalY.setValue(0);
        });
    };

    const openSwitcherModal = () => {
        sheetSlideAnim.setValue(350);
        modalY.setValue(0);
        setShowSwitcherModal(true);
        Animated.spring(sheetSlideAnim, {
            toValue: 0,
            tension: 75,
            friction: 11,
            useNativeDriver: true,
        }).start();
    };

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
                    closeSwitcherModal();
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

    // Real-time Smooth Liquid Flow (svaypda ham, bosilganda ham suyuqlik kabi oqib o'tish va height ezilishi):
    const swipeScaleX = scrollX.interpolate({
        inputRange: SWIPE_LIQUID_INPUT_RANGE,
        outputRange: SWIPE_LIQUID_OUTPUT_SCALE_X,
        extrapolate: 'clamp',
    });

    const swipeScaleY = scrollX.interpolate({
        inputRange: SWIPE_LIQUID_INPUT_RANGE,
        outputRange: SWIPE_LIQUID_OUTPUT_SCALE_Y,
        extrapolate: 'clamp',
    });

    // Umumiy navbar bosilgandagi sekin sakrash animatsiyasi:
    const navbarBounceAnim = useRef(new Animated.Value(0)).current;

    const handleTabButtonPress = (index: number) => {
        navbarBounceAnim.setValue(0);
        Animated.timing(navbarBounceAnim, {
            toValue: 1,
            duration: 420,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
            useNativeDriver: false,
        }).start();

        onTabPress(index);
    };

    const navbarBounceScale = navbarBounceAnim.interpolate({
        inputRange: [0, 0.35, 0.70, 1],
        outputRange: [1.0, 1.035, 0.988, 1.0],
        extrapolate: 'clamp',
    });

    const navbarBounceY = navbarBounceAnim.interpolate({
        inputRange: [0, 0.35, 0.70, 1],
        outputRange: [0, -3.5, 0.8, 0],
        extrapolate: 'clamp',
    });

    const combinedNavbarScale = Platform.OS === 'ios'
        ? Animated.multiply(shrinkScale, navbarBounceScale)
        : navbarBounceScale;

    const combinedNavbarTranslateY = Platform.OS === 'ios'
        ? Animated.add(shrinkTranslateY, navbarBounceY)
        : navbarBounceY;

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

    const handleProfilLongPress = () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (e) {}

        if (isGuest) {
            return;
        }

        // 1. Qurilma xotirasidan (local cache) birdaniga yuklash (0ms kechikish, yuklanishsiz)
        const storedAccounts = (userAccounts && userAccounts.length > 0)
            ? userAccounts
            : (user ? [user] : []);
        
        const initialValidAccounts = deduplicateAccountsList(storedAccounts);
        setAccountOptions(initialValidAccounts);
        setLoadingAccounts(false);
        openSwitcherModal();

        // 2. Orqa fonda (jimjit, spinner ko'rsatmasdan) yangi akkauntlarni tekshirib yangilaydi
        const phone = user?.phone || user?.phoneNumber || user?.phone_number;
        if (phone) {
            const fullPhone = `+998${phone.replace(/\D/g, '').slice(-9)}`;
            apiService.findAccountsByPhone(fullPhone)
                .then((res: any) => {
                    const accounts = res?.accounts || [];
                    if (Array.isArray(accounts) && accounts.length > 0) {
                        const deduped = deduplicateAccountsList(accounts);
                        setAccountOptions(deduped);
                        useAuthStore.getState().setUserAccounts(deduped);
                    }
                })
                .catch(() => {});
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
        
        const currentAccounts = useAuthStore.getState().userAccounts;
        const finalAccounts = currentAccounts && currentAccounts.length > 0 ? currentAccounts : accountOptions;

        setAuth({
            ...acc,
            organizationId: Number(orgId),
            organization_id: Number(orgId),
        }, finalAccounts);
        
        closeSwitcherModal();
    };

    return (
        <Animated.View
            style={[
                styles.floatingContainer,
                {
                    transform: [
                        { scale: combinedNavbarScale },
                        { translateY: combinedNavbarTranslateY },
                    ],
                },
            ]}
            pointerEvents="box-none"
        >
            <View
                style={[
                    styles.floatingCapsuleWrapper,
                    capsuleRadiusStyle,
                    {
                        height: 60 + androidExtraHeight,
                        backgroundColor: capsuleBg,
                        borderColor: capsuleBorderColor,
                    },
                ]}
            >
                {/* Haqiqiy Liquid Glass blur — kunduzgi va qorong'i rejimda to'liq shaffof oyna effekti */}
                <BlurView
                    intensity={isDark ? 65 : BLUR_INTENSITY}
                    tint={isDark ? 'dark' : 'light'}
                    fallbackColor={blurFallbackColor}
                    style={capsuleRadiusStyle}
                    containerStyle={capsuleRadiusStyle}
                />

                {/* Real-time Smooth Highlight Pill — suyuqlikdek oqib o'tadi va heighti eziladi */}
                <Animated.View
                    style={[
                        styles.activeTabIndicator,
                        {
                            backgroundColor: activePillBg,
                            transform: [
                                { translateX },
                                { scaleX: swipeScaleX },
                                { scaleY: swipeScaleY },
                            ],
                        },
                    ]}
                />

                <View style={styles.tabRow}>
                    {TABS.map((tab, index) => {
                        const isFocused = activeIndex === index;
                        const tabColor = isFocused ? TAB_ACTIVE_COLOR : TAB_INACTIVE_COLOR;

                        return (
                            <TouchableOpacity
                                key={tab.key}
                                accessibilityRole="button"
                                accessibilityState={isFocused ? { selected: true } : {}}
                                onPress={() => handleTabButtonPress(index)}
                                onLongPress={tab.key === 'Profil' ? handleProfilLongPress : undefined}
                                delayLongPress={300}
                                activeOpacity={1}
                                style={styles.tabItem}
                            >
                                <View style={styles.iconWrapper}>
                                    {tab.key === 'Profil' ? (
                                        userAvatarUri ? (
                                            <SmartImage
                                                uri={userAvatarUri}
                                                style={{
                                                    width: 22,
                                                    height: 22,
                                                    borderRadius: 11,
                                                    borderWidth: isFocused ? 2 : 1,
                                                    borderColor: tabColor,
                                                }}
                                                contentFit="cover"
                                                fallbackIcon="person-outline"
                                                fallbackIconSize={20}
                                            />
                                        ) : (
                                            <Ionicons name="person-outline" size={22} color={tabColor} />
                                        )
                                    ) : (
                                        <Ionicons name={tab.icon as any} size={22} color={tabColor} />
                                    )}
                                </View>
                                {/* Matn label FAQAT Android'da — iOS'da faqat icon (foydalanuvchi so'rovi bo'yicha) */}
                                {Platform.OS !== 'ios' && (
                                    <Text
                                        style={[styles.tabLabel, { color: tabColor, fontWeight: isFocused ? '700' : '500' }]}
                                        numberOfLines={1}
                                    >
                                        {t(tab.nameKey, tab.defaultName)}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Bottom Sheet Quick Account Switcher Modal */}
            <Modal
                visible={showSwitcherModal}
                transparent
                animationType="none"
                onRequestClose={closeSwitcherModal}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={closeSwitcherModal}
                    />
                    <Animated.View
                        style={[
                            styles.switcherModalCard,
                            { backgroundColor: colors.surface, borderColor: colors.border },
                            { transform: [{ translateY: Animated.add(sheetSlideAnim, modalY) }] }
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
        </Animated.View>
    );
}

function MainSwipeableTabs({ navigation, route }: any) {
    const { isSwipeDisabled } = useTabSwipe();
    const { resetNavBarShrink } = useNavBarScroll();
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
        resetNavBarShrink();

        // 1. Sahifa darhol o'tsin (hech qanday page slayd animatsiyasiz):
        scrollViewRef.current?.scrollTo({
            x: targetIndex * SCREEN_WIDTH,
            animated: false,
        });

        // 2. Tugma bosilganda oraliq tablardan oqib o'tmasdan, to'g'ridan-to'g'ri shu tabda paydo bo'lsin:
        scrollX.setValue(targetIndex * SCREEN_WIDTH);

        requestAnimationFrame(() => {
            isManualScrolling.current = false;
        });
    }, [resetNavBarShrink, scrollX]);

    const handleScroll = (e: any) => {
        // Agar tugma bosilgan bo'lsa, ScrollView onScroll hodisasi
        // navbardagi pill spring animatsiyasini to'xtatib qo'ymasligi kerak
        if (isManualScrolling.current) return;
        const offsetX = e.nativeEvent.contentOffset.x;
        scrollX.setValue(offsetX);
    };

    const handleMomentumScrollEnd = (e: any) => {
        if (isManualScrolling.current) return;
        const offsetX = e.nativeEvent.contentOffset.x;
        const newIndex = Math.max(0, Math.min(TABS.length - 1, Math.round(offsetX / SCREEN_WIDTH)));
        if (newIndex !== activeIndexRef.current) {
            activeIndexRef.current = newIndex;
            setActiveIndex(newIndex);
            resetNavBarShrink();
            try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (e) {}
        }
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
            <NavBarScrollProvider>
                <MainSwipeableTabs {...props} />
            </NavBarScrollProvider>
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
        height: 60,
        borderRadius: Platform.OS === 'ios' ? CAPSULE_RADIUS_IOS : 0,
        borderTopLeftRadius: Platform.OS === 'ios' ? CAPSULE_RADIUS_IOS : CAPSULE_RADIUS_ANDROID,
        borderTopRightRadius: Platform.OS === 'ios' ? CAPSULE_RADIUS_IOS : CAPSULE_RADIUS_ANDROID,
        borderBottomLeftRadius: Platform.OS === 'ios' ? CAPSULE_RADIUS_IOS : 0,
        borderBottomRightRadius: Platform.OS === 'ios' ? CAPSULE_RADIUS_IOS : 0,
        overflow: 'hidden',
        borderTopWidth: 1,
        borderLeftWidth: Platform.OS === 'ios' ? 1 : 0,
        borderRightWidth: Platform.OS === 'ios' ? 1 : 0,
        borderBottomWidth: Platform.OS === 'ios' ? 1 : 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 20,
        elevation: 12,
        position: 'relative',
    },
    activeTabIndicator: {
        position: 'absolute',
        top: PILL_INSET,
        width: HIGHLIGHT_WIDTH,
        height: 48,
        // Mathematically derived from the capsule's own radius, see HIGHLIGHT_RADIUS above.
        borderRadius: HIGHLIGHT_RADIUS,
    },
    tabRow: {
        flexDirection: 'row',
        width: '100%',
        height: 60,
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 4,
        paddingBottom: Platform.OS === 'ios' ? 0 : 2,
    },
    tabItem: {
        flex: 1,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapper: {
        width: 26,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    tabLabel: {
        fontSize: 10.5,
        marginTop: 3,
        letterSpacing: -0.1,
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
        backgroundColor: Platform.OS === 'android' ? '#141414' : 'transparent',
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

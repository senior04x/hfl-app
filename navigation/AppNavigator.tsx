import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, TouchableOpacity, Dimensions, Animated, PanResponder, Text, Modal, ActivityIndicator, Image, Alert, ScrollView } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../store/useAuthStore';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { apiService, clearApiCache } from '../services/apiService';
import SmartImage from '../components/SmartImage';

import HomeScreen from '../screens/HomeScreen';
import TournamentsScreen from '../screens/TournamentsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import NewsScreen from '../screens/NewsScreen';
import AccountScreen from '../screens/AccountScreen';

const { width } = Dimensions.get('window');
const CAPSULE_WIDTH = width - 72;
const TAB_COUNT = 5;
const TAB_ITEM_WIDTH = (CAPSULE_WIDTH - 8) / TAB_COUNT;
const HIGHLIGHT_WIDTH = 48;
const HIGHLIGHT_OFFSET = (TAB_ITEM_WIDTH - HIGHLIGHT_WIDTH) / 2;

const Tab = createBottomTabNavigator();

function CustomFloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { user, setAuth, isGuest } = useAuthStore();
    const userAvatarUri = user?.photo || user?.photo_url || user?.avatar || user?.logo || user?.logo_url;

    // Quick Account Switcher Modal state
    const [showSwitcherModal, setShowSwitcherModal] = useState(false);
    const [accountOptions, setAccountOptions] = useState<any[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    // Modal Y displacement for swipe down gesture from anywhere on the screen, header text, margins or card
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

    // Animated position for sliding pill highlight
    const translateX = useRef(new Animated.Value(state.index * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4)).current;

    const startIndexRef = useRef(state.index);
    const isDraggingRef = useRef(false);

    useEffect(() => {
        if (!isDraggingRef.current) {
            startIndexRef.current = state.index;
            Animated.spring(translateX, {
                toValue: state.index * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4,
                useNativeDriver: true,
                tension: 70,
                friction: 9,
            }).start();
        }
    }, [state.index]);

    const deduplicateAccountsList = (list: any[]) => {
        if (!list || !Array.isArray(list)) return [];
        const map = new Map<string, any>();
        list.forEach(acc => {
            if (acc.comment && typeof acc.comment === 'string' && acc.comment.includes('[PROFILE_UPDATE]')) {
                return;
            }
            const key = acc.role === 'manager'
                ? `manager_${acc.teamId || acc.id || acc._id}`
                : `player_${acc.id || acc._id}`;
            if (!map.has(key)) {
                map.set(key, acc);
            }
        });
        return Array.from(map.values());
    };

    const handleProfilLongPress = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}

        if (isGuest) {
            Alert.alert('Akkountlar', 'Akkount ro\'yxatini ko\'rish uchun ilovaga kiring.');
            return;
        }

        modalY.setValue(0);
        const userPhone = user?.phone || user?.phoneNumber || user?.phone_number || user?.tel;
        const cachedAccounts = useAuthStore.getState().userAccounts;
        const cleanCached = deduplicateAccountsList(cachedAccounts || []);

        // 1. Instant 0-second display from persistent local cache
        if (cleanCached && cleanCached.length > 0) {
            setAccountOptions(cleanCached);
            setLoadingAccounts(false);
            setShowSwitcherModal(true);
        } else {
            setAccountOptions(user ? [user] : []);
            setLoadingAccounts(true);
            setShowSwitcherModal(true);
        }

        // 2. Background silent refresh
        if (userPhone) {
            try {
                const fullPhone = `+998${userPhone.replace(/\D/g, '').slice(-9)}`;
                const res = await apiService.findAccountsByPhone(fullPhone);
                if (res.success && res.accounts && res.accounts.length > 0) {
                    const cleanRes = deduplicateAccountsList(res.accounts);
                    setAccountOptions(cleanRes);
                    useAuthStore.getState().setUserAccounts(cleanRes);
                }
            } catch (e) {
                console.warn('Background account refresh error:', e);
            } finally {
                setLoadingAccounts(false);
            }
        } else {
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
            organization_id: Number(orgId)
        });
        setShowSwitcherModal(false);
    };

    // Ultra-smooth 120fps PanResponder drag gesture
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 10,
            onPanResponderGrant: () => {
                isDraggingRef.current = true;
                startIndexRef.current = state.index;
            },
            onPanResponderMove: (_, gestureState) => {
                const startX = startIndexRef.current * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4;
                const minX = HIGHLIGHT_OFFSET + 4;
                const maxX = (TAB_COUNT - 1) * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4;
                const currentX = Math.max(minX, Math.min(maxX, startX + gestureState.dx));
                translateX.setValue(currentX);
            },
            onPanResponderRelease: (_, gestureState) => {
                isDraggingRef.current = false;
                const startX = startIndexRef.current * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4;
                const finalX = startX + gestureState.dx;
                const targetIndex = Math.max(
                    0,
                    Math.min(TAB_COUNT - 1, Math.round((finalX - HIGHLIGHT_OFFSET - 4) / TAB_ITEM_WIDTH))
                );

                if (targetIndex !== state.index) {
                    navigation.navigate(state.routes[targetIndex].name);
                } else {
                    Animated.spring(translateX, {
                        toValue: state.index * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4,
                        useNativeDriver: true,
                        tension: 70,
                        friction: 9,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                isDraggingRef.current = false;
                Animated.spring(translateX, {
                    toValue: state.index * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4,
                    useNativeDriver: true,
                    tension: 70,
                    friction: 9,
                }).start();
            },
        })
    ).current;

    return (
        <View style={styles.floatingContainer}>
            <View style={styles.floatingCapsuleWrapper} {...panResponder.panHandlers}>
                <BlurView
                    intensity={Platform.OS === 'ios' ? 45 : 55}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                />

                {/* SLIDING ACTIVE HIGHLIGHT PILL */}
                <Animated.View
                    style={[
                        styles.slidingHighlight,
                        {
                            transform: [{ translateX }],
                        },
                    ]}
                />

                <View style={styles.tabRow}>
                    {state.routes.map((route, index) => {
                        const { options } = descriptors[route.key];
                        const isFocused = state.index === index;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        let iconName: any = "home-outline";
                        if (route.name === 'Asosiy') {
                            iconName = isFocused ? "home" : "home-outline";
                        } else if (route.name === 'Turnirlar') {
                            iconName = isFocused ? "trophy" : "trophy-outline";
                        } else if (route.name === 'Taqvim') {
                            iconName = isFocused ? "calendar" : "calendar-outline";
                        } else if (route.name === 'Yangiliklar') {
                            iconName = isFocused ? "newspaper" : "newspaper-outline";
                        }

                        return (
                            <TouchableOpacity
                                key={route.key}
                                accessibilityRole="button"
                                accessibilityState={isFocused ? { selected: true } : {}}
                                accessibilityLabel={options.tabBarAccessibilityLabel}
                                testID={options.tabBarTestID}
                                onPress={onPress}
                                onLongPress={route.name === 'Profil' ? handleProfilLongPress : undefined}
                                delayLongPress={300}
                                activeOpacity={0.7}
                                style={styles.tabItem}
                            >
                                <View style={styles.iconWrapper}>
                                    {route.name === 'Profil' ? (
                                        userAvatarUri ? (
                                            <SmartImage
                                                uri={userAvatarUri}
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: 12,
                                                    borderWidth: isFocused ? 2 : 1,
                                                    borderColor: isFocused ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                                                }}
                                                contentFit="cover"
                                                fallbackIcon="person-circle-outline"
                                                fallbackIconSize={24}
                                            />
                                        ) : (
                                            <Ionicons
                                                name={isFocused ? "person" : "person-outline"}
                                                size={22}
                                                color={isFocused ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)'}
                                            />
                                        )
                                    ) : (
                                        <Ionicons
                                            name={iconName}
                                            size={22}
                                            color={isFocused ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)'}
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
                            { transform: [{ translateY: modalY }] }
                        ]}
                        {...modalPanResponder.panHandlers}
                    >
                        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                        
                        <View style={styles.headerDragZone}>
                            <View style={styles.grabberBar} />
                            <View style={styles.modalHeaderRow}>
                                <Text style={styles.switcherTitle}>Akkountni Almashtirish</Text>
                            </View>
                        </View>

                        <View style={{ paddingHorizontal: 22, paddingTop: 2, paddingBottom: Platform.OS === 'ios' ? 34 : 20 }}>

                            {loadingAccounts ? (
                                <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 12, fontSize: 13 }}>
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
                                                style={[styles.accountOptionCard, isCurrent && styles.accountOptionCardActive]}
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
                                                        <View style={styles.accountOptionAvatarFallback}>
                                                            <Text style={styles.avatarInitial}>
                                                                {(acc.name || 'F').charAt(0).toUpperCase()}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>

                                                {/* Name and Organization */}
                                                <View style={{ flex: 1, marginLeft: 14, justifyContent: 'center' }}>
                                                    <Text style={styles.accountOptionName}>{acc.name}</Text>
                                                    <Text style={styles.accountOptionOrg}>{orgName}</Text>
                                                </View>

                                                {/* Active Indicator */}
                                                {isCurrent && (
                                                    <View style={styles.activeCheckBadge}>
                                                        <View style={styles.activeCheckDot} />
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

export default function AppNavigator() {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomFloatingTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                sceneContainerStyle: { backgroundColor: 'transparent' },
            }}
        >
            <Tab.Screen name="Asosiy" component={HomeScreen} />
            <Tab.Screen name="Turnirlar" component={TournamentsScreen} />
            <Tab.Screen name="Taqvim" component={CalendarScreen} />
            <Tab.Screen name="Yangiliklar" component={NewsScreen} />
            <Tab.Screen name="Profil" component={AccountScreen} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    floatingContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 36 : 28,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingCapsuleWrapper: {
        width: CAPSULE_WIDTH,
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.16)',
        backgroundColor: 'rgba(20, 15, 25, 0.48)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45,
        shadowRadius: 20,
        elevation: 8,
        position: 'relative',
    },
    slidingHighlight: {
        position: 'absolute',
        top: 9,
        left: 0,
        width: HIGHLIGHT_WIDTH,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
    },
    tabRow: {
        flexDirection: 'row',
        width: '100%',
        height: 56,
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 4,
    },
    tabItem: {
        flex: 1,
        height: 56,
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
        backgroundColor: 'transparent',
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
        borderColor: 'rgba(255, 255, 255, 0.12)',
        backgroundColor: 'transparent',
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

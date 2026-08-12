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

    const handleProfilLongPress = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}

        if (isGuest) {
            Alert.alert('Akkountlar', 'Akkount ro\'yxatini ko\'rish uchun ilovaga kiring.');
            return;
        }

        const userPhone = user?.phone || user?.phoneNumber || user?.phone_number || user?.tel;
        if (!userPhone) {
            Alert.alert('Akkountlar', 'Akkount ro\'yxatini olish uchun ilovaga kiring.');
            return;
        }

        try {
            setLoadingAccounts(true);
            setShowSwitcherModal(true);
            const fullPhone = `+998${userPhone.replace(/\D/g, '').slice(-9)}`;
            const res = await apiService.findAccountsByPhone(fullPhone);
            if (res.success && res.accounts && res.accounts.length > 0) {
                setAccountOptions(res.accounts);
            } else {
                setAccountOptions([user]);
            }
        } catch (e) {
            console.error('Account switch fetch error:', e);
            setAccountOptions([user]);
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

            {/* Quick Account Switcher Modal */}
            <Modal
                visible={showSwitcherModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSwitcherModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.switcherModalCard}>
                        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={{ padding: 22 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="repeat" size={22} color="#00FF87" />
                                    <Text style={styles.switcherTitle}>AKKOUNTLARNI ALMASHTIRISH</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowSwitcherModal(false)}>
                                    <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.5)" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.switcherSubtitle}>
                                Tizimdan chiqmasdan boshqa akkountingizga tezkor o'ting:
                            </Text>

                            {loadingAccounts ? (
                                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                                    <ActivityIndicator size="large" color="#00FF87" />
                                    <Text style={{ color: 'rgba(255,255,255,0.6)', marginTop: 10, fontSize: 12 }}>Akkountlaringiz yuklanmoqda...</Text>
                                </View>
                            ) : (
                                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                                    {accountOptions.map((acc, idx) => {
                                        const isCurrent = (acc.id === user?.id || acc._id === user?._id) && (acc.organizationId === user?.organizationId || acc.organization_id === user?.organization_id);
                                        const orgName = acc.orgName || acc.organizations?.name || 'Amatora Liga';

                                        return (
                                            <TouchableOpacity
                                                key={idx}
                                                style={[styles.accountOptionCard, isCurrent && styles.accountOptionCardActive]}
                                                activeOpacity={0.8}
                                                onPress={() => handleSwitchAccount(acc)}
                                            >
                                                <View style={styles.accountOptionIcon}>
                                                    {acc.photo ? (
                                                        <Image
                                                            source={{ uri: acc.photo }}
                                                            style={{ width: 44, height: 44, borderRadius: 22 }}
                                                            resizeMode="cover"
                                                        />
                                                    ) : (
                                                        <Ionicons
                                                            name={acc.role === 'manager' ? 'shield-half' : 'football'}
                                                            size={24}
                                                            color="#00FF87"
                                                        />
                                                    )}
                                                </View>
                                                <View style={{ flex: 1, marginLeft: 12, justifyContent: 'center' }}>
                                                    <Text style={styles.accountOptionName}>{acc.name}</Text>
                                                    <Text style={{ color: '#00FF87', fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                                                        🏛️ {orgName}
                                                    </Text>
                                                    {!!acc.subTitle && (
                                                        <Text style={styles.accountOptionSubtitle} numberOfLines={1}>
                                                            {acc.subTitle}
                                                        </Text>
                                                    )}
                                                </View>
                                                {isCurrent ? (
                                                    <Ionicons name="checkmark-circle" size={24} color="#00FF87" />
                                                ) : (
                                                    <Ionicons name="swap-horizontal" size={20} color="rgba(255,255,255,0.4)" />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}

                            <TouchableOpacity
                                style={styles.cancelModalBtn}
                                onPress={() => setShowSwitcherModal(false)}
                            >
                                <Text style={styles.cancelModalBtnText}>YOPISH</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
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
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    switcherModalCard: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        backgroundColor: '#121212',
    },
    switcherTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    switcherSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
        marginBottom: 16,
    },
    accountOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        padding: 14,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    accountOptionCardActive: {
        borderColor: 'rgba(0, 255, 135, 0.5)',
        backgroundColor: 'rgba(0, 255, 135, 0.12)',
    },
    accountOptionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.3)',
        overflow: 'hidden',
    },
    accountOptionName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFF',
    },
    accountOptionSubtitle: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.5)',
        marginTop: 2,
    },
    cancelModalBtn: {
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    cancelModalBtnText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 13,
        letterSpacing: 1,
    },
});

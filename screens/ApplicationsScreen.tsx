import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    SafeAreaView,
    RefreshControl,
    Modal,
    Animated,
    Dimensions,
    Platform,
    PanResponder,
    StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../theme/homeScreenColors';
import { apiService, supabase } from '../services/apiService';
import SmartImage from '../components/SmartImage';

const { width } = Dimensions.get('window');
const BRAND_ORANGE = '#FF6B00';
const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;

export default function ApplicationsScreen({ navigation }: any) {
    const { user, isGuest } = useAuthStore();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const { t, i18n } = useTranslation();
    const currentLang = i18n?.language || 'uz';

    const [appTab, setAppTab] = useState<'transfers' | 'profile'>('profile');
    const [userTransfers, setUserTransfers] = useState<any[]>([]);
    const [userProfileApps, setUserProfileApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Detail Modal State
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [selectedAppType, setSelectedAppType] = useState<'transfer' | 'profile'>('profile');

    // Interactive Swipe to Back Animation
    const swipeBackAnim = useRef(new Animated.Value(0)).current;
    const swipeBackPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                return gestureState.dx > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.3;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dx > 0) {
                    swipeBackAnim.setValue(gestureState.dx);
                } else {
                    swipeBackAnim.setValue(0);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                const shouldExit = gestureState.dx > width * 0.35 || (gestureState.dx > 60 && gestureState.vx > 0.6);
                if (shouldExit) {
                    Animated.timing(swipeBackAnim, {
                        toValue: width,
                        duration: 180,
                        useNativeDriver: true,
                    }).start(() => {
                        navigation.goBack();
                    });
                } else {
                    Animated.spring(swipeBackAnim, {
                        toValue: 0,
                        friction: 8,
                        tension: 45,
                        useNativeDriver: true,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(swipeBackAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 45,
                    useNativeDriver: true,
                }).start();
            }
        })
    ).current;

    const cardSurface = {
        backgroundColor: homeColors.background,
        ...Platform.select({
            ios: {
                borderWidth: 1,
                borderColor: homeColors.border,
                shadowOpacity: 0,
            },
            android: {
                borderWidth: 1,
                borderColor: homeColors.border,
                elevation: 2,
                shadowColor: isDark ? '#FFFFFF' : '#000000',
            },
        }),
    };

    useEffect(() => {
        if (!isGuest && user) {
            loadApplications();
        } else {
            setLoading(false);
        }
    }, [isGuest, user]);

    const loadApplications = async () => {
        try {
            setLoading(true);
            const targetPlayerId = String(user?.id || user?._id || user?.playerId || '');
            const rawPhone = String(user?.phone || user?.phoneNumber || user?.phone_number || user?.tel || '').trim();
            const cleanPhone = rawPhone.replace(/\D/g, '');

            // 1. Fetch transfers
            if (targetPlayerId) {
                const transfers = await apiService.getPlayerTransfers(targetPlayerId).catch(() => []);
                setUserTransfers(transfers || []);
            }

            // 2. Fetch applications directly from supabase with complete relations
            const { data: allApps, error: appErr } = await supabase
                .from('applications')
                .select('*, teams(id, name, logo_url, logo)')
                .order('created_at', { ascending: false })
                .limit(100);

            if (!appErr && allApps) {
                const myApps = allApps.filter((app: any) => {
                    const comment = String(app.comment || '');
                    const appPhoneClean = String(app.phone || '').replace(/\D/g, '');

                    if (cleanPhone && appPhoneClean && (appPhoneClean.endsWith(cleanPhone) || cleanPhone.endsWith(appPhoneClean))) {
                        return true;
                    }
                    if (targetPlayerId && (comment.includes(`"playerId":"${targetPlayerId}"`) || comment.includes(`"playerId":${targetPlayerId}`))) {
                        return true;
                    }
                    return false;
                });
                setUserProfileApps(myApps);
            }
        } catch (err) {
            console.error('Error loading ApplicationsScreen data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadApplications();
    };

    // Calculate Cooldown Info for profile applications
    const getCooldownInfo = (createdAt: string) => {
        if (!createdAt) return null;
        try {
            const appTime = new Date(createdAt).getTime();
            const timeDiff = Date.now() - appTime;
            const remainingMs = THREE_WEEKS_MS - timeDiff;

            if (remainingMs > 0) {
                const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
                const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                let timeStr = '';
                if (currentLang === 'ru') {
                    timeStr = days > 0 ? `${days} дн. ${hours > 0 ? `${hours} ч.` : ''}` : `${hours} ч.`;
                } else if (currentLang === 'en') {
                    timeStr = days > 0 ? `${days} days ${hours > 0 ? `${hours} hrs` : ''}` : `${hours} hours`;
                } else {
                    timeStr = days > 0 ? `${days} kun ${hours > 0 ? `${hours} soat` : ''}` : `${hours} soat`;
                }

                return {
                    isActive: true,
                    timeStr: timeStr.trim(),
                    remainingDays: days
                };
            }
            return {
                isActive: false,
                timeStr: '',
                remainingDays: 0
            };
        } catch (e) {
            return null;
        }
    };

    // Parse App Details & Payload
    const parseAppPayload = (item: any) => {
        const comment = String(item?.comment || '');
        let payload: any = null;
        if (comment.includes('[PROFILE_UPDATE]')) {
            try {
                const jsonStr = comment.replace('[PROFILE_UPDATE]', '').split('[LEAGUE:')[0].split('[INSTAGRAM:')[0].trim();
                payload = JSON.parse(jsonStr);
            } catch (e) {}
        }
        return payload;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${day}.${month}.${year}  ${hours}:${minutes}`;
        } catch (e) {
            return dateStr.slice(0, 16);
        }
    };

    const renderStatusBadge = (statusStr: string) => {
        const status = String(statusStr || '').toLowerCase().trim();
        const isPending = status === 'pending' || status === 'kutilmoqda';
        const isApproved = status === 'approved' || status === 'accepted' || status === 'tasdiqlangan';
        const isRejected = status === 'rejected' || status === 'rad etilgan';

        let badgeBg = isDark ? 'rgba(234, 179, 8, 0.15)' : 'rgba(234, 179, 8, 0.1)';
        let badgeBorder = isDark ? 'rgba(234, 179, 8, 0.35)' : 'rgba(234, 179, 8, 0.25)';
        let badgeColor = '#EAB308';
        let iconName: any = 'time-outline';
        let label = t('common.pending', 'KUTILMOQDA');

        if (isApproved) {
            badgeBg = isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)';
            badgeBorder = isDark ? 'rgba(34, 197, 94, 0.35)' : 'rgba(34, 197, 94, 0.25)';
            badgeColor = '#22C55E';
            iconName = 'checkmark-circle-outline';
            label = t('common.approved', 'TASDIQLANDI');
        } else if (isRejected) {
            badgeBg = isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)';
            badgeBorder = isDark ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.25)';
            badgeColor = '#EF4444';
            iconName = 'close-circle-outline';
            label = t('common.rejected', 'RAD ETILDI');
        }

        return (
            <View style={[styles.statusBadgePill, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
                <Ionicons name={iconName} size={13} color={badgeColor} style={{ marginRight: 4 }} />
                <Text style={[styles.statusBadgePillText, { color: badgeColor }]}>{label.toUpperCase()}</Text>
            </View>
        );
    };

    return (
        <Animated.View
            style={[
                styles.rootContainer,
                {
                    backgroundColor: homeColors.background,
                    transform: [{ translateX: swipeBackAnim }]
                }
            ]}
            {...swipeBackPanResponder.panHandlers}
        >
            <SafeAreaView style={{ flex: 1, backgroundColor: homeColors.background }}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

                {/* Top Header */}
                <View style={[styles.topHeader, { borderBottomColor: homeColors.border }]}>
                    <TouchableOpacity
                        style={[styles.backBtnAction, cardSurface]}
                        activeOpacity={0.7}
                        onPress={() => {
                            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch (e) {}
                            navigation.goBack();
                        }}
                    >
                        <Ionicons name="arrow-back" size={20} color={homeColors.textPrimary} />
                    </TouchableOpacity>

                    <View style={styles.headerTitleGroup}>
                        <Ionicons name="documents" size={17} color={BRAND_ORANGE} style={{ marginRight: 6 }} />
                        <Text style={[styles.headerTitleText, { color: homeColors.textPrimary }]}>
                            {t('applications.title', 'MENING ARIZALARIM')}
                        </Text>
                    </View>

                    <View style={{ width: 40 }} />
                </View>

                {/* 2-Tab Segmented Selector */}
                <View style={styles.tabContainer}>
                    <View style={[styles.tabSelectorBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: homeColors.border }]}>
                        <TouchableOpacity
                            style={[
                                styles.tabBtn,
                                appTab === 'profile' && {
                                    backgroundColor: isDark ? '#FFFFFF' : '#000000',
                                    shadowColor: BRAND_ORANGE,
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.15,
                                    shadowRadius: 4,
                                    elevation: 2,
                                }
                            ]}
                            activeOpacity={0.8}
                            onPress={() => {
                                try { Haptics.selectionAsync().catch(() => {}); } catch (e) {}
                                setAppTab('profile');
                            }}
                        >
                            <Ionicons
                                name="person"
                                size={14}
                                color={appTab === 'profile' ? (isDark ? '#000000' : '#FFFFFF') : BRAND_ORANGE}
                                style={{ marginRight: 6 }}
                            />
                            <Text
                                style={[
                                    styles.tabBtnText,
                                    {
                                        color: appTab === 'profile'
                                            ? (isDark ? '#000000' : '#FFFFFF')
                                            : homeColors.textSecondary,
                                        fontWeight: appTab === 'profile' ? '800' : '600'
                                    }
                                ]}
                            >
                                {t('applications.profile_tab', 'Profil arizalari')} ({userProfileApps.length})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.tabBtn,
                                appTab === 'transfers' && {
                                    backgroundColor: isDark ? '#FFFFFF' : '#000000',
                                    shadowColor: BRAND_ORANGE,
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.15,
                                    shadowRadius: 4,
                                    elevation: 2,
                                }
                            ]}
                            activeOpacity={0.8}
                            onPress={() => {
                                try { Haptics.selectionAsync().catch(() => {}); } catch (e) {}
                                setAppTab('transfers');
                            }}
                        >
                            <Ionicons
                                name="swap-horizontal"
                                size={15}
                                color={appTab === 'transfers' ? (isDark ? '#000000' : '#FFFFFF') : BRAND_ORANGE}
                                style={{ marginRight: 6 }}
                            />
                            <Text
                                style={[
                                    styles.tabBtnText,
                                    {
                                        color: appTab === 'transfers'
                                            ? (isDark ? '#000000' : '#FFFFFF')
                                            : homeColors.textSecondary,
                                        fontWeight: appTab === 'transfers' ? '800' : '600'
                                    }
                                ]}
                            >
                                {t('applications.transfers_tab', 'Transferlar')} ({userTransfers.length})
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Content List */}
                {loading && !refreshing ? (
                    <View style={styles.loadingWrapper}>
                        <ActivityIndicator size="large" color={BRAND_ORANGE} />
                        <Text style={[styles.loadingText, { color: homeColors.textSecondary }]}>
                            {t('common.loading', 'Yuklanmoqda...')}
                        </Text>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.scrollList}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={BRAND_ORANGE}
                                colors={[BRAND_ORANGE]}
                            />
                        }
                    >
                        {appTab === 'profile' ? (
                            userProfileApps.length === 0 ? (
                                <View style={[styles.emptyBox, cardSurface]}>
                                    <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255, 107, 0, 0.12)' : 'rgba(255, 107, 0, 0.08)' }]}>
                                        <Ionicons name="document-text-outline" size={40} color={BRAND_ORANGE} />
                                    </View>
                                    <Text style={[styles.emptyTitleText, { color: homeColors.textPrimary }]}>
                                        {t('applications.info_apps_empty', 'Profil arizalari topilmadi')}
                                    </Text>
                                    <Text style={[styles.emptySubText, { color: homeColors.textSecondary }]}>
                                        {t('applications.info_apps_empty_sub', "Siz hali ma'lumotlarni o'zgartirish bo'yicha ariza topshirmagansiz.")}
                                    </Text>
                                </View>
                            ) : (
                                userProfileApps.map((item: any, idx: number) => {
                                    const isProfileUpdate = String(item.comment || '').includes('[PROFILE_UPDATE]');
                                    const cooldown = isProfileUpdate ? getCooldownInfo(item.created_at) : null;
                                    const isPending = String(item.status || '').toLowerCase() === 'pending';

                                    return (
                                        <TouchableOpacity
                                            key={item.id || idx}
                                            activeOpacity={0.82}
                                            style={[styles.applicationCard, cardSurface]}
                                            onPress={() => {
                                                try { Haptics.selectionAsync().catch(() => {}); } catch (e) {}
                                                setSelectedApp(item);
                                                setSelectedAppType('profile');
                                            }}
                                        >
                                            {/* Card Top Row */}
                                            <View style={styles.cardHeaderRow}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                                                    <View style={[styles.appIconWrapper, { backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.1)' }]}>
                                                        <Ionicons name="person-circle-outline" size={20} color={BRAND_ORANGE} />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.appNameTitle, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                                            {item.first_name || item.name} {item.last_name || ''}
                                                        </Text>
                                                        <Text style={[styles.appTypeSubtitle, { color: homeColors.textSecondary }]}>
                                                            {isProfileUpdate
                                                                ? t('applications.profile_update_type', 'Profilni tahrirlash')
                                                                : t('applications.individual_type', 'Yakka tartibdagi ariza')}
                                                        </Text>
                                                    </View>
                                                </View>
                                                {renderStatusBadge(item.status)}
                                            </View>

                                            {/* Cooldown Timer Bar for Completed Profile Updates */}
                                            {cooldown && !isPending && (
                                                <View
                                                    style={[
                                                        styles.cooldownNoticeChip,
                                                        {
                                                            backgroundColor: cooldown.isActive
                                                                ? (isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.08)')
                                                                : (isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)'),
                                                            borderColor: cooldown.isActive
                                                                ? (isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(56, 189, 248, 0.2)')
                                                                : (isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)')
                                                        }
                                                    ]}
                                                >
                                                    <Ionicons
                                                        name={cooldown.isActive ? 'time-outline' : 'checkmark-circle-outline'}
                                                        size={14}
                                                        color={cooldown.isActive ? '#38BDF8' : '#22C55E'}
                                                        style={{ marginRight: 6 }}
                                                    />
                                                    <Text
                                                        style={[
                                                            styles.cooldownChipText,
                                                            { color: cooldown.isActive ? '#38BDF8' : '#22C55E' }
                                                        ]}
                                                    >
                                                        {cooldown.isActive
                                                            ? t('applications.reapply_in', { time: cooldown.timeStr, defaultValue: `Qayta ariza: ${cooldown.timeStr}dan so'ng` })
                                                            : t('applications.can_reapply', 'Qayta ariza topshirish mumkin')}
                                                    </Text>
                                                </View>
                                            )}

                                            {/* Footer Row */}
                                            <View style={[styles.cardFooterRow, { borderTopColor: homeColors.border }]}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Ionicons name="calendar-outline" size={13} color={BRAND_ORANGE} style={{ marginRight: 5 }} />
                                                    <Text style={[styles.dateText, { color: homeColors.textSecondary }]}>
                                                        {formatDate(item.created_at)}
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Text style={[styles.detailsLinkText, { color: BRAND_ORANGE }]}>
                                                        {t('common.details', 'Batafsil')}
                                                    </Text>
                                                    <Ionicons name="chevron-forward" size={13} color={BRAND_ORANGE} />
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )
                        ) : (
                            userTransfers.length === 0 ? (
                                <View style={[styles.emptyBox, cardSurface]}>
                                    <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255, 107, 0, 0.12)' : 'rgba(255, 107, 0, 0.08)' }]}>
                                        <Ionicons name="swap-horizontal-outline" size={40} color={BRAND_ORANGE} />
                                    </View>
                                    <Text style={[styles.emptyTitleText, { color: homeColors.textPrimary }]}>
                                        {t('applications.transfer_apps_empty', 'Transfer arizalari topilmadi')}
                                    </Text>
                                    <Text style={[styles.emptySubText, { color: homeColors.textSecondary }]}>
                                        {t('applications.transfer_apps_empty_sub', "Sizda hozircha jamoalararo o'tish arizalari mavjud emas.")}
                                    </Text>
                                </View>
                            ) : (
                                userTransfers.map((item: any, idx: number) => (
                                    <TouchableOpacity
                                        key={item.id || idx}
                                        activeOpacity={0.82}
                                        style={[styles.applicationCard, cardSurface]}
                                        onPress={() => {
                                            try { Haptics.selectionAsync().catch(() => {}); } catch (e) {}
                                            setSelectedApp(item);
                                            setSelectedAppType('transfer');
                                        }}
                                    >
                                        <View style={styles.cardHeaderRow}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                                                <View style={[styles.appIconWrapper, { backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.1)' }]}>
                                                    <Ionicons name="swap-horizontal" size={18} color={BRAND_ORANGE} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.appNameTitle, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                                        {item.old_team_name || 'Eski Jamoa'} ➔ {item.new_team_name || 'Yangi Jamoa'}
                                                    </Text>
                                                    <Text style={[styles.appTypeSubtitle, { color: homeColors.textSecondary }]}>
                                                        {t('nav.transfers', 'Transfer')}
                                                    </Text>
                                                </View>
                                            </View>
                                            {renderStatusBadge(item.status)}
                                        </View>

                                        {item.reason ? (
                                            <View style={[styles.transferReasonChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: homeColors.border }]}>
                                                <Text style={[styles.reasonLabelText, { color: BRAND_ORANGE }]}>
                                                    {t('applications.reason', "O'tish sababi")}:
                                                </Text>
                                                <Text style={[styles.reasonContentText, { color: homeColors.textPrimary }]} numberOfLines={2}>
                                                    "{item.reason}"
                                                </Text>
                                            </View>
                                        ) : null}

                                        <View style={[styles.cardFooterRow, { borderTopColor: homeColors.border }]}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Ionicons name="calendar-outline" size={13} color={BRAND_ORANGE} style={{ marginRight: 5 }} />
                                                <Text style={[styles.dateText, { color: homeColors.textSecondary }]}>
                                                    {formatDate(item.created_at)}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={[styles.detailsLinkText, { color: BRAND_ORANGE }]}>
                                                    {t('common.details', 'Batafsil')}
                                                </Text>
                                                <Ionicons name="chevron-forward" size={13} color={BRAND_ORANGE} />
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )
                        )}
                    </ScrollView>
                )}

                {/* FULL APPLICATION DETAIL MODAL */}
                <Modal
                    visible={Boolean(selectedApp)}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setSelectedApp(null)}
                >
                    <TouchableOpacity
                        style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}
                        activeOpacity={1}
                        onPress={() => setSelectedApp(null)}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            style={[
                                styles.modalCard,
                                cardSurface,
                                {
                                    backgroundColor: homeColors.background,
                                    borderColor: homeColors.border,
                                }
                            ]}
                        >
                            {/* Modal Header */}
                            <View style={[styles.modalHeaderRow, { borderBottomColor: homeColors.border }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <View style={[styles.appIconWrapper, { backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.1)', marginRight: 10 }]}>
                                        <Ionicons name="information-circle" size={20} color={BRAND_ORANGE} />
                                    </View>
                                    <Text style={[styles.modalTitleText, { color: homeColors.textPrimary }]}>
                                        {t('applications.details_title', 'ARIZA TAFSILOTLARI')}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setSelectedApp(null)}
                                    style={[styles.modalCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
                                >
                                    <Ionicons name="close" size={18} color={homeColors.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                                {selectedApp && (() => {
                                    const isProfileUpdate = String(selectedApp.comment || '').includes('[PROFILE_UPDATE]');
                                    const cooldown = isProfileUpdate ? getCooldownInfo(selectedApp.created_at) : null;
                                    const payload = parseAppPayload(selectedApp);
                                    const newData = payload?.newData;
                                    const oldData = payload?.oldData;

                                    return (
                                        <View style={{ gap: 12, paddingVertical: 12 }}>
                                            {/* Status Banner */}
                                            <View style={{ alignItems: 'center', paddingVertical: 6 }}>
                                                {renderStatusBadge(selectedApp.status)}
                                            </View>

                                            {/* Cooldown Information Banner */}
                                            {cooldown && (
                                                <View
                                                    style={{
                                                        padding: 12,
                                                        borderRadius: 14,
                                                        backgroundColor: cooldown.isActive
                                                            ? (isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(56, 189, 248, 0.08)')
                                                            : (isDark ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.08)'),
                                                        borderWidth: 1,
                                                        borderColor: cooldown.isActive
                                                            ? (isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(56, 189, 248, 0.2)')
                                                            : (isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)'),
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                                        <Ionicons
                                                            name={cooldown.isActive ? 'time' : 'shield-checkmark'}
                                                            size={16}
                                                            color={cooldown.isActive ? '#38BDF8' : '#22C55E'}
                                                            style={{ marginRight: 6 }}
                                                        />
                                                        <Text
                                                            style={{
                                                                fontSize: 13,
                                                                fontWeight: '800',
                                                                color: cooldown.isActive ? '#38BDF8' : '#22C55E'
                                                            }}
                                                        >
                                                            {t('applications.cooldown_notice_title', '3 haftalik cheklov')}
                                                        </Text>
                                                    </View>
                                                    <Text
                                                        style={{
                                                            fontSize: 12,
                                                            textAlign: 'center',
                                                            color: homeColors.textSecondary,
                                                            lineHeight: 17
                                                        }}
                                                    >
                                                        {cooldown.isActive
                                                            ? t('applications.cooldown_active_desc', { time: cooldown.timeStr, defaultValue: `Qayta ariza topshirish uchun ${cooldown.timeStr} kuting` })
                                                            : t('applications.cooldown_ready_desc', "3 haftalik muddat o'tgan. Yangi ariza yuborishingiz mumkin.")}
                                                    </Text>
                                                </View>
                                            )}

                                            {/* Details Info List */}
                                            {selectedAppType === 'transfer' ? (
                                                <View style={[styles.detailTable, { borderColor: homeColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                                                    <View style={[styles.detailTableRow, { borderBottomColor: homeColors.border }]}>
                                                        <Text style={[styles.detailTableLabel, { color: homeColors.textSecondary }]}>{t('applications.from_team', 'Hozirgi jamoa')}</Text>
                                                        <Text style={[styles.detailTableValue, { color: homeColors.textPrimary }]}>{selectedApp.old_team_name || '—'}</Text>
                                                    </View>
                                                    <View style={[styles.detailTableRow, { borderBottomColor: homeColors.border }]}>
                                                        <Text style={[styles.detailTableLabel, { color: homeColors.textSecondary }]}>{t('applications.to_team', 'Yangi jamoa')}</Text>
                                                        <Text style={[styles.detailTableValue, { color: BRAND_ORANGE }]}>{selectedApp.new_team_name || '—'}</Text>
                                                    </View>
                                                    <View style={[styles.detailTableRow, { borderBottomColor: homeColors.border }]}>
                                                        <Text style={[styles.detailTableLabel, { color: homeColors.textSecondary }]}>{t('applications.reason', "O'tish sababi")}</Text>
                                                        <Text style={[styles.detailTableValue, { color: homeColors.textPrimary }]}>"{selectedApp.reason || '—'}"</Text>
                                                    </View>
                                                </View>
                                            ) : (
                                                <View style={[styles.detailTable, { borderColor: homeColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                                                    <View style={[styles.detailTableRow, { borderBottomColor: homeColors.border }]}>
                                                        <Text style={[styles.detailTableLabel, { color: homeColors.textSecondary }]}>{t('applications.name', 'Ism va Familiya')}</Text>
                                                        <Text style={[styles.detailTableValue, { color: homeColors.textPrimary }]}>
                                                            {newData ? `${newData.firstName || ''} ${newData.lastName || ''}` : `${selectedApp.first_name || ''} ${selectedApp.last_name || ''}`}
                                                        </Text>
                                                    </View>
                                                    <View style={[styles.detailTableRow, { borderBottomColor: homeColors.border }]}>
                                                        <Text style={[styles.detailTableLabel, { color: homeColors.textSecondary }]}>{t('applications.phone', 'Telefon raqam')}</Text>
                                                        <Text style={[styles.detailTableValue, { color: homeColors.textPrimary }]}>{selectedApp.phone || '—'}</Text>
                                                    </View>
                                                    <View style={[styles.detailTableRow, { borderBottomColor: homeColors.border }]}>
                                                        <Text style={[styles.detailTableLabel, { color: homeColors.textSecondary }]}>{t('applications.position', 'Pozitsiya')}</Text>
                                                        <Text style={[styles.detailTableValue, { color: BRAND_ORANGE }]}>
                                                            {newData?.position || selectedApp.position || '—'}
                                                        </Text>
                                                    </View>
                                                    {(newData?.playerNumber || selectedApp.player_number) ? (
                                                        <View style={[styles.detailTableRow, { borderBottomColor: homeColors.border }]}>
                                                            <Text style={[styles.detailTableLabel, { color: homeColors.textSecondary }]}>{t('applications.jersey', 'Forma raqami')}</Text>
                                                            <Text style={[styles.detailTableValue, { color: homeColors.textPrimary }]}>#{newData?.playerNumber || selectedApp.player_number}</Text>
                                                        </View>
                                                    ) : null}
                                                    {(newData?.birthDate || selectedApp.birth_date) ? (
                                                        <View style={[styles.detailTableRow, { borderBottomColor: homeColors.border }]}>
                                                            <Text style={[styles.detailTableLabel, { color: homeColors.textSecondary }]}>{t('applications.birth_date', "Tug'ilgan sana")}</Text>
                                                            <Text style={[styles.detailTableValue, { color: homeColors.textPrimary }]}>{newData?.birthDate || selectedApp.birth_date}</Text>
                                                        </View>
                                                    ) : null}
                                                    {(newData?.passportSeries || selectedApp.passport_series) ? (
                                                        <View style={[styles.detailTableRow, { borderBottomColor: homeColors.border }]}>
                                                            <Text style={[styles.detailTableLabel, { color: homeColors.textSecondary }]}>{t('applications.passport', 'Pasport')}</Text>
                                                            <Text style={[styles.detailTableValue, { color: homeColors.textPrimary }]}>
                                                                {newData?.passportSeries || selectedApp.passport_series} {newData?.passportNumber || selectedApp.passport_number}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                    {newData?.instagramUsername ? (
                                                        <View style={[styles.detailTableRow, { borderBottomColor: homeColors.border }]}>
                                                            <Text style={[styles.detailTableLabel, { color: homeColors.textSecondary }]}>{t('applications.instagram', 'Instagram')}</Text>
                                                            <Text style={[styles.detailTableValue, { color: BRAND_ORANGE }]}>@{newData.instagramUsername}</Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            )}

                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                                                <Ionicons name="calendar-outline" size={13} color={homeColors.textSecondary} />
                                                <Text style={{ fontSize: 12, color: homeColors.textSecondary }}>
                                                    {t('applications.submitted_at', 'Yuborilgan sana')}: {formatDate(selectedApp.created_at)}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })()}
                            </ScrollView>

                            {/* Close Action Button */}
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch (e) {}
                                    setSelectedApp(null);
                                }}
                                style={[styles.modalActionCloseBtn, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}
                            >
                                <Text style={[styles.modalActionCloseBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                                    {t('common.close', 'Yopish')}
                                </Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>
            </SafeAreaView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    rootContainer: {
        flex: 1,
    },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backBtnAction: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitleText: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    tabContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    tabSelectorBg: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 16,
        borderWidth: 1,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
    },
    tabBtnText: {
        fontSize: 13,
        letterSpacing: 0.2,
    },
    loadingWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 13.5,
        fontWeight: '600',
    },
    scrollList: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 12,
    },
    emptyBox: {
        padding: 32,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
    },
    emptyIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitleText: {
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 6,
    },
    emptySubText: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: 280,
    },
    applicationCard: {
        borderRadius: 18,
        padding: 16,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    appIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    appNameTitle: {
        fontSize: 14.5,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    appTypeSubtitle: {
        fontSize: 11.5,
        fontWeight: '600',
        marginTop: 2,
    },
    statusBadgePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 9,
        paddingVertical: 4.5,
        borderRadius: 10,
        borderWidth: 1,
    },
    statusBadgePillText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    cooldownNoticeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 10,
    },
    cooldownChipText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    transferReasonChip: {
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 10,
    },
    reasonLabelText: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 2,
    },
    reasonContentText: {
        fontSize: 12.5,
        lineHeight: 17,
        fontWeight: '500',
    },
    cardFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 10,
        borderTopWidth: 1,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '600',
    },
    detailsLinkText: {
        fontSize: 12.5,
        fontWeight: '700',
        marginRight: 2,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 380,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    modalTitleText: {
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailTable: {
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
    },
    detailTableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    detailTableLabel: {
        fontSize: 12.5,
        fontWeight: '600',
    },
    detailTableValue: {
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'right',
        maxWidth: 180,
    },
    modalActionCloseBtn: {
        width: '100%',
        paddingVertical: 13,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
    },
    modalActionCloseBtnText: {
        fontSize: 14.5,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
});

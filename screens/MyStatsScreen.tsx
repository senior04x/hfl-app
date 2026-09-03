import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Linking,
    Dimensions,
    Image,
    Animated,
    StatusBar,
    Modal,
    TextInput,
    Alert,
    Platform,
    PanResponder,
    KeyboardAvoidingView,
    Keyboard,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { Picker } from '@react-native-picker/picker';
import { apiService, clearApiCache } from '../services/apiService';
import { supabase } from '../services/supabase';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import SmartImage from '../components/SmartImage';
import { useAuthStore } from '../store/useAuthStore';
import PlayerMatchReplayCard from '../components/PlayerMatchReplayCard';
import FifaPlayerCard, { FifaCardSkeleton } from '../components/FifaPlayerCard';
import PlayerComparisonModal from '../components/PlayerComparisonModal';
import { aiScoutService, PlayerAiStats } from '../services/aiScoutService';
import { useTranslation } from 'react-i18next';
import { getLocalizedPosition } from '../utils/localizationUtils';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { SlideButton } from '../components/SlideButton';
import CustomDatePickerModal from '../components/CustomDatePickerModal';

const { width } = Dimensions.get('window');

// Universal Metadata Extractor
const extractPlayerData = (data: any) => {
    if (!data) return null;
    let citizenship = data.citizenship || '';
    let height = data.height || '';
    let weight = data.weight || '';
    let instaUser = data.instagram_username || '';
    let instaUrl = data.instagram_url || '';

    if (data.comment && typeof data.comment === 'string') {
        const metaMatch = data.comment.match(/\[METADATA:({[^\]]+})\]/);
        if (metaMatch?.[1]) {
            try {
                const obj = JSON.parse(metaMatch[1]);
                if (obj.citizenship) citizenship = obj.citizenship;
                if (obj.height) height = String(obj.height);
                if (obj.weight) weight = String(obj.weight);
            } catch (e) {}
        }

        if (data.comment.includes('[PROFILE_UPDATE]')) {
            try {
                const parts = data.comment.split('[PROFILE_UPDATE]');
                let jsonStr = parts[1] || '';
                const tagIdx = jsonStr.indexOf(' [');
                if (tagIdx !== -1) jsonStr = jsonStr.substring(0, tagIdx);
                const pObj = JSON.parse(jsonStr.trim());
                const target = pObj.newData || pObj;
                if (target.citizenship && !citizenship) citizenship = target.citizenship;
                if (target.height && !height) height = String(target.height);
                if (target.weight && !weight) weight = String(target.weight);
            } catch (e) {}
        }

        const instaMatch = data.comment.match(/\[INSTAGRAM:(https?:\/\/[^\]]+)\]/);
        if (instaMatch?.[1]) {
            instaUrl = instaMatch[1];
            const uMatch = instaUrl.match(/instagram\.com\/([^/]+)/);
            if (uMatch?.[1]) instaUser = uMatch[1];
        }
    }

    return {
        ...data,
        citizenship: citizenship || "O'zbekiston",
        height,
        weight,
        fatherName: data.fatherName || data.father_name || '',
        instagram_username: instaUser,
        instagram_url: instaUrl,
        team_logo: data.teams?.logo_url || data.teams?.logo || data.team?.logo_url || data.team?.logo || data.team_logo || data.teamLogo || data.team_logo_url || ''
    };
};

const calculateAgeFromBirthDate = (birthStr?: string, defaultAge?: any) => {
    if (!birthStr) return defaultAge ? `${defaultAge} yosh` : '—';
    const str = String(birthStr).trim();
    let day: number | null = null;
    let month: number | null = null;
    let year: number | null = null;

    if (str.includes('.')) {
        const parts = str.split('.');
        if (parts.length >= 3) {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            year = parseInt(parts[2], 10);
        }
    } else if (str.includes('-')) {
        const parts = str.split('-');
        if (parts.length >= 3) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            day = parseInt(parts[2], 10);
        }
    } else if (/^\d{8}$/.test(str)) {
        day = parseInt(str.substring(0, 2), 10);
        month = parseInt(str.substring(2, 4), 10);
        year = parseInt(str.substring(4, 8), 10);
    } else {
        const yrMatch = str.match(/\b(19\d{2}|20\d{2})\b/);
        if (yrMatch) {
            year = parseInt(yrMatch[1], 10);
            month = 1;
            day = 1;
        }
    }

    if (!year || isNaN(year) || year < 1920 || year > 2026) {
        return defaultAge ? `${defaultAge} yosh` : '—';
    }

    const today = new Date('2026-07-27');
    let age = today.getFullYear() - year;
    if (month && day && !isNaN(month) && !isNaN(day)) {
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();
        if (currentMonth < month || (currentMonth === month && currentDay < day)) {
            age--;
        }
    }

    return age > 0 ? `${age}` : (defaultAge ? `${defaultAge}` : '—');
};

const InlineSkeleton = ({ width = 36, height = 14, borderRadius = 4, style }: any) => {
    const isDark = useThemeStore((state) => state.isDark);
    const opacityAnim = useRef(new Animated.Value(0.35)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacityAnim, {
                    toValue: 0.8,
                    duration: 700,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0.35,
                    duration: 700,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.12)',
                    opacity: opacityAnim,
                },
                style,
            ]}
        />
    );
};

const MyStatsScreenSkeleton = () => {
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const cardSurface = {
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
        borderColor: homeColors.border,
        borderWidth: 1,
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: homeColors.background }]} edges={['top']}>
            <View style={[styles.headerStickySection, { backgroundColor: homeColors.background, borderBottomColor: homeColors.border }]}>
                {/* Top Row */}
                <View style={styles.topRow}>
                    <InlineSkeleton width={36} height={36} borderRadius={10} />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <InlineSkeleton width={36} height={36} borderRadius={10} />
                        <InlineSkeleton width={36} height={36} borderRadius={10} />
                    </View>
                </View>

                {/* Identity Row */}
                <View style={styles.identityRowSticky}>
                    <InlineSkeleton width={68} height={68} borderRadius={16} />
                    <View style={{ flex: 1, paddingLeft: 12, gap: 6 }}>
                        <InlineSkeleton width={140} height={18} borderRadius={4} />
                        <InlineSkeleton width={100} height={14} borderRadius={4} />
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                            <InlineSkeleton width={60} height={20} borderRadius={6} />
                            <InlineSkeleton width={45} height={20} borderRadius={6} />
                        </View>
                    </View>
                </View>

                {/* Info Stats Card */}
                <View style={[styles.infoStatsCard, cardSurface, { marginBottom: 8 }]}>
                    <View style={styles.infoTopRow}>
                        {[1, 2, 3, 4].map((i) => (
                            <React.Fragment key={i}>
                                <View style={styles.infoStat}>
                                    <InlineSkeleton width={24} height={16} borderRadius={4} />
                                    <InlineSkeleton width={32} height={10} borderRadius={3} style={{ marginTop: 4 }} />
                                </View>
                                {i < 4 && <View style={[styles.infoDivider, { backgroundColor: homeColors.border }]} />}
                            </React.Fragment>
                        ))}
                    </View>
                </View>

                {/* Tab switcher */}
                <View style={[styles.tabBarContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                    {[1, 2, 3].map((i) => (
                        <View key={i} style={[styles.tabBtn, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                            <InlineSkeleton width={55} height={14} borderRadius={4} />
                        </View>
                    ))}
                </View>
            </View>

            {/* Scroll body with FIFA card skeleton */}
            <ScrollView style={styles.tabContent} contentContainerStyle={{ padding: 16, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
                <View style={[styles.infoSectionCard, cardSurface, { width: '100%' }]}>
                    <View style={[styles.sectionCardHeader, { borderBottomColor: homeColors.border }]}>
                        <InlineSkeleton width={110} height={16} borderRadius={4} />
                    </View>
                    <View style={styles.physicalGrid}>
                        {[1, 2, 3, 4].map((i) => (
                            <React.Fragment key={i}>
                                <View style={styles.physicalItem}>
                                    <InlineSkeleton width={32} height={10} borderRadius={3} />
                                    <InlineSkeleton width={30} height={14} borderRadius={4} style={{ marginTop: 4 }} />
                                </View>
                                {i < 4 && <View style={[styles.physicalDivider, { backgroundColor: homeColors.border }]} />}
                            </React.Fragment>
                        ))}
                    </View>
                </View>

                <View style={[styles.infoSectionCard, cardSurface, { width: '100%', marginTop: 14, alignItems: 'center', paddingVertical: 18 }]}>
                    <FifaCardSkeleton size="lg" showAttributes={true} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default function MyStatsScreen({ route, navigation }: any) {
    const { t, i18n } = useTranslation();
    const currentLang = i18n?.language || 'uz';
    const { user } = useAuthStore();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);

    const cardSurface = {
        backgroundColor: homeColors.background,
        ...Platform.select({
            ios: {
                borderWidth: 1,
                borderColor: homeColors.border,
                shadowOpacity: 0,
            },
            android: {
                borderWidth: 0,
                elevation: 2,
                shadowColor: isDark ? '#FFFFFF' : '#000000',
            },
        }),
    };

    const initialPlayer = route?.params?.player || user;
    const targetPlayerId = route?.params?.playerId || initialPlayer?.id || initialPlayer?._id || user?.id || user?._id;
    const [loading, setLoading] = useState(!initialPlayer);
    const [player, setPlayer] = useState<any>(initialPlayer ? extractPlayerData(initialPlayer) : null);
    const [playerTransfers, setPlayerTransfers] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [matchesLoading, setMatchesLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [openingInstagram, setOpeningInstagram] = useState(false);
    const [checkingPendingUpdate, setCheckingPendingUpdate] = useState(false);
    const [showPendingAppModal, setShowPendingAppModal] = useState(false);
    const [showCooldownModal, setShowCooldownModal] = useState(false);
    const [cooldownRemainingTime, setCooldownRemainingTime] = useState('');

    // Profile Update & Modals
    const [showProfileUpdateModal, setShowProfileUpdateModal] = useState(false);
    const [originalPlayerData, setOriginalPlayerData] = useState<any>(null);
    const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showComparisonModal, setShowComparisonModal] = useState(false);
    const [aiStats, setAiStats] = useState<PlayerAiStats | null>(null);

    // Export State & ViewShot Ref
    const [exportState, setExportState] = useState<'idle' | 'loading' | 'complete'>('idle');
    const [exportProgress, setExportProgress] = useState(0);
    const posterShotRef = useRef<any>(null);
    const passportNumberRef = useRef<TextInput>(null);

    // Profile update form state
    const [updateForm, setUpdateForm] = useState({
        photoUrl: '',
        phone: '',
        firstName: '',
        lastName: '',
        fatherName: '',
        position: '',
        playerNumber: '',
        passportSeries: '',
        passportNumber: '',
        citizenship: '',
        height: '',
        weight: '',
        instagramUsername: '',
        birthDay: '15',
        birthMonth: '05',
        birthYear: '1998'
    });
    const [submittingUpdate, setSubmittingUpdate] = useState(false);
    const [pickerLoading, setPickerLoading] = useState(false);
    const [updateSubmitStatus, setUpdateSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    // Real-time 1:1 linked pager (MatchDetail & MyTeam architecture)
    const tabs: ('profil' | 'karyerasi' | 'oyinlari')[] = ['profil', 'karyerasi', 'oyinlari'];
    const TAB_LABELS: Record<string, string> = {
        profil: t('stats.tab_profile', 'PROFIL').toUpperCase(),
        karyerasi: t('stats.tab_career', 'KARYERASI').toUpperCase(),
        oyinlari: t('stats.tab_matches', "O'YINLARI").toUpperCase()
    };
    const [currentTabIndex, setCurrentTabIndex] = useState(0);
    const currentTabIndexRef = useRef(0);
    const scrollXPager = useRef(new Animated.Value(0)).current;
    const isPagerScrolling = useRef(false);
    const pagerScrollRef = useRef<ScrollView>(null);
    const [tabLabelWidths, setTabLabelWidths] = useState<number[]>([]);

    const TAB_BAR_WIDTH = width - 32;
    const TAB_WIDTH = TAB_BAR_WIDTH / tabs.length;
    const DEFAULT_INDICATOR_WIDTH = TAB_WIDTH * 0.72;
    const tabIndicatorInputRange = tabs.map((_, i) => i * width);
    const indicatorWidths = tabs.map((_, i) => tabLabelWidths[i] ?? DEFAULT_INDICATOR_WIDTH);
    const indicatorLefts = tabs.map((_, i) => i * TAB_WIDTH + (TAB_WIDTH - indicatorWidths[i]) / 2);
    const indicatorTranslateX = scrollXPager.interpolate({
        inputRange: tabIndicatorInputRange,
        outputRange: indicatorLefts,
        extrapolate: 'clamp',
    });
    const indicatorWidthAnim = scrollXPager.interpolate({
        inputRange: tabIndicatorInputRange,
        outputRange: indicatorWidths,
        extrapolate: 'clamp',
    });

    const swipeBackAnim = useRef(new Animated.Value(0)).current;

    // Tab 0 interactive real-time swipe to back
    const swipeBackPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                if (currentTabIndexRef.current !== 0) return false;
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
            },
            onPanResponderTerminationRequest: () => true,
        })
    ).current;

    const handleTabPress = async (index: number) => {
        if (index === currentTabIndexRef.current) return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}
        isPagerScrolling.current = true;
        currentTabIndexRef.current = index;
        setCurrentTabIndex(index);
        pagerScrollRef.current?.scrollTo({
            x: index * width,
            animated: false,
        });
        requestAnimationFrame(() => {
            isPagerScrolling.current = false;
        });
    };

    const handlePagerMomentumScrollEnd = (e: any) => {
        const offsetX = e.nativeEvent.contentOffset.x;
        const newIdx = Math.max(0, Math.min(tabs.length - 1, Math.round(offsetX / width)));
        if (newIdx !== currentTabIndexRef.current) {
            currentTabIndexRef.current = newIdx;
            setCurrentTabIndex(newIdx);
            if (tabs[newIdx] === 'oyinlari' && matches.length === 0) {
                fetchPlayerMatches();
            }
        }
        isPagerScrolling.current = false;
    };

    const handleOpenInstagram = async (url: string) => {
        if (!url || openingInstagram) return;
        try {
            setOpeningInstagram(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                Alert.alert(t('common.notice', 'Eslatma'), 'Instagram havolasini ochib bo\'lmadi');
            }
        } catch (error) {
            console.error('Error opening instagram URL:', error);
        } finally {
            setTimeout(() => setOpeningInstagram(false), 1200);
        }
    };

    const handleExportPress = () => {
        if (exportState !== 'idle') return;
        setExportState('loading');
        setExportProgress(0);

        let current = 0;
        const timer = setInterval(() => {
            current += 10;
            setExportProgress(current);
            if (current >= 100) {
                clearInterval(timer);
                setExportState('complete');
                setShowExportModal(true);
                setTimeout(() => {
                    setExportState('idle');
                    setExportProgress(0);
                }, 3000);
            }
        }, 120);
    };

    const handleSharePoster = async () => {
        try {
            if (posterShotRef.current) {
                const uri = await captureRef(posterShotRef, {
                    format: 'png',
                    quality: 1.0,
                    result: 'tmpfile'
                });
                const isAvailable = await Sharing.isAvailableAsync();
                if (isAvailable) {
                    await Sharing.shareAsync(uri, {
                        mimeType: 'image/png',
                        dialogTitle: 'Matchday Player Card',
                        UTI: 'public.png'
                    });
                } else {
                    Alert.alert(t('common.ready', 'Tayyor!'), `Posteringiz saqlandi: ${uri}`);
                }
            } else {
                Alert.alert(t('common.notice', 'Eslatma'), 'Posterni rasmga olib bo\'lmadi. Qayta urinib ko\'ring.');
            }
        } catch (e) {
            console.error('Error exporting poster:', e);
            Alert.alert(t('common.notice', 'Xatolik'), 'Posterni eksport qilishda xatolik bo\'ldi');
        }
    };

    // Open Profile Update Modal with lazy loading check for pending applications & 3-week cooldown
    const handleOpenUpdateModal = async () => {
        if (checkingPendingUpdate) return;
        try {
            setCheckingPendingUpdate(true);
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch (e) {}

            const user = useAuthStore.getState().user;
            const targetPhone = String(player?.phone || user?.phone || updateForm?.phone || '').trim();
            const cleanTargetPhone = targetPhone.replace(/\D/g, '');
            const playerIdStr = String(targetPlayerId || player?.id || player?._id || user?.id || user?.playerId || '');

            // 1. Query applications to check for pending and latest approved/rejected requests
            let pendingAppFound = false;
            let latestCompletedApp: any = null;
            const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;

            try {
                const { data: allUserApps, error: fetchErr } = await supabase
                    .from('applications')
                    .select('id, comment, status, phone, first_name, last_name, created_at')
                    .order('created_at', { ascending: false })
                    .limit(100);

                if (!fetchErr && allUserApps && allUserApps.length > 0) {
                    for (const app of allUserApps) {
                        const comment = String(app.comment || '');
                        if (!comment.includes('[PROFILE_UPDATE]')) continue;

                        const cleanAppPhone = String(app.phone || '').replace(/\D/g, '');
                        const matchesPhone = cleanTargetPhone && cleanAppPhone && (
                            cleanAppPhone.endsWith(cleanTargetPhone) || cleanTargetPhone.endsWith(cleanAppPhone)
                        );
                        const matchesId = playerIdStr && comment.includes(playerIdStr);

                        if (matchesPhone || matchesId) {
                            const status = String(app.status || '').toLowerCase().trim();
                            if (status === 'pending' || status === 'kutilmoqda') {
                                pendingAppFound = true;
                                break;
                            } else if (['approved', 'accepted', 'tasdiqlangan', 'rejected', 'rad etilgan'].includes(status)) {
                                if (!latestCompletedApp) {
                                    latestCompletedApp = app;
                                }
                            }
                        }
                    }
                }
            } catch (checkErr) {
                console.warn('Error checking application status:', checkErr);
            }

            // If active pending application exists -> show pending modal
            if (pendingAppFound) {
                setCheckingPendingUpdate(false);
                try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); } catch (e) {}
                setShowPendingAppModal(true);
                return;
            }

            // If recent completed application within 3 weeks exists -> show cooldown modal
            if (latestCompletedApp && latestCompletedApp.created_at) {
                const appTime = new Date(latestCompletedApp.created_at).getTime();
                const timeDiff = Date.now() - appTime;
                if (timeDiff < THREE_WEEKS_MS) {
                    const remainingMs = THREE_WEEKS_MS - timeDiff;
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

                    setCooldownRemainingTime(timeStr.trim());
                    setCheckingPendingUpdate(false);
                    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); } catch (e) {}
                    setShowCooldownModal(true);
                    return;
                }
            }

            const pData = extractPlayerData(player) || {};
            const bDate = player?.birth_date || player?.birthDate || '15.05.1998';
            let formattedBDate = String(bDate);

            if (formattedBDate.includes('-')) {
                const parts = formattedBDate.split('-');
                if (parts[0].length === 4) {
                    formattedBDate = `${parts[2].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[0]}`;
                }
            }

            setOriginalPlayerData(player);
            setUpdateForm({
                photoUrl: player?.photo_url || player?.photo || player?.avatar || '',
                phone: player?.phone || '',
                firstName: player?.first_name || player?.firstName || '',
                lastName: player?.last_name || player?.lastName || '',
                fatherName: player?.father_name || player?.fatherName || pData.fatherName || '',
                position: player?.position || 'Hujumchi',
                playerNumber: String(player?.player_number || player?.number || player?.shirt_number || ''),
                passportSeries: player?.passport_series || player?.passportSeries || '',
                passportNumber: player?.passport_number || player?.passportNumber || '',
                citizenship: player?.citizenship || pData.citizenship || "O'zbekiston",
                height: String(player?.height || pData.height || ''),
                weight: String(player?.weight || pData.weight || ''),
                instagramUsername: player?.instagram_username || pData.instagram_username || '',
                birthDate: formattedBDate
            });
            setUpdateSubmitStatus('idle');
            setShowProfileUpdateModal(true);

            // Silent background refresh for freshest DB values
            if (targetPlayerId) {
                supabase
                    .from('applications')
                    .select('*')
                    .eq('id', targetPlayerId)
                    .maybeSingle()
                    .then(({ data: dbData }) => {
                        if (dbData) {
                            const freshPlayer = { ...player, ...dbData };
                            const freshPData = extractPlayerData(freshPlayer) || {};
                            setOriginalPlayerData(freshPlayer);
                            setUpdateForm(prev => ({
                                ...prev,
                                photoUrl: freshPlayer?.photo_url || freshPlayer?.photo || freshPlayer?.avatar || prev.photoUrl,
                                phone: freshPlayer?.phone || prev.phone,
                                firstName: freshPlayer?.first_name || freshPlayer?.firstName || prev.firstName,
                                lastName: freshPlayer?.last_name || freshPlayer?.lastName || prev.lastName,
                                fatherName: freshPlayer?.father_name || freshPlayer?.fatherName || freshPData.fatherName || prev.fatherName,
                                position: freshPlayer?.position || prev.position,
                                playerNumber: String(freshPlayer?.player_number || freshPlayer?.number || freshPlayer?.shirt_number || prev.playerNumber),
                                passportSeries: freshPlayer?.passport_series || freshPlayer?.passportSeries || prev.passportSeries,
                                passportNumber: freshPlayer?.passport_number || freshPlayer?.passportNumber || prev.passportNumber,
                                citizenship: freshPlayer?.citizenship || freshPData.citizenship || prev.citizenship,
                                height: String(freshPlayer?.height || freshPData.height || prev.height),
                                weight: String(freshPlayer?.weight || freshPData.weight || prev.weight),
                                instagramUsername: freshPlayer?.instagram_username || freshPData.instagram_username || prev.instagramUsername,
                            }));
                        }
                    })
                    .catch(() => {});
            }
        } catch (e) {
            console.error('Error opening update modal:', e);
            setShowProfileUpdateModal(true);
        } finally {
            setCheckingPendingUpdate(false);
        }
    };

    const handlePickImage = async () => {
        try {
            setPickerLoading(true);
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert(t('profile.permission_needed', 'Ruxsat kerak'), t('profile.gallery_permission_desc', 'Rasmni tanlash uchun galereyaga ruxsat bering'));
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets[0]?.uri) {
                const localUri = result.assets[0].uri;
                setUpdateForm(prev => ({ ...prev, photoUrl: localUri }));

                try {
                    const uploadRes = await apiService.uploadPhoto(localUri);
                    if (uploadRes && uploadRes.url && uploadRes.url.startsWith('http')) {
                        setUpdateForm(prev => ({ ...prev, photoUrl: uploadRes.url }));
                    }
                } catch (upErr) {
                    console.warn('Photo upload failed, keeping local uri preview:', upErr);
                }
            }
        } catch (err: any) {
            console.error('Error picking image:', err);
            Alert.alert(t('common.notice', 'Xatolik'), t('profile.photo_pick_error', 'Rasmni tanlashda xatolik yuz berdi'));
        } finally {
            setPickerLoading(false);
        }
    };

        const handleSubmitProfileUpdate = async () => {
        if (!updateForm.firstName?.trim() || !updateForm.lastName?.trim()) {
            Alert.alert(t('common.notice', 'Eslatma'), t('profile.required_fields_error', 'Iltimos, ism va familiyangizni kiriting'));
            setUpdateSubmitStatus('idle');
            return;
        }

        setSubmittingUpdate(true);
        setUpdateSubmitStatus('loading');
        try {
            const formattedBirthDate = updateForm.birthDate || '15.05.1998';
            const targetOrgId = player?.organization_id || player?.org_id || player?.teams?.organization_id || 1;
            const targetLeague = player?.league || player?.teams?.league || '';

            let finalPhotoUrl = updateForm.photoUrl || player?.photo || player?.avatar || null;
            if (finalPhotoUrl && (finalPhotoUrl.startsWith('file:') || finalPhotoUrl.startsWith('content:') || finalPhotoUrl.startsWith('ph:') || finalPhotoUrl.startsWith('blob:') || finalPhotoUrl.startsWith('data:image'))) {
                const uRes: any = await apiService.uploadPhoto(finalPhotoUrl);
                if (uRes && uRes.url && uRes.url.startsWith('http')) {
                    finalPhotoUrl = uRes.url;
                } else {
                    const existingPhoto = player?.photo_url || player?.photo || player?.avatar || '';
                    finalPhotoUrl = existingPhoto.startsWith('http') ? existingPhoto : null;
                }
            }

            const pSeries = (updateForm.passportSeries || '').toUpperCase().trim();
            const pNumber = (updateForm.passportNumber || '').trim();
            const cleanInsta = (updateForm.instagramUsername || '').trim().replace(/^@/, '');
            const instaUrl = cleanInsta ? `https://www.instagram.com/${cleanInsta}/` : '';

            const oldSource = originalPlayerData || player;
            const oldPData = extractPlayerData(oldSource) || {};
            const oldPhotoUrl = oldSource?.photo_url || oldSource?.photo || oldSource?.avatar || '';

            const metaObj = {
                citizenship: updateForm.citizenship || "O'zbekiston",
                height: updateForm.height || '',
                weight: updateForm.weight || ''
            };

            const payload = {
                playerId: targetPlayerId,
                oldData: {
                    firstName: oldSource?.first_name || oldSource?.firstName || '',
                    lastName: oldSource?.last_name || oldSource?.lastName || '',
                    fatherName: oldSource?.father_name || oldSource?.fatherName || oldPData.fatherName || '',
                    phone: oldSource?.phone || '',
                    position: oldSource?.position || '',
                    playerNumber: oldSource?.player_number || oldSource?.number || oldSource?.shirt_number || '',
                    photoUrl: oldPhotoUrl,
                    passportSeries: oldSource?.passport_series || oldSource?.passportSeries || '',
                    passportNumber: oldSource?.passport_number || oldSource?.passportNumber || '',
                    citizenship: oldPData.citizenship || oldSource?.citizenship || '',
                    height: String(oldPData.height || oldSource?.height || ''),
                    weight: String(oldPData.weight || oldSource?.weight || ''),
                    instagramUsername: oldPData.instagram_username || oldSource?.instagram_username || '',
                    birthDate: oldSource?.birth_date || oldSource?.birthDate || ''
                },
                newData: {
                    ...updateForm,
                    photoUrl: finalPhotoUrl,
                    instagramUsername: cleanInsta,
                    instagramUrl: instaUrl,
                    birthDate: formattedBirthDate,
                    passportSeries: pSeries,
                    passportNumber: pNumber,
                    citizenship: metaObj.citizenship,
                    height: metaObj.height,
                    weight: metaObj.weight
                }
            };

            let commentPayload = '[PROFILE_UPDATE]' + JSON.stringify({ playerId: targetPlayerId, oldData: payload.oldData, newData: payload.newData });
            if (targetLeague) {
                commentPayload += ` [LEAGUE:${targetLeague}]`;
            }
            if (instaUrl) {
                commentPayload += ` [INSTAGRAM:${instaUrl}]`;
            }

            let { error } = await supabase
                .from('applications')
                .insert([{
                    organization_id: targetOrgId,
                    team_id: null,
                    first_name: updateForm.firstName || player?.first_name || 'Futbolchi',
                    last_name: updateForm.lastName || player?.last_name || '',
                    father_name: updateForm.fatherName || player?.father_name || '',
                    phone: updateForm.phone || player?.phone || '',
                    position: updateForm.position || player?.position || 'O\'YINCHI',
                    player_number: updateForm.playerNumber ? Number(updateForm.playerNumber) : (player?.player_number || 0),
                    passport_series: pSeries,
                    passport_number: pNumber,
                    photo_url: finalPhotoUrl,
                    birth_date: formattedBirthDate,
                    comment: commentPayload,
                    status: 'pending'
                }]);

            if (error && (error.message.includes('valid_status') || error.code === '23514')) {
                const retryRes = await supabase
                    .from('applications')
                    .insert([{
                        organization_id: targetOrgId,
                        team_id: null,
                        first_name: updateForm.firstName || player?.first_name || 'Futbolchi',
                        last_name: updateForm.lastName || player?.last_name || '',
                        father_name: updateForm.fatherName || player?.father_name || '',
                        phone: updateForm.phone || player?.phone || '',
                        position: updateForm.position || player?.position || 'O\'YINCHI',
                        player_number: updateForm.playerNumber ? Number(updateForm.playerNumber) : (player?.player_number || 0),
                        passport_series: pSeries,
                        passport_number: pNumber,
                        photo_url: finalPhotoUrl,
                        birth_date: formattedBirthDate,
                        comment: commentPayload,
                        status: 'PENDING'
                    }]);
                error = retryRes.error;
            }

            if (error) {
                setUpdateSubmitStatus('error');
                console.error('Supabase profile update insert error:', error);
                Alert.alert(t('common.notice', 'Xatolik'), error.message);
                return;
            }

            setUpdateSubmitStatus('success');
            setTimeout(() => {
                setShowProfileUpdateModal(false);
            }, 600);
        } catch (err: any) {
            setUpdateSubmitStatus('error');
            console.error('Error submitting profile update:', err);
            Alert.alert(t('common.notice', 'Xatolik'), t('profile.submit_error', 'Arizani yuborishda xatolik yuz berdi'));
        } finally {
            setSubmittingUpdate(false);
        }
    };

    const fetchPlayer = async (bypassCache = false) => {
        try {
            if (!player) setLoading(true);
            const [playerData, statsData, transfersData] = await Promise.all([
                apiService.getPlayerById(targetPlayerId, bypassCache),
                apiService.getPlayerStats(targetPlayerId).catch(() => null),
                apiService.getPlayerTransfers(targetPlayerId).catch(() => [])
            ]);

            if (playerData) {
                const parsed = extractPlayerData({
                    ...playerData,
                    stats: statsData || playerData.stats
                });

                const evaluatedAi = await aiScoutService.evaluatePlayer(parsed);
                parsed.aiStats = evaluatedAi;
                setAiStats(evaluatedAi);
                setPlayer(parsed);

                // Sync latest photo & name to useAuthStore so HomeScreen and Navbar update immediately
                const freshPhoto = parsed.photo || parsed.photo_url || parsed.avatar;
                const freshFirstName = parsed.firstName || parsed.first_name;
                const freshLastName = parsed.lastName || parsed.last_name;
                useAuthStore.getState().updateUser({
                    photo: freshPhoto,
                    photo_url: freshPhoto,
                    avatar: freshPhoto,
                    firstName: freshFirstName,
                    first_name: freshFirstName,
                    lastName: freshLastName,
                    last_name: freshLastName,
                });
            }
            if (transfersData) {
                setPlayerTransfers(transfersData);
            }
        } catch (error) {
            console.error('Error fetching my player stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            clearApiCache();
            await Promise.all([
                fetchPlayer(true),
                fetchPlayerMatches(),
            ]);
        } catch (error) {
            console.error('Error refreshing my stats:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const fetchPlayerMatches = async () => {
        try {
            setMatchesLoading(true);
            const data = await apiService.getPlayerMatches(targetPlayerId);
            setMatches(data || []);
        } catch (error) {
            console.error('Error fetching player matches:', error);
        } finally {
            setMatchesLoading(false);
        }
    };

    useEffect(() => {
        if (targetPlayerId) {
            fetchPlayer();
            fetchPlayerMatches();
        } else {
            setLoading(false);
            setMatchesLoading(false);
        }
    }, [targetPlayerId]);

    const [playerReplays, setPlayerReplays] = useState<any[]>([]);
    const [replaysLoading, setReplaysLoading] = useState(false);

    useEffect(() => {
        const fetchPlayerReplays = async () => {
            const pId = player?.id || player?._id || targetPlayerId;
            if (!pId) return;
            setReplaysLoading(true);
            try {
                const playerPhone = player?.phone;
                let targetPlayerIds = [pId];
                if (playerPhone) {
                    const cleanPhone = String(playerPhone).replace(/\D/g, '').slice(-9);
                    const { data: siblings } = await supabase
                        .from('applications')
                        .select('id')
                        .ilike('phone', `%${cleanPhone}%`);
                    if (siblings && siblings.length > 0) {
                        targetPlayerIds = [...new Set([pId, ...siblings.map(s => s.id)])];
                    }
                }

                const { data: events, error } = await supabase
                    .from('match_events')
                    .select('*, match:match_id(*)')
                    .in('player_id', targetPlayerIds)
                    .order('created_at', { ascending: false });

                if (!error && events && events.length > 0) {
                    const validReplays = events.filter((e: any) =>
                        Boolean(e.replay_video_url || e.video_url || e.replay_url || e.video)
                    );
                    setPlayerReplays(validReplays);
                } else {
                    setPlayerReplays([]);
                }
            } catch (e) {
                console.warn('Error fetching player replays:', e);
            } finally {
                setReplaysLoading(false);
            }
        };

        fetchPlayerReplays();
    }, [player?.id, player?._id, targetPlayerId, player?.phone]);

    if (loading && !player) {
        return <MyStatsScreenSkeleton />;
    }

    if (!player) {
        return (
            <SafeAreaView style={[styles.emptyContainer, { backgroundColor: homeColors.background }]}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <View style={styles.emptyContent}>
                    <Ionicons name="person-outline" size={64} color={homeColors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: homeColors.textPrimary }]}>{t('teams.player_fallback', 'O\'yinchi topilmadi')}</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtnAction, { backgroundColor: homeColors.accent }]}>
                        <Text style={[styles.backBtnActionText, { color: isDark ? '#000000' : '#FFFFFF' }]}>{t('common.back', 'Orqaga')}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const stats = player.stats || { goals: 0, assists: 0, matchesPlayed: 0, yellowCards: 0, redCards: 0, rating: 0 };
    const computedAge = calculateAgeFromBirthDate(player.birth_date || player.birthDate, player.age);
    const instagramUsername = player.instagram_username || '';
    const instagramUrl = instagramUsername ? `https://www.instagram.com/${instagramUsername}/` : null;

    const approvedTransfers = playerTransfers.filter((t: any) => t.status === 'approved');
    const currentTeamName = player?.teams?.name || (approvedTransfers[0]?.new_team_name) || player?.team_name || player?.teamName || '';
    const currentTeamLogo = player?.teams?.logo_url || player?.teams?.logo || player?.team_logo || (approvedTransfers[0]?.new_team_logo) || '';

    const formatTransferDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const day = String(d.getDate()).padStart(2, '0');
            const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
            const monthName = months[d.getMonth()];
            const year = d.getFullYear();
            return `${day}-${monthName}, ${year}`;
        } catch (e) {
            return dateStr.slice(0, 10);
        }
    };

    // Group player replays by match
    const matchGroups: { [key: string]: { match: any, replays: any[] } } = {};
    playerReplays.forEach((ev: any) => {
        const mId = ev.match_id || ev.match?.id || 'unknown';
        if (!matchGroups[mId]) {
            matchGroups[mId] = {
                match: ev.match || {},
                replays: []
            };
        }
        if (!matchGroups[mId].replays.some(r => r.id === ev.id)) {
            matchGroups[mId].replays.push(ev);
        }
    });
    const groupedMatches = Object.values(matchGroups);

    const backdropOpacity = swipeBackAnim.interpolate({
        inputRange: [0, width * 0.8, width],
        outputRange: [isDark ? 0.6 : 0.25, 0.05, 0],
        extrapolate: 'clamp',
    });

    const playerNameFull = `${player.firstName || player.name || player.first_name || ''} ${player.lastName || player.last_name || ''}`.trim() || t('teams.player_fallback', 'O\'YINCHI');

    const renderProfil = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
            {/* PHYSICAL STATS CARD */}
            <View style={[styles.infoSectionCard, cardSurface]}>
                <View style={[styles.sectionCardHeader, { borderBottomColor: homeColors.border }]}>
                    <Ionicons name="finger-print-outline" size={17} color={homeColors.textPrimary} />
                    <Text style={[styles.sectionCardTitle, { color: homeColors.textPrimary }]}>{t('stats.personal_info', 'MA\'LUMOTLAR').toUpperCase()}</Text>
                </View>

                <View style={styles.physicalGrid}>
                    <View style={styles.physicalItem}>
                        <Text style={[styles.physicalLabel, { color: homeColors.textSecondary }]}>{t('stats.age', 'YOSHI')}</Text>
                        {loading && computedAge === '—' ? (
                            <InlineSkeleton width={24} height={15} style={{ marginTop: 2 }} />
                        ) : (
                            <Text style={[styles.physicalValue, { color: homeColors.textPrimary }]}>{computedAge !== '—' ? `${computedAge}` : '—'}</Text>
                        )}
                    </View>
                    <View style={[styles.physicalDivider, { backgroundColor: homeColors.border }]} />
                    <View style={styles.physicalItem}>
                        <Text style={[styles.physicalLabel, { color: homeColors.textSecondary }]}>{t('stats.height', 'BO\'YI')}</Text>
                        {loading && !player?.height ? (
                            <InlineSkeleton width={32} height={15} style={{ marginTop: 2 }} />
                        ) : (
                            <Text style={[styles.physicalValue, { color: homeColors.textPrimary }]}>{player?.height ? `${player.height} CM` : '—'}</Text>
                        )}
                    </View>
                    <View style={[styles.physicalDivider, { backgroundColor: homeColors.border }]} />
                    <View style={styles.physicalItem}>
                        <Text style={[styles.physicalLabel, { color: homeColors.textSecondary }]}>{t('stats.weight', 'VAZNI')}</Text>
                        {loading && !player?.weight ? (
                            <InlineSkeleton width={32} height={15} style={{ marginTop: 2 }} />
                        ) : (
                            <Text style={[styles.physicalValue, { color: homeColors.textPrimary }]}>{player?.weight ? `${player.weight} KG` : '—'}</Text>
                        )}
                    </View>
                    <View style={[styles.physicalDivider, { backgroundColor: homeColors.border }]} />
                    <View style={styles.physicalItem}>
                        <Text style={[styles.physicalLabel, { color: homeColors.textSecondary }]}>{t('stats.citizenship', 'DAVLAT')}</Text>
                        {loading && !player?.citizenship ? (
                            <InlineSkeleton width={28} height={15} style={{ marginTop: 2 }} />
                        ) : (
                            <Text style={[styles.physicalValue, { color: homeColors.textPrimary }]} numberOfLines={1}>{player?.citizenship || 'UZB'}</Text>
                        )}
                    </View>
                </View>

                {instagramUrl && (
                    <TouchableOpacity
                        style={[styles.instagramBtn, { borderTopColor: homeColors.border, opacity: openingInstagram ? 0.7 : 1 }]}
                        activeOpacity={0.75}
                        disabled={openingInstagram}
                        onPress={() => handleOpenInstagram(instagramUrl)}
                    >
                        <Ionicons name="logo-instagram" size={18} color="#E1306C" />
                        <Text style={[styles.instagramBtnText, { color: homeColors.textPrimary }]}>@{instagramUsername}</Text>
                        {openingInstagram ? (
                            <ActivityIndicator size="small" color={homeColors.textPrimary} style={{ marginLeft: 'auto' }} />
                        ) : (
                            <Ionicons name="open-outline" size={14} color={homeColors.textSecondary} style={{ marginLeft: 'auto' }} />
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {/* FIFA / EA FC PLAYER CARD (STATIC) */}
            <View style={[styles.infoSectionCard, cardSurface, { marginTop: 14, alignItems: 'center', paddingVertical: 18 }]}>
                <View style={[styles.sectionCardHeader, { width: '100%', borderBottomColor: homeColors.border, marginBottom: 14 }]}>
                    <Ionicons name="shield-checkmark-outline" size={17} color={homeColors.textPrimary} />
                    <Text style={[styles.sectionCardTitle, { color: homeColors.textPrimary }]}>{t('stats.player_card_title', 'O\'YINCHI KARTASI')}</Text>
                </View>

                <FifaPlayerCard
                    player={player}
                    teamLogo={currentTeamLogo}
                    isLoading={loading}
                    size="lg"
                    interactive3D={false}
                    showPlayStyles={false}
                    showAttributes={true}
                />

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleExportPress}
                    disabled={exportState !== 'idle'}
                    style={[styles.compareBtn, { backgroundColor: isDark ? '#FFFFFF' : '#000000', marginTop: 16 }]}
                >
                    {exportState === 'idle' && (
                        <>
                            <Ionicons name="share-social-outline" size={16} color={isDark ? '#000000' : '#FFFFFF'} />
                            <Text style={[styles.compareBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                                {t('stats.share_fifa_card', 'KARTANI ULASHISH').toUpperCase()}
                            </Text>
                        </>
                    )}
                    {exportState === 'loading' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <ActivityIndicator size="small" color={isDark ? '#000000' : '#FFFFFF'} />
                            <Text style={[styles.compareBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                                {t('stats.preparing_card', 'KARTA TAYYORLANMOQDA...').toUpperCase()} {exportProgress}%
                            </Text>
                        </View>
                    )}
                    {exportState === 'complete' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={[styles.compareBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                                {t('stats.card_ready', 'KARTA TAYYOR!').toUpperCase()}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    const renderKaryera = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
            {/* CURRENT TEAM */}
            <View style={[styles.infoSectionCard, cardSurface]}>
                <View style={[styles.sectionCardHeader, { borderBottomColor: homeColors.border }]}>
                    <Ionicons name="trophy-outline" size={17} color={homeColors.textPrimary} />
                    <Text style={[styles.sectionCardTitle, { color: homeColors.textPrimary }]}>{t('stats.career_history', 'KARYERA TARIXI').toUpperCase()}</Text>
                </View>

                <View style={styles.careerTeamItem}>
                    <View style={[styles.teamLogoBoxMini, { borderColor: homeColors.border }]}>
                        {currentTeamLogo ? (
                            <SmartImage uri={currentTeamLogo} style={{ width: 28, height: 28 }} contentFit="contain" fallbackIcon="shield-outline" />
                        ) : (
                            <Ionicons name="shield-outline" size={20} color={homeColors.textPrimary} />
                        )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={[styles.careerTeamName, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                {(currentTeamName || t('stats.free_agent', 'ERKIN AGENT')).toUpperCase()}
                            </Text>
                            <View style={[styles.currentTeamBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                <View style={[styles.pulsingDot, { backgroundColor: '#10B981' }]} />
                                <Text style={[styles.currentTeamBadgeText, { color: homeColors.textPrimary }]}>{t('stats.current_team', 'HOZIRGI').toUpperCase()}</Text>
                            </View>
                        </View>
                        <Text style={[styles.careerDateSub, { color: homeColors.textSecondary }]}>{t('stats.current_team_sub', 'Amaldagi jamoasi')}</Text>
                    </View>
                </View>

                {/* PAST TRANSFERS */}
                {approvedTransfers.map((tr: any, idx: number) => {
                    const trDate = formatTransferDate(tr.created_at);
                    const oldLogo = tr.old_team_logo;
                    const oldName = tr.old_team_name || 'Eski jamoasi';

                    return (
                        <View key={tr.id || idx} style={[styles.careerTeamItem, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: homeColors.border }]}>
                            <View style={[styles.teamLogoBoxMini, { borderColor: homeColors.border }]}>
                                {oldLogo ? (
                                    <SmartImage uri={oldLogo} style={{ width: 24, height: 24 }} contentFit="contain" fallbackIcon="shield-outline" />
                                ) : (
                                    <Ionicons name="shield-outline" size={18} color={homeColors.textSecondary} />
                                )}
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={[styles.careerTeamName, { color: homeColors.textSecondary }]} numberOfLines={1}>
                                        {oldName.toUpperCase()}
                                    </Text>
                                    <Text style={[styles.pastTeamBadgeText, { color: homeColors.textSecondary }]}>{t('stats.past_team', 'AVVALGI').toUpperCase()}</Text>
                                </View>
                                <Text style={[styles.careerDateSub, { color: homeColors.textSecondary }]}>
                                    🗓️ {t('stats.transfer_date', 'Transfer')}: {trDate}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>

            {/* PLAYER'S REPLAY HIGHLIGHTS FEED (ONLY RENDER IF REPLAYS EXIST OR LOADING) */}
            {(replaysLoading || groupedMatches.length > 0) && (
                <View style={[styles.infoSectionCard, cardSurface, { marginTop: 14 }]}>
                    <View style={[styles.sectionCardHeader, { borderBottomColor: homeColors.border }]}>
                        <Ionicons name="videocam-outline" size={17} color={homeColors.textPrimary} />
                        <Text style={[styles.sectionCardTitle, { color: homeColors.textPrimary }]}>{t('stats.personal_replays', 'GOLLAR & REPLAYLAR').toUpperCase()}</Text>
                    </View>

                    {replaysLoading ? (
                        <ActivityIndicator color={homeColors.textPrimary} style={{ marginVertical: 20 }} />
                    ) : (
                        groupedMatches.map((group: any, idx: number) => (
                            <PlayerMatchReplayCard
                                key={group.match?.id || idx}
                                match={group.match}
                                replays={group.replays}
                                playerName={playerNameFull}
                            />
                        ))
                    )}
                </View>
            )}
        </ScrollView>
    );

    const renderMatches = () => (
        <ScrollView
            style={styles.tabContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 60, gap: 12 }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={homeColors.textPrimary}
                    colors={[homeColors.accent || '#F59E0B']}
                />
            }
        >
            {matchesLoading ? (
                [1, 2, 3, 4].map((key) => (
                    <View
                        key={key}
                        style={[
                            styles.hMatchCard,
                            cardSurface,
                            { opacity: 0.5 }
                        ]}
                    >
                        <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ width: '35%', height: 14, backgroundColor: homeColors.surface, borderRadius: 4 }} />
                            <View style={{ width: 40, height: 16, backgroundColor: homeColors.surface, borderRadius: 6 }} />
                            <View style={{ width: '35%', height: 14, backgroundColor: homeColors.surface, borderRadius: 4 }} />
                        </View>
                    </View>
                ))
            ) : matches.length > 0 ? (
                matches.map((match: any) => {
                    const st = String(match.status || '').toLowerCase().trim();
                    const matchIsLive = ['live', 'first_half', 'second_half', 'half_time', 'halftime', 'ongoing', 'in_progress', '1st_half', '2nd_half', '1-taym', '2-taym', 'tanaffus'].includes(st);
                    const matchIsFinished = ['finished', 'completed', 'ended', 'tugadi'].includes(st);
                    const rawDate = match.date || match.match_date;
                    const matchDate = new Date(rawDate);
                    const isValidDate = !isNaN(matchDate.getTime());
                    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
                    const day = isValidDate ? matchDate.getDate() : '';
                    const month = isValidDate ? months[matchDate.getMonth()] : '';
                    let formattedTime = String(match.match_time || match.time || '').trim();
                    if (formattedTime.includes(':')) {
                        const timeParts = formattedTime.split(':');
                        formattedTime = `${timeParts[0].padStart(2, '0')}:${(timeParts[1] || '00').padStart(2, '0')}`;
                    }
                    if (!formattedTime && isValidDate) {
                        const hrs = String(matchDate.getHours()).padStart(2, '0');
                        const mins = String(matchDate.getMinutes()).padStart(2, '0');
                        if (hrs !== '00' || mins !== '00') formattedTime = `${hrs}:${mins}`;
                    }
                    if (!formattedTime) formattedTime = '18:00';

                    return (
                        <TouchableOpacity
                            key={match.id || match._id}
                            style={[
                                styles.hMatchCard,
                                cardSurface,
                                matchIsLive && { borderColor: homeColors.accent }
                            ]}
                            onPress={() => navigation.navigate('MatchDetail', { matchId: match.id || match._id })}
                            activeOpacity={0.85}
                        >
                            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    {/* CHAP: Uy jamoasi */}
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, paddingRight: 8 }}>
                                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: homeColors.textPrimary, letterSpacing: 0.1 }} numberOfLines={1}>
                                            {match.homeTeamName || match.homeTeam?.name || match.home_team?.name || t('matches.home_short', 'UY')}
                                        </Text>
                                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                            <SmartImage
                                                uri={match.homeTeamLogo || match.homeTeam?.logo || match.home_team?.logo_url}
                                                style={{ width: 20, height: 20 }}
                                                contentFit="contain"
                                                fallbackIcon="shield-outline"
                                            />
                                        </View>
                                    </View>

                                    {/* O'RTA: Hisob yoki vaqt */}
                                    <View style={{ width: 72, alignItems: 'center' }}>
                                        {(matchIsLive || matchIsFinished) ? (
                                            <View style={{ alignItems: 'center' }}>
                                                <Text style={{ fontSize: 20, fontWeight: '900', color: homeColors.textPrimary, letterSpacing: -0.5 }}>
                                                    {match.score?.home ?? match.home_score ?? 0} - {match.score?.away ?? match.away_score ?? 0}
                                                </Text>
                                                {matchIsLive && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                                        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: homeColors.accent }} />
                                                        <Text style={{ fontSize: 8, fontWeight: '700', color: homeColors.accent, letterSpacing: 0.3 }}>LIVE</Text>
                                                    </View>
                                                )}
                                                {!!(match.round || match.tour) && (
                                                    <Text style={{ fontSize: 8, color: homeColors.textSecondary, marginTop: 2 }}>
                                                        {match.round || match.tour}-{t('teams.tour_short', 'tur')}
                                                    </Text>
                                                )}
                                            </View>
                                        ) : (
                                            <View style={{ alignItems: 'center' }}>
                                                <Text style={{ fontSize: 15, fontWeight: '700', color: homeColors.textPrimary, letterSpacing: -0.3 }}>
                                                    {formattedTime}
                                                </Text>
                                                <Text style={{ fontSize: 8.5, color: homeColors.textSecondary, marginTop: 1 }}>
                                                    {day} {month}
                                                </Text>
                                                {!!(match.round || match.tour) && (
                                                    <Text style={{ fontSize: 8, color: homeColors.textSecondary, marginTop: 1 }}>
                                                        {match.round || match.tour}-{t('teams.tour_short', 'tur')}
                                                    </Text>
                                                )}
                                            </View>
                                        )}
                                    </View>

                                    {/* O'NG: Mehmon jamoa */}
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 6, paddingLeft: 8 }}>
                                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                            <SmartImage
                                                uri={match.awayTeamLogo || match.awayTeam?.logo || match.away_team?.logo_url}
                                                style={{ width: 20, height: 20 }}
                                                contentFit="contain"
                                                fallbackIcon="shield-outline"
                                            />
                                        </View>
                                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: homeColors.textPrimary, letterSpacing: 0.1 }} numberOfLines={1}>
                                            {match.awayTeamName || match.awayTeam?.name || match.away_team?.name || t('matches.away_short', 'MEH')}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })
            ) : (
                <View style={[styles.emptyState, cardSurface]}>
                    <Ionicons name="football-outline" size={24} color={homeColors.textSecondary} />
                    <Text style={[styles.emptyStateText, { color: homeColors.textSecondary }]}>{t('teams.no_matches', "O'yinlar tarixi mavjud emas")}</Text>
                </View>
            )}
        </ScrollView>
    );

    return (
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

            {/* Fading Backdrop Overlay */}
            <Animated.View
                pointerEvents="none"
                style={[
                    StyleSheet.absoluteFillObject,
                    {
                        backgroundColor: '#000000',
                        opacity: backdropOpacity,
                    },
                ]}
            />

            <Animated.View
                style={{
                    flex: 1,
                    backgroundColor: homeColors.background,
                    transform: [{ translateX: swipeBackAnim }],
                    shadowColor: '#000000',
                    shadowOffset: { width: -4, height: 0 },
                    shadowOpacity: isDark ? 0.5 : 0.2,
                    shadowRadius: 10,
                    elevation: 10,
                }}
            >
                <SafeAreaView style={[styles.container, { backgroundColor: homeColors.background }]} edges={['top']}>
                    {/* STICKY HEADER: TOP ACTIONS + PLAYER IDENTITY + STATS + TABS */}
                    <View style={[styles.headerStickySection, { backgroundColor: homeColors.background, borderBottomColor: homeColors.border }]}>
                        {/* TOP ROW: BACK BUTTON & ACTIONS */}
                        <View style={styles.topRow}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, cardSurface]}>
                                <Ionicons name="arrow-back" size={20} color={homeColors.textPrimary} />
                            </TouchableOpacity>

                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    style={[styles.iconBtn, cardSurface]}
                                    onPress={handleOpenUpdateModal}
                                    disabled={checkingPendingUpdate}
                                    activeOpacity={0.7}
                                >
                                    {checkingPendingUpdate ? (
                                        <ActivityIndicator size="small" color={homeColors.textPrimary} />
                                    ) : (
                                        <Ionicons name="create-outline" size={18} color={homeColors.textPrimary} />
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.iconBtn, cardSurface]}
                                    onPress={() => {
                                        Haptics.selectionAsync().catch(() => {});
                                        setShowComparisonModal(true);
                                    }}
                                >
                                    <Ionicons name="git-compare-outline" size={18} color={homeColors.textPrimary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* PLAYER IDENTITY — 1x1 Square photo on left, info on right */}
                        <View style={styles.identityRowSticky}>
                            <View style={{ position: 'relative' }}>
                                <View style={[styles.photoBoxSm, cardSurface]}>
                                    <SmartImage
                                        uri={player.photo || player.avatar || player.photo_url}
                                        style={{ width: '100%', height: '100%', borderRadius: 16 }}
                                        contentFit="cover"
                                        fallbackIcon="person"
                                    />
                                </View>
                                {/* Tilted Shirt Number Badge */}
                                <View style={[styles.numberBadgeSticky, { backgroundColor: isDark ? '#FFFFFF' : '#000000', borderColor: homeColors.background }]}>
                                    <Text style={[styles.numberBadgeText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                                        #{player.number || player.player_number || '0'}
                                    </Text>
                                </View>
                            </View>

                            <View style={{ flex: 1, paddingLeft: 12 }}>
                                <Text style={[styles.playerNameSm, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                    {playerNameFull.toUpperCase()}
                                </Text>

                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 6 }}>
                                    {currentTeamLogo ? (
                                        <SmartImage uri={currentTeamLogo} style={{ width: 14, height: 14 }} contentFit="contain" fallbackIcon="shield-outline" />
                                    ) : null}
                                    <Text style={[styles.playerTeamName, { color: homeColors.textSecondary }]} numberOfLines={1}>
                                        {(currentTeamName || t('stats.free_agent', 'ERKIN AGENT')).toUpperCase()}
                                    </Text>
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
                                    <View style={[styles.positionPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                        <Text style={[styles.positionPillText, { color: homeColors.textPrimary }]}>
                                            {getLocalizedPosition(player.position, t).toUpperCase()}
                                        </Text>
                                    </View>
                                    {stats.rating > 0 && (
                                        <View style={[styles.ratingPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                            <Ionicons name="star" size={10} color="#FACC15" style={{ marginRight: 3 }} />
                                            <Text style={[styles.ratingPillText, { color: homeColors.textPrimary }]}>{stats.rating}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* INFO STATS CARD */}
                        <View style={[styles.infoStatsCard, cardSurface, { marginBottom: 8 }]}>
                            <View style={styles.infoTopRow}>
                                <View style={styles.infoStat}>
                                    {loading ? (
                                        <InlineSkeleton width={20} height={16} />
                                    ) : (
                                        <Text style={[styles.infoStatValue, { color: homeColors.textPrimary }]}>{stats.goals || 0}</Text>
                                    )}
                                    <Text style={[styles.infoStatLabel, { color: homeColors.textSecondary }]}>{t('stats.goals', 'GOL').toUpperCase()}</Text>
                                </View>
                                <View style={[styles.infoDivider, { backgroundColor: homeColors.border }]} />
                                <View style={styles.infoStat}>
                                    {loading ? (
                                        <InlineSkeleton width={20} height={16} />
                                    ) : (
                                        <Text style={[styles.infoStatValue, { color: homeColors.textPrimary }]}>{stats.assists || 0}</Text>
                                    )}
                                    <Text style={[styles.infoStatLabel, { color: homeColors.textSecondary }]}>{t('stats.assists', 'ASIST').toUpperCase()}</Text>
                                </View>
                                <View style={[styles.infoDivider, { backgroundColor: homeColors.border }]} />
                                <View style={styles.infoStat}>
                                    {loading ? (
                                        <InlineSkeleton width={20} height={16} />
                                    ) : (
                                        <Text style={[styles.infoStatValue, { color: homeColors.textPrimary }]}>{stats.matchesPlayed || stats.matches || 0}</Text>
                                    )}
                                    <Text style={[styles.infoStatLabel, { color: homeColors.textSecondary }]}>{t('stats.matches_played', 'O\'YIN').toUpperCase()}</Text>
                                </View>
                                <View style={[styles.infoDivider, { backgroundColor: homeColors.border }]} />
                                <View style={styles.infoStat}>
                                    {loading ? (
                                        <InlineSkeleton width={32} height={16} />
                                    ) : (
                                        <Text style={styles.infoStatValue}>
                                            <Text style={{ color: '#EAB308' }}>{stats.yellowCards || 0}</Text>
                                            <Text style={{ color: isDark ? '#FFFFFF' : '#94A3B8' }}> / </Text>
                                            <Text style={{ color: '#EF4444' }}>{stats.redCards || 0}</Text>
                                        </Text>
                                    )}
                                    <Text style={[styles.infoStatLabel, { color: homeColors.textSecondary }]}>KARTA</Text>
                                </View>
                            </View>
                        </View>

                        {/* TAB SWITCHER */}
                        <View style={styles.tabsContainer}>
                            <Animated.View
                                style={[
                                    styles.tabActiveLine,
                                    {
                                        width: indicatorWidthAnim,
                                        backgroundColor: isDark ? '#FFFFFF' : '#000000',
                                        transform: [{ translateX: indicatorTranslateX }],
                                    },
                                ]}
                            />
                            {tabs.map((tabKey, idx) => {
                                const isCurrent = currentTabIndex === idx;
                                return (
                                    <TouchableOpacity
                                        key={tabKey}
                                        style={styles.tabBtn}
                                        onPress={() => handleTabPress(idx)}
                                        activeOpacity={0.7}
                                    >
                                        <Text
                                            onLayout={(e) => {
                                                const w = e.nativeEvent.layout.width;
                                                setTabLabelWidths((prev) => {
                                                    if (prev[idx] === w) return prev;
                                                    const next = [...prev];
                                                    next[idx] = w;
                                                    return next;
                                                });
                                            }}
                                            style={[
                                                styles.tabBtnText,
                                                { color: isCurrent ? homeColors.textPrimary : homeColors.textSecondary },
                                                isCurrent && { fontWeight: '900' },
                                            ]}
                                        >
                                            {TAB_LABELS[tabKey]}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* 1:1 REAL-TIME LINKED HORIZONTAL PAGER */}
                    <View style={{ flex: 1 }} {...swipeBackPanResponder.panHandlers}>
                        <Animated.ScrollView
                            ref={pagerScrollRef as any}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            bounces={false}
                            scrollEventThrottle={16}
                            decelerationRate="fast"
                            onScroll={Animated.event(
                                [{ nativeEvent: { contentOffset: { x: scrollXPager } } }],
                                { useNativeDriver: false }
                            )}
                            onMomentumScrollEnd={handlePagerMomentumScrollEnd}
                            style={{ flex: 1 }}
                        >
                            <View style={{ width, flex: 1 }}>{renderProfil()}</View>
                            <View style={{ width, flex: 1 }}>{renderKaryera()}</View>
                            <View style={{ width, flex: 1 }}>{renderMatches()}</View>
                        </Animated.ScrollView>
                    </View>
                </SafeAreaView>
            </Animated.View>

            {/* PROFILE UPDATE MODAL */}
            <Modal
                visible={showProfileUpdateModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowProfileUpdateModal(false)}
            >
                <View style={[styles.editModalOverlay, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
                    >
                        <View style={[styles.editModalCard, cardSurface, { maxHeight: '92%', padding: 16 }]}>
                            {/* Modal Header */}
                            <View style={[styles.editModalHeader, { marginBottom: 12 }]}>
                                <Text style={[styles.editModalTitle, { color: homeColors.textPrimary }]}>{t('profile.edit_profile', 'PROFILNI TAHRIRLASH')}</Text>
                                <TouchableOpacity onPress={() => setShowProfileUpdateModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Ionicons name="close" size={22} color={homeColors.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            {/* Scrollable Form Body */}
                            <ScrollView
                                style={{ maxHeight: 460 }}
                                contentContainerStyle={{ paddingBottom: 12 }}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            >
                                {/* Photo upload row */}
                                <View style={{ alignItems: 'center', marginBottom: 14 }}>
                                    <TouchableOpacity onPress={handlePickImage} style={styles.editAvatarWrapper} activeOpacity={0.8}>
                                        <SmartImage uri={updateForm.photoUrl || player.photo || player.avatar} style={{ width: 84, height: 84, borderRadius: 22 }} contentFit="cover" fallbackIcon="person" />
                                        <View style={[styles.cameraIconBadge, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}>
                                            <Ionicons name="camera" size={14} color={isDark ? '#000000' : '#FFFFFF'} />
                                        </View>
                                    </TouchableOpacity>
                                    <Text style={{ color: homeColors.textSecondary, fontSize: 11.5, marginTop: 6, fontWeight: '600' }}>
                                        {pickerLoading ? 'Rasm yuklanmoqda...' : 'Rasmni o\'zgartirish'}
                                    </Text>
                                </View>

                                <View style={styles.formRow}>
                                    <View style={[styles.formGroup, { flex: 1 }]}>
                                        <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Ism *</Text>
                                        <TextInput
                                            style={[styles.modalInput, { color: homeColors.textPrimary, borderColor: homeColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                            value={updateForm.firstName}
                                            placeholder="Ismingiz"
                                            placeholderTextColor={homeColors.textSecondary}
                                            onChangeText={(v) => setUpdateForm(p => ({ ...p, firstName: v }))}
                                        />
                                    </View>
                                    <View style={[styles.formGroup, { flex: 1 }]}>
                                        <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Familiya *</Text>
                                        <TextInput
                                            style={[styles.modalInput, { color: homeColors.textPrimary, borderColor: homeColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                            value={updateForm.lastName}
                                            placeholder="Familiyangiz"
                                            placeholderTextColor={homeColors.textSecondary}
                                            onChangeText={(v) => setUpdateForm(p => ({ ...p, lastName: v }))}
                                        />
                                    </View>
                                </View>

                                <View style={styles.formRow}>
                                    <View style={[styles.formGroup, { flex: 1 }]}>
                                        <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Otasining ismi</Text>
                                        <TextInput
                                            style={[styles.modalInput, { color: homeColors.textPrimary, borderColor: homeColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                            value={updateForm.fatherName}
                                            placeholder="Sharifingiz"
                                            placeholderTextColor={homeColors.textSecondary}
                                            onChangeText={(v) => setUpdateForm(p => ({ ...p, fatherName: v }))}
                                        />
                                    </View>
                                    <View style={[styles.formGroup, { flex: 1 }]}>
                                        <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Telefon raqam *</Text>
                                        <View style={[
                                            styles.modalInput,
                                            {
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                paddingHorizontal: 0,
                                                paddingVertical: 0,
                                                borderColor: homeColors.border,
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                                overflow: 'hidden'
                                            }
                                        ]}>
                                            <View style={{
                                                paddingHorizontal: 8,
                                                paddingVertical: 9,
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                                borderRightWidth: 1,
                                                borderRightColor: homeColors.border,
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }}>
                                                <Text style={{ color: homeColors.textPrimary, fontWeight: '700', fontSize: 13 }}>+998</Text>
                                            </View>
                                            <TextInput
                                                style={{
                                                    flex: 1,
                                                    color: homeColors.textPrimary,
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 8,
                                                    fontSize: 13.5,
                                                    fontWeight: '600'
                                                }}
                                                value={(updateForm.phone || '').replace(/^\+998/, '').replace(/^998/, '')}
                                                keyboardType="number-pad"
                                                maxLength={9}
                                                placeholder="901234567"
                                                placeholderTextColor={homeColors.textSecondary}
                                                onChangeText={(v) => {
                                                    const clean = v.replace(/\D/g, '').slice(0, 9);
                                                    setUpdateForm(p => ({ ...p, phone: `+998${clean}` }));
                                                }}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {/* 4 Positions Select (2 explicit rows, zero overlap) */}
                                <View style={styles.formGroup}>
                                    <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Pozitsiya (Amplua)</Text>
                                    <View style={{ gap: 6, marginTop: 4 }}>
                                        <View style={{ flexDirection: 'row', gap: 6 }}>
                                            {['Darvozabon', 'Himoyachi'].map((pos) => {
                                                const isSel = updateForm.position === pos;
                                                return (
                                                    <TouchableOpacity
                                                        key={pos}
                                                        activeOpacity={0.7}
                                                        onPress={() => {
                                                            try { Haptics.selectionAsync().catch(() => {}); } catch (e) {}
                                                            setUpdateForm(p => ({ ...p, position: pos }));
                                                        }}
                                                        style={[
                                                            styles.positionPillBtn,
                                                            {
                                                                borderColor: isSel ? (isDark ? '#FFFFFF' : '#000000') : homeColors.border,
                                                                backgroundColor: isSel
                                                                    ? (isDark ? '#FFFFFF' : '#000000')
                                                                    : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
                                                            }
                                                        ]}
                                                    >
                                                        <Text style={[
                                                            styles.positionPillBtnText,
                                                            {
                                                                color: isSel ? (isDark ? '#000000' : '#FFFFFF') : homeColors.textPrimary,
                                                                fontWeight: isSel ? '800' : '600'
                                                            }
                                                        ]}>
                                                            {pos}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 6 }}>
                                            {['Yarim himoyachi', 'Hujumchi'].map((pos) => {
                                                const isSel = updateForm.position === pos;
                                                return (
                                                    <TouchableOpacity
                                                        key={pos}
                                                        activeOpacity={0.7}
                                                        onPress={() => {
                                                            try { Haptics.selectionAsync().catch(() => {}); } catch (e) {}
                                                            setUpdateForm(p => ({ ...p, position: pos }));
                                                        }}
                                                        style={[
                                                            styles.positionPillBtn,
                                                            {
                                                                borderColor: isSel ? (isDark ? '#FFFFFF' : '#000000') : homeColors.border,
                                                                backgroundColor: isSel
                                                                    ? (isDark ? '#FFFFFF' : '#000000')
                                                                    : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
                                                            }
                                                        ]}
                                                    >
                                                        <Text style={[
                                                            styles.positionPillBtnText,
                                                            {
                                                                color: isSel ? (isDark ? '#000000' : '#FFFFFF') : homeColors.textPrimary,
                                                                fontWeight: isSel ? '800' : '600'
                                                            }
                                                        ]}>
                                                            {pos}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.formRow}>
                                    <View style={[styles.formGroup, { flex: 1 }]}>
                                        <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Forma (#)</Text>
                                        <TextInput
                                            style={[styles.modalInput, { color: homeColors.textPrimary, borderColor: homeColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                            value={updateForm.playerNumber}
                                            keyboardType="numeric"
                                            placeholder="10"
                                            placeholderTextColor={homeColors.textSecondary}
                                            onChangeText={(v) => setUpdateForm(p => ({ ...p, playerNumber: v }))}
                                        />
                                    </View>
                                    <View style={[styles.formGroup, { flex: 1.2 }]}>
                                        <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Tug'ilgan sana</Text>
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            onPress={() => setIsDatePickerVisible(true)}
                                            style={[
                                                styles.modalInput,
                                                {
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    borderColor: homeColors.border,
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                                    paddingVertical: 12,
                                                }
                                            ]}
                                        >
                                            <Text style={{ color: updateForm.birthDate ? homeColors.textPrimary : homeColors.textSecondary, fontSize: 13.5, fontWeight: '600' }}>
                                                {updateForm.birthDate || "Sanani tanlang"}
                                            </Text>
                                            <Ionicons name="calendar-outline" size={17} color={homeColors.textPrimary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.formRow}>
                                    <View style={[styles.formGroup, { flex: 1 }]}>
                                        <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Bo\'yi (sm)</Text>
                                        <TextInput
                                            style={[styles.modalInput, { color: homeColors.textPrimary, borderColor: homeColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                            value={updateForm.height}
                                            keyboardType="numeric"
                                            placeholder="180"
                                            placeholderTextColor={homeColors.textSecondary}
                                            onChangeText={(v) => setUpdateForm(p => ({ ...p, height: v }))}
                                        />
                                    </View>
                                    <View style={[styles.formGroup, { flex: 1 }]}>
                                        <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Vazni (kg)</Text>
                                        <TextInput
                                            style={[styles.modalInput, { color: homeColors.textPrimary, borderColor: homeColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                            value={updateForm.weight}
                                            keyboardType="numeric"
                                            placeholder="75"
                                            placeholderTextColor={homeColors.textSecondary}
                                            onChangeText={(v) => setUpdateForm(p => ({ ...p, weight: v }))}
                                        />
                                    </View>
                                </View>

                                {/* Passport Series & Number (Close together + Auto-focus) */}
                                <View style={styles.formGroup}>
                                    <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Pasport seriya va raqami</Text>
                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                        <TextInput
                                            style={[
                                                styles.modalInput,
                                                {
                                                    width: 72,
                                                    textAlign: 'center',
                                                    color: homeColors.textPrimary,
                                                    borderColor: homeColors.border,
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                                    fontWeight: '700',
                                                    fontSize: 14
                                                }
                                            ]}
                                            value={updateForm.passportSeries}
                                            autoCapitalize="characters"
                                            maxLength={2}
                                            placeholder="AA"
                                            placeholderTextColor={homeColors.textSecondary}
                                            onChangeText={(v) => {
                                                const clean = v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
                                                setUpdateForm(p => ({ ...p, passportSeries: clean }));
                                                if (clean.length === 2) {
                                                    passportNumberRef.current?.focus();
                                                }
                                            }}
                                        />
                                        <TextInput
                                            ref={passportNumberRef}
                                            style={[
                                                styles.modalInput,
                                                {
                                                    flex: 1,
                                                    color: homeColors.textPrimary,
                                                    borderColor: homeColors.border,
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                                    fontWeight: '600',
                                                    fontSize: 14
                                                }
                                            ]}
                                            value={updateForm.passportNumber}
                                            keyboardType="number-pad"
                                            maxLength={7}
                                            placeholder="1234567"
                                            placeholderTextColor={homeColors.textSecondary}
                                            onChangeText={(v) => {
                                                const clean = v.replace(/\D/g, '').slice(0, 7);
                                                setUpdateForm(p => ({ ...p, passportNumber: clean }));
                                            }}
                                        />
                                    </View>
                                </View>

                                <View style={styles.formRow}>
                                    <View style={[styles.formGroup, { flex: 1 }]}>
                                        <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Millati / Fuqaroligi</Text>
                                        <TextInput
                                            style={[styles.modalInput, { color: homeColors.textPrimary, borderColor: homeColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                            value={updateForm.citizenship}
                                            placeholder="O'zbekiston"
                                            placeholderTextColor={homeColors.textSecondary}
                                            onChangeText={(v) => setUpdateForm(p => ({ ...p, citizenship: v }))}
                                        />
                                    </View>
                                    <View style={[styles.formGroup, { flex: 1 }]}>
                                        <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Instagram Username</Text>
                                        <TextInput
                                            style={[styles.modalInput, { color: homeColors.textPrimary, borderColor: homeColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                            value={updateForm.instagramUsername}
                                            placeholder="username"
                                            placeholderTextColor={homeColors.textSecondary}
                                            autoCapitalize="none"
                                            onChangeText={(v) => setUpdateForm(p => ({ ...p, instagramUsername: v }))}
                                        />
                                    </View>
                                </View>

                                {/* 3-Week Cooldown Notice Banner */}
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 7,
                                        marginTop: 14,
                                        marginBottom: 2,
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        borderRadius: 12,
                                        backgroundColor: isDark ? 'rgba(234, 179, 8, 0.08)' : 'rgba(234, 179, 8, 0.06)',
                                        borderWidth: 1,
                                        borderColor: isDark ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 179, 8, 0.15)',
                                        width: '100%',
                                    }}
                                >
                                    <Ionicons name="information-circle-outline" size={16} color="#EAB308" />
                                    <Text
                                        style={{
                                            flex: 1,
                                            fontSize: 11.5,
                                            lineHeight: 16,
                                            fontWeight: '600',
                                            color: isDark ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 0, 0, 0.65)',
                                        }}
                                    >
                                        {t('profile.submit_cooldown_notice', "Eslatma: Ariza yuborilgandan so'ng qayta o'zgartirish 3 haftadan keyin mumkin bo'ladi.")}
                                    </Text>
                                </View>

                                {/* Slide To Send Button inside Scrollable Form */}
                                <View style={{ marginTop: 12, marginBottom: 4, alignItems: 'center', width: '100%' }}>
                                    <SlideButton
                                        title={t('common.slide_to_send', 'Arizani yuborish uchun suring')}
                                        loadingTitle={t('common.loading', 'Yuborilmoqda...')}
                                        successTitle={t('common.success', 'Muvaffaqiyatli!')}
                                        onSwipeSuccess={handleSubmitProfileUpdate}
                                        loading={submittingUpdate}
                                        status={updateSubmitStatus}
                                        disabled={submittingUpdate}
                                        compact={true}
                                        showHelperText={false}
                                    />
                                </View>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>

                    {/* INLINE DATE PICKER OVERLAY */}
                    <CustomDatePickerModal
                        visible={isDatePickerVisible}
                        initialDate={updateForm.birthDate}
                        inline={true}
                        onClose={() => setIsDatePickerVisible(false)}
                        onSelectDate={(dateStr) => {
                            setUpdateForm(p => ({ ...p, birthDate: dateStr }));
                            setIsDatePickerVisible(false);
                        }}
                    />
                </View>
            </Modal>

            {/* PENDING APPLICATION WARNING MODAL */}
            <Modal
                visible={showPendingAppModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPendingAppModal(false)}
            >
                <TouchableOpacity
                    style={[styles.editModalOverlay, { backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 }]}
                    activeOpacity={1}
                    onPress={() => setShowPendingAppModal(false)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={[
                            cardSurface,
                            {
                                width: '100%',
                                maxWidth: 360,
                                borderRadius: 24,
                                padding: 22,
                                alignItems: 'center',
                                backgroundColor: homeColors.background,
                                borderColor: homeColors.border,
                                borderWidth: 1,
                            }
                        ]}
                    >
                        {/* Glowing Hourglass Icon Badge */}
                        <View
                            style={{
                                width: 68,
                                height: 68,
                                borderRadius: 34,
                                backgroundColor: isDark ? 'rgba(234, 179, 8, 0.15)' : 'rgba(234, 179, 8, 0.12)',
                                borderWidth: 1.5,
                                borderColor: 'rgba(234, 179, 8, 0.35)',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 16,
                            }}
                        >
                            <Ionicons name="hourglass-outline" size={32} color="#EAB308" />
                        </View>

                        {/* Title */}
                        <Text
                            style={{
                                fontSize: 18,
                                fontWeight: '800',
                                color: homeColors.textPrimary,
                                textAlign: 'center',
                                marginBottom: 8,
                                letterSpacing: 0.3,
                            }}
                        >
                            {t('profile.pending_application_title', 'Arizangiz mavjud')}
                        </Text>

                        {/* Status Badge */}
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: isDark ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 179, 8, 0.15)',
                                paddingHorizontal: 12,
                                paddingVertical: 5,
                                borderRadius: 12,
                                marginBottom: 14,
                            }}
                        >
                            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#EAB308' }} />
                            <Text style={{ color: '#EAB308', fontSize: 11.5, fontWeight: '800', letterSpacing: 0.5 }}>
                                {t('common.pending', 'KUTILMOQDA').toUpperCase()}
                            </Text>
                        </View>

                        {/* Description */}
                        <Text
                            style={{
                                fontSize: 13.5,
                                lineHeight: 20,
                                color: homeColors.textSecondary,
                                textAlign: 'center',
                                marginBottom: 22,
                                fontWeight: '500',
                            }}
                        >
                            {t('profile.pending_application_msg', "Sizda ko'rib chiqilayotgan faol ariza mavjud. Administrator tasdiqlashini kuting.")}
                        </Text>

                        {/* Close / Understood Button */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch (e) {}
                                setShowPendingAppModal(false);
                            }}
                            style={{
                                width: '100%',
                                paddingVertical: 13,
                                borderRadius: 14,
                                backgroundColor: isDark ? '#FFFFFF' : '#000000',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 14.5,
                                    fontWeight: '800',
                                    color: isDark ? '#000000' : '#FFFFFF',
                                    letterSpacing: 0.4,
                                }}
                            >
                                {t('common.understood', 'Tushundim')}
                            </Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* 3-WEEK COOLDOWN WARNING MODAL */}
            <Modal
                visible={showCooldownModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowCooldownModal(false)}
            >
                <TouchableOpacity
                    style={[styles.editModalOverlay, { backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 }]}
                    activeOpacity={1}
                    onPress={() => setShowCooldownModal(false)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={[
                            cardSurface,
                            {
                                width: '100%',
                                maxWidth: 360,
                                borderRadius: 24,
                                padding: 22,
                                alignItems: 'center',
                                backgroundColor: homeColors.background,
                                borderColor: homeColors.border,
                                borderWidth: 1,
                            }
                        ]}
                    >
                        {/* Glowing Time / Cooldown Icon Badge */}
                        <View
                            style={{
                                width: 68,
                                height: 68,
                                borderRadius: 34,
                                backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.12)',
                                borderWidth: 1.5,
                                borderColor: 'rgba(56, 189, 248, 0.35)',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 16,
                            }}
                        >
                            <Ionicons name="time-outline" size={32} color="#38BDF8" />
                        </View>

                        {/* Title */}
                        <Text
                            style={{
                                fontSize: 18,
                                fontWeight: '800',
                                color: homeColors.textPrimary,
                                textAlign: 'center',
                                marginBottom: 8,
                                letterSpacing: 0.3,
                            }}
                        >
                            {t('profile.cooldown_title', 'Ariza topshirish cheklovi')}
                        </Text>

                        {/* Status Badge */}
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                                paddingHorizontal: 12,
                                paddingVertical: 5,
                                borderRadius: 12,
                                marginBottom: 14,
                            }}
                        >
                            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#38BDF8' }} />
                            <Text style={{ color: '#38BDF8', fontSize: 11.5, fontWeight: '800', letterSpacing: 0.5 }}>
                                {t('profile.cooldown_badge', '3 HAFTALIK CHEKLOV')}
                            </Text>
                        </View>

                        {/* Description */}
                        <Text
                            style={{
                                fontSize: 13.5,
                                lineHeight: 20,
                                color: homeColors.textSecondary,
                                textAlign: 'center',
                                marginBottom: 22,
                                fontWeight: '500',
                            }}
                        >
                            {t('profile.cooldown_msg', {
                                time: cooldownRemainingTime,
                                defaultValue: `Siz yaqinda ma'lumotlarni o'zgartirish uchun ariza topshirgansiz. Qayta ariza topshirish uchun ${cooldownRemainingTime} dan so'ng urinib ko'ring.`
                            })}
                        </Text>

                        {/* Close / Understood Button */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch (e) {}
                                setShowCooldownModal(false);
                            }}
                            style={{
                                width: '100%',
                                paddingVertical: 13,
                                borderRadius: 14,
                                backgroundColor: isDark ? '#FFFFFF' : '#000000',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 14.5,
                                    fontWeight: '800',
                                    color: isDark ? '#000000' : '#FFFFFF',
                                    letterSpacing: 0.4,
                                }}
                            >
                                {t('common.understood', 'Tushundim')}
                            </Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>





            {/* COMPARISON MODAL */}
            <PlayerComparisonModal
                visible={showComparisonModal}
                onClose={() => setShowComparisonModal(false)}
                currentPlayer={player}
            />

            {/* ZOOM MODAL */}
            {/* POSTER VIEWSHOT MODAL */}
            <Modal visible={showExportModal} transparent animationType="fade" onRequestClose={() => setShowExportModal(false)}>
                <View style={[styles.exportModalOverlay, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
                    <View style={[styles.exportModalCard, cardSurface, { maxWidth: 360, alignItems: 'center' }]}>
                        <View style={[styles.exportModalHeader, { width: '100%' }]}>
                            <Text style={[styles.exportModalTitle, { color: homeColors.textPrimary }]}>{t('stats.share_fifa_card_title', 'FIFA KARTASINI ULASHISH')}</Text>
                            <TouchableOpacity onPress={() => setShowExportModal(false)}>
                                <Ionicons name="close" size={22} color={homeColors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ViewShot ref={posterShotRef} options={{ format: 'png', quality: 1.0 }} style={{ padding: 6, borderRadius: 20, overflow: 'hidden', alignItems: 'center', backgroundColor: 'transparent' }}>
                            <FifaPlayerCard
                                player={player}
                                teamLogo={currentTeamLogo}
                                isLoading={loading}
                                size="lg"
                                interactive3D={false}
                                showPlayStyles={false}
                                showAttributes={true}
                            />
                        </ViewShot>

                        <TouchableOpacity style={[styles.sharePosterBtn, { backgroundColor: isDark ? '#FFFFFF' : '#000000', width: '100%', marginTop: 16 }]} onPress={handleSharePoster}>
                            <Ionicons name="share-social" size={18} color={isDark ? '#000000' : '#FFFFFF'} />
                            <Text style={[styles.sharePosterBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>{t('stats.share_card_btn', 'ULASHISH / SAQLASH')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerStickySection: {
        paddingHorizontal: 16,
        paddingTop: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    identityRowSticky: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    photoBoxSm: {
        width: 68,
        height: 68,
        borderRadius: 16,
        overflow: 'hidden',
    },
    numberBadgeSticky: {
        position: 'absolute',
        bottom: -3,
        right: -3,
        borderWidth: 1.5,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 8,
        transform: [{ rotate: '-6deg' }],
    },
    numberBadgeText: {
        fontSize: 10,
        fontWeight: '900',
    },
    playerNameSm: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    playerTeamName: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    positionPill: {
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 6,
    },
    positionPillText: {
        fontSize: 9.5,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    ratingPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderRadius: 6,
    },
    ratingPillText: {
        fontSize: 9.5,
        fontWeight: '800',
    },

    infoStatsCard: {
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    infoTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    infoStat: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 44,
    },
    infoStatValue: {
        fontSize: 14,
        fontWeight: '900',
    },
    infoStatLabel: {
        fontSize: 9,
        fontWeight: '700',
        marginTop: 2,
        letterSpacing: 0.3,
    },
    infoDivider: {
        width: 1,
        height: 20,
    },

    tabsContainer: {
        flexDirection: 'row',
        position: 'relative',
        height: 38,
        alignItems: 'center',
    },
    tabBtn: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabBtnText: {
        fontSize: 12.5,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    tabActiveLine: {
        position: 'absolute',
        bottom: 0,
        height: 2.5,
        borderRadius: 1.5,
    },

    tabContent: {
        flex: 1,
    },

    infoSectionCard: {
        borderRadius: 16,
        padding: 14,
    },
    sectionCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingBottom: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    sectionCardTitle: {
        fontSize: 12.5,
        fontWeight: '800',
        letterSpacing: 0.5,
    },

    physicalGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingTop: 12,
        paddingBottom: 4,
    },
    physicalItem: {
        alignItems: 'center',
    },
    physicalLabel: {
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    physicalValue: {
        fontSize: 13,
        fontWeight: '900',
        marginTop: 3,
    },
    physicalDivider: {
        width: 1,
        height: 22,
    },

    instagramBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 8,
    },
    instagramBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },

    aiScoutPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginTop: 12,
        width: '100%',
    },
    aiScoutText: {
        fontSize: 11,
        fontWeight: '600',
        flex: 1,
        lineHeight: 15,
    },

    compareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginTop: 14,
        width: '100%',
    },
    compareBtnText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.3,
    },

    exportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    exportBtnText: {
        fontSize: 12.5,
        fontWeight: '800',
        letterSpacing: 0.3,
    },

    careerTeamItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    teamLogoBoxMini: {
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    careerTeamName: {
        fontSize: 13,
        fontWeight: '800',
    },
    currentTeamBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 4,
    },
    pulsingDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    currentTeamBadgeText: {
        fontSize: 9,
        fontWeight: '800',
    },
    pastTeamBadgeText: {
        fontSize: 9,
        fontWeight: '700',
    },
    careerDateSub: {
        fontSize: 10.5,
        fontWeight: '600',
        marginTop: 2,
    },

    hMatchCard: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    emptyState: {
        padding: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyStateText: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    matchRowItem: {
        paddingVertical: 12,
    },
    matchRowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    matchRowLeague: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    matchRowDate: {
        fontSize: 10,
        fontWeight: '600',
    },
    matchTeamsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    teamCol: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    teamMiniLogo: {
        width: 22,
        height: 22,
    },
    teamNameMatch: {
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },
    scoreBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginHorizontal: 8,
    },
    scoreText: {
        fontSize: 12.5,
        fontWeight: '900',
    },

    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContent: { alignItems: 'center', padding: 24 },
    emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 16, marginBottom: 16 },
    backBtnAction: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    backBtnActionText: { fontSize: 13, fontWeight: '800' },

    editModalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    editModalStickyFooter: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderTopWidth: 1,
    },
    positionPillBtn: {
        flex: 1,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 6,
    },
    positionPillBtnText: {
        fontSize: 12,
        letterSpacing: 0.1,
    },
    editModalCard: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 20,
        padding: 16,
    },
    editModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    editModalTitle: {
        fontSize: 13,
        fontWeight: '800',
    },
    editAvatarWrapper: {
        position: 'relative',
        borderRadius: 20,
    },
    cameraIconBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#000',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FFF',
    },
    formGroup: {
        marginBottom: 10,
    },
    formRow: {
        flexDirection: 'row',
        gap: 8,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 4,
    },
    modalInput: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 13,
    },
    submitUpdateBtn: {
        borderRadius: 12,
        paddingVertical: 11,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
    },
    submitUpdateBtnText: {
        fontSize: 12.5,
        fontWeight: '800',
        letterSpacing: 0.3,
    },

    exportModalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    exportModalCard: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 20,
        padding: 16,
    },
    exportModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    exportModalTitle: {
        fontSize: 13,
        fontWeight: '800',
    },
    posterCaptureContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        alignItems: 'center',
    },
    posterInner: {
        width: 300,
        height: 400,
        position: 'relative',
        justifyContent: 'flex-end',
    },
    posterPhoto: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    posterOverlayBottom: {
        padding: 14,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    posterNameText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
    },
    posterSubText: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700',
        marginTop: 2,
    },
    posterStatsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    posterStatItem: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
    },
    sharePosterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 12,
        paddingVertical: 11,
        marginTop: 14,
    },
    sharePosterBtnText: {
        fontSize: 13,
        fontWeight: '800',
    },
});

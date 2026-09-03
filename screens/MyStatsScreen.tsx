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
                if (obj.citizenship && !citizenship) citizenship = obj.citizenship;
                if (obj.height && !height) height = obj.height;
                if (obj.weight && !weight) weight = obj.weight;
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
        citizenship,
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
    const { t } = useTranslation();
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
    const [openingInstagram, setOpeningInstagram] = useState(false);

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

            // Open Profile Update Modal (Fetches fresh live data directly from DB)
    const handleOpenUpdateModal = async () => {
        try {
            setLoading(true);
            let freshPlayer = player;
            if (targetPlayerId) {
                const { data: dbData } = await supabase
                    .from('applications')
                    .select('*')
                    .eq('id', targetPlayerId)
                    .maybeSingle();
                if (dbData) {
                    freshPlayer = { ...player, ...dbData };
                }
            }

            const pData = extractPlayerData(freshPlayer) || {};
            const bDate = freshPlayer?.birth_date || freshPlayer?.birthDate || '15.05.1998';
            let formattedBDate = String(bDate);

            if (formattedBDate.includes('-')) {
                const parts = formattedBDate.split('-');
                if (parts[0].length === 4) {
                    formattedBDate = `${parts[2].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[0]}`;
                }
            }

            setOriginalPlayerData(freshPlayer);
            setUpdateForm({
                photoUrl: freshPlayer?.photo_url || freshPlayer?.photo || freshPlayer?.avatar || '',
                phone: freshPlayer?.phone || '',
                firstName: freshPlayer?.first_name || freshPlayer?.firstName || '',
                lastName: freshPlayer?.last_name || freshPlayer?.lastName || '',
                fatherName: freshPlayer?.father_name || freshPlayer?.fatherName || pData.fatherName || '',
                position: freshPlayer?.position || 'Hujumchi',
                playerNumber: String(freshPlayer?.player_number || freshPlayer?.number || freshPlayer?.shirt_number || ''),
                passportSeries: freshPlayer?.passport_series || freshPlayer?.passportSeries || '',
                passportNumber: freshPlayer?.passport_number || freshPlayer?.passportNumber || '',
                citizenship: freshPlayer?.citizenship || pData.citizenship || "O'zbekiston",
                height: String(freshPlayer?.height || pData.height || ''),
                weight: String(freshPlayer?.weight || pData.weight || ''),
                instagramUsername: freshPlayer?.instagram_username || pData.instagram_username || '',
                birthDate: formattedBDate
            });
            setUpdateSubmitStatus('idle');
            setShowProfileUpdateModal(true);
        } catch (e) {
            console.error('Error fetching live player for edit:', e);
            setShowProfileUpdateModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handlePickImage = async () => {
        try {
            setPickerLoading(true);
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert('Ruxsat kerak', 'Rasmni tanlash uchun galereyaga ruxsat bering');
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
            Alert.alert(t('common.notice', 'Xatolik'), 'Rasmni tanlashda xatolik yuz berdi');
        } finally {
            setPickerLoading(false);
        }
    };

        const handleSubmitProfileUpdate = async () => {
        if (!updateForm.firstName?.trim() || !updateForm.lastName?.trim()) {
            Alert.alert(t('common.notice', 'Eslatma'), 'Iltimos, ism va familiyangizni kiriting');
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

            let commentPayload = '[PROFILE_UPDATE]' + JSON.stringify({ oldData: payload.oldData, newData: payload.newData, playerId: targetPlayerId });
            commentPayload += ` [METADATA:${JSON.stringify(metaObj)}]`;
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
            Alert.alert(t('common.notice', 'Xatolik'), 'Arizani yuborishda xatolik yuz berdi');
        } finally {
            setSubmittingUpdate(false);
        }
    };

    const fetchPlayer = async () => {
        try {
            setLoading(true);
            const [playerData, statsData, transfersData] = await Promise.all([
                apiService.getPlayerById(targetPlayerId),
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
        } else {
            setLoading(false);
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
                    <TouchableOpacity onPress={handleOpenUpdateModal} hitSlop={10} style={{ marginLeft: 'auto' }}>
                        <Ionicons name="create-outline" size={18} color={homeColors.textPrimary} />
                    </TouchableOpacity>
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
                        style={[styles.instagramBtn, { borderTopColor: homeColors.border }]}
                        activeOpacity={0.75}
                        onPress={() => handleOpenInstagram(instagramUrl)}
                    >
                        <Ionicons name="logo-instagram" size={18} color="#E1306C" />
                        <Text style={[styles.instagramBtnText, { color: homeColors.textPrimary }]}>@{instagramUsername}</Text>
                        <Ionicons name="open-outline" size={14} color={homeColors.textSecondary} style={{ marginLeft: 'auto' }} />
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
                    onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setShowComparisonModal(true);
                    }}
                    style={[styles.compareBtn, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}
                >
                    <Ionicons name="git-compare-outline" size={16} color={isDark ? '#000000' : '#FFFFFF'} />
                    <Text style={[styles.compareBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                        {t('stats.compare_vs', 'BOSHQASI BILAN TAQQOSLASH (VS)').toUpperCase()}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* FIFA CARD SHARE SECTION */}
            <View style={{ marginTop: 14, width: '100%' }}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleExportPress}
                    disabled={exportState !== 'idle'}
                    style={[styles.exportBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: homeColors.border }]}
                >
                    {exportState === 'idle' && (
                        <>
                            <Ionicons name="share-social-outline" size={18} color={homeColors.textPrimary} />
                            <Text style={[styles.exportBtnText, { color: homeColors.textPrimary }]}>{t('stats.share_fifa_card', 'FIFA KARTASINI ULASHISH')}</Text>
                        </>
                    )}
                    {exportState === 'loading' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <ActivityIndicator size="small" color={homeColors.textPrimary} />
                            <Text style={[styles.exportBtnText, { color: homeColors.textPrimary }]}>{t('stats.preparing_card', 'KARTA TAYYORLANMOQDA...')} {exportProgress}%</Text>
                        </View>
                    )}
                    {exportState === 'complete' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                            <Text style={[styles.exportBtnText, { color: homeColors.textPrimary }]}>{t('stats.card_ready', 'KARTA TAYYOR!')}</Text>
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

            {/* PLAYER'S REPLAY HIGHLIGHTS FEED */}
            <View style={[styles.infoSectionCard, cardSurface, { marginTop: 14 }]}>
                <View style={[styles.sectionCardHeader, { borderBottomColor: homeColors.border }]}>
                    <Ionicons name="videocam-outline" size={17} color={homeColors.textPrimary} />
                    <Text style={[styles.sectionCardTitle, { color: homeColors.textPrimary }]}>{t('stats.personal_replays', 'GOLLAR & REPLAYLAR').toUpperCase()}</Text>
                </View>

                {replaysLoading ? (
                    <ActivityIndicator color={homeColors.textPrimary} style={{ marginVertical: 20 }} />
                ) : groupedMatches.length > 0 ? (
                    groupedMatches.map((group: any, idx: number) => (
                        <PlayerMatchReplayCard
                            key={group.match?.id || idx}
                            match={group.match}
                            replays={group.replays}
                            playerName={playerNameFull}
                        />
                    ))
                ) : (
                    <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="videocam-outline" size={32} color={homeColors.textSecondary} style={{ opacity: 0.5 }} />
                        <Text style={{ color: homeColors.textSecondary, fontSize: 13, marginTop: 8, fontWeight: '600' }}>{t('stats.no_replays', 'Replaylar mavjud emas')}</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );

    const renderMatches = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
            <View style={[styles.infoSectionCard, cardSurface]}>
                <View style={[styles.sectionCardHeader, { borderBottomColor: homeColors.border }]}>
                    <Ionicons name="football-outline" size={17} color={homeColors.textPrimary} />
                    <Text style={[styles.sectionCardTitle, { color: homeColors.textPrimary }]}>{t('stats.past_matches', 'O\'YINLAR TARIXI').toUpperCase()}</Text>
                </View>

                {matchesLoading ? (
                    <ActivityIndicator color={homeColors.textPrimary} style={{ marginVertical: 24 }} />
                ) : matches.length > 0 ? (
                    matches.map((match: any, idx: number) => (
                        <View key={match.id || match._id || idx} style={[styles.matchRowItem, idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: homeColors.border }]}>
                            <View style={styles.matchRowTop}>
                                <Text style={[styles.matchRowLeague, { color: homeColors.textSecondary }]}>{match.leagueName || 'AMATORA LIGA'}</Text>
                                <Text style={[styles.matchRowDate, { color: homeColors.textSecondary }]}>{new Date(match.date || match.match_date || Date.now()).toLocaleDateString('uz-UZ')}</Text>
                            </View>
                            <View style={styles.matchTeamsRow}>
                                <View style={styles.teamCol}>
                                    <SmartImage uri={match.homeTeam?.logo || match.homeTeamLogo} style={styles.teamMiniLogo} contentFit="contain" fallbackIcon="shield-outline" />
                                    <Text style={[styles.teamNameMatch, { color: homeColors.textPrimary }]} numberOfLines={1}>{match.homeTeam?.name || match.homeTeamName || 'Jamoa A'}</Text>
                                </View>
                                <View style={[styles.scoreBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                    <Text style={[styles.scoreText, { color: homeColors.textPrimary }]}>{match.score?.home ?? match.home_score ?? 0} : {match.score?.away ?? match.away_score ?? 0}</Text>
                                </View>
                                <View style={styles.teamCol}>
                                    <SmartImage uri={match.awayTeam?.logo || match.awayTeamLogo} style={styles.teamMiniLogo} contentFit="contain" fallbackIcon="shield-outline" />
                                    <Text style={[styles.teamNameMatch, { color: homeColors.textPrimary }]} numberOfLines={1}>{match.awayTeam?.name || match.awayTeamName || 'Jamoa B'}</Text>
                                </View>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="football-outline" size={32} color={homeColors.textSecondary} style={{ opacity: 0.5 }} />
                        <Text style={{ color: homeColors.textSecondary, fontSize: 13, marginTop: 8, fontWeight: '600' }}>{t('stats.no_matches', "O'yinlar tarixi mavjud emas")}</Text>
                    </View>
                )}
            </View>
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
                                >
                                    <Ionicons name="create-outline" size={18} color={homeColors.textPrimary} />
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
                    <View style={[styles.editModalCard, cardSurface, { maxHeight: '90%' }]}>
                        <View style={styles.editModalHeader}>
                            <Text style={[styles.editModalTitle, { color: homeColors.textPrimary }]}>{t('profile.edit_profile', 'PROFILNI TAHRIRLASH')}</Text>
                            <TouchableOpacity onPress={() => setShowProfileUpdateModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="close" size={22} color={homeColors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
                            {/* Photo upload row */}
                            <View style={{ alignItems: 'center', marginBottom: 16 }}>
                                <TouchableOpacity onPress={handlePickImage} style={styles.editAvatarWrapper} activeOpacity={0.8}>
                                    <SmartImage uri={updateForm.photoUrl || player.photo || player.avatar} style={{ width: 88, height: 88, borderRadius: 22 }} contentFit="cover" fallbackIcon="person" />
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
                                    <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Telefon raqam</Text>
                                    <TextInput
                                        style={[styles.modalInput, { color: homeColors.textPrimary, borderColor: homeColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                        value={updateForm.phone}
                                        keyboardType="phone-pad"
                                        placeholder="+998901234567"
                                        placeholderTextColor={homeColors.textSecondary}
                                        onChangeText={(v) => setUpdateForm(p => ({ ...p, phone: v }))}
                                    />
                                </View>
                            </View>

                            <View style={styles.formRow}>
                                <View style={[styles.formGroup, { flex: 1.2 }]}>
                                    <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Pozitsiya</Text>
                                    <TextInput
                                        style={[styles.modalInput, { color: homeColors.textPrimary, borderColor: homeColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                        value={updateForm.position}
                                        placeholder="Masalan: Hujumchi"
                                        placeholderTextColor={homeColors.textSecondary}
                                        onChangeText={(v) => setUpdateForm(p => ({ ...p, position: v }))}
                                    />
                                </View>
                                <View style={[styles.formGroup, { flex: 0.8 }]}>
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
                            </View>

                            {/* Tug'ilgan sana (JoinApplication date picker modal) */}
                            <View style={styles.formGroup}>
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
                                    <Text style={{ color: updateForm.birthDate ? homeColors.textPrimary : homeColors.textSecondary, fontSize: 14, fontWeight: '600' }}>
                                        {updateForm.birthDate || "Sanani tanlang"}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={18} color={homeColors.textPrimary} />
                                </TouchableOpacity>
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

                            <View style={styles.formRow}>
                                <View style={[styles.formGroup, { flex: 0.8 }]}>
                                    <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Pasport Seriya</Text>
                                    <TextInput
                                        style={[styles.modalInput, { color: homeColors.textPrimary, borderColor: homeColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                        value={updateForm.passportSeries}
                                        autoCapitalize="characters"
                                        maxLength={2}
                                        placeholder="AA"
                                        placeholderTextColor={homeColors.textSecondary}
                                        onChangeText={(v) => setUpdateForm(p => ({ ...p, passportSeries: v }))}
                                    />
                                </View>
                                <View style={[styles.formGroup, { flex: 1.2 }]}>
                                    <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Pasport Raqam</Text>
                                    <TextInput
                                        style={[styles.modalInput, { color: homeColors.textPrimary, borderColor: homeColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                        value={updateForm.passportNumber}
                                        keyboardType="numeric"
                                        maxLength={7}
                                        placeholder="1234567"
                                        placeholderTextColor={homeColors.textSecondary}
                                        onChangeText={(v) => setUpdateForm(p => ({ ...p, passportNumber: v }))}
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
                        </ScrollView>

                        {/* Interactive Slide To Send Button */}
                        <View style={{ marginTop: 14, alignItems: 'center', width: '100%' }}>
                            <SlideButton
                                title={t('common.slide_to_send', 'Arizani yuborish uchun suring')}
                                loadingTitle={t('common.loading', 'Yuborilmoqda...')}
                                successTitle={t('common.success', 'Muvaffaqiyatli!')}
                                onSwipeSuccess={handleSubmitProfileUpdate}
                                loading={submittingUpdate}
                                status={updateSubmitStatus}
                                disabled={submittingUpdate}
                            />
                        </View>
                    </View>

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

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
    Platform,
    Alert,
    Modal,
    PanResponder
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { apiService } from '../services/apiService';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import VideoBackground from '../components/VideoBackground';
import Colors from '../constants/Colors';
import SmartImage from '../components/SmartImage';
import { supabase } from '../services/supabase';
import ReplayVideoCard from '../components/ReplayVideoCard';
import PlayerMatchReplayCard from '../components/PlayerMatchReplayCard';
import PlayerProfileSkeleton from '../components/PlayerProfileSkeleton';
import PlayerRadarChart from '../components/PlayerRadarChart';
import FifaPlayerCard from '../components/FifaPlayerCard';
import PlayerComparisonModal from '../components/PlayerComparisonModal';
import PlayerCardZoomModal from '../components/PlayerCardZoomModal';
import { aiScoutService, PlayerAiStats } from '../services/aiScoutService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { getLocalizedPosition } from '../utils/localizationUtils';

const { width } = Dimensions.get('window');

const getPositionFullUz = (pos: string) => {
    const map: any = {
        'GK': 'Darvozabon',
        'LB': 'Chap qanot himoyachisi',
        'CB': 'Markaziy himoyachi',
        'RB': "O'ng qanot himoyachisi",
        'CDM': 'Tayanch yarim himoyachisi',
        'CM': 'Markaziy yarim himoyachisi',
        'CAM': 'Hujumkor yarim himoyachisi',
        'LW': 'Chap qanot hujumchisi',
        'RW': "O'ng qanot hujumchisi",
        'ST': 'Markaziy hujumchi',
        'CF': 'Ikkinchi hujumchi',
        'LM': 'Chap qanot yarim himoyachisi',
        'RM': "O'ng qanot yarim himoyachisi",
        'LWB': 'Chap qanot qanot himoyachisi',
        'RWB': "O'ng qanot qanot himoyachisi",
    };
    return map[pos?.toUpperCase()] || pos || 'O\'YINCHI';
};

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
        instagram_url: instaUrl
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

const PlayerStatsScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { playerId, player: initialPlayer } = route.params || {};
    const [loading, setLoading] = useState(true);
    const [player, setPlayer] = useState<any>(initialPlayer ? extractPlayerData(initialPlayer) : null);
    const [playerTransfers, setPlayerTransfers] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('profil');
    const [matches, setMatches] = useState<any[]>([]);
    const [matchesLoading, setMatchesLoading] = useState(false);
    const [openingInstagram, setOpeningInstagram] = useState(false);
    const [showComparisonModal, setShowComparisonModal] = useState(false);
    const [showCardZoomModal, setShowCardZoomModal] = useState(false);

    const handleOpenInstagram = async (url: string) => {
        if (!url || openingInstagram) return;
        try {
            setOpeningInstagram(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Xatolik', 'Instagram havolasini ochib bo\'lmadi');
            }
        } catch (error) {
            console.error('Error opening instagram URL:', error);
        } finally {
            setTimeout(() => setOpeningInstagram(false), 1200);
        }
    };
    
    // Export State & ViewShot Ref
    const [exportState, setExportState] = useState<'idle' | 'loading' | 'complete'>('idle');
    const [exportProgress, setExportProgress] = useState(0);
    const [showExportModal, setShowExportModal] = useState(false);
    const posterShotRef = useRef<any>(null);
    const [scrollEnabled, setScrollEnabled] = useState(true);

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
                    Alert.alert('Tayyor!', `Posteringiz saqlandi: ${uri}`);
                }
            } else {
                Alert.alert('Eslatma', 'Posterni rasmga olib bo\'lmadi. Qayta urinib ko\'ring.');
            }
        } catch (e) {
            console.error('Error exporting poster:', e);
            Alert.alert('Xatolik', 'Posterni eksport qilishda xatolik bo\'ldi');
        }
    };
    
    const slideAnim = useRef(new Animated.Value(0)).current;

    const tabs = ['profil', 'karyerasi', 'oyinlari'];
    const activeTabRef = useRef(activeTab);
    activeTabRef.current = activeTab;

    const tabLabels: any = {
        profil: t('stats.tab_profile', 'PROFIL'),
        karyerasi: t('stats.tab_career', 'KARYERASI'),
        oyinlari: t('stats.tab_matches', 'O\'YINLARI')
    };

    const nextTab = () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}

        const currentIndex = tabs.indexOf(activeTabRef.current);
        const nextIndex = (currentIndex + 1) % tabs.length;
        const nextTabName = tabs[nextIndex];
        
        Animated.timing(slideAnim, {
            toValue: -80,
            duration: 100,
            useNativeDriver: true,
        }).start(() => {
            setActiveTab(nextTabName);
            slideAnim.setValue(80);
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 7,
                tension: 45,
                useNativeDriver: true,
            }).start();
        });
    };

    const prevTab = () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}

        const currentIndex = tabs.indexOf(activeTabRef.current);
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        const prevTabName = tabs[prevIndex];
        
        Animated.timing(slideAnim, {
            toValue: 80,
            duration: 100,
            useNativeDriver: true,
        }).start(() => {
            setActiveTab(prevTabName);
            slideAnim.setValue(-80);
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 7,
                tension: 45,
                useNativeDriver: true,
            }).start();
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 25 && Math.abs(gestureState.dy) < 15;
            },
            onPanResponderGrant: () => {
                setScrollEnabled(false);
            },
            onPanResponderMove: (_, gestureState) => {
                slideAnim.setValue(gestureState.dx * 0.4);
            },
            onPanResponderRelease: (_, gestureState) => {
                setScrollEnabled(true);
                if (gestureState.dx < -50) {
                    nextTab();
                } else if (gestureState.dx > 50) {
                    prevTab();
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        friction: 7,
                        tension: 50,
                        useNativeDriver: true,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                setScrollEnabled(true);
                Animated.spring(slideAnim, {
                    toValue: 0,
                    friction: 7,
                    tension: 50,
                    useNativeDriver: true,
                }).start();
            }
        })
    ).current;

    useEffect(() => {
        if (playerId) {
            fetchPlayer();
        } else {
            setLoading(false);
        }
    }, [playerId]);

    const [aiStats, setAiStats] = useState<PlayerAiStats | null>(null);

    const fetchPlayer = async () => {
        try {
            setLoading(true);
            const [playerData, statsData, transfersData] = await Promise.all([
                apiService.getPlayerById(playerId),
                apiService.getPlayerStats(playerId).catch(() => null),
                apiService.getPlayerTransfers(playerId).catch(() => [])
            ]);

            if (playerData) {
                const parsed = extractPlayerData({
                    ...playerData,
                    stats: statsData || playerData.stats
                });

                // AI Scout evaluation for FIFA card
                const evaluatedAi = await aiScoutService.evaluatePlayer(parsed);
                parsed.aiStats = evaluatedAi;
                setAiStats(evaluatedAi);
                setPlayer(parsed);
                if (activeTab === 'oyinlari') fetchPlayerMatches();
            }
            if (transfersData) {
                setPlayerTransfers(transfersData);
            }
        } catch (error) {
            console.error('Error fetching player stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlayerMatches = async () => {
        try {
            setMatchesLoading(true);
            const data = await apiService.getPlayerMatches(playerId);
            setMatches(data || []);
        } catch (error) {
            console.error('Error fetching player matches:', error);
        } finally {
            setMatchesLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'oyinlari' && matches.length === 0) fetchPlayerMatches();
    }, [activeTab]);

    if (loading && !player) return (
        <View style={{ flex: 1, backgroundColor: '#050811' }}>
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                overlayOpacity={0.85}
                style={StyleSheet.absoluteFill}
            />
            <PlayerProfileSkeleton />
        </View>
    );

    if (!player) return null;

    const stats = player.stats || { goals: 0, assists: 0, matchesPlayed: 0, yellowCards: 0, redCards: 0, rating: 0 };
    const computedAge = calculateAgeFromBirthDate(player.birth_date || player.birthDate, player.age);
    const instagramUsername = player.instagram_username || '';
    const instagramUrl = instagramUsername ? `https://www.instagram.com/${instagramUsername}/` : null;

    const renderProfil = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.statsGrid}>
                <StatBox label={t('stats.goals').toUpperCase()} value={stats.goals} icon="football" color={Colors.primary} />
                <StatBox label={t('stats.assists').toUpperCase()} value={stats.assists} icon="shoe-prints" color="#3b82f6" />
                <StatBox label={t('stats.matches_played').toUpperCase()} value={stats.matchesPlayed} icon="calendar" color="#FFF" />
                <StatBox label={t('stats.rating').toUpperCase()} value={stats.rating || player.rating || 0} icon="trending-up" color="#FACC15" />
            </View>

            <View style={styles.physicalInfoBox}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.cardContent}>
                    <View style={styles.statItem}>
                        <View style={styles.statIconBox}><Ionicons name="calendar-outline" size={18} color={Colors.primary} /></View>
                        <View>
                            <Text style={styles.statLabelSmall}>{t('stats.age')}</Text>
                            <Text style={styles.statValueSmall}>{computedAge !== '—' ? `${computedAge} ${t('stats.years_old')}` : '—'}</Text>
                        </View>
                    </View>
                    <View style={styles.statItem}>
                        <View style={styles.statIconBox}><Ionicons name="resize-outline" size={18} color={Colors.primary} /></View>
                        <View>
                            <Text style={styles.statLabelSmall}>{t('stats.height')}</Text>
                            <Text style={styles.statValueSmall}>{player?.height ? `${player.height} ${t('stats.cm').toUpperCase()}` : '—'}</Text>
                        </View>
                    </View>
                    <View style={styles.statItem}>
                        <View style={styles.statIconBox}><Ionicons name="fitness-outline" size={18} color={Colors.primary} /></View>
                        <View>
                            <Text style={styles.statLabelSmall}>{t('stats.weight')}</Text>
                            <Text style={styles.statValueSmall}>{player?.weight ? `${player.weight} ${t('stats.kg').toUpperCase()}` : '—'}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.infoSection}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="person-circle" size={20} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>{t('stats.personal_info')}</Text>
                </View>
                <View style={styles.infoList}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <InfoRow label={t('stats.father_name')} value={player.fatherName || player.father_name || '---'} icon="person" />
                    <InfoRow label={t('stats.citizenship')} value={player.citizenship || '---'} icon="planet" />
                    <InfoRow label={t('stats.position')} value={getLocalizedPosition(player.position, t)} icon="shield" />
                </View>
            </View>

            {/* 3D FIFA / EA FC PLAYER CARD */}
            <View style={{ marginTop: 24, marginBottom: 16, alignItems: 'center', width: '100%' }}>
                <View style={[styles.sectionHeader, { width: '100%', marginBottom: 10 }]}>
                    <Ionicons name="sparkles" size={20} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>{t('stats.player_card_title', 'O\'YINCHI KARTASI')}</Text>
                </View>

                <View style={{ marginBottom: 12, alignItems: 'center' }}>
                    <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                        {t('stats.card_tap_hint', 'Kattalashtirish va 3D ko\'rish uchun kartaga bosing')}
                    </Text>
                </View>

                <FifaPlayerCard
                    player={player}
                    size="lg"
                    interactive3D={true}
                    showPlayStyles={true}
                    onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setShowCardZoomModal(true);
                    }}
                />

                {aiStats?.aiScoutSummary ? (
                    <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 223, 130, 0.08)', borderWidth: 1, borderColor: 'rgba(0, 223, 130, 0.25)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, gap: 8, maxWidth: width - 48 }}>
                        <Ionicons name={aiStats.hasVideoScouted ? "sparkles" : "analytics-outline"} size={16} color={Colors.primary} />
                        <Text style={{ color: '#E2E8F0', fontSize: 11, fontWeight: '700', flex: 1, lineHeight: 15 }}>
                            {aiStats.aiScoutSummary}
                        </Text>
                    </View>
                ) : null}
            </View>

            {/* 3D SPIDER / RADAR POLYGON CHART SECTION */}
            <View style={{ marginTop: 16, marginBottom: 24, alignItems: 'center', width: '100%' }}>
                <View style={[styles.sectionHeader, { width: '100%', marginBottom: 6 }]}>
                    <Ionicons name="pie-chart" size={20} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>3D ATRIBUTLAR RADARI</Text>
                </View>
                <PlayerRadarChart
                    player1={player}
                    player1Name={`${player.firstName || ''} ${player.lastName || ''}`.trim() || 'O\'yinchi'}
                    size={Math.min(width - 40, 330)}
                />
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setShowComparisonModal(true);
                    }}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        backgroundColor: 'rgba(0, 223, 130, 0.15)',
                        borderWidth: 1.2,
                        borderColor: Colors.primary,
                        borderRadius: 14,
                        paddingVertical: 12,
                        paddingHorizontal: 20,
                        marginTop: 12,
                        width: '100%'
                    }}
                >
                    <Ionicons name="git-compare" size={18} color={Colors.primary} />
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 }}>
                        BOSHQASI BILAN TAQQOSLASH (VS)
                    </Text>
                </TouchableOpacity>
            </View>

            {/* MATCHDAY POSTER EXPORT SECTION */}
            <View style={{ marginTop: 10, marginBottom: 25, width: '100%' }}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleExportPress}
                    disabled={exportState !== 'idle'}
                    style={styles.exportBtn}
                >
                    {exportState === 'idle' && (
                        <>
                            <Ionicons name="sparkles" size={18} color="#000" />
                            <Text style={styles.exportBtnText}>{t('stats.create_matchday_poster', 'MATCHDAY POSTER YARATISH')}</Text>
                        </>
                    )}
                    {exportState === 'loading' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <ActivityIndicator size="small" color="#000" />
                            <Text style={styles.exportBtnText}>{t('stats.generating_poster', 'POSTER YARATILMOQDA...')} {exportProgress}%</Text>
                        </View>
                    )}
                    {exportState === 'complete' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="checkmark-circle" size={20} color="#000" />
                            <Text style={styles.exportBtnText}>{t('stats.poster_ready', 'POSTER TAYYOR!')}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 35 }} />
        </ScrollView>
    );

    const [playerReplays, setPlayerReplays] = useState<any[]>([]);
    const [replaysLoading, setReplaysLoading] = useState(false);

    useEffect(() => {
        const fetchPlayerReplays = async () => {
            const pId = player?.id || player?._id || playerId;
            if (!pId) return;
            setReplaysLoading(true);
            try {
                // Find all application IDs associated with this player
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
                    .select('*, match:match_id(*, home_team:home_team_id(id, name, logo_url), away_team:away_team_id(id, name, logo_url)), player:player_id(*)')
                    .in('player_id', targetPlayerIds)
                    .order('created_at', { ascending: false });

                if (events && events.length > 0) {
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
    }, [player?.id, player?._id, playerId, player?.phone]);

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

    const renderKaryera = () => {
        const approvedTransfers = playerTransfers.filter((t: any) => t.status === 'approved');
        const currentTeamName = player?.teams?.name || (approvedTransfers[0]?.new_team_name) || player?.team_name || player?.teamName || 'Jamoa';
        const currentTeamLogo = player?.teams?.logo_url || player?.teams?.logo || player?.team_logo || (approvedTransfers[0]?.new_team_logo) || '';

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

        return (
            <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                    <Ionicons name="trophy-outline" size={20} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>{t('stats.career_history').toUpperCase()}</Text>
                </View>

                <View style={styles.careerTimelineContainer}>
                    {/* 1. HOZIRGI JAMOASI (CURRENT ACTIVE TEAM) */}
                    <View style={[styles.teamCareerWrapper, styles.teamCareerCurrent]}>
                        <View style={styles.teamMainRow}>
                            <View style={[styles.teamIconBox, { borderColor: '#00FF66', borderWidth: 1.5, width: 36, height: 36, borderRadius: 10 }]}>
                                {currentTeamLogo ? (
                                    <Image source={{ uri: currentTeamLogo }} style={{ width: 26, height: 26 }} resizeMode="contain" />
                                ) : (
                                    <Ionicons name="shield" size={18} color="#00FF66" />
                                )}
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={[styles.teamNameCareer, { color: '#00FF66', fontSize: 14 }]} numberOfLines={1}>
                                        {(currentTeamName || 'AMALDAGI JAMOA').toUpperCase()}
                                    </Text>
                                    <View style={styles.currentTeamBadge}>
                                        <View style={styles.pulsingDot} />
                                        <Text style={styles.currentTeamBadgeText}>{t('stats.current_team').toUpperCase()}</Text>
                                    </View>
                                </View>
                                <Text style={styles.careerDateSub}>{t('stats.current_team_sub')}</Text>
                            </View>
                        </View>
                    </View>

                    {/* 2. TRANSFER BO'LGAN AVVALGI JAMOALARI (PAST TEAMS WITH EXACT TRANSFER DATE) */}
                    {approvedTransfers.map((tr: any, idx: number) => {
                        const trDate = formatTransferDate(tr.created_at);
                        const oldLogo = tr.old_team_logo;
                        const oldName = tr.old_team_name || 'Eski jamoasi';

                        return (
                            <View key={tr.id || idx} style={[styles.teamCareerWrapper, { borderLeftWidth: 3, borderLeftColor: 'rgba(255,255,255,0.25)', marginTop: 8 }]}>
                                <View style={styles.teamMainRow}>
                                    <View style={[styles.teamIconBox, { width: 34, height: 34, borderRadius: 10 }]}>
                                        {oldLogo ? (
                                            <Image source={{ uri: oldLogo }} style={{ width: 24, height: 24 }} resizeMode="contain" />
                                        ) : (
                                            <Ionicons name="shield-outline" size={16} color="rgba(255,255,255,0.6)" />
                                        )}
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Text style={styles.teamNameCareer} numberOfLines={1}>
                                                {oldName.toUpperCase()}
                                            </Text>
                                            <View style={styles.transferredBadge}>
                                                <Ionicons name="arrow-forward" size={10} color="#94A3B8" />
                                                <Text style={styles.transferredBadgeText}>{t('stats.past_team').toUpperCase()}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.careerDateSub}>
                                            🗓️ {t('stats.transfer_date')}: {trDate}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Player's Personal 20s Goal Replay Clips Feed (Grouped by Match) */}
                <View style={{ marginTop: 24, marginBottom: 20 }}>
                    <View style={[styles.sectionHeader, { marginBottom: 12 }]}>
                        <Ionicons name="videocam" size={20} color={Colors.primary || '#00FF87'} />
                        <Text style={styles.sectionTitle}>{t('stats.personal_replays')}</Text>
                    </View>

                    {replaysLoading ? (
                        <ActivityIndicator color={Colors.primary || '#00FF87'} style={{ marginVertical: 15 }} />
                    ) : groupedMatches.length > 0 ? (
                        groupedMatches.map((group: any, idx: number) => (
                            <PlayerMatchReplayCard
                                key={group.match?.id || idx}
                                match={group.match}
                                replays={group.replays}
                                playerName={`${player?.first_name || ''} ${player?.last_name || ''}`.trim()}
                            />
                        ))
                    ) : (
                        <View style={styles.teamCareerWrapper}>
                            <View style={{ padding: 15, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="videocam-outline" size={30} color="rgba(255,255,255,0.2)" />
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 6 }}>{t('stats.no_replays')}</Text>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        );
    };

    const renderMatches = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                <Ionicons name="football-outline" size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>{t('stats.past_matches').toUpperCase()}</Text>
            </View>

            {matchesLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
            ) : matches.length > 0 ? (
                matches.map((match: any) => (
                    <MatchCard key={match.id || match._id} match={match} />
                ))
            ) : (
                <View style={styles.emptyCareer}>
                    <Text style={styles.emptyCareerText}>O'yinlar tarixi mavjud emas</Text>
                </View>
            )}
        </ScrollView>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                overlayOpacity={0.8}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
            >
                <View style={styles.heroSection}>
                    {/* AMATORA BRAND HEADER (SIDE-BY-SIDE WITH LOGO) */}
                    <View style={styles.brandHeaderWrapper}>
                        <Image
                            source={require('../assets/logo.png')}
                            style={{ width: 18, height: 18, marginRight: 6 }}
                            resizeMode="contain"
                        />
                        <Text style={styles.brandText}>AMATORA</Text>
                    </View>

                    {/* ⚽ PARALLEL TOP ROW: BACK BUTTON ALIGNED TO TOP EDGE PARALLEL WITH PLAYER PHOTO */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', marginTop: 30, marginBottom: 20 }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonBtn}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>

                        {/* PLAYER PHOTO CREST (BIGGER 1X1 SQUARE CARD) */}
                        <View style={{ position: 'relative' }}>
                            <View style={{
                                width: 118,
                                height: 118,
                                borderRadius: 22,
                                borderWidth: 1.5,
                                borderColor: 'rgba(0, 255, 135, 0.7)',
                                padding: 2,
                                backgroundColor: '#0A1224',
                                overflow: 'hidden',
                                shadowColor: '#00FF87',
                                shadowRadius: 16,
                                shadowOpacity: 0.35,
                                elevation: 8
                            }}>
                                <SmartImage
                                    uri={player.photo || player.avatar || player.photo_url}
                                    style={{ width: '100%', height: '100%', borderRadius: 18 }}
                                    contentFit="cover"
                                    fallbackIcon="person"
                                />
                            </View>

                            {/* UNIQUE TILTED FOOTBALL CREST SHIRT NUMBER BADGE */}
                            <View style={{
                                position: 'absolute',
                                bottom: -4,
                                right: -4,
                                backgroundColor: '#00FF87',
                                borderWidth: 2,
                                borderColor: '#050A14',
                                paddingHorizontal: 9,
                                paddingVertical: 2.5,
                                borderRadius: 10,
                                transform: [{ rotate: '-8deg' }],
                                shadowColor: '#00FF87',
                                shadowRadius: 10,
                                shadowOpacity: 0.6,
                                elevation: 6
                            }}>
                                <Text style={{ color: '#050A14', fontWeight: '900', fontSize: 11, fontStyle: 'italic', letterSpacing: 0.5 }}>
                                    #{player.number || player.player_number || '0'}
                                </Text>
                            </View>
                        </View>

                        {/* SPACER FOR BALANCED CENTERING */}
                        <View style={{ width: 40, height: 40 }} />
                    </View>

                    {/* PLAYER DETAILS CENTERED BELOW */}
                    <View style={{ alignItems: 'center', marginBottom: 8 }}>

                        {/* PLAYER FULL NAME (FIRST NAME NEON GREEN, LAST NAME WHITE) */}
                        <Text style={{
                            fontWeight: '900',
                            fontSize: 22,
                            letterSpacing: 0.5,
                            textAlign: 'center',
                            textTransform: 'uppercase'
                        }}>
                            <Text style={{ color: '#00FF87' }}>{(player.firstName || player.first_name || '').toUpperCase()}</Text>{' '}
                            <Text style={{ color: '#FFFFFF' }}>{(player.lastName || player.last_name || '').toUpperCase()}</Text>
                        </Text>

                        {/* CENTERED BADGES ROW: TEAM LOGO + POSITION & RATING */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                            {/* POSITION BADGE WITH TEAM LOGO */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: 'rgba(255, 255, 255, 0.07)',
                                borderWidth: 1,
                                borderColor: 'rgba(255, 255, 255, 0.14)',
                                paddingHorizontal: 12,
                                paddingVertical: 5,
                                borderRadius: 20
                            }}>
                                {(player?.teams?.logo_url || player?.teams?.logo || player?.team_logo || player?.teamLogo) ? (
                                    <Image
                                        source={{ uri: player?.teams?.logo_url || player?.teams?.logo || player?.team_logo || player?.teamLogo }}
                                        style={{ width: 16, height: 16, borderRadius: 8 }}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <Ionicons name="shield-sharp" size={14} color="#00FF87" />
                                )}
                                <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: '800', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
                                    {getLocalizedPosition(player?.position, t)}
                                </Text>
                            </View>

                            {/* RATING BADGE (GOLD WITH TRENDING-UP ICON) */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                backgroundColor: 'rgba(255, 215, 0, 0.15)',
                                borderWidth: 1,
                                borderColor: 'rgba(255, 215, 0, 0.4)',
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                borderRadius: 20
                            }}>
                                <Ionicons name="trending-up" size={13} color="#FFD700" />
                                <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 }}>
                                    {player?.rating !== undefined && player?.rating !== null && player?.rating !== 0 ? player.rating : (stats?.rating || 0)}
                                </Text>
                            </View>
                        </View>

                        {/* INSTAGRAM LINK BADGE */}
                        {instagramUrl ? (
                            <TouchableOpacity
                                onPress={() => handleOpenInstagram(instagramUrl)}
                                disabled={openingInstagram}
                                activeOpacity={0.7}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    backgroundColor: 'rgba(225, 48, 108, 0.14)',
                                    borderColor: 'rgba(225, 48, 108, 0.4)',
                                    borderWidth: 1,
                                    paddingHorizontal: 12,
                                    height: 26,
                                    borderRadius: 13,
                                    marginTop: 10
                                }}
                            >
                                {openingInstagram ? (
                                    <ActivityIndicator size="small" color="#E1306C" style={{ transform: [{ scale: 0.65 }], width: 14, height: 14 }} />
                                ) : (
                                    <FontAwesome5 name="instagram" size={12} color="#E1306C" />
                                )}
                                <Text style={{ color: '#E1306C', fontSize: 11, fontWeight: '800', lineHeight: 14 }}>
                                    {openingInstagram ? t('common.loading') : `@${instagramUsername}`}
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>

                {/* Slider-Style Tab Switcher */}
                <View style={styles.switcherWrapper}>
                    <View style={styles.carouselContainer}>
                        <View style={styles.animatedCardWrapper}>
                            <Animated.View style={[styles.miniTabCard, { transform: [{ translateX: slideAnim }] }]}>
                                <View style={styles.miniTabInner}>
                                    <View style={styles.miniTabIconBox}>
                                        <Ionicons 
                                            name={
                                                activeTab === 'profil' ? 'person' : 
                                                activeTab === 'fifa_card' ? 'sparkles' :
                                                activeTab === 'karyerasi' ? 'trophy' : 'football'
                                            } 
                                            size={20} 
                                            color={Colors.primary} 
                                        />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.miniTabType}>{t('stats.section')}</Text>
                                        <Text style={styles.miniTabName}>{tabLabels[activeTab]}</Text>
                                    </View>
                                </View>
                            </Animated.View>
                        </View>
                    </View>

                    <TouchableOpacity onPress={nextTab} style={styles.navArrowBtnLarge}>
                        <Ionicons name="chevron-forward" size={32} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.mainContent} {...panResponder.panHandlers}>
                    <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
                        {activeTab === 'profil' && renderProfil()}
                        {activeTab === 'karyerasi' && renderKaryera()}
                        {activeTab === 'oyinlari' && renderMatches()}
                    </Animated.View>
                </View>
            </ScrollView>

            {/* ⚽ MINIMALIST ULTIMATE FOOTBALL PLAYER POSTER MODAL */}
            <Modal
                visible={showExportModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowExportModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={{ width: '90%', maxHeight: '85%', backgroundColor: '#050A14', borderRadius: 32, borderWidth: 1.5, borderColor: 'rgba(0, 255, 135, 0.3)', overflow: 'hidden', shadowColor: '#00FF87', shadowRadius: 30, shadowOpacity: 0.3, elevation: 20 }}>
                        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
                        
                        <ViewShot ref={posterShotRef} options={{ format: 'png', quality: 1.0 }} style={{ flex: 1, backgroundColor: '#050A14' }}>
                            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 28, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
                                {/* Minimalist Top Header with Original Logo */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.08)', paddingBottom: 16, marginBottom: 24 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Image
                                            source={require('../assets/logo.png')}
                                            style={{ width: 24, height: 24 }}
                                            resizeMode="contain"
                                        />
                                        <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 15, letterSpacing: 2 }}>AMATORA</Text>
                                    </View>
                                    <View style={{ backgroundColor: 'rgba(0, 255, 135, 0.12)', borderWidth: 1, borderColor: 'rgba(0, 255, 135, 0.3)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
                                        <Text style={{ color: '#00FF87', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>SEASON 2026</Text>
                                    </View>
                                </View>

                                {/* Minimalist Player Photo Crest & Rating */}
                                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                    <View style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#00FF87', padding: 4, backgroundColor: '#0A1224', shadowColor: '#00FF87', shadowRadius: 20, shadowOpacity: 0.4 }}>
                                        <Image
                                            source={{ uri: player?.photo || player?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80' }}
                                            style={{ width: '100%', height: '100%', borderRadius: 54 }}
                                            resizeMode="cover"
                                        />
                                    </View>
                                    
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFD700', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, marginTop: -14, shadowColor: '#FFD700', shadowRadius: 10, shadowOpacity: 0.6 }}>
                                        <Ionicons name="trending-up" size={14} color="#050A14" />
                                        <Text style={{ color: '#050A14', fontWeight: '900', fontSize: 13, letterSpacing: 1 }}>
                                            {player?.rating !== undefined && player?.rating !== null && player?.rating !== 0 ? player.rating : (stats?.rating || 0)} RATING
                                        </Text>
                                    </View>

                                    <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 22, marginTop: 14, letterSpacing: 0.5, textAlign: 'center' }}>
                                        {(player?.firstName || player?.first_name || 'FUTBOLCHI').toUpperCase()} {(player?.lastName || player?.last_name || '').toUpperCase()}
                                    </Text>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginTop: 8 }}>
                                        {(player?.teams?.logo_url || player?.teams?.logo || player?.team_logo || player?.teamLogo) ? (
                                            <Image
                                                source={{ uri: player?.teams?.logo_url || player?.teams?.logo || player?.team_logo || player?.teamLogo }}
                                                style={{ width: 16, height: 16, borderRadius: 8 }}
                                                resizeMode="contain"
                                            />
                                        ) : (
                                            <Ionicons name="shield-outline" size={14} color="#00FF87" />
                                        )}
                                        <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: '700', fontSize: 11, letterSpacing: 1 }}>
                                            {getLocalizedPosition(player?.position, t)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Minimalist Grid Stats */}
                                <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 10 }}>
                                    <View style={{ flex: 1, minWidth: '45%', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', padding: 16, borderRadius: 20 }}>
                                        <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>GOLLAR</Text>
                                        <Text style={{ color: '#00FF87', fontSize: 28, fontWeight: '900', marginTop: 4 }}>{stats.goals}</Text>
                                    </View>

                                    <View style={{ flex: 1, minWidth: '45%', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', padding: 16, borderRadius: 20 }}>
                                        <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>ASSISTLAR</Text>
                                        <Text style={{ color: '#3B82F6', fontSize: 28, fontWeight: '900', marginTop: 4 }}>{stats.assists}</Text>
                                    </View>

                                    <View style={{ flex: 1, minWidth: '45%', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', padding: 16, borderRadius: 20 }}>
                                        <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>O'YINLAR</Text>
                                        <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 4 }}>{stats.matchesPlayed}</Text>
                                    </View>

                                    <View style={{ flex: 1, minWidth: '45%', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', padding: 16, borderRadius: 20 }}>
                                        <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>SARIQ / QIZIL</Text>
                                        <Text style={{ color: '#FACC15', fontSize: 28, fontWeight: '900', marginTop: 4 }}>{stats.yellowCards} / {stats.redCards}</Text>
                                    </View>
                                </View>

                                <Text style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 10, fontWeight: '600', marginTop: 14, letterSpacing: 1 }}>
                                    AMATORA LEAGUE • OFFICIAL MATCHDAY CARD
                                </Text>
                            </ScrollView>
                        </ViewShot>

                        {/* Minimalist Action Buttons */}
                        <View style={{ flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)' }}>
                            <TouchableOpacity
                                onPress={() => setShowExportModal(false)}
                                style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.06)', paddingVertical: 15, borderRadius: 18, alignItems: 'center' }}
                            >
                                <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontWeight: '800', fontSize: 13 }}>YOPISH</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleSharePoster}
                                style={{ flex: 1.5, backgroundColor: '#00FF87', paddingVertical: 15, borderRadius: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                            >
                                <Ionicons name="share-social" size={18} color="#050A14" />
                                <Text style={{ color: '#050A14', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }}>STORY'GA ULASHISH</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <PlayerComparisonModal
                visible={showComparisonModal}
                onClose={() => setShowComparisonModal(false)}
                player1={player}
            />

            <PlayerCardZoomModal
                visible={showCardZoomModal}
                onClose={() => setShowCardZoomModal(false)}
                player={player}
            />
        </View>
    );
};

const StatBox = ({ label, value, icon, color }: any) => (
    <View style={styles.statBox}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
            {icon === 'shoe-prints' ? (
                <FontAwesome5 name="shoe-prints" size={16} color={color} />
            ) : (
                <Ionicons name={icon} size={20} color={color} />
            )}
        </View>
        <Text style={styles.statLabelSmall}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
    </View>
);

const InfoRow = ({ label, value, icon }: any) => (
    <View style={styles.infoRow}>
        <View style={styles.infoIconBox}>
            <Ionicons name={icon} size={16} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    </View>
);

const MatchCard = ({ match }: any) => (
    <View style={styles.matchCard}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.matchTop}>
            <Text style={styles.matchLeague}>{match.leagueName || 'Amatora Turniri'}</Text>
            <Text style={styles.matchDate}>{new Date(match.date || match.match_date || Date.now()).toLocaleDateString('uz-UZ')}</Text>
        </View>
        <View style={styles.matchTeams}>
            <View style={styles.teamInfo}>
                <SmartImage uri={match.homeTeam?.logo || match.homeTeamLogo} style={styles.matchTeamLogo} contentFit="contain" />
                <Text style={styles.matchTeamName} numberOfLines={1}>{match.homeTeam?.name || match.homeTeamName}</Text>
            </View>
            <View style={styles.matchScore}>
                <Text style={styles.scoreText}>{match.score?.home ?? match.home_score ?? 0}:{match.score?.away ?? match.away_score ?? 0}</Text>
            </View>
            <View style={styles.teamInfo}>
                <SmartImage uri={match.awayTeam?.logo || match.awayTeamLogo} style={styles.matchTeamLogo} contentFit="contain" />
                <Text style={styles.matchTeamName} numberOfLines={1}>{match.awayTeam?.name || match.awayTeamName}</Text>
            </View>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050811',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    heroSection: {
        paddingTop: Platform.OS === 'ios' ? 12 : (StatusBar.currentHeight ? StatusBar.currentHeight + 5 : 20),
        paddingHorizontal: 20,
        paddingBottom: 15,
    },
    brandHeaderWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 2,
        marginBottom: 8,
    },
    brandText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 2,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    navHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    backButtonBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        zIndex: 10,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
    },
    photoContainer: {
        position: 'relative',
    },
    mainPhotoWrapper: {
        width: 115,
        height: 115,
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    profilePhoto: {
        width: '100%',
        height: '100%',
    },
    numberOverlay: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: Colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 10,
        transform: [{ rotate: '12deg' }],
    },
    numberText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 13,
    },
    nameContainer: {
        flex: 1,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    statusBadge: {
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        borderColor: 'rgba(0, 255, 102, 0.2)',
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
    },
    statusText: {
        color: Colors.primary,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    ratingBadge: {
        backgroundColor: 'rgba(250, 204, 21, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
    },
    ratingText: {
        color: '#FACC15',
        fontSize: 11,
        fontWeight: '900',
    },
    firstName: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFF',
        lineHeight: 26,
    },
    lastName: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.primary,
        lineHeight: 26,
    },
    switcherWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginVertical: 10,
    },
    carouselContainer: {
        flex: 1,
    },
    animatedCardWrapper: {
        overflow: 'hidden',
    },
    miniTabCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 14,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    miniTabInner: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniTabIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    miniTabType: {
        fontSize: 9,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 1,
    },
    miniTabName: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    navArrowBtnLarge: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.2)',
    },
    mainContent: {
        paddingHorizontal: 20,
    },
    tabContent: {
        flex: 1,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 15,
    },
    statBox: {
        width: (width - 50) / 2,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 16,
        padding: 14,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    statIconContainer: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    statLabelSmall: {
        fontSize: 10,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    statValue: {
        fontSize: 22,
        fontWeight: '900',
        color: '#FFF',
        marginTop: 2,
        textAlign: 'center',
    },
    physicalInfoBox: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        marginBottom: 15,
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 14,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(0,255,102,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValueSmall: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFF',
    },
    infoSection: {
        marginTop: 5,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    sectionTitleHighlight: {
        color: Colors.primary,
    },
    infoList: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        padding: 12,
        gap: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoIconBox: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFF',
    },
    yearBlock: {
        marginBottom: 15,
    },
    yearHeaderBadge: {
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        marginBottom: 8,
    },
    yearHeaderText: {
        color: Colors.primary,
        fontWeight: '900',
        fontSize: 12,
    },
    teamCareerWrapper: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    teamCareerCurrent: {
        backgroundColor: 'rgba(0, 255, 102, 0.05)',
        borderColor: 'rgba(0, 255, 102, 0.35)',
        borderLeftWidth: 4,
        borderLeftColor: '#00FF66',
    },
    currentTeamBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 102, 0.15)',
        borderColor: 'rgba(0, 255, 102, 0.4)',
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 5,
    },
    currentTeamBadgeText: {
        color: '#00FF66',
        fontSize: 9.5,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    pulsingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00FF66',
    },
    transferredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 4,
    },
    transferredBadgeText: {
        color: '#94A3B8',
        fontSize: 9.5,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    careerDateSub: {
        color: '#94A3B8',
        fontSize: 11.5,
        fontWeight: '600',
        marginTop: 4,
    },
    careerTimelineContainer: {
        marginVertical: 10,
    },
    teamMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    teamIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    teamMiniLogo: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
    },
    teamNameCareer: {
        flex: 1,
        color: '#FFF',
        fontWeight: '800',
        fontSize: 12,
    },
    emptyCareer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyCareerText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
    },
    matchCard: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        padding: 12,
        marginBottom: 10,
    },
    matchTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    matchLeague: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.primary,
    },
    matchDate: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
    },
    matchTeams: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    teamInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    matchTeamLogo: {
        width: 20,
        height: 20,
    },
    matchTeamName: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },
    matchScore: {
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
        marginHorizontal: 10,
    },
    scoreText: {
        color: Colors.primary,
        fontWeight: '900',
        fontSize: 13,
    },
});

export default PlayerStatsScreen;

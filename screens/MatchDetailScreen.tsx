import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Dimensions,
    Animated,
    Linking,
    RefreshControl,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';
import MatchDetailSkeleton from '../components/MatchDetailSkeleton';
import VideoBackground from '../components/VideoBackground';
import YoutubePlayerCard from '../components/YoutubePlayerCard';
import TacticsBoard from '../components/TacticsBoard';
import ReplayVideoCard from '../components/ReplayVideoCard';
import { apiService, supabase } from '../services/apiService';
import { useSocket } from '../context/SocketContext';
import { formatShortTeamName } from '../utils/stringUtils';
import SmartImage from '../components/SmartImage';

const { width } = Dimensions.get('window');

export default function MatchDetailScreen({ route, navigation }: any) {
    const { matchData, matchId } = route?.params || {};
    const [activeTab, setActiveTab] = useState('lineups');
    const [loading, setLoading] = useState(true);
    const [match, setMatch] = useState<any>(matchData);
    const [homePlayers, setHomePlayers] = useState<any[]>([]);
    const [awayPlayers, setAwayPlayers] = useState<any[]>([]);
    const [playersLoading, setPlayersLoading] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const { socket, isConnected } = useSocket();
    
    // Animation refs
    const slideAnim = useRef(new Animated.Value(0)).current;

    const fetchMatch = async (isRefreshing = false) => {
        const id = matchId || matchData?._id;
        if (!id) {
            setLoading(false);
            return;
        }
        try {
            if (isRefreshing) setRefreshing(true);
            else setLoading(true);

            const data = await apiService.getMatchById(id);
            setMatch(data);
            
            const hId = data?.homeTeamId || data?.home_team_id;
            const aId = data?.awayTeamId || data?.away_team_id;

            if (hId) setSelectedTeamId(hId);

            if (hId && aId) {
                setPlayersLoading(true);
                const [homeData, awayData] = await Promise.all([
                    apiService.getPlayers(1, 100, hId),
                    apiService.getPlayers(1, 100, aId)
                ]);
                setHomePlayers(homeData || []);
                setAwayPlayers(awayData || []);
            }
        } catch (error) {
            console.error('Error fetching match detail:', error);
        } finally {
            setLoading(false);
            setPlayersLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMatch();
    }, [matchId, matchData?._id]);

    useEffect(() => {
        const currentId = matchId || matchData?._id;
        if (!currentId) return;

        const eventsChannel = supabase
            .channel(`realtime_events_${currentId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events', filter: `match_id=eq.${currentId}` }, () => {
                fetchMatch(true);
            })
            .subscribe();

        if (socket && isConnected) {
            socket.on('match-update', (data: any) => {
                if (data.matchId === currentId) {
                    setMatch(data.match);
                    fetchMatch(true);
                }
            });
        }

        return () => {
            supabase.removeChannel(eventsChannel);
            if (socket) socket.off('match-update');
        };
    }, [socket, isConnected, matchId, matchData?._id]);

    const onRefresh = () => {
        fetchMatch(true);
    };

    const switchTeam = () => {
        const isHome = selectedTeamId === match?.homeTeamId;
        const nextId = isHome ? match?.awayTeamId : match?.homeTeamId;
        const slideOutValue = -50;

        Animated.timing(slideAnim, {
            toValue: slideOutValue,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setSelectedTeamId(nextId);
            slideAnim.setValue(50);
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        });
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Vaqt belgilanmagan';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return match?.date_str || 'Bo\'lajak o\'yin';
        const months = [
            'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 
            'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
        ];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();

        let timeStr = String(match?.match_time || match?.time || '').trim();
        if (timeStr && timeStr.includes(':')) {
            const parts = timeStr.split(':');
            timeStr = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        } else {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            timeStr = `${hours}:${minutes}`;
        }
        
        return `${day}-${month}, ${year} • ${timeStr}`;
    };

    const renderHeader = () => {
        return (
            <View style={styles.headerContainer}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{(match?.tournamentName || 'TURNIR').toUpperCase()}</Text>
                    {match?.round ? (
                        <View style={styles.tourBadge}>
                            <Text style={styles.tourBadgeText}>{match.round.toString().includes('TUR') ? match.round : `${match.round}-TUR`}</Text>
                        </View>
                    ) : <View style={{ width: 28 }} />}
                </View>

                <View style={styles.matchScoreCard}>
                    <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.dateText}>
                            {formatDate(match?.date).toUpperCase()}
                        </Text>
                    </View>

                    <View style={styles.teamsScoreRow}>
                        <TouchableOpacity 
                            style={styles.teamBlockRight}
                            activeOpacity={0.7}
                            onPress={() => {
                                const hId = match?.homeTeamId || match?.home_team_id || match?.homeTeam?.id || match?.homeTeam?._id;
                                if (hId) {
                                    navigation.navigate('TeamProfile', { teamId: hId });
                                }
                            }}
                        >
                            <Text style={styles.teamNameText} numberOfLines={1}>
                                {(formatShortTeamName(match?.homeTeamName || match?.homeTeam?.name || 'JAMOA A', 12) || 'JAMOA A').toUpperCase()}
                            </Text>
                            <View style={styles.logoCircle}>
                                <SmartImage
                                    uri={match?.homeTeamLogo || match?.homeTeam?.logo || match?.home_team_logo || match?.home_team?.logo_url}
                                    style={{ width: 34, height: 34, borderRadius: 17 }}
                                    contentFit="contain"
                                    fallbackIcon="shield"
                                    fallbackIconSize={20}
                                />
                            </View>
                        </TouchableOpacity>

                        <Text style={styles.scoreTextMain}>
                            {match?.score?.home ?? match?.home_score ?? match?.homeScore ?? 0}:{match?.score?.away ?? match?.away_score ?? match?.awayScore ?? 0}
                        </Text>

                        <TouchableOpacity 
                            style={styles.teamBlockLeft}
                            activeOpacity={0.7}
                            onPress={() => {
                                const aId = match?.awayTeamId || match?.away_team_id || match?.awayTeam?.id || match?.awayTeam?._id;
                                if (aId) {
                                    navigation.navigate('TeamProfile', { teamId: aId });
                                }
                            }}
                        >
                            <View style={styles.logoCircle}>
                                <SmartImage
                                    uri={match?.awayTeamLogo || match?.awayTeam?.logo || match?.away_team_logo || match?.away_team?.logo_url}
                                    style={{ width: 34, height: 34, borderRadius: 17 }}
                                    contentFit="contain"
                                    fallbackIcon="shield"
                                    fallbackIconSize={20}
                                />
                            </View>
                            <Text style={styles.teamNameText} numberOfLines={1}>
                                {(formatShortTeamName(match?.awayTeamName || match?.awayTeam?.name || 'JAMOA B', 12) || 'JAMOA B').toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.locationText}>{(match?.venue || 'Amatora Arena').toUpperCase()}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderTabs = () => (
        <View style={styles.tabsContainer}>
            <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['lineups', 'overview', 'preview', 'media', 'staff'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab === 'lineups' ? "TARKIB" :
                                tab === 'overview' ? 'OBZOR' :
                                    tab === 'preview' ? 'PREVYU' :
                                        tab === 'media' ? 'MEDIA' : 'XODIMLAR'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const renderTimelineEvent = (event: any, index: number, isLast: boolean) => {
        const eType = String(event.type || event.event_type || '').toLowerCase();
        const isYellow = eType.includes('yellow');
        const isRed = eType.includes('red');
        const isCard = isYellow || isRed;
        const isGoal = eType.includes('goal');
        const isAssist = eType.includes('assist');

        let title = 'VOQEA';
        let cardColor = '#FFF';

        if (isGoal) {
            title = 'GOL!';
        } else if (isYellow) {
            title = 'SARIQ KARTOCHKA';
            cardColor = '#FACC15';
        } else if (isRed) {
            title = 'QIZIL KARTOCHKA';
            cardColor = '#EF4444';
        } else if (isAssist) {
            title = 'ASSIST';
        }

        return (
            <View key={index} style={styles.timelineRow}>
                <View style={styles.timelineLeftColumn}>
                    {isCard ? (
                        <View style={[styles.cardIcon, { backgroundColor: cardColor, width: 14, height: 20, borderRadius: 3, marginVertical: 4 }]} />
                    ) : (
                        <Ionicons name={isGoal ? 'football' : 'shirt-outline'} size={22} color={isGoal ? '#00FF66' : Colors.primary} style={styles.timelineIcon} />
                    )}
                    <Text style={styles.timelineTimeText}>{event.time || event.minute || 0}'</Text>
                    {!isLast && <View style={styles.timelineLine} />}
                </View>

                <View style={styles.timelineEventCard}>
                    <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.eventContentWrapper}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.eventTitle, isYellow && { color: '#FACC15' }, isRed && { color: '#EF4444' }]}>{title}</Text>
                            <Text style={styles.eventDesc}>{(event.playerName || event.player_name || 'FUTBOLCHI').toUpperCase()}</Text>
                        </View>
                        <View style={styles.eventLogo}>
                            <Text style={styles.eventLogoText}>{event.isHomeTeam ? 'UY' : 'MH'}</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderOverview = () => {
        if (match?.status === 'scheduled') {
            return (
                <View style={styles.notStartedContainer}>
                    <Text style={styles.notStartedText}>O'YIN HALI BOSHLANMAGAN</Text>
                </View>
            );
        }

        const events = match?.events || [];

        return (
            <ScrollView 
                style={styles.tabContent} 
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
            >
                {events.length > 0 ? (
                    events.map((ev: any, idx: number) => renderTimelineEvent(ev, idx, idx === events.length - 1))
                ) : (
                    <View style={styles.notStartedContainer}>
                        <Text style={styles.notStartedText}>HOZIRCHA VOQEALAR YO'Q</Text>
                    </View>
                )}
            </ScrollView>
        );
    };

    const renderPreview = () => {
        const homeName = match?.homeTeamName || match?.homeTeam?.name || 'UY JAMOA';
        const awayName = match?.awayTeamName || match?.awayTeam?.name || 'MEHMON';
        const homeLogo = match?.homeTeamLogo || match?.homeTeam?.logo;
        const awayLogo = match?.awayTeamLogo || match?.awayTeam?.logo;
        const leagueName = match?.tournamentName || match?.league || "HFL Liga";
        const venueName = match?.venue || match?.location || 'Amatora Arena';

        const homeForm = match?.homeForm || ['W', 'W', 'D', 'L', 'W'];
        const awayForm = match?.awayForm || ['W', 'D', 'W', 'W', 'L'];

        const homeKeyPlayer = homePlayers[0];
        const awayKeyPlayer = awayPlayers[0];

        return (
            <ScrollView 
                style={styles.tabContent} 
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
            >
                {/* 1. Pre-Match Overview Header */}
                <View style={styles.previewSectionCard}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <Ionicons name="information-circle-outline" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                            <Text style={styles.previewSectionTitle}>UCHRASHUV HAQIDA</Text>
                        </View>
                        <View style={styles.previewInfoRow}>
                            <Text style={styles.previewInfoLabel}>Turnir / Liga:</Text>
                            <Text style={styles.previewInfoVal}>{leagueName}</Text>
                        </View>
                        <View style={styles.previewInfoRow}>
                            <Text style={styles.previewInfoLabel}>Bosqich / Tur:</Text>
                            <Text style={styles.previewInfoVal}>{match?.round ? `${match.round}-TUR` : 'Guruh Bosqichi'}</Text>
                        </View>
                        <View style={styles.previewInfoRow}>
                            <Text style={styles.previewInfoLabel}>Sana va Vaqt:</Text>
                            <Text style={styles.previewInfoVal}>{formatDate(match?.date)}</Text>
                        </View>
                        <View style={styles.previewInfoRow}>
                            <Text style={styles.previewInfoLabel}>Maydon (Stadion):</Text>
                            <Text style={styles.previewInfoVal}>{venueName}</Text>
                        </View>
                    </View>
                </View>

                {/* 2. Team Form Guide */}
                <View style={styles.previewSectionCard}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Ionicons name="analytics-outline" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                            <Text style={styles.previewSectionTitle}>SO'NGGI O'YINLAR FORMASI</Text>
                        </View>

                        {/* Home Team Form */}
                        <View style={{ marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                {homeLogo && <Image source={{ uri: homeLogo }} style={{ width: 20, height: 20, marginRight: 8, resizeMode: 'contain' }} />}
                                <Text style={styles.teamFormTitle} numberOfLines={1}>{homeName.toUpperCase()}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                {homeForm.map((res: string, idx: number) => (
                                    <View 
                                        key={idx} 
                                        style={[
                                            styles.formBadge, 
                                            res === 'W' && styles.formBadgeWin,
                                            res === 'D' && styles.formBadgeDraw,
                                            res === 'L' && styles.formBadgeLoss
                                        ]}
                                    >
                                        <Text style={styles.formBadgeText}>{res}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Away Team Form */}
                        <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                {awayLogo && <Image source={{ uri: awayLogo }} style={{ width: 20, height: 20, marginRight: 8, resizeMode: 'contain' }} />}
                                <Text style={styles.teamFormTitle} numberOfLines={1}>{awayName.toUpperCase()}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                {awayForm.map((res: string, idx: number) => (
                                    <View 
                                        key={idx} 
                                        style={[
                                            styles.formBadge, 
                                            res === 'W' && styles.formBadgeWin,
                                            res === 'D' && styles.formBadgeDraw,
                                            res === 'L' && styles.formBadgeLoss
                                        ]}
                                    >
                                        <Text style={styles.formBadgeText}>{res}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>

                {/* 3. Key Players Spotlight */}
                {(homeKeyPlayer || awayKeyPlayer) && (
                    <View style={styles.previewSectionCard}>
                        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={{ padding: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                <Ionicons name="star-outline" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                                <Text style={styles.previewSectionTitle}>ETAKCHI O'YINCHILAR</Text>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                                {homeKeyPlayer && (
                                    <TouchableOpacity 
                                        style={styles.keyPlayerBox}
                                        onPress={() => navigation.navigate('PlayerStats', { player: homeKeyPlayer, playerId: homeKeyPlayer._id || homeKeyPlayer.id })}
                                    >
                                        <Image 
                                            source={{ uri: homeKeyPlayer.photo || homeKeyPlayer.photo_url || homeKeyPlayer.avatar || 'https://via.placeholder.com/60' }} 
                                            style={styles.keyPlayerAvatar} 
                                        />
                                        <Text style={styles.keyPlayerName} numberOfLines={1}>{`${homeKeyPlayer.firstName || homeKeyPlayer.first_name || ''} ${homeKeyPlayer.lastName || homeKeyPlayer.last_name || ''}`.trim()}</Text>
                                        <Text style={styles.keyPlayerRole}>{homeName}</Text>
                                    </TouchableOpacity>
                                )}

                                {awayKeyPlayer && (
                                    <TouchableOpacity 
                                        style={styles.keyPlayerBox}
                                        onPress={() => navigation.navigate('PlayerStats', { player: awayKeyPlayer, playerId: awayKeyPlayer._id || awayKeyPlayer.id })}
                                    >
                                        <Image 
                                            source={{ uri: awayKeyPlayer.photo || awayKeyPlayer.photo_url || awayKeyPlayer.avatar || 'https://via.placeholder.com/60' }} 
                                            style={styles.keyPlayerAvatar} 
                                        />
                                        <Text style={styles.keyPlayerName} numberOfLines={1}>{`${awayKeyPlayer.firstName || awayKeyPlayer.first_name || ''} ${awayKeyPlayer.lastName || awayKeyPlayer.last_name || ''}`.trim()}</Text>
                                        <Text style={styles.keyPlayerRole}>{awayName}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
        );
    };

    const renderLineups = () => {
        const isHome = selectedTeamId === match?.homeTeamId;
        const currentPlayers = isHome ? homePlayers : awayPlayers;
        const currentTeamName = isHome ? (match?.homeTeamName || 'UY JAMOA') : (match?.awayTeamName || 'MEHMON');
        const currentLogo = isHome ? (match?.homeTeamLogo || match?.homeTeam?.logo) : (match?.awayTeamLogo || match?.awayTeam?.logo);

        const targetTeamObject = isHome ? match?.homeTeam : match?.awayTeam;
        const rawFormationPlayers = targetTeamObject?.formation?.players || targetTeamObject?.players || [];

        let tacticsPlayers: any[] = [];

        if (rawFormationPlayers && rawFormationPlayers.length > 0) {
            tacticsPlayers = rawFormationPlayers.map((p: any) => {
                const playerId = p.id || p._id;
                const playerGoals = (match?.events || []).filter((e: any) => e.playerId === playerId && e.type === 'goal').length;
                const fullPlayer = currentPlayers.find((cp: any) => String(cp._id || cp.id) === String(playerId));
                return {
                    ...p,
                    id: playerId,
                    name: p.name || `${fullPlayer?.firstName || ''} ${fullPlayer?.lastName || ''}`.trim() || 'O\'yinchi',
                    number: p.number || fullPlayer?.number || fullPlayer?.player_number || '-',
                    goals: playerGoals,
                    x: p.x || 50,
                    y: p.y || 50
                };
            });
        } else if (currentPlayers && currentPlayers.length > 0) {
            const defaultCoords = [
                { x: 50, y: 88 },
                { x: 20, y: 70 }, { x: 40, y: 72 }, { x: 60, y: 72 }, { x: 80, y: 70 },
                { x: 30, y: 45 }, { x: 50, y: 45 }, { x: 70, y: 45 },
                { x: 25, y: 20 }, { x: 50, y: 18 }, { x: 75, y: 20 }
            ];
            tacticsPlayers = currentPlayers.slice(0, 11).map((p: any, idx: number) => ({
                id: p._id || p.id,
                name: p.firstName || p.first_name || p.name || 'O\'yinchi',
                number: p.number || p.player_number || p.shirt_number || '-',
                goals: (match?.events || []).filter((e: any) => e.playerId === (p._id || p.id) && e.type === 'goal').length,
                x: defaultCoords[idx % defaultCoords.length].x,
                y: defaultCoords[idx % defaultCoords.length].y
            }));
        }

        const renderPlayerItem = (player: any) => {
            const pId = String(player._id || player.id || '');
            const pNameClean = `${player.firstName || player.first_name || ''} ${player.lastName || player.last_name || ''}`.trim().toLowerCase();

            const formPlayer = tacticsPlayers.find((tp: any) => String(tp.id) === pId);
            const displayNum = formPlayer?.number || player.number || player.player_number || player.shirt_number || '-';

            const events = match?.events || [];
            const playerEvents = events.filter((e: any) => {
                const evPlayerId = String(e.playerId || e.player_id || e.player?.id || e.player?._id || '');
                if (evPlayerId && pId && evPlayerId === pId) return true;
                const evName = String(e.playerName || e.player_name || '').trim().toLowerCase();
                if (evName && pNameClean && (evName.includes(pNameClean) || pNameClean.includes(evName))) return true;
                return false;
            });

            const goalsCount = playerEvents.filter((e: any) => {
                const t = String(e.type || e.rawType || e.event_type || '').toLowerCase();
                return t.includes('goal');
            }).length;

            const assistsCount = playerEvents.filter((e: any) => {
                const t = String(e.type || e.rawType || e.event_type || '').toLowerCase();
                return t.includes('assist');
            }).length;

            const yellowCount = playerEvents.filter((e: any) => {
                const t = String(e.type || e.rawType || e.event_type || '').toLowerCase();
                return t.includes('yellow');
            }).length;

            const redCount = playerEvents.filter((e: any) => {
                const t = String(e.type || e.rawType || e.event_type || '').toLowerCase();
                return t.includes('red');
            }).length;

            const photoUri = player.photo || player.photo_url || player.avatar;

            return (
                <TouchableOpacity 
                    key={player._id || player.id} 
                    style={styles.playerCardCompact}
                    onPress={() => navigation.navigate('PlayerStats', { player: player, playerId: player._id || player.id })}
                >
                    <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, width: '100%' }}>
                        <View style={styles.playerAvatarSmall}>
                            {photoUri ? (
                                <Image source={{ uri: photoUri }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                            ) : (
                                <View style={styles.playerInitials}>
                                    <Text style={styles.initialsText}>{(player.firstName || player.first_name || 'F').charAt(0)}</Text>
                                </View>
                            )}
                        </View>
                        
                        <View style={styles.playerInfoCompact}>
                            <Text style={styles.playerNameCompact} numberOfLines={1}>
                                {`${player.firstName || player.first_name || ''} ${player.lastName || player.last_name || ''}`.trim().toUpperCase()}
                            </Text>
                            <Text style={styles.playerNumberCompact}>#{displayNum} • {(player.positionUz || player.position || 'O\'YINCHI').toUpperCase()}</Text>
                        </View>

                        {/* Match Event Badges */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 6 }}>
                            {goalsCount > 0 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,255,102,0.12)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,255,102,0.3)' }}>
                                    <Ionicons name="football" size={14} color="#00FF66" />
                                    <Text style={{ color: '#00FF66', fontSize: 12, fontWeight: '700', marginLeft: 3 }}>x{goalsCount}</Text>
                                </View>
                            )}
                            {assistsCount > 0 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59,130,246,0.12)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' }}>
                                    <Ionicons name="footsteps" size={13} color="#3B82F6" />
                                    <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '700', marginLeft: 3 }}>x{assistsCount}</Text>
                                </View>
                            )}
                            {yellowCount > 0 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(250,204,21,0.12)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(250,204,21,0.4)' }}>
                                    <View style={{ width: 10, height: 14, backgroundColor: '#FACC15', borderRadius: 2, marginRight: 3 }} />
                                    {yellowCount > 1 && <Text style={{ color: '#FACC15', fontSize: 12, fontWeight: '700' }}>x{yellowCount}</Text>}
                                </View>
                            )}
                            {redCount > 0 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.12)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)' }}>
                                    <View style={{ width: 10, height: 14, backgroundColor: '#EF4444', borderRadius: 2, marginRight: 3 }} />
                                    {redCount > 1 && <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>x{redCount}</Text>}
                                </View>
                            )}
                        </View>

                        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
                    </View>
                </TouchableOpacity>
            );
        };

        return (
            <ScrollView 
                style={styles.tabContent} 
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
            >
                <View style={styles.carouselContainer}>
                    <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.animatedCardWrapper}>
                        <Animated.View style={[
                            styles.teamCarouselCard,
                            { transform: [{ translateX: slideAnim }] }
                        ]}>
                            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                            <View style={styles.compactTeamInfo}>
                                <View style={styles.miniLogoBox}>
                                    {currentLogo ? (
                                        <Image source={{ uri: currentLogo }} style={{ width: 32, height: 32 }} />
                                    ) : (
                                        <Ionicons name="shield" size={20} color={Colors.primary} />
                                    )}
                                </View>
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.miniTeamType}>TANLANGAN JAMOA</Text>
                                    <Text style={styles.miniTeamName} numberOfLines={1}>{currentTeamName.toUpperCase()}</Text>
                                </View>
                            </View>
                        </Animated.View>
                    </View>

                    <TouchableOpacity onPress={switchTeam} style={styles.navArrowBtnOneSide}>
                        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                        <Ionicons name="swap-horizontal" size={22} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                {playersLoading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <View style={styles.lineupListWrapper}>
                        {tacticsPlayers.length > 0 && (
                            <View style={{ marginBottom: 20 }}>
                                <TacticsBoard 
                                    players={tacticsPlayers}
                                    teamColor={isHome ? '#3B82F6' : '#EF4444'} 
                                />
                            </View>
                        )}

                        <View style={styles.listHeader}>
                            <Ionicons name="shirt-outline" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
                            <Text style={styles.listTitle}>{currentTeamName.toUpperCase()} TARKIBI ({currentPlayers.length})</Text>
                        </View>

                        {currentPlayers.length > 0 ? (
                            currentPlayers.map(renderPlayerItem)
                        ) : (
                            <View style={styles.emptyPlayersBox}>
                                <Ionicons name="people-outline" size={40} color="rgba(255,255,255,0.1)" />
                                <Text style={styles.emptyPlayersText}>O'YINCHILAR RO'YXATI MAVJUD EMAS</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        );
    };

    const renderMedia = () => {
        const videoUrl = match?.youtube_link || match?.youtubeLink || match?.youtube_url || match?.youtubeUrl || match?.video_url || match?.videoUrl || match?.video || match?.stream_link || match?.streamUrl;
        
        // Filter events that have replay videos and sort by minute DESC (latest goal first)
        const replayEvents = (match?.events || [])
            .filter((e: any) => e.replay_video_url || e.video_url || e.replay_url)
            .sort((a: any, b: any) => (Number(b.minute) || 0) - (Number(a.minute) || 0));

        return (
            <ScrollView 
                style={styles.tabContent} 
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
            >
                {/* 1. YouTube Online Stream */}
                {videoUrl && (
                    <View style={{ width: '100%', alignItems: 'center', marginBottom: 20 }}>
                        <YoutubePlayerCard videoUrl={videoUrl} />
                        <TouchableOpacity
                            style={styles.openYtLinkBtn}
                            activeOpacity={0.8}
                            onPress={() => Linking.openURL(videoUrl).catch(() => {})}
                        >
                            <Ionicons name="logo-youtube" size={20} color="#FF0000" style={{ marginRight: 8 }} />
                            <Text style={styles.openYtLinkText}>YouTube'da tomosha qilish</Text>
                            <Ionicons name="open-outline" size={16} color="rgba(255,255,255,0.6)" style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* 2. 20s Goal & Replay Clips Feed */}
                <View style={{ marginTop: 10, width: '100%' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                        <Ionicons name="videocam-outline" size={22} color={Colors.primary || '#7c3aed'} />
                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>O'YIN XITLARI & GOL QAYTARIQLARI</Text>
                    </View>

                    {replayEvents.length > 0 ? (
                        replayEvents.map((ev: any, idx: number) => {
                            const isHome = ev.team_id ? (ev.team_id === (match?.homeTeamId || match?.home_team_id)) : ev.isHomeTeam;
                            const currentTeamName = ev.team_name || (isHome ? (match?.homeTeamName || match?.home_team?.name) : (match?.awayTeamName || match?.away_team?.name));
                            const currentTeamLogo = isHome ? (match?.homeTeamLogo || match?.home_team?.logo_url) : (match?.awayTeamLogo || match?.away_team?.logo_url);
                            const scorer = ev.player_name || (ev.player ? `${ev.player.first_name || ''} ${ev.player.last_name || ''}`.trim() : null);
                            const scorerPhoto = ev.player?.photo_url || ev.player?.avatar || ev.player_photo || null;
                            const assistant = ev.assist_player_name || (ev.assistant ? `${ev.assistant.first_name || ''} ${ev.assistant.last_name || ''}`.trim() : null);
                            const assistantPhoto = ev.assistant?.photo_url || ev.assistant?.avatar || ev.assistant_photo || null;

                            return (
                                <ReplayVideoCard
                                    key={ev.id || idx}
                                    videoUrl={ev.replay_video_url || ev.video_url || ev.replay_url}
                                    minute={ev.minute}
                                    teamName={currentTeamName}
                                    teamLogo={currentTeamLogo}
                                    scorerName={scorer}
                                    scorerPhoto={scorerPhoto}
                                    assistantName={assistant}
                                    assistantPhoto={assistantPhoto}
                                    eventType={ev.event_type || ev.type || 'goal'}
                                />
                            );
                        })
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <Ionicons name="film-outline" size={42} color="rgba(255,255,255,0.15)" />
                            <Text style={styles.placeholderText}>O'YIN DAVOMIDA GOL QAYTARIQLARI SHU YERDA CHIQADI</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        );
    };

    const renderStaff = () => {
        const refereeName = match?.referee || match?.referee_name || match?.main_referee || "Rasmiy Hakam (HFL)";
        const assistant1 = match?.assistant_referee_1 || match?.linesman_1 || "Yo'l-yo'riq Hakami 1";
        const assistant2 = match?.assistant_referee_2 || match?.linesman_2 || "Yo'l-yo'riq Hakami 2";
        const commissioner = match?.commissioner || match?.inspector || "HFL Maydon Inspektori";

        const homeCaptain = match?.homeTeam?.captain_name || match?.home_team_captain || (homePlayers[0] ? `${homePlayers[0].firstName || homePlayers[0].first_name || ''} ${homePlayers[0].lastName || homePlayers[0].last_name || ''}`.trim() : "Menejer / Sardor");
        const awayCaptain = match?.awayTeam?.captain_name || match?.away_team_captain || (awayPlayers[0] ? `${awayPlayers[0].firstName || awayPlayers[0].first_name || ''} ${awayPlayers[0].lastName || awayPlayers[0].last_name || ''}`.trim() : "Menejer / Sardor");

        return (
            <ScrollView 
                style={styles.tabContent} 
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
            >
                {/* 1. Hakamlar Brigadasi */}
                <View style={styles.staffSectionCard}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Ionicons name="ribbon-outline" size={22} color={Colors.primary} style={{ marginRight: 8 }} />
                            <Text style={styles.staffSectionTitle}>HAKAMLAR BRIGADASI</Text>
                        </View>

                        {/* Main Referee */}
                        <View style={styles.staffItemRow}>
                            <View style={[styles.staffIconCircle, { backgroundColor: 'rgba(250, 204, 21, 0.15)' }]}>
                                <Ionicons name="shirt-outline" size={20} color="#FACC15" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.staffItemRole}>BOSH HAKAM</Text>
                                <Text style={styles.staffItemName}>{refereeName.toUpperCase()}</Text>
                            </View>
                        </View>

                        {/* Assistant 1 */}
                        <View style={styles.staffItemRow}>
                            <View style={styles.staffIconCircle}>
                                <Ionicons name="flag-outline" size={18} color={Colors.primary} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.staffItemRole}>QANOT HAKAMI 1</Text>
                                <Text style={styles.staffItemName}>{assistant1.toUpperCase()}</Text>
                            </View>
                        </View>

                        {/* Assistant 2 */}
                        <View style={[styles.staffItemRow, { borderBottomWidth: 0 }]}>
                            <View style={styles.staffIconCircle}>
                                <Ionicons name="flag-outline" size={18} color={Colors.primary} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.staffItemRole}>QANOT HAKAMI 2</Text>
                                <Text style={styles.staffItemName}>{assistant2.toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 2. Jamoa Shtabi va Menejerlar */}
                <View style={styles.staffSectionCard}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Ionicons name="people-outline" size={22} color={Colors.primary} style={{ marginRight: 8 }} />
                            <Text style={styles.staffSectionTitle}>JAMOA MENEJERLARI VA SARDORLARI</Text>
                        </View>

                        {/* Home Manager */}
                        <View style={styles.staffItemRow}>
                            <View style={styles.staffIconCircle}>
                                <Ionicons name="briefcase-outline" size={18} color="#3B82F6" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.staffItemRole}>{(match?.homeTeamName || 'UY JAMOA').toUpperCase()} SARDORI</Text>
                                <Text style={styles.staffItemName}>{homeCaptain.toUpperCase()}</Text>
                            </View>
                        </View>

                        {/* Away Manager */}
                        <View style={[styles.staffItemRow, { borderBottomWidth: 0 }]}>
                            <View style={styles.staffIconCircle}>
                                <Ionicons name="briefcase-outline" size={18} color="#EF4444" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.staffItemRole}>{(match?.awayTeamName || 'MEHMON JAMOA').toUpperCase()} SARDORI</Text>
                                <Text style={styles.staffItemName}>{awayCaptain.toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 3. Maydon Komissari */}
                <View style={styles.staffSectionCard}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Ionicons name="shield-checkmark-outline" size={22} color={Colors.primary} style={{ marginRight: 8 }} />
                            <Text style={styles.staffSectionTitle}>MAYDON INSPEKTORI</Text>
                        </View>

                        <View style={[styles.staffItemRow, { borderBottomWidth: 0 }]}>
                            <View style={styles.staffIconCircle}>
                                <Ionicons name="person-circle-outline" size={20} color={Colors.primary} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.staffItemRole}>HFL KOMISSARI</Text>
                                <Text style={styles.staffItemName}>{commissioner.toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        );
    };

    if (loading && !match) {
        return <MatchDetailSkeleton />;
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                posterSource={require('../assets/images/splash-icon.png')}
                overlayOpacity={0.85}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.container} edges={['top']}>
                {renderHeader()}
                {renderTabs()}

                {activeTab === 'overview' ? renderOverview() :
                    activeTab === 'preview' ? renderPreview() :
                        activeTab === 'lineups' ? renderLineups() :
                            activeTab === 'media' ? renderMedia() :
                                activeTab === 'staff' ? renderStaff() : null}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    headerContainer: { overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 20 },
    topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, marginBottom: 20 },
    backBtn: { padding: 4 },
    headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
    tourBadge: { backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    tourBadgeText: { color: '#000', fontSize: 11, fontWeight: '900' },
    matchScoreCard: { alignItems: 'center', paddingHorizontal: 20 },
    dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    dateText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 6, fontWeight: '700' },
    teamsScoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 15 },
    teamBlockRight: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
    teamBlockLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-start' },
    teamNameText: { color: '#FFF', fontSize: 16, fontWeight: '900', marginHorizontal: 10 },
    logoCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    scoreTextMain: { color: '#FFF', fontSize: 32, fontWeight: '900', marginHorizontal: 20, letterSpacing: 2 },
    locationRow: { flexDirection: 'row', alignItems: 'center' },
    locationText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 6, fontWeight: '700' },
    tabsContainer: { height: 50, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    tab: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: Colors.primary },
    tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800' },
    activeTabText: { color: '#FFF' },
    tabContent: { flex: 1 },
    carouselContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, height: 80, overflow: 'hidden' },
    navArrowBtnOneSide: { width: 48, height: 50, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginLeft: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    animatedCardWrapper: { flex: 1, overflow: 'hidden' },
    teamCarouselCard: { height: 50, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,255,102,0.2)' },
    compactTeamInfo: { flexDirection: 'row', alignItems: 'center', width: '100%', padding: 8 },
    miniLogoBox: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    miniTeamType: { color: Colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
    miniTeamName: { color: '#FFF', fontSize: 14, fontWeight: '900' },
    lineupListWrapper: { padding: 16 },
    listHeader: { marginBottom: 16 },
    listTitle: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    playerCardCompact: { borderRadius: 12, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    playerAvatarSmall: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 12, overflow: 'hidden' },
    playerInitials: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    initialsText: { color: 'rgba(255,255,255,0.4)', fontSize: 18, fontWeight: 'bold' },
    playerInfoCompact: { flex: 1 },
    playerNameCompact: { color: '#FFF', fontSize: 14, fontWeight: '900' },
    playerNumberCompact: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2, fontWeight: '700' },
    emptyPlayersBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    emptyPlayersText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '900', marginTop: 10 },
    timelineRow: { flexDirection: 'row', marginBottom: 20 },
    timelineLeftColumn: { width: 45, alignItems: 'center', position: 'relative' },
    timelineIcon: { zIndex: 2 },
    cardIcon: { width: 14, height: 20, borderRadius: 2, zIndex: 2 },
    timelineTimeText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 6, fontWeight: '900', zIndex: 2 },
    timelineLine: { position: 'absolute', top: 25, bottom: -30, width: 1, backgroundColor: 'rgba(255,255,255,0.1)', zIndex: 1 },
    timelineEventCard: { borderRadius: 12, padding: 1, marginLeft: 8, flex: 1, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    eventContentWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
    eventTitle: { fontWeight: '900', color: Colors.primary, fontSize: 12, marginBottom: 4 },
    eventDesc: { color: '#FFF', fontSize: 13, fontWeight: '800' },
    eventLogo: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
    eventLogoText: { color: 'rgba(255,255,255,0.5)', fontWeight: '900', fontSize: 10 },
    notStartedContainer: { alignItems: 'center', marginTop: 60 },
    notStartedText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '900' },
    placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
    placeholderText: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontWeight: '900', fontSize: 12 },
    staffMemberCard: { borderRadius: 16, overflow: 'hidden', width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    staffIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(0,255,102,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    staffLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900' },
    staffValue: { color: '#FFF', fontSize: 15, fontWeight: '900', marginTop: 2 },
    openYtLinkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 0, 0, 0.3)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        width: '100%',
        marginTop: 10,
    },
    openYtLinkText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 13,
    },

    // Preview Styles
    previewSectionCard: {
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    previewSectionTitle: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    previewInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    previewInfoLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        fontWeight: '600',
    },
    previewInfoVal: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
    },
    teamFormTitle: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
    },
    formBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    formBadgeWin: {
        backgroundColor: 'rgba(34, 197, 94, 0.25)',
        borderWidth: 1,
        borderColor: '#22C55E',
    },
    formBadgeDraw: {
        backgroundColor: 'rgba(234, 179, 8, 0.25)',
        borderWidth: 1,
        borderColor: '#EAB308',
    },
    formBadgeLoss: {
        backgroundColor: 'rgba(239, 68, 68, 0.25)',
        borderWidth: 1,
        borderColor: '#EF4444',
    },
    formBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '900',
    },
    keyPlayerBox: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    keyPlayerAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginBottom: 8,
    },
    keyPlayerName: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
        textAlign: 'center',
    },
    keyPlayerRole: {
        color: Colors.primary,
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2,
    },

    // Staff Styles
    staffSectionCard: {
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    staffSectionTitle: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    staffItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    staffIconCircle: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    staffItemRole: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    staffItemName: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '800',
        marginTop: 2,
    },
});

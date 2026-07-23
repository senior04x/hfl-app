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
import { apiService } from '../services/apiService';
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
        if (socket && isConnected) {
            const currentId = matchId || matchData?._id;
            
            socket.on('match-update', (data: any) => {
                if (data.matchId === currentId) {
                    setMatch(data.match);
                }
            });

            return () => {
                socket.off('match-update');
            };
        }
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

    const renderPreview = () => (
        <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={styles.placeholderContainer}>
                <Ionicons name="stats-chart-outline" size={48} color="rgba(255,255,255,0.1)" />
                <Text style={styles.placeholderText}>PREVYU MA'LUMOTLARI TEZ ORADA...</Text>
            </View>
        </ScrollView>
    );

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

            // Filter match events for this player by ID or by Name
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

                        {/* Match Event Badges (Goals, Assists, Yellow & Red Cards) */}
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
        const videoUrl = match?.youtubeLink || match?.videoUrl;

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
                {videoUrl ? (
                    <YoutubePlayerCard videoUrl={videoUrl} />
                ) : (
                    <View style={styles.placeholderContainer}>
                        <Ionicons name="images-outline" size={48} color="rgba(255,255,255,0.1)" />
                        <Text style={styles.placeholderText}>MEDIA MA'LUMOTLARI MAVJUD EMAS</Text>
                    </View>
                )}
            </ScrollView>
        );
    };

    const renderStaff = () => (
        <ScrollView style={styles.tabContent} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
            <View style={styles.placeholderContainer}>
                {match?.referee ? (
                    <View style={styles.staffMemberCard}>
                        <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, width: '100%' }}>
                            <View style={styles.staffIconBox}>
                                <Ionicons name="person" size={24} color={Colors.primary} />
                            </View>
                            <View>
                                <Text style={styles.staffLabel}>BOSH HAKAM</Text>
                                <Text style={styles.staffValue}>{match.referee.toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <Text style={styles.placeholderText}>RASMIY VAKILLAR RO'YXATI BELGILANMAGAN</Text>
                )}
            </View>
        </ScrollView>
    );

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
    staffValue: { color: '#FFF', fontSize: 15, fontWeight: '900', marginTop: 2 }
});

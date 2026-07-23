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
    Platform
} from 'react-native';
import { apiService } from '../services/apiService';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import VideoBackground from '../components/VideoBackground';
import Colors from '../constants/Colors';
import SmartImage from '../components/SmartImage';
import { Player } from '../types';
import PlayerProfileSkeleton from '../components/PlayerProfileSkeleton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatShortTeamName } from '../utils/stringUtils';

const { width } = Dimensions.get('window');

const PlayerStatsScreen = ({ route, navigation }: any) => {
    const { playerId, player: initialPlayer } = route.params || {};
    const [loading, setLoading] = useState(true);
    const [player, setPlayer] = useState<Player | null>(initialPlayer || null);
    const [activeTab, setActiveTab] = useState('profil');
    const [matches, setMatches] = useState<any[]>([]);
    const [matchesLoading, setMatchesLoading] = useState(false);
    
    const slideAnim = useRef(new Animated.Value(0)).current;

    const tabs = ['profil', 'karyerasi', 'oyinlari'];
    const tabLabels = {
        profil: 'PROFIL',
        karyerasi: 'KARYERASI',
        oyinlari: "O'YINLARI"
    };

    const nextTab = () => {
        const currentIndex = tabs.indexOf(activeTab);
        const nextIndex = (currentIndex + 1) % tabs.length;
        const nextTabName = tabs[nextIndex];
        
        Animated.timing(slideAnim, {
            toValue: -50,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setActiveTab(nextTabName);
            slideAnim.setValue(50);
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        });
    };

    useEffect(() => {
        if (playerId) {
            fetchPlayer();
        } else {
            setLoading(false);
        }
    }, [playerId]);

    const fetchPlayer = async () => {
        try {
            setLoading(true);
            const [playerData, statsData] = await Promise.all([
                apiService.getPlayerById(playerId),
                apiService.getPlayerStats(playerId).catch(() => null)
            ]);

            if (playerData) {
                const mergedPlayer = {
                    ...playerData,
                    stats: statsData || playerData.stats
                };
                setPlayer(mergedPlayer);
                if (activeTab === 'oyinlari') fetchPlayerMatches();
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
        <View style={{ flex: 1, backgroundColor: '#000' }}>
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

    const renderProfil = () => (
        <View style={styles.tabContent}>
            <View style={styles.statsGrid}>
                <StatBox label="GOLLAR" value={stats.goals} icon="football" color={Colors.primary} />
                <StatBox label="ASSISTLAR" value={stats.assists} icon="star" color="#3b82f6" />
                <StatBox label="O'YINLAR" value={stats.matchesPlayed} icon="calendar" color="#FFF" />
                <StatBox label="REYTING" value={stats.rating || 0} icon="trending-up" color="#FACC15" />
            </View>

            <View style={styles.glassCard}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.cardContent}>
                    <View style={styles.statItem}>
                        <View style={styles.statIconBox}><Ionicons name="calendar-outline" size={18} color={Colors.primary} /></View>
                        <Text style={styles.statLabel}>YOSHI</Text>
                        <Text style={styles.statValueText}>{player?.age || '—'}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <View style={styles.statIconBox}><Ionicons name="resize-outline" size={18} color={Colors.primary} /></View>
                        <Text style={styles.statLabel}>BO'YI</Text>
                        <Text style={styles.statValueText}>{player?.height ? `${player.height} SM` : '—'}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <View style={styles.statIconBox}><Ionicons name="fitness-outline" size={18} color={Colors.primary} /></View>
                        <Text style={styles.statLabel}>VAZNI</Text>
                        <Text style={styles.statValueText}>{player?.weight ? `${player.weight} KG` : '—'}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.infoSection}>
                <View style={[styles.sectionHeader, { paddingHorizontal: 0 }]}>
                    <Ionicons name="person-circle" size={20} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>SHAXSIY <Text style={styles.sectionTitleHighlight}>MA'LUMOTLAR</Text></Text>
                </View>
                <View style={styles.glassList}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <InfoRow label="OTASINING ISMI" value={player.fatherName?.toUpperCase() || '---'} icon="person" />
                    <InfoRow label="MILLATI" value={player.citizenship?.toUpperCase() || '---'} icon="planet" />
                    <InfoRow label="POZITSIYA" value={(player.positionUz || player.position || '---').toUpperCase()} icon="shield" />
                </View>
            </View>
        </View>
    );

    const renderKaryera = () => {
        const teamName = player?.teams?.name || player?.team_name || 'HFL FK';
        const teamLogo = player?.teams?.logo_url || player?.team_logo || '';
        const leagueName = player?.teams?.league || 'HFL Liga';

        return (
            <View style={styles.tabContent}>
                <View style={styles.infoSection}>
                    <View style={[styles.sectionHeader, { paddingHorizontal: 0 }]}>
                        <Ionicons name="trophy" size={20} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>HOZIRGI <Text style={styles.sectionTitleHighlight}>JAMOA</Text></Text>
                    </View>
                    <View style={styles.glassList}>
                        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={styles.careerTeamRow}>
                            <View style={styles.careerLogoCircle}>
                                {teamLogo ? (
                                    <Image source={{ uri: teamLogo }} style={styles.careerTeamLogo} />
                                ) : (
                                    <Ionicons name="shield" size={24} color={Colors.primary} />
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.careerTeamName}>{teamName.toUpperCase()}</Text>
                                <Text style={styles.careerLeagueText}>{leagueName.toUpperCase()}</Text>
                            </View>
                            <View style={styles.activeTagBadge}>
                                <Text style={styles.activeTagText}>ASOSIY</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.infoSection}>
                    <View style={[styles.sectionHeader, { paddingHorizontal: 0 }]}>
                        <Ionicons name="analytics" size={20} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>UMUMIY <Text style={styles.sectionTitleHighlight}>KARYERA STATISTIKASI</Text></Text>
                    </View>
                    <View style={styles.glassList}>
                        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                        <InfoRow label="O'YINLAR SONI" value={`${stats.matchesPlayed || 0} TA O'YIN`} icon="shirt" />
                        <InfoRow label="JAMI GOLLAR" value={`${stats.goals || 0} TA GOL`} icon="football" />
                        <InfoRow label="JAMI ASSISTLAR" value={`${stats.assists || 0} TA UZATMA`} icon="star" />
                        <InfoRow label="SARIQ KARTOTCHKALAR" value={`${stats.yellowCards || 0} TA`} icon="square" />
                    </View>
                </View>
            </View>
        );
    };

    const renderOyinlari = () => {
        if (matchesLoading) {
            return (
                <View style={{ padding: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            );
        }

        if (!matches || matches.length === 0) {
            return (
                <View style={styles.emptyMatchesBox}>
                    <Ionicons name="football-outline" size={48} color="rgba(255,255,255,0.2)" />
                    <Text style={styles.emptyMatchesText}>Ushbu futbolchi o'yinlari hali kiritilmagan</Text>
                </View>
            );
        }

        return (
            <View style={styles.tabContent}>
                {matches.map((matchObj: any, index: number) => {
                    const homeLogo = matchObj.homeTeamLogo || matchObj.homeTeam?.logo;
                    const awayLogo = matchObj.awayTeamLogo || matchObj.awayTeam?.logo;

                    return (
                        <TouchableOpacity
                            key={matchObj._id || matchObj.id || index}
                            style={styles.playerMatchCard}
                            onPress={() => navigation.navigate('MatchDetail', {
                                matchId: matchObj._id || matchObj.id,
                                match: matchObj
                            })}
                            activeOpacity={0.7}
                        >
                            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                            <View style={styles.playerMatchInner}>
                                <View style={styles.playerMatchDateRow}>
                                    <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.5)" />
                                    <Text style={styles.playerMatchDateText}>{matchObj.match_date || matchObj.date || 'O\'yin'}</Text>
                                    <View style={styles.eventBadgeSmall}>
                                        <Text style={styles.eventBadgeSmallText}>
                                            {matchObj.eventLabel || "O'YIN"}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.playerMatchScoreRow}>
                                    {/* Home Team */}
                                    <View style={styles.playerMatchTeamCol}>
                                        <View style={styles.miniTeamLogoCircle}>
                                            {homeLogo ? (
                                                <Image source={{ uri: homeLogo }} style={styles.miniTeamLogoImg} />
                                            ) : (
                                                <Ionicons name="shield" size={18} color={Colors.primary} />
                                            )}
                                        </View>
                                        <Text style={styles.playerMatchTeamName} numberOfLines={1}>
                                            {formatShortTeamName(matchObj.homeTeamName || matchObj.homeTeam?.name || 'UY JAMOA', 10)}
                                        </Text>
                                    </View>

                                    {/* Score */}
                                    <View style={styles.scoreContainerSmall}>
                                        <Text style={styles.playerMatchScoreText}>
                                            {matchObj.home_score ?? matchObj.score?.home ?? 0} - {matchObj.away_score ?? matchObj.score?.away ?? 0}
                                        </Text>
                                    </View>

                                    {/* Away Team */}
                                    <View style={styles.playerMatchTeamCol}>
                                        <View style={styles.miniTeamLogoCircle}>
                                            {awayLogo ? (
                                                <Image source={{ uri: awayLogo }} style={styles.miniTeamLogoImg} />
                                            ) : (
                                                <Ionicons name="shield" size={18} color={Colors.primary} />
                                            )}
                                        </View>
                                        <Text style={styles.playerMatchTeamName} numberOfLines={1}>
                                            {formatShortTeamName(matchObj.awayTeamName || matchObj.awayTeam?.name || 'MEHMON', 10)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                overlayOpacity={0.7}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.heroSection}>
                    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                    <SafeAreaView edges={['top']}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="chevron-back" size={28} color={Colors.primary} />
                        </TouchableOpacity>

                        <View style={styles.profileHeader}>
                            <View style={styles.photoContainer}>
                                <View style={[styles.mainPhotoWrapper, { borderColor: Colors.primary + '40', borderWidth: 2 }]}>
                                    <SmartImage
                                        uri={player.photo || player.avatar}
                                        style={styles.profilePhoto}
                                        contentFit="cover"
                                        fallbackIcon="person"
                                    />
                                </View>
                                <View style={styles.numberOverlay}>
                                    <Text style={styles.numberText}>#{player.number || '0'}</Text>
                                </View>
                            </View>

                            <View style={styles.nameContainer}>
                                <View style={styles.badgeRow}>
                                    <View style={[styles.statusBadge, player.status !== 'active' && { borderColor: Colors.danger + '40', backgroundColor: Colors.danger + '10' }]}>
                                        <Text style={[styles.statusText, player.status !== 'active' && { color: Colors.danger }]}>{(player.status || 'FAOL').toUpperCase()} O'YINCHI</Text>
                                    </View>
                                    <View style={styles.ratingBadge}><Text style={styles.ratingText}>★ {stats.rating || 0}</Text></View>
                                </View>

                                <Text style={styles.firstName}>{(player.firstName || player.first_name || 'FUTBOLCHI').toUpperCase()}</Text>
                                <Text style={styles.lastName}>{(player.lastName || player.last_name || '').toUpperCase()}</Text>

                                <View style={styles.socialRow}>
                                    {['instagram', 'facebook', 'youtube'].map(plat => (
                                        player[plat as keyof Player] && (
                                            <TouchableOpacity key={plat} style={styles.socialBtn} onPress={() => Linking.openURL(player[plat as keyof Player] as string)}>
                                                <Ionicons name={`logo-${plat}` as any} size={18} color="#FFF" />
                                            </TouchableOpacity>
                                        )
                                    ))}
                                </View>
                            </View>
                        </View>
                    </SafeAreaView>
                </View>

                <View style={styles.switcherWrapper}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.compactTabInfo}>
                        <View style={styles.miniIconBox}>
                            <Ionicons name={activeTab === 'profil' ? 'person' : activeTab === 'karyerasi' ? 'trophy' : 'football'} size={20} color={Colors.primary} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.miniTabType}>BO'LIM</Text>
                            <Text style={styles.miniTabName}>{tabLabels[activeTab as keyof typeof tabLabels]}</Text>
                        </View>
                        <TouchableOpacity onPress={nextTab} style={styles.nextToggleBtn}>
                            <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.mainContent}>
                    <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
                        {activeTab === 'profil' && renderProfil()}
                        {activeTab === 'karyerasi' && renderKaryera()}
                        {activeTab === 'oyinlari' && renderOyinlari()}
                    </Animated.View>
                </View>
            </ScrollView>
        </View>
    );
};

const StatBox = ({ label, value, icon, color }: any) => (
    <View style={styles.statBox}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}><Ionicons name={icon} size={20} color={color} /></View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
    </View>
);

const InfoRow = ({ label, value, icon }: any) => (
    <View style={styles.infoRow}>
        <View style={styles.infoIconBox}><Ionicons name={icon} size={16} color={Colors.primary} /></View>
        <View><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>
    </View>
);

const styles = StyleSheet.create({
    tabContent: { marginTop: 10 },
    scrollContent: { paddingBottom: 60 },
    heroSection: { borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderTopWidth: 0 },
    backButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 20, marginTop: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
    profileHeader: { flexDirection: 'row', alignItems: 'center', padding: 25, paddingTop: 10 },
    photoContainer: { position: 'relative' },
    mainPhotoWrapper: { width: 160, height: 160, borderRadius: 15, overflow: 'hidden' },
    profilePhoto: { width: '100%', height: '100%' },
    numberOverlay: { position: 'absolute', bottom: -5, right: -5, backgroundColor: '#000', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 2, borderColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 10, transform: [{ rotate: '15deg' }] },
    numberText: { color: Colors.primary, fontSize: 18, fontWeight: '900', fontStyle: 'italic' },
    nameContainer: { flex: 1, marginLeft: 25 },
    badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
    statusBadge: { backgroundColor: 'rgba(0,223,130,0.1)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,223,130,0.2)' },
    statusText: { color: Colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    ratingBadge: { backgroundColor: 'rgba(255,215,0,0.1)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
    ratingText: { color: '#FFD700', fontSize: 10, fontWeight: '900' },
    firstName: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    lastName: { color: Colors.primary, fontSize: 26, fontWeight: '900', marginTop: -5, letterSpacing: -0.5 },
    socialRow: { flexDirection: 'row', gap: 12, marginTop: 15 },
    socialBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    switcherWrapper: { marginHorizontal: 20, marginTop: 20, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    compactTabInfo: { flexDirection: 'row', alignItems: 'center', padding: 15 },
    miniIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    miniTabType: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    miniTabName: { color: '#FFF', fontSize: 15, fontWeight: '900' },
    nextToggleBtn: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    mainContent: { paddingHorizontal: 20 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginBottom: 25, marginTop: 25 },
    statBox: { width: (width - 55) / 2, borderRadius: 30, padding: 20, alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statIconContainer: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
    statValue: { color: '#FFF', fontSize: 30, fontWeight: '900' },
    glassCard: { borderRadius: 30, padding: 25, marginBottom: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    cardContent: { flexDirection: 'row', justifyContent: 'space-between' },
    statItem: { alignItems: 'center', flex: 1 },
    statIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    statValueText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    infoSection: { marginBottom: 30 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
    sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
    sectionTitleHighlight: { color: Colors.primary },
    glassList: { borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    infoRow: { flexDirection: 'row', padding: 18, alignItems: 'center', gap: 15 },
    infoIconBox: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    infoLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 3 },
    infoValue: { color: '#FFF', fontSize: 15, fontWeight: '900' },
    careerTeamRow: { flexDirection: 'row', alignItems: 'center', padding: 18 },
    careerLogoCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    careerTeamLogo: { width: 34, height: 34, borderRadius: 17 },
    careerTeamName: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    careerLeagueText: { color: Colors.primary, fontSize: 12, fontWeight: '700', marginTop: 2 },
    activeTagBadge: { backgroundColor: 'rgba(0,255,102,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,255,102,0.3)' },
    activeTagText: { color: '#00FF66', fontSize: 10, fontWeight: '900' },

    emptyMatchesBox: { padding: 40, alignItems: 'center' },
    emptyMatchesText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 12, fontWeight: '600' },
    playerMatchCard: { borderRadius: 20, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    playerMatchInner: { padding: 16 },
    playerMatchDateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    playerMatchDateText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 6, flex: 1 },
    eventBadgeSmall: { backgroundColor: 'rgba(255,215,0,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
    eventBadgeSmallText: { color: '#FFD700', fontSize: 10, fontWeight: '900' },
    playerMatchScoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    playerMatchTeamCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    miniTeamLogoCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center', marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    miniTeamLogoImg: { width: 28, height: 28, borderRadius: 14 },
    playerMatchTeamName: { color: '#FFF', fontSize: 13, fontWeight: '800', textAlign: 'center' },
    scoreContainerSmall: { backgroundColor: 'rgba(0, 255, 102, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0, 255, 102, 0.25)', marginHorizontal: 8 },
    playerMatchScoreText: { color: Colors.primary, fontSize: 16, fontWeight: '900' },
});

export default PlayerStatsScreen;

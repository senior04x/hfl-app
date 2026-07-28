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
import PlayerProfileSkeleton from '../components/PlayerProfileSkeleton';
import { SafeAreaView } from 'react-native-safe-area-context';

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

    return age > 0 ? `${age} yosh` : (defaultAge ? `${defaultAge} yosh` : '—');
};

const PlayerStatsScreen = ({ route, navigation }: any) => {
    const { playerId, player: initialPlayer } = route.params || {};
    const [loading, setLoading] = useState(true);
    const [player, setPlayer] = useState<any>(initialPlayer ? extractPlayerData(initialPlayer) : null);
    const [activeTab, setActiveTab] = useState('profil');
    const [matches, setMatches] = useState<any[]>([]);
    const [matchesLoading, setMatchesLoading] = useState(false);
    
    const slideAnim = useRef(new Animated.Value(0)).current;

    const tabs = ['profil', 'karyerasi', 'oyinlari'];
    const tabLabels: any = {
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
                const parsed = extractPlayerData({
                    ...playerData,
                    stats: statsData || playerData.stats
                });
                setPlayer(parsed);
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
                <StatBox label="GOLLAR" value={stats.goals} icon="football" color={Colors.primary} />
                <StatBox label="ASSISTLAR" value={stats.assists} icon="shoe-prints" color="#3b82f6" />
                <StatBox label="O'YINLAR" value={stats.matchesPlayed} icon="calendar" color="#FFF" />
                <StatBox label="REYTING" value={stats.rating || player.rating || 0} icon="trending-up" color="#FACC15" />
            </View>

            <View style={styles.physicalInfoBox}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.cardContent}>
                    <View style={styles.statItem}>
                        <View style={styles.statIconBox}><Ionicons name="calendar-outline" size={18} color={Colors.primary} /></View>
                        <View>
                            <Text style={styles.statLabelSmall}>YOSHI</Text>
                            <Text style={styles.statValueSmall}>{computedAge}</Text>
                        </View>
                    </View>
                    <View style={styles.statItem}>
                        <View style={styles.statIconBox}><Ionicons name="resize-outline" size={18} color={Colors.primary} /></View>
                        <View>
                            <Text style={styles.statLabelSmall}>BO'YI</Text>
                            <Text style={styles.statValueSmall}>{player?.height ? `${player.height} SM` : '—'}</Text>
                        </View>
                    </View>
                    <View style={styles.statItem}>
                        <View style={styles.statIconBox}><Ionicons name="fitness-outline" size={18} color={Colors.primary} /></View>
                        <View>
                            <Text style={styles.statLabelSmall}>VAZNI</Text>
                            <Text style={styles.statValueSmall}>{player?.weight ? `${player.weight} KG` : '—'}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.infoSection}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="person-circle" size={20} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>SHAXSIY <Text style={styles.sectionTitleHighlight}>MA'LUMOTLAR</Text></Text>
                </View>
                <View style={styles.infoList}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <InfoRow label="OTASINING ISMI" value={player.fatherName || player.father_name || '---'} icon="person" />
                    <InfoRow label="MILLATI" value={player.citizenship || '---'} icon="planet" />
                    <InfoRow label="POZITSIYA" value={player.positionUz || player.position || '---'} icon="shield" />
                </View>
            </View>
        </ScrollView>
    );

    const renderKaryera = () => {
        const history = player?.careerHistory || [];
        const currentTeamName = player?.teams?.name || player?.team_name || 'HFL FK';
        const currentTeamLogo = player?.teams?.logo_url || player?.team_logo || '';

        return (
            <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                    <Ionicons name="trophy-outline" size={20} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>KARYERA <Text style={styles.sectionTitleHighlight}>TARIXI</Text></Text>
                </View>

                {history.length > 0 ? (
                    history.map((yearGroup: any) => (
                        <View key={yearGroup.year} style={styles.yearBlock}>
                            <View style={styles.yearHeaderBadge}>
                                <Text style={styles.yearHeaderText}>{yearGroup.year}</Text>
                            </View>

                            {yearGroup.teams.map((team: any) => (
                                <View key={team.teamId} style={styles.teamCareerWrapper}>
                                    <View style={styles.teamMainRow}>
                                        <View style={styles.teamIconBox}>
                                            {team.teamLogo ? (
                                                <Image source={{ uri: team.teamLogo }} style={styles.teamMiniLogo} />
                                            ) : (
                                                <Ionicons name="shield" size={14} color={Colors.primary} />
                                            )}
                                        </View>
                                        <Text style={styles.teamNameCareer} numberOfLines={1}>{team.teamName?.toUpperCase()}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ))
                ) : (
                    <View style={styles.teamCareerWrapper}>
                        <View style={styles.teamMainRow}>
                            <View style={styles.teamIconBox}>
                                {currentTeamLogo ? (
                                    <Image source={{ uri: currentTeamLogo }} style={styles.teamMiniLogo} />
                                ) : (
                                    <Ionicons name="shield" size={14} color={Colors.primary} />
                                )}
                            </View>
                            <Text style={styles.teamNameCareer} numberOfLines={1}>{currentTeamName.toUpperCase()}</Text>
                        </View>
                    </View>
                )}
            </ScrollView>
        );
    };

    const renderMatches = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                <Ionicons name="football-outline" size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>O'TGAN <Text style={styles.sectionTitleHighlight}>O'YINLAR</Text></Text>
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
                    {/* AMATORA BRAND HEADER AT VERY TOP CENTERED */}
                    <View style={styles.brandHeaderWrapper}>
                        <Text style={styles.brandText}>AMATORA</Text>
                    </View>

                    {/* BACK BUTTON LOWERED BELOW AMATORA HEADER */}
                    <View style={styles.navHeaderRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonBtn}>
                            <Ionicons name="arrow-back" size={22} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.profileHeader}>
                        <View style={styles.photoContainer}>
                            <View style={[styles.mainPhotoWrapper, { shadowColor: 'transparent' }]}>
                                <SmartImage
                                    uri={player.photo || player.avatar || player.photo_url}
                                    style={styles.profilePhoto}
                                    contentFit="cover"
                                    fallbackIcon="person"
                                    borderRadius={22}
                                />
                            </View>
                            {/* TILTED/ROTATED SHIRT NUMBER BADGE */}
                            <View style={styles.numberOverlay}>
                                <Text style={styles.numberText}>#{player.number || player.player_number || '0'}</Text>
                            </View>
                        </View>

                        <View style={styles.nameContainer}>
                            <View style={styles.badgeRow}>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>{(player?.position || 'O\'YINCHI').toUpperCase()}</Text>
                                </View>
                                <View style={styles.ratingBadge}>
                                    <Text style={styles.ratingText}>★ {stats.rating || player?.rating || 0}</Text>
                                </View>
                            </View>

                            <Text style={styles.firstName}>{player.firstName || player.first_name}</Text>
                            <Text style={styles.lastName}>{player.lastName || player.last_name}</Text>
                            
                            {/* INSTAGRAM LINK UNDER NAME (POSITION BADGE REMOVED FROM UNDER NAME) */}
                            {instagramUrl ? (
                                <TouchableOpacity
                                    onPress={() => Linking.openURL(instagramUrl)}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 6,
                                        backgroundColor: 'rgba(225, 48, 108, 0.15)',
                                        borderColor: 'rgba(225, 48, 108, 0.4)',
                                        borderWidth: 1,
                                        paddingHorizontal: 12,
                                        paddingVertical: 5,
                                        borderRadius: 10,
                                        marginTop: 8,
                                        alignSelf: 'flex-start'
                                    }}
                                >
                                    <FontAwesome5 name="instagram" size={14} color="#E1306C" />
                                    <Text style={{ color: '#E1306C', fontSize: 12, fontWeight: '800' }}>
                                        @{instagramUsername}
                                    </Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
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
                                                activeTab === 'karyerasi' ? 'trophy' : 'football'
                                            } 
                                            size={20} 
                                            color={Colors.primary} 
                                        />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.miniTabType}>BO'LIM</Text>
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

                <View style={styles.mainContent}>
                    <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
                        {activeTab === 'profil' && renderProfil()}
                        {activeTab === 'karyerasi' && renderKaryera()}
                        {activeTab === 'oyinlari' && renderMatches()}
                    </Animated.View>
                </View>
            </ScrollView>
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
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    brandText: {
        fontSize: 18,
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
        borderRadius: 12,
        padding: 12,
        marginBottom: 6,
    },
    teamMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    teamIconBox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    teamMiniLogo: {
        width: 18,
        height: 18,
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

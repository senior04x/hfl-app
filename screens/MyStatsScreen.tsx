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
    SafeAreaView,
    StatusBar
} from 'react-native';
import { apiService } from '../services/apiService';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import SmartImage from '../components/SmartImage';
import { useAuthStore } from '../store/useAuthStore';
import PlayerProfileSkeleton from '../components/PlayerProfileSkeleton';

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
    return map[pos?.toUpperCase()] || pos || 'FUTBOLCHI';
};

const MyStatsScreen = ({ navigation }: any) => {
    const user = useAuthStore((state) => state.user);
    const [loading, setLoading] = useState(true);
    const [player, setPlayer] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('profil');
    const [matches, setMatches] = useState<any[]>([]);
    const [matchesLoading, setMatchesLoading] = useState(false);
    
    // Animation refs for slider
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
        if (user && user.id && user.role === 'player') {
            fetchPlayer();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchPlayer = async () => {
        try {
            setLoading(true);
            const data = await apiService.getPlayerById(user.id);
            if (data) {
                setPlayer(data);
                if (activeTab === 'oyinlari') {
                    fetchPlayerMatches();
                }
            }
        } catch (error) {
            console.error('Error fetching my stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlayerMatches = async () => {
        if (!user?.id) return;
        try {
            setMatchesLoading(true);
            const data = await apiService.getPlayerMatches(user.id);
            setMatches(data || []);
        } catch (error) {
            console.error('Error fetching player matches:', error);
        } finally {
            setMatchesLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'oyinlari' && matches.length === 0) {
            fetchPlayerMatches();
        }
    }, [activeTab]);

    if (!user) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centeredContent}>
                    <Ionicons name="lock-closed" size={64} color={Colors.textMuted} />
                    <Text style={styles.noUserText}>Iltimos, tizimga kiring</Text>
                    <TouchableOpacity 
                        style={styles.loginBtn}
                        onPress={() => navigation.navigate('Welcome')}
                    >
                        <Text style={styles.loginBtnText}>KIRISH</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (loading && !player) {
        return <PlayerProfileSkeleton />;
    }

    if (!player && user.role === 'player') {
         return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centeredContent}>
                    <Text style={styles.noUserText}>Ma'lumotlar topilmadi</Text>
                </View>
            </SafeAreaView>
        );
    }

    // manager view placeholder (since request focused on player stats imitation)
    if (user.role === 'manager') {
        return (
            <SafeAreaView style={styles.container}>
                 <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.brandText}>AMATORA</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.centeredContent}>
                    <SmartImage uri={user.logo} style={{ width: 120, height: 120, borderRadius: 60, marginBottom: 20 }} />
                    <Text style={styles.playerName}>{user.name}</Text>
                    <View style={styles.managerBadge}>
                        <Text style={styles.managerBadgeText}>JAMOA SARDORI</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.actionBtn}
                        onPress={() => navigation.navigate('TeamProfile', { teamId: user.id })}
                    >
                        <Text style={styles.actionBtnText}>JAMOA PROFILI</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const stats = player.stats || { goals: 0, assists: 0, matchesPlayed: 0, yellowCards: 0, redCards: 0 };

    const renderProfil = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.statsGrid}>
                <StatBox
                    label="GOLLAR"
                    value={stats.goals}
                    icon="football"
                    color={Colors.primary}
                />
                <StatBox
                    label="ASSISTLAR"
                    value={stats.assists}
                    icon="star"
                    color="#3b82f6"
                />
                <StatBox
                    label="O'YINLAR"
                    value={stats.matchesPlayed}
                    icon="calendar"
                    color="#FFF"
                />
                <StatBox
                    label="REYTING"
                    value={player.rating || 0}
                    icon="trending-up"
                    color="#FACC15"
                />
            </View>

            <View style={styles.physicalInfoBox}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.cardContent}>
                    <View style={styles.statItem}>
                        <View style={styles.statIconBox}>
                            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.statLabelSmall}>YOSHI</Text>
                            <Text style={styles.statValueSmall}>{player?.age || '—'}</Text>
                        </View>
                    </View>
                    <View style={styles.statItem}>
                        <View style={styles.statIconBox}>
                            <Ionicons name="resize-outline" size={18} color={Colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.statLabelSmall}>BO'YI</Text>
                            <Text style={styles.statValueSmall}>{player?.height ? `${player.height} SM` : '—'}</Text>
                        </View>
                    </View>
                    <View style={styles.statItem}>
                        <View style={styles.statIconBox}>
                            <Ionicons name="fitness-outline" size={18} color={Colors.primary} />
                        </View>
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
                    <InfoRow label="OTASINING ISMI" value={player.fatherName || '---'} icon="person" />
                    <InfoRow label="MILLATI" value={player.citizenship || '---'} icon="planet" />
                    <InfoRow label="POZITSIYA" value={player.positionUz || player.position || '---'} icon="shield" />
                    <InfoRow label="TELEFON" value={player.phone || '---'} icon="call" />
                </View>
            </View>
            
        </ScrollView>
    );

    const renderCareer = () => {
        const history = player?.careerHistory || [];

        return (
            <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                    <Ionicons name="time-outline" size={20} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>KARYERA <Text style={styles.sectionTitleHighlight}>TARIXI</Text></Text>
                </View>

                <View style={styles.careerTimelineContainer}>
                    {history.length > 0 ? (
                        history.map((yearGroup: any, yIdx: number) => (
                            <View key={yearGroup.year} style={styles.yearBlock}>
                                <View style={styles.yearHeaderBadge}>
                                    <Text style={styles.yearHeaderText}>{yearGroup.year}</Text>
                                    <View style={styles.yearStatLabels}>
                                        <Text style={styles.statColLabel}>И</Text>
                                        <Text style={styles.statColLabel}>G</Text>
                                        <Text style={styles.statColLabel}>P</Text>
                                    </View>
                                </View>

                                {yearGroup.teams.map((team: any, tIdx: number) => (
                                    <View key={team.teamId} style={styles.teamCareerWrapper}>
                                        <View style={styles.teamMainRow}>
                                            <View style={styles.teamIconBox}>
                                                {team.teamLogo ? (
                                                    <Image source={{ uri: team.teamLogo }} style={styles.teamMiniLogo} />
                                                ) : (
                                                    <Ionicons name="shield" size={14} color={Colors.primary} />
                                                )}
                                                <View style={styles.timelineVerticalLine} />
                                            </View>
                                            <Text style={styles.teamNameCareer} numberOfLines={1}>{team.teamName?.toUpperCase()}</Text>
                                            <View style={styles.teamTotalStats}>
                                                <Text style={styles.teamStatVal}>{team.total.matchesPlayed}</Text>
                                                <Text style={styles.teamStatVal}>{team.total.goals}</Text>
                                                <Text style={styles.teamStatVal}>{team.total.assists}</Text>
                                            </View>
                                        </View>

                                        {team.tournaments.map((tour: any, tourIdx: number) => (
                                            <View key={tourIdx} style={styles.tournamentRow}>
                                                <View style={styles.tourIconWrap}>
                                                    <Ionicons name="football" size={12} color="rgba(255,255,255,0.4)" />
                                                </View>
                                                <Text style={styles.tourNameText} numberOfLines={1}>{tour.name}</Text>
                                                <View style={styles.tourStatsRow}>
                                                    <Text style={styles.tourStatVal}>{tour.matchesPlayed}</Text>
                                                    <Text style={styles.tourStatVal}>{tour.goals}</Text>
                                                    <Text style={styles.tourStatVal}>{tour.assists}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        ))
                    ) : (
                        <View style={styles.noDataBox}>
                            <Text style={styles.noDataText}>Karyera tarixi mavjud emas</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        );
    };

    const renderMatches = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionHeader}>
                <Ionicons name="football" size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>SO'NGGI <Text style={styles.sectionTitleHighlight}>O'YINLAR</Text></Text>
            </View>

            {matchesLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
            ) : matches.length > 0 ? (
                <View style={styles.matchList}>
                    {matches.map((match: any) => (
                        <MatchCard key={match._id} match={match} />
                    ))}
                </View>
            ) : (
                <View style={styles.noData}>
                    <Text style={styles.noDataText}>O'yinlar topilmadi</Text>
                </View>
            )}
        </ScrollView>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Cinematic Video Background */}
            <Video
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                isMuted
                useNativeControls={false}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)' }]} />

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
            >
                <View style={styles.heroSection}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.brandText}>AMATORA</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <View style={styles.profileHeader}>
                        <View style={styles.photoContainer}>
                            <View style={[styles.mainPhotoWrapper, { shadowColor: 'transparent' }]}>
                                <SmartImage
                                    uri={player.photo || player.avatar}
                                    style={styles.profilePhoto}
                                    contentFit="cover"
                                    fallbackIcon="person"
                                    borderRadius={15}
                                />
                            </View>
                            <View style={styles.numberOverlay}>
                                <Text style={styles.numberText}>#{player.number || '0'}</Text>
                            </View>
                        </View>

                        <View style={styles.nameContainer}>
                            <View style={styles.badgeRow}>
                                <View style={[
                                    styles.statusBadge,
                                    player.status === 'inactive' && { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        player.status === 'inactive' && { color: '#EF4444' }
                                    ]}>
                                        {player.status === 'inactive' ? 'NOFAOL' : 'FAOL'} O'YINCHI
                                    </Text>
                                </View>
                                <View style={styles.ratingBadge}>
                                    <Text style={styles.ratingText}>★ {player?.rating || 0}</Text>
                                </View>
                            </View>

                            <Text style={styles.firstName}>{player.firstName}</Text>
                            <Text style={styles.lastName}>{player.lastName}</Text>
                            
                            <View style={styles.posBadge}>
                                <Text style={styles.posText}>{player?.position || 'O\'YINCHI'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Slider-Style Tab Switcher */}
                <View style={styles.switcherWrapper}>
                    <View style={styles.carouselContainer}>
                        <View style={styles.animatedCardWrapper}>
                            <Animated.View style={[
                                styles.tabCarouselCard,
                                { transform: [{ translateX: slideAnim }] }
                            ]}>
                                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                                <View style={styles.compactTabInfo}>
                                    <View style={styles.miniIconBox}>
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
                        {activeTab === 'karyerasi' && renderCareer()}
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
            <Ionicons name={icon} size={20} color={color} />
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
        <View>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    </View>
);

const MatchCard = ({ match }: any) => {
    return (
        <View style={styles.matchCard}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.matchTop}>
                <Text style={styles.matchLeague}>{match.leagueName || 'Amatora Turniri'}</Text>
                <Text style={styles.matchDate}>{new Date(match.date).toLocaleDateString('uz-UZ')}</Text>
            </View>
            <View style={styles.matchTeams}>
                <View style={styles.teamInfo}>
                    <SmartImage uri={match.homeTeam?.logo} style={styles.matchTeamLogo} contentFit="contain" />
                    <Text style={styles.matchTeamName} numberOfLines={1}>{match.homeTeam?.name}</Text>
                </View>
                <View style={styles.matchScore}>
                    <Text style={styles.scoreText}>{match.score?.home ?? 0}:{match.score?.away ?? 0}</Text>
                </View>
                <View style={[styles.teamInfo, { alignItems: 'flex-end' }]}>
                    <SmartImage uri={match.awayTeam?.logo} style={styles.matchTeamLogo} contentFit="contain" />
                    <Text style={styles.matchTeamName} numberOfLines={1}>{match.awayTeam?.name}</Text>
                </View>
            </View>
            <View style={styles.matchVenue}>
                <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                <Text style={styles.matchVenueName}>{match.stadiumName || 'Amatora Arena'}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0E1A',
    },
    centeredContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    noUserText: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 30,
    },
    loginBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 12,
    },
    loginBtnText: {
        color: '#000',
        fontWeight: '900',
        letterSpacing: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 40,
        marginBottom: 20,
    },
    brandText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 4,
        opacity: 0.8,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    heroSection: {
        paddingTop: 10,
        paddingBottom: 20,
        paddingHorizontal: 24,
        position: 'relative',
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    photoContainer: {
        position: 'relative',
    },
    mainPhotoWrapper: {
        width: 160,
        height: 160,
        borderRadius: 15,
        backgroundColor: '#000',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    profilePhoto: {
        width: '100%',
        height: '100%',
    },
    numberOverlay: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        backgroundColor: '#000',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 10,
        minWidth: 42,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '15deg' }],
    },
    numberText: {
        color: Colors.primary,
        fontSize: 18,
        fontWeight: 'bold',
        fontStyle: 'italic',
    },
    nameContainer: {
        flex: 1,
        marginLeft: 25,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    statusBadge: {
        backgroundColor: 'rgba(0,255,102,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,255,102,0.2)',
    },
    statusText: {
        color: Colors.primary,
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
    },
    ratingBadge: {
        backgroundColor: 'rgba(255,215,0,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.2)',
    },
    ratingText: {
        color: '#FFD700',
        fontSize: 10,
        fontWeight: '900',
    },
    firstName: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '900',
        fontStyle: 'italic',
        textTransform: 'uppercase',
        letterSpacing: -1,
    },
    lastName: {
        color: Colors.primary,
        fontSize: 28,
        fontWeight: '900',
        fontStyle: 'italic',
        textTransform: 'uppercase',
        letterSpacing: -1,
        marginTop: -5,
    },
    posBadge: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginTop: 10,
        alignSelf: 'flex-start',
    },
    posText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    mainContent: {
        paddingHorizontal: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
        marginBottom: 30,
        marginTop: 20,
    },
    statBox: {
        width: (width - 55) / 2,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 30,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        overflow: 'hidden',
    },
    statIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statLabelSmall: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 4,
    },
    statValue: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    physicalInfoBox: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 24,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValueSmall: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
        fontStyle: 'italic',
        textAlign: 'center',
    },
    infoSection: {
        marginBottom: 30,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        fontStyle: 'italic',
        letterSpacing: -0.5,
    },
    sectionTitleHighlight: {
        color: Colors.primary,
    },
    infoList: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 30,
        padding: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    infoRow: {
        flexDirection: 'row',
        padding: 15,
        alignItems: 'center',
        gap: 15,
    },
    infoIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.02)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    infoLabel: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 2,
    },
    infoValue: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    switcherWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 10,
        marginBottom: 20,
        zIndex: 100,
    },
    carouselContainer: {
        flex: 1,
    },
    animatedCardWrapper: {
        overflow: 'hidden',
    },
    tabCarouselCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        padding: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    compactTabInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#0A0E1A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniTabType: {
        color: Colors.primary,
        fontSize: 9,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    miniTabName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        fontStyle: 'italic',
        marginTop: 1,
    },
    navArrowBtnLarge: {
        width: 60,
        height: 60,
        backgroundColor: '#1A2138',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginLeft: 12,
    },
    yearBlock: {
        marginBottom: 20,
    },
    yearHeaderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1E3A8A',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 15,
    },
    yearHeaderText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    yearStatLabels: {
        flexDirection: 'row',
        width: 100,
        justifyContent: 'space-between',
    },
    statColLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        fontWeight: 'bold',
        width: 30,
        textAlign: 'center',
    },
    teamCareerWrapper: {
        paddingLeft: 4,
    },
    teamMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    teamIconBox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        position: 'relative',
    },
    teamMiniLogo: {
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    timelineVerticalLine: {
        position: 'absolute',
        top: 24,
        width: 2,
        backgroundColor: '#1E3A8A',
        bottom: -50,
        alignSelf: 'center',
    },
    teamNameCareer: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '900',
        flex: 1,
    },
    teamTotalStats: {
        flexDirection: 'row',
        width: 100,
        justifyContent: 'space-between',
    },
    teamStatVal: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '900',
        width: 30,
        textAlign: 'center',
    },
    tournamentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 34,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        paddingBottom: 8,
    },
    tourIconWrap: {
        marginRight: 8,
    },
    tourNameText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    tourStatsRow: {
        flexDirection: 'row',
        width: 100,
        justifyContent: 'space-between',
    },
    tourStatVal: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        fontWeight: '500',
        width: 30,
        textAlign: 'center',
    },
    matchList: {
        gap: 15,
    },
    matchCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    matchTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    matchLeague: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 8,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    matchDate: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 8,
        fontWeight: 'bold',
    },
    matchTeams: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    teamInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    matchTeamLogo: {
        width: 32,
        height: 32,
    },
    matchTeamName: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '900',
        fontStyle: 'italic',
        textTransform: 'uppercase',
        flex: 1,
    },
    matchScore: {
        backgroundColor: '#0A0E1A',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        marginHorizontal: 15,
    },
    scoreText: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    matchVenue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    matchVenueName: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 9,
        fontWeight: 'bold',
    },
    tabContent: {
        flex: 1,
    },
    noData: {
        padding: 40,
        alignItems: 'center',
    },
    managerBadge: {
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.primary,
        marginBottom: 30,
    },
    managerBadgeText: {
        color: Colors.primary,
        fontWeight: '900',
        fontSize: 12,
        letterSpacing: 1,
    },
    actionBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 12,
    },
    actionBtnText: {
        color: '#000',
        fontWeight: '900',
    },
    playerName: { color: '#FFF', fontSize: 24, fontWeight: '900', marginBottom: 10, textTransform: 'uppercase' },
    careerTimelineContainer: { paddingHorizontal: 5 },
    noDataBox: { padding: 40, alignItems: 'center' },
    noDataText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '500' },
    editProfileBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        padding: 15,
        borderRadius: 15,
        marginTop: 10,
        marginBottom: 30,
        gap: 10,
    },
    editProfileBtnText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 12,
    },
});

export default MyStatsScreen;

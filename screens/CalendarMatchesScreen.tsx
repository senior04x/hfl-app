import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    Image,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import AnimatedBackground from '../components/AnimatedBackground';
import backgroundImage from '../assets/images/backroud-image.png';

import CustomRefreshControl from '../components/CustomRefreshControl';
import { useTranslation } from 'react-i18next';
import AppNavbar from '../components/AppNavbar';
import { formatLocalizedVenue } from '../utils/localizationUtils';

export default function CalendarMatchesScreen({ route, navigation }: any) {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language || 'uz';
    const { 
        tournamentId,
        tournamentName = "Noma'lum Turnir", 
        date = "Sanasi ko'rsatilmagan",
        timestamp,
        rawDate,
        matches: initialMatches = [] 
    } = route?.params || {};
    
    const [matches, setMatches] = useState<any[]>(initialMatches);
    const [loading, setLoading] = useState(initialMatches.length === 0);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const formattedSubtitleDate = React.useMemo(() => {
        let dateObj: Date | null = null;
        if (timestamp) {
            dateObj = new Date(timestamp);
        } else if (rawDate) {
            dateObj = new Date(rawDate);
        } else if (initialMatches && initialMatches.length > 0) {
            const firstM = initialMatches[0];
            const mRaw = firstM.date || firstM.scheduledAt || firstM.match_date;
            if (mRaw) dateObj = new Date(mRaw);
        }

        if (!dateObj || isNaN(dateObj.getTime())) {
            if (typeof date === 'string') {
                const parsed = new Date(date);
                if (!isNaN(parsed.getTime())) dateObj = parsed;
            }
        }

        if (dateObj && !isNaN(dateObj.getTime())) {
            if (currentLang === 'uz') {
                const day = dateObj.getDate();
                const monthsUz = [
                    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
                    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
                ];
                const weekdaysUz = [
                    'Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba',
                    'Payshanba', 'Juma', 'Shanba'
                ];
                const monthName = monthsUz[dateObj.getMonth()];
                const weekdayName = weekdaysUz[dateObj.getDay()];
                return `${day}-${monthName}, ${weekdayName}`.toUpperCase();
            } else if (currentLang === 'ru') {
                const day = dateObj.getDate();
                const monthsRu = [
                    'Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
                    'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'
                ];
                const weekdaysRu = [
                    'Воскресенье', 'Понедельник', 'Вторник', 'Среда',
                    'Четверг', 'Пятница', 'Суббота'
                ];
                const monthName = monthsRu[dateObj.getMonth()];
                const weekdayName = weekdaysRu[dateObj.getDay()];
                return `${day} ${monthName}, ${weekdayName}`.toUpperCase();
            } else {
                return dateObj.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                }).toUpperCase();
            }
        }

        return String(date).toUpperCase();
    }, [timestamp, rawDate, initialMatches, date, currentLang]);

    useEffect(() => {
        if (initialMatches.length === 0 && tournamentId) {
            fetchMatches();
        }
    }, []);

    const fetchMatches = async () => {
        try {
            setLoading(true);
            const data = await apiService.getMatches({ tournamentId });
            if (data && Array.isArray(data)) {
                setMatches(data);
            }
        } catch (error) {
            console.error('Error fetching tournament matches:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchMatches();
    };

    const filteredMatches = matches.filter((match: any) => {
        const hName = match.homeTeam?.name || match.homeTeamName || match.home_team?.name || '';
        const aName = match.awayTeam?.name || match.awayTeamName || match.away_team?.name || '';
        return hName.toLowerCase().includes(searchQuery.toLowerCase()) ||
               aName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const renderMatchItem = ({ item }: { item: any }) => {
        const rawTime = item.match_time || item.time || item.matchTime || item.scheduled_time || item.start_time;
        let formattedTime = rawTime ? String(rawTime).slice(0, 5) : '';

        if (!formattedTime) {
            const dateStr = item.date || item.scheduledAt || item.match_date || '';
            if (dateStr.includes('T') && !dateStr.includes('T00:00:00')) {
                const matchDate = new Date(dateStr);
                if (!isNaN(matchDate.getTime())) {
                    formattedTime = matchDate.toLocaleTimeString('uz-UZ', { 
                        timeZone: 'Asia/Tashkent', 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false
                    });
                }
            }
        }
        if (!formattedTime) formattedTime = '18:00';

        const isLive = item.status === 'live' || item.status === 'first_half' || item.status === 'second_half' || item.status === 'half_time';
        const isFinished = item.status === 'finished';
        const homeName = item.homeTeam?.name || item.homeTeamName || item.home_team?.name || 'Uy jamoasi';
        const awayName = item.awayTeam?.name || item.awayTeamName || item.away_team?.name || 'Mehmon';
        const homeLogo = item.homeTeam?.logo || item.homeTeamLogo || item.home_team?.logo_url;
        const awayLogo = item.awayTeam?.logo || item.awayTeamLogo || item.away_team?.logo_url;
        const leagueName = item.tournamentName || item.league || tournamentName || "HFL Liga";
        const venueName = formatLocalizedVenue(item.venue || item.location || 'AMATORA ARENA', currentLang);

        return (
            <TouchableOpacity
                key={item._id || item.id || Math.random().toString()}
                style={[
                    styles.hMatchCard,
                    isLive && styles.hMatchCardLive
                ]}
                onPress={() => navigation.navigate('MatchDetail', { matchId: item._id || item.id })}
            >
                <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />

                <View style={{ padding: 18 }}>
                    {/* Header */}
                    <View style={styles.hMatchHeader}>
                        <Text style={styles.hMatchLeague} numberOfLines={1}>{leagueName}</Text>
                        {isLive && (
                            <View style={styles.liveBadgeContainer}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveBadgeText}>{t('matches.live')}</Text>
                            </View>
                        )}
                        {isFinished && (
                            <View style={styles.finishBadgeContainer}>
                                <Text style={styles.finishBadgeText}>{t('matches.finished')}</Text>
                            </View>
                        )}
                    </View>

                    {/* Teams & Score Row */}
                    <View style={styles.hMatchTeamsRow}>
                        {/* Home Team */}
                        <View style={styles.hTeamColumn}>
                            <View style={styles.hLogoCircle}>
                                {homeLogo ? (
                                    <Image source={{ uri: homeLogo }} style={styles.hTeamLogo} />
                                ) : (
                                    <Text style={styles.hLogoText}>{homeName.charAt(0)}</Text>
                                )}
                            </View>
                            <Text style={styles.hTeamName} numberOfLines={1}>{homeName}</Text>
                        </View>

                        {/* Score or VS Time */}
                        <View style={styles.hScoreColumn}>
                            {isLive || isFinished ? (
                                <Text style={styles.hScoreText}>{item.score?.home ?? item.home_score ?? 0} - {item.score?.away ?? item.away_score ?? 0}</Text>
                            ) : (
                                <View style={styles.vsContainer}>
                                    <Text style={styles.hTimeVsText}>{formattedTime}</Text>
                                    <Text style={styles.vsSubText}>{t('matches.starts')}</Text>
                                </View>
                            )}
                        </View>

                        {/* Away Team */}
                        <View style={styles.hTeamColumn}>
                            <View style={styles.hLogoCircle}>
                                {awayLogo ? (
                                    <Image source={{ uri: awayLogo }} style={styles.hTeamLogo} />
                                ) : (
                                    <Text style={styles.hLogoText}>{awayName.charAt(0)}</Text>
                                )}
                            </View>
                            <Text style={styles.hTeamName} numberOfLines={1}>{awayName}</Text>
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.hMatchFooter}>
                        <Text style={styles.hMatchDate}>{formattedSubtitleDate} • {venueName}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <AnimatedBackground overlayOpacity={0.85} backgroundImage={backgroundImage}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Universal App Navbar */}
                <AppNavbar
                    title={`${tournamentName}`}
                    subtitle={formattedSubtitleDate}
                    onBackPress={() => navigation.goBack()}
                    showSearch={true}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder={t('common.search', 'Qidiruv...')}
                />

                {/* Matches List */}
                {loading && !refreshing ? (
                    <View style={[styles.emptyContainer, { flex: 1, justifyContent: 'center' }]}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={[styles.emptyText, { marginTop: 10 }]}>{t('common.loading')}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredMatches}
                        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
                        renderItem={renderMatchItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <CustomRefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>{t('common.no_data')}</Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </AnimatedBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 15,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    backButton: {
        padding: 5,
        width: 40,
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 15,
    },
    listContent: {
        paddingBottom: 30,
        paddingTop: 4,
    },

    // Glassmorphic Match Card matching HomeScreen
    hMatchCard: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 18,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        overflow: 'hidden',
    },
    hMatchCardLive: {
        borderColor: 'rgba(239, 68, 68, 0.45)',
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
    },
    hMatchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    hMatchLeague: {
        color: '#8A94A6',
        fontSize: 13,
        fontWeight: 'bold',
        flex: 1,
        textTransform: 'uppercase',
    },
    hMatchTeamsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    hTeamColumn: {
        flex: 1,
        alignItems: 'center',
    },
    hLogoCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    hTeamLogo: {
        width: 44,
        height: 44,
        resizeMode: 'contain',
    },
    hLogoText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    hTeamName: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 2,
    },
    hScoreColumn: {
        width: 90,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hScoreText: {
        color: '#FFF',
        fontSize: 26,
        fontWeight: '900',
    },
    vsContainer: {
        alignItems: 'center',
    },
    hTimeVsText: {
        color: Colors.primary,
        fontSize: 20,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    vsSubText: {
        color: '#8A94A6',
        fontSize: 9,
        fontWeight: '700',
        marginTop: 2,
        letterSpacing: 0.5,
    },
    hMatchFooter: {
        alignItems: 'center',
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.06)',
    },
    hMatchDate: {
        color: '#8A94A6',
        fontSize: 11,
        fontWeight: '500',
    },

    liveBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.danger,
        marginRight: 4,
    },
    liveBadgeText: {
        color: Colors.danger,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    finishBadgeContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
    },
    finishBadgeText: {
        color: '#8A94A6',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },

    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#8A94A6',
        fontSize: 16,
    },
});

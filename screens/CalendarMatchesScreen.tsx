import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    TextInput,
    Image,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import { Video, ResizeMode } from 'expo-av';
import VideoBackground from '../components/VideoBackground';

export default function CalendarMatchesScreen({ route, navigation }: any) {
    const { 
        tournamentId,
        tournamentName = "Noma'lum Turnir", 
        date = "Sanasi ko'rsatilmagan", 
        matches: initialMatches = [] 
    } = route?.params || {};
    
    const [matches, setMatches] = useState<any[]>(initialMatches);
    const [loading, setLoading] = useState(initialMatches.length === 0);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (initialMatches.length === 0 && tournamentId) {
            fetchMatches();
        }
    }, []);

    const fetchMatches = async () => {
        try {
            setLoading(true);
            // Since we need matches for a specific tournament and date, 
            // we use the same getMatches but with more filters if the backend supported them.
            // For now, we rely on the matches passed from the previous screen as requested,
            // but we add this hook for robustness.
            const data = await apiService.getMatches({ tournamentId });
            if (data && Array.isArray(data)) {
                setMatches(data);
            }
        } catch (error) {
            console.error('Error fetching tournament matches:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredMatches = matches.filter((match: any) => {
        const hName = match.homeTeam?.name || match.homeTeamName || '';
        const aName = match.awayTeam?.name || match.awayTeamName || '';
        return hName.toLowerCase().includes(searchQuery.toLowerCase()) ||
               aName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const renderMatchItem = ({ item }: { item: any }) => {
        const matchDate = new Date(item.date || item.scheduledAt);
        const time = matchDate.toLocaleTimeString('uz-UZ', { 
            timeZone: 'Asia/Tashkent', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        });
        const dateStr = matchDate.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });

        return (
            <TouchableOpacity
                style={styles.matchCard}
                onPress={() => navigation.navigate('MatchDetail', { matchId: item._id })}
            >
                {/* Top row: Round and Time */}
                <View style={styles.matchHeader}>
                    <Text style={styles.matchRound}>{item.round || 'Uchrashuv'}</Text>
                    <View style={styles.matchTimeContainer}>
                        <Text style={styles.matchDate}>{dateStr}</Text>
                    </View>
                </View>

                {/* Middle row: Teams and Score */}
                <View style={styles.matchTeamsRow}>
                    <View style={[styles.teamContainer, { justifyContent: 'flex-end' }]}>
                        <Text style={styles.teamName} numberOfLines={1}>{item.homeTeam?.name || item.homeTeamName}</Text>
                        <View style={styles.logoPlaceholder}>
                            {item.homeTeam?.logo || item.homeTeamLogo ? (
                                <Image source={{ uri: item.homeTeam?.logo || item.homeTeamLogo }} style={styles.teamLogo} />
                            ) : (
                                <Text style={styles.logoEmoji}>⚽</Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.scoreContainer}>
                        <Text style={item.status === 'scheduled' ? styles.timeVsText : styles.scoreText}>
                            {item.status === 'finished' || item.status === 'live' 
                                ? `${item.score?.home || 0}:${item.score?.away || 0}` 
                                : time}
                        </Text>
                    </View>

                    <View style={[styles.teamContainer, { justifyContent: 'flex-start' }]}>
                        <View style={styles.logoPlaceholder}>
                            {item.awayTeam?.logo || item.awayTeamLogo ? (
                                <Image source={{ uri: item.awayTeam?.logo || item.awayTeamLogo }} style={styles.teamLogo} />
                            ) : (
                                <Text style={styles.logoEmoji}>⚽</Text>
                            )}
                        </View>
                        <Text style={styles.teamName} numberOfLines={1}>{item.awayTeam?.name || item.awayTeamName}</Text>
                    </View>
                </View>

                {/* Bottom row: Location */}
                <View style={styles.matchLocationRow}>
                    <Ionicons name="location-outline" size={14} color="#8A94A6" />
                    <Text style={styles.locationText}>{item.venue || item.location || 'AMATORA SK'}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                overlayOpacity={0.85}
            >
            <SafeAreaView style={{ flex: 1 }}>
            {/* Custom Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle} numberOfLines={2} adjustsFontSizeToFit>
                        {`${tournamentName}, ${date.split(',')[0]}`}
                    </Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.primary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Qidiruv"
                    placeholderTextColor="#8A94A6"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Matches List */}
            {loading ? (
                <View style={[styles.emptyContainer, { flex: 1, justifyContent: 'center' }]}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={[styles.emptyText, { marginTop: 10 }]}>Yuklanmoqda...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredMatches}
                    keyExtractor={(item) => item._id || item.id}
                    renderItem={renderMatchItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Topilmadi</Text>
                        </View>
                    }
                />
            )}
            </SafeAreaView>
            </VideoBackground>
        </View>
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
        borderBottomColor: Colors.primary, // Green bottom border for the header
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
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1A2138',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 16,
    },
    listContent: {
        paddingBottom: 20,
    },
    matchCard: {
        backgroundColor: '#0a1020', // Slightly lighter than background but darker than surface
        borderBottomWidth: 1,
        borderBottomColor: '#1A2138',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    matchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    matchRound: {
        color: '#8A94A6',
        fontSize: 13,
    },
    matchTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    matchDate: {
        color: '#8A94A6',
        fontSize: 13,
    },
    timeDivider: {
        width: 1,
        height: 12,
        backgroundColor: '#1A2138',
        marginHorizontal: 8,
    },
    matchTime: {
        color: '#8A94A6',
        fontSize: 13,
    },
    matchTeamsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    teamContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    teamName: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginHorizontal: 10,
    },
    teamLogo: {
        width: 20,
        height: 20,
        resizeMode: 'contain',
    },
    logoPlaceholder: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#1A2138',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoEmoji: {
        fontSize: 16,
    },
    scoreContainer: {
        paddingHorizontal: 15,
    },
    scoreText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    timeVsText: {
        color: Colors.primary,
        fontSize: 18,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    matchLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationText: {
        color: '#8A94A6',
        fontSize: 12,
        marginLeft: 6,
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

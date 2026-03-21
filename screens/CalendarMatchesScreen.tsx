import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

export default function CalendarMatchesScreen({ route, navigation }: any) {
    const { tournamentName = "Noma'lum Turnir", date = "Sanasi ko'rsatilmagan" } = route?.params || {};
    const [searchQuery, setSearchQuery] = useState('');

    // Mock Data based on the screenshot provided
    const mockMatches = [
        {
            id: '1',
            round: '5 tur',
            dateValue: date.split(',')[0], // just the date part, e.g., '09 mar.'
            time: '12:00',
            team1: { name: 'BRS', logo: '🦁' }, // Using emojis as placeholder logos
            team2: { name: 'SHCR', logo: '🦅' },
            score: '-:-',
            location: 'SK "CLEVERSPORT", futbol maydoni 8x8'
        },
        {
            id: '2',
            round: '5 tur',
            dateValue: date.split(',')[0],
            time: '13:00',
            team1: { name: 'BRD', logo: '🐦' },
            team2: { name: 'TSHN', logo: '🐺' },
            score: '-:-',
            location: 'SK "CLEVERSPORT", futbol maydoni 8x8'
        },
        {
            id: '3',
            round: '5 tur',
            dateValue: date.split(',')[0],
            time: '14:00',
            team1: { name: 'PKM', logo: '🐻' },
            team2: { name: 'SHEF', logo: '👨‍🍳' },
            score: '-:-',
            location: 'SK "CLEVERSPORT", futbol maydoni 8x8'
        },
        {
            id: '4',
            round: '5 tur',
            dateValue: date.split(',')[0],
            time: '15:00',
            team1: { name: 'GRA', logo: '🛡️' },
            team2: { name: 'DVJ', logo: '🐲' },
            score: '-:-',
            location: 'SK "CLEVERSPORT", futbol maydoni 8x8'
        }
    ];

    const filteredMatches = mockMatches.filter(match =>
        match.team1.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.team2.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderMatchItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.matchCard}
            onPress={() => navigation.navigate('MatchDetail', { matchId: item.id, isUpcoming: true })}
        >
            {/* Top row: Round and Time */}
            <View style={styles.matchHeader}>
                <Text style={styles.matchRound}>{item.round}</Text>
                <View style={styles.matchTimeContainer}>
                    <Text style={styles.matchDate}>{item.dateValue}</Text>
                    <View style={styles.timeDivider} />
                    <Text style={styles.matchTime}>{item.time}</Text>
                </View>
            </View>

            {/* Middle row: Teams and Score */}
            <View style={styles.matchTeamsRow}>
                <View style={[styles.teamContainer, { justifyContent: 'flex-end' }]}>
                    <Text style={styles.teamName} numberOfLines={1}>{item.team1.name}</Text>
                    <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoEmoji}>{item.team1.logo}</Text>
                    </View>
                </View>

                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreText}>{item.score}</Text>
                </View>

                <View style={[styles.teamContainer, { justifyContent: 'flex-start' }]}>
                    <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoEmoji}>{item.team2.logo}</Text>
                    </View>
                    <Text style={styles.teamName} numberOfLines={1}>{item.team2.name}</Text>
                </View>
            </View>

            {/* Bottom row: Location */}
            <View style={styles.matchLocationRow}>
                <Ionicons name="location-outline" size={14} color="#8A94A6" />
                <Text style={styles.locationText}>{item.location}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Custom Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle} numberOfLines={2} adjustsFontSizeToFit>
                        {tournamentName}, {date.split(',')[0]}
                    </Text>
                </View>
                <View style={{ width: 40 }} /> {/* Spacer to balance back button */}
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
            <FlatList
                data={filteredMatches}
                keyExtractor={(item) => item.id}
                renderItem={renderMatchItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Topilmadi</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background, // #0a0d14
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 15,
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
        backgroundColor: Colors.background,
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

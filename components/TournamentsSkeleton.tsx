import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Skeleton from './Skeleton';
import Colors from '../constants/Colors';

const { width } = Dimensions.get('window');

const TournamentsSkeleton = () => {
    return (
        <View style={styles.container}>
            {/* Tabs Row Skeleton */}
            <View style={styles.tabsRow}>
                <Skeleton width={(width - 48) / 2} height={40} borderRadius={8} style={{ marginRight: 8 }} />
                <Skeleton width={(width - 48) / 2} height={40} borderRadius={8} />
            </View>

            {/* League info card (Large) */}
            <View style={styles.leagueCard}>
                <Skeleton width={100} height={100} borderRadius={16} style={{ marginRight: 20 }} />
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Skeleton width={120} height={12} style={{ marginBottom: 10 }} />
                    <Skeleton width={180} height={20} style={{ marginBottom: 12 }} />
                    <View style={{ flexDirection: 'row' }}>
                        <Skeleton width={24} height={24} borderRadius={6} style={{ marginRight: 10 }} />
                        <Skeleton width={24} height={24} borderRadius={6} style={{ marginRight: 10 }} />
                        <Skeleton width={24} height={24} borderRadius={6} />
                    </View>
                </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Skeleton width={60} height={12} style={{ marginBottom: 6 }} />
                    <Skeleton width={30} height={20} />
                </View>
                <View style={styles.statItem}>
                    <Skeleton width={60} height={12} style={{ marginBottom: 6 }} />
                    <Skeleton width={40} height={20} />
                </View>
                <View style={styles.statItem}>
                    <Skeleton width={60} height={12} style={{ marginBottom: 6 }} />
                    <Skeleton width={70} height={20} />
                </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actionsRow}>
                <Skeleton width={width * 0.4} height={44} borderRadius={22} style={{ marginRight: 12 }} />
                <Skeleton width={width * 0.4} height={44} borderRadius={22} />
            </View>

            {/* Tournament List Items */}
            <View style={styles.listContainer}>
                {[1, 2, 3, 4, 5].map(i => (
                    <View key={i} style={styles.listItem}>
                        <View style={{ flex: 1 }}>
                            <Skeleton width={width * 0.6} height={18} borderRadius={4} style={{ marginBottom: 8 }} />
                            <Skeleton width={width * 0.4} height={14} borderRadius={4} />
                        </View>
                        <Skeleton circle width={20} height={20} />
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        paddingTop: 10,
    },
    tabsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 25,
    },
    leagueCard: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 30,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 30,
        marginBottom: 30,
    },
    statItem: {
        alignItems: 'center',
    },
    actionsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 30,
    },
    listContainer: {
        paddingHorizontal: 16,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#1A2138',
    }
});

export default TournamentsSkeleton;

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Skeleton from './Skeleton';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

const { width } = Dimensions.get('window');

const TournamentsSkeleton = () => {
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);

    return (
        <View style={[styles.container, { backgroundColor: homeColors.background }]}>
            {/* Tabs Row Skeleton */}
            <View style={[styles.tabsRow, { backgroundColor: isDark ? '#181818' : '#F2F2F4', borderColor: homeColors.border }]}>
                <Skeleton width={(width - 44) / 2} height={34} borderRadius={8} style={{ marginRight: 6 }} />
                <Skeleton width={(width - 44) / 2} height={34} borderRadius={8} />
            </View>

            {/* League Central Card Skeleton */}
            <View style={[styles.leagueCardCentered, { backgroundColor: isDark ? '#141414' : '#FFFFFF', borderColor: homeColors.border }]}>
                <View style={{ backgroundColor: '#12141A', padding: 8, borderRadius: 10, marginBottom: 10 }}>
                    <Skeleton width={160} height={60} borderRadius={6} />
                </View>
                <Skeleton width={120} height={16} borderRadius={4} />
            </View>

            {/* Stats Row Skeleton */}
            <View style={[styles.statsRow, { backgroundColor: isDark ? '#141414' : '#FFFFFF', borderColor: homeColors.border }]}>
                <View style={styles.statItem}>
                    <Skeleton width={50} height={10} style={{ marginBottom: 6 }} />
                    <Skeleton width={26} height={18} />
                </View>
                <View style={[styles.statDivider, { backgroundColor: homeColors.border }]} />
                <View style={styles.statItem}>
                    <Skeleton width={50} height={10} style={{ marginBottom: 6 }} />
                    <Skeleton width={32} height={18} />
                </View>
                <View style={[styles.statDivider, { backgroundColor: homeColors.border }]} />
                <View style={styles.statItem}>
                    <Skeleton width={50} height={10} style={{ marginBottom: 6 }} />
                    <Skeleton width={24} height={16} />
                </View>
            </View>

            {/* Section Header Skeleton */}
            <View style={styles.sectionHeader}>
                <Skeleton width={180} height={16} borderRadius={4} />
            </View>

            {/* List items Skeleton */}
            <View style={styles.listContainer}>
                {[1, 2, 3, 4, 5].map(i => (
                    <View key={i} style={[styles.listItem, { backgroundColor: isDark ? '#141414' : '#FFFFFF', borderColor: homeColors.border }]}>
                        <Skeleton width={20} height={16} borderRadius={4} style={{ marginRight: 8 }} />
                        <Skeleton circle width={40} height={40} style={{ marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                            <Skeleton width={width * 0.45} height={15} borderRadius={4} style={{ marginBottom: 6 }} />
                            <Skeleton width={width * 0.25} height={11} borderRadius={4} />
                        </View>
                        <Skeleton width={14} height={14} borderRadius={7} />
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 8,
    },
    tabsRow: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 12,
        padding: 3,
        borderWidth: 1,
    },
    leagueCardCentered: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    statsRow: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderWidth: 1,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statDivider: {
        width: 1,
        height: 24,
    },
    sectionHeader: {
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    listContainer: {
        paddingHorizontal: 16,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 8,
    },
});

export default TournamentsSkeleton;

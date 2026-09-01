import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Skeleton from './Skeleton';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

interface MatchesListSkeletonProps {
    count?: number;
}

const MatchesListSkeleton: React.FC<MatchesListSkeletonProps> = ({ count = 5 }) => {
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {[...Array(count)].map((_, i) => (
                <View key={i} style={[styles.matchCard, { backgroundColor: isDark ? '#141414' : '#FFFFFF', borderColor: homeColors.border }]}>
                    <View style={styles.metaRow}>
                        <Skeleton width={80} height={11} borderRadius={4} />
                        <Skeleton width={60} height={11} borderRadius={4} />
                    </View>
                    <View style={styles.teamsRow}>
                        <View style={styles.sideTeam}>
                            <Skeleton width={44} height={14} borderRadius={4} />
                            <Skeleton circle height={30} width={30} style={{ marginLeft: 8 }} />
                        </View>
                        <Skeleton width={48} height={24} borderRadius={6} style={{ marginHorizontal: 8 }} />
                        <View style={styles.sideTeam}>
                            <Skeleton circle height={30} width={30} style={{ marginRight: 8 }} />
                            <Skeleton width={44} height={14} borderRadius={4} />
                        </View>
                    </View>
                    <View style={styles.stadiumRow}>
                        <Skeleton width={100} height={10} borderRadius={4} />
                    </View>
                </View>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    matchCard: {
        padding: 14,
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 14,
        borderWidth: 1,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    teamsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    sideTeam: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stadiumRow: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
});

export default MatchesListSkeleton;

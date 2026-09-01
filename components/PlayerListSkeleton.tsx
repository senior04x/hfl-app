import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Skeleton from './Skeleton';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

const PlayerListSkeleton = () => {
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <View key={i} style={[styles.playerCard, { backgroundColor: isDark ? '#141414' : '#FFFFFF', borderColor: homeColors.border }]}>
                    <View style={styles.rankContainer}>
                        <Skeleton width={18} height={16} borderRadius={4} />
                    </View>
                    <Skeleton circle width={36} height={36} style={{ marginRight: 10 }} />
                    <View style={styles.info}>
                        <Skeleton width={120} height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                        <Skeleton width={75} height={11} borderRadius={4} />
                    </View>
                    <View style={styles.statContainer}>
                        <Skeleton width={28} height={20} borderRadius={6} />
                    </View>
                </View>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 14 },
    playerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
        borderWidth: 1,
    },
    rankContainer: { width: 24, alignItems: 'center', marginRight: 6 },
    info: { flex: 1 },
    statContainer: { alignItems: 'center', paddingLeft: 8 },
});

export default PlayerListSkeleton;


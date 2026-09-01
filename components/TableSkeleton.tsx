import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Skeleton from './Skeleton';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

const TableSkeleton = () => {
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={[styles.headerRow, { backgroundColor: isDark ? '#1A1A1A' : '#F0F0F2', borderColor: homeColors.border }]}>
                <Skeleton width={30} height={12} style={{ marginRight: 10 }} />
                <Skeleton width={120} height={12} style={{ flex: 1 }} />
                <View style={styles.statsRow}>
                    <Skeleton width={20} height={12} style={{ marginLeft: 8 }} />
                    <Skeleton width={20} height={12} style={{ marginLeft: 8 }} />
                    <Skeleton width={30} height={12} style={{ marginLeft: 12 }} />
                </View>
            </View>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <View key={i} style={[styles.contentRow, { backgroundColor: isDark ? '#141414' : '#FFFFFF', borderColor: homeColors.border }]}>
                    <Skeleton width={25} height={14} style={{ marginRight: 10 }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Skeleton circle width={26} height={26} style={{ marginRight: 10 }} />
                        <Skeleton width={100} height={14} />
                    </View>
                    <View style={styles.statsRow}>
                        <Skeleton width={20} height={14} style={{ marginLeft: 8 }} />
                        <Skeleton width={20} height={14} style={{ marginLeft: 8 }} />
                        <Skeleton width={30} height={14} style={{ marginLeft: 12 }} />
                    </View>
                </View>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 14 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 8,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 6,
    },
    statsRow: { flexDirection: 'row', alignItems: 'center' },
});

export default TableSkeleton;

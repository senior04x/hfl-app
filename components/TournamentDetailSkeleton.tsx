import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Skeleton from './Skeleton';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

const { width } = Dimensions.get('window');

const TournamentDetailSkeleton = () => {
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);

    return (
        <View style={[styles.container, { backgroundColor: homeColors.background }]}>
            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <View style={[styles.fixedTabsRow, { backgroundColor: isDark ? '#181818' : '#F2F2F4', borderColor: homeColors.border }]}>
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} width={(width - 44) / 4} height={30} borderRadius={8} />
                    ))}
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {/* Information Card */}
                <View style={[styles.sectionCard, { backgroundColor: isDark ? '#141414' : '#FFFFFF', borderColor: homeColors.border }]}>
                    <View style={styles.sectionHeader}>
                        <Skeleton width={140} height={16} borderRadius={4} />
                    </View>
                    {[1, 2, 3, 4, 5].map(i => (
                        <View key={i} style={styles.infoRow}>
                            <Skeleton width={90} height={13} borderRadius={4} />
                            <Skeleton width={70} height={13} borderRadius={4} />
                        </View>
                    ))}
                </View>

                {/* Organizers Card */}
                <View style={[styles.sectionCard, { backgroundColor: isDark ? '#141414' : '#FFFFFF', borderColor: homeColors.border }]}>
                    <View style={styles.sectionHeader}>
                        <Skeleton width={120} height={16} borderRadius={4} />
                    </View>
                    <View style={styles.organizerRow}>
                        <Skeleton width={42} height={42} borderRadius={10} style={{ marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                            <Skeleton width={130} height={15} borderRadius={4} style={{ marginBottom: 6 }} />
                            <Skeleton width={90} height={11} borderRadius={4} />
                        </View>
                        <Skeleton width={32} height={32} borderRadius={16} />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    tabsContainer: { paddingVertical: 6, paddingHorizontal: 16 },
    fixedTabsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, padding: 3, borderWidth: 1 },
    sectionCard: { marginTop: 12, marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 14, overflow: 'hidden' },
    sectionHeader: { marginBottom: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
    organizerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
});

export default TournamentDetailSkeleton;


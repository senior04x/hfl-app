import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Skeleton from './Skeleton';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

const { width } = Dimensions.get('window');

const MatchDetailSkeleton = () => {
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);

    const cardSurface = Platform.OS === 'ios'
        ? { backgroundColor: homeColors.background, borderWidth: 1, borderColor: homeColors.border }
        : {
            backgroundColor: homeColors.background,
            elevation: 3,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
        };

    const skeletonBg = { backgroundColor: homeColors.surface };

    return (
        <View style={[styles.root, { backgroundColor: homeColors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
            <SafeAreaView style={[styles.container, { backgroundColor: homeColors.background }]} edges={['top']}>
                {/* Header Container */}
                <View style={[styles.headerContainer, { backgroundColor: homeColors.background, borderBottomColor: homeColors.border }]}>
                    <View style={styles.topNav}>
                        <View style={[styles.backBtn, cardSurface]}>
                            <Skeleton width={18} height={18} borderRadius={4} style={skeletonBg} />
                        </View>
                        <Skeleton width={140} height={18} borderRadius={6} style={skeletonBg} />
                        <Skeleton width={44} height={20} borderRadius={6} style={skeletonBg} />
                    </View>

                    {/* Score Card */}
                    <View style={styles.matchScoreCard}>
                        {/* Date row */}
                        <View style={styles.dateRow}>
                            <Skeleton width={14} height={14} borderRadius={7} style={{ marginRight: 6, ...skeletonBg }} />
                            <Skeleton width={130} height={12} borderRadius={4} style={skeletonBg} />
                        </View>

                        {/* Teams Score row */}
                        <View style={styles.teamsScoreRow}>
                            <View style={styles.teamBlockRight}>
                                <Skeleton width={75} height={16} borderRadius={4} style={{ marginRight: 10, ...skeletonBg }} />
                                <Skeleton width={36} height={36} borderRadius={18} style={skeletonBg} />
                            </View>

                            <Skeleton width={54} height={34} borderRadius={8} style={{ marginHorizontal: 16, ...skeletonBg }} />

                            <View style={styles.teamBlockLeft}>
                                <Skeleton width={36} height={36} borderRadius={18} style={{ marginRight: 10, ...skeletonBg }} />
                                <Skeleton width={75} height={16} borderRadius={4} style={skeletonBg} />
                            </View>
                        </View>

                        {/* Location row */}
                        <View style={styles.locationRow}>
                            <Skeleton width={14} height={14} borderRadius={7} style={{ marginRight: 6, ...skeletonBg }} />
                            <Skeleton width={120} height={12} borderRadius={4} style={skeletonBg} />
                        </View>
                    </View>
                </View>

                {/* Tabs */}
                <View style={[styles.tabsContainer, { backgroundColor: homeColors.background, borderBottomColor: homeColors.border }]}>
                    <View style={styles.tabsRowContainer}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <View key={i} style={styles.tabEqual}>
                                <Skeleton width={50} height={12} borderRadius={4} style={skeletonBg} />
                            </View>
                        ))}
                    </View>
                </View>

                {/* Timeline Events Feed */}
                <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <View key={i} style={styles.timelineRow}>
                            <View style={styles.timelineLeftColumn}>
                                <Skeleton width={20} height={20} borderRadius={10} style={skeletonBg} />
                                <Skeleton width={22} height={10} borderRadius={3} style={{ marginTop: 4, ...skeletonBg }} />
                                <View style={[styles.timelineLine, { backgroundColor: homeColors.border }]} />
                            </View>
                            <View style={[styles.timelineEventCard, cardSurface]}>
                                <View style={{ flex: 1 }}>
                                    <Skeleton width="45%" height={14} borderRadius={4} style={{ marginBottom: 8, ...skeletonBg }} />
                                    <Skeleton width="75%" height={12} borderRadius={4} style={skeletonBg} />
                                </View>
                                <Skeleton width={28} height={28} borderRadius={14} style={skeletonBg} />
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1 },
    container: { flex: 1 },
    headerContainer: {
        paddingBottom: 20,
        borderBottomWidth: 1,
    },
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 10,
        marginBottom: 20,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    matchScoreCard: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    teamsScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginBottom: 15,
    },
    teamBlockRight: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'flex-end',
    },
    teamBlockLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'flex-start',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tabsContainer: {
        height: 48,
        borderBottomWidth: 1,
        justifyContent: 'center',
    },
    tabsRowContainer: {
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        alignItems: 'center',
    },
    tabEqual: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timelineRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    timelineLeftColumn: {
        width: 45,
        alignItems: 'center',
    },
    timelineLine: {
        width: 1,
        flex: 1,
        marginTop: 6,
        minHeight: 30,
    },
    timelineEventCard: {
        borderRadius: 12,
        padding: 14,
        marginLeft: 8,
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
});

export default MatchDetailSkeleton;

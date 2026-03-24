import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Skeleton from './Skeleton';

const MatchDetailSkeleton = () => {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header Container */}
            <View style={styles.headerContainer}>
                <View style={styles.topNav}>
                    <Skeleton width={30} height={30} borderRadius={15} />
                    <Skeleton width={150} height={20} />
                    <View style={{ width: 30 }} />
                </View>

                {/* Score Card */}
                <View style={styles.matchScoreCard}>
                    <Skeleton width={140} height={12} style={{ marginBottom: 15 }} />
                    <View style={styles.teamsScoreRow}>
                        <View style={styles.teamBlockRight}>
                            <Skeleton width={80} height={20} style={{ marginRight: 12 }} />
                            <Skeleton width={36} height={36} borderRadius={18} />
                        </View>
                        <Skeleton width={80} height={40} style={{ marginHorizontal: 20 }} />
                        <View style={styles.teamBlockLeft}>
                            <Skeleton width={36} height={36} borderRadius={18} style={{ marginRight: 12 }} />
                            <Skeleton width={80} height={20} />
                        </View>
                    </View>
                    <Skeleton width={120} height={12} />
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} width={80} height={15} style={{ marginHorizontal: 20, marginVertical: 18 }} />
                    ))}
                </ScrollView>
            </View>

            {/* Timeline Events */}
            <ScrollView style={{ flex: 1, padding: 16 }}>
                {[1, 2, 3, 4, 5].map(i => (
                    <View key={i} style={styles.timelineRow}>
                        <View style={styles.timelineLeftColumn}>
                            <Skeleton width={20} height={20} borderRadius={10} />
                            <Skeleton width={20} height={10} style={{ marginTop: 4 }} />
                            <View style={styles.timelineLine} />
                        </View>
                        <View style={styles.timelineEventCard}>
                            <View style={{ flex: 1 }}>
                                <Skeleton width="40%" height={15} style={{ marginBottom: 6 }} />
                                <Skeleton width="70%" height={12} />
                            </View>
                            <Skeleton width={20} height={20} borderRadius={4} />
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    headerContainer: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 10,
        marginBottom: 20,
    },
    matchScoreCard: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    teamsScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginBottom: 15,
    },
    teamBlockRight: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
    teamBlockLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-start' },
    tabsContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    timelineRow: { flexDirection: 'row', marginBottom: 16 },
    timelineLeftColumn: { width: 40, alignItems: 'center' },
    timelineLine: {
        width: 1,
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginTop: 5,
        minHeight: 30,
    },
    timelineEventCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 16,
        marginLeft: 8,
        flex: 1,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        flexDirection: 'row',
        alignItems: 'center',
    },
});

export default MatchDetailSkeleton;

import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Skeleton from './Skeleton';

const { width } = Dimensions.get('window');

const TeamProfileSkeleton = () => {
    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.heroSection}>
                    <View style={styles.heroContent}>
                        <View style={styles.mainLogoWrapper}>
                            <Skeleton width={140} height={140} borderRadius={70} />
                        </View>
                        <View style={styles.heroTextContainer}>
                            <View style={styles.badgeRow}>
                                <Skeleton width={120} height={20} borderRadius={10} />
                                <Skeleton width={80} height={20} borderRadius={10} />
                            </View>
                            <Skeleton width={200} height={32} borderRadius={8} style={{ marginTop: 16 }} />
                            <View style={[styles.heroStatsRow, { marginTop: 16 }]}>
                                <Skeleton width={100} height={16} borderRadius={4} />
                                <View style={styles.statDot} />
                                <Skeleton width={80} height={16} borderRadius={4} />
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.mainContent}>
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Skeleton width={180} height={24} borderRadius={4} />
                            <Skeleton width={120} height={16} borderRadius={4} />
                        </View>
                        <View style={styles.squadGrid}>
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <View key={i} style={styles.playerCardSkeleton}>
                                    <Skeleton width="100%" height={200} borderRadius={24} style={{ marginBottom: 12 }} />
                                    <Skeleton width="80%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                                    <Skeleton width="60%" height={16} borderRadius={4} style={{ marginBottom: 10 }} />
                                    <Skeleton width="40%" height={12} borderRadius={4} />
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    scrollContent: { paddingBottom: 40 },
    heroSection: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 50,
        borderBottomRightRadius: 50,
    },
    heroContent: { alignItems: 'center', marginTop: 40 },
    mainLogoWrapper: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center' },
    heroTextContainer: { alignItems: 'center', marginTop: 24 },
    badgeRow: { flexDirection: 'row', gap: 8 },
    heroStatsRow: { flexDirection: 'row', alignItems: 'center' },
    statDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 12 },
    mainContent: { padding: 24 },
    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    squadGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 },
    playerCardSkeleton: {
        width: (width - 64) / 2,
        margin: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 30,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
    },
});

export default TeamProfileSkeleton;

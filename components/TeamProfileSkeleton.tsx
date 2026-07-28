import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Skeleton from './Skeleton';

const { width } = Dimensions.get('window');

const TeamProfileSkeleton = () => {
    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* HERO SKELETON WITH BLUR */}
                <View style={styles.heroSection}>
                    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.heroContent}>
                        <View style={styles.mainLogoWrapper}>
                            <Skeleton width={140} height={140} borderRadius={12} />
                        </View>
                        <View style={styles.heroTextContainer}>
                            <View style={styles.badgeRow}>
                                <Skeleton width={120} height={24} borderRadius={10} />
                            </View>
                            <Skeleton width={220} height={36} borderRadius={10} style={{ marginTop: 16 }} />
                            <View style={[styles.heroStatsRow, { marginTop: 16 }]}>
                                <Skeleton width={90} height={16} borderRadius={6} />
                                <View style={styles.statDot} />
                                <Skeleton width={80} height={16} borderRadius={6} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* SQUAD GRID SKELETON (EXACT 1-TO-1 MATCH WITH TEAM DETAIL PLAYER CARDS) */}
                <View style={styles.mainContent}>
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Skeleton width={160} height={22} borderRadius={6} />
                            <Skeleton width={100} height={14} borderRadius={6} />
                        </View>

                        <View style={styles.squadGrid}>
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <View key={i} style={styles.playerCard}>
                                    <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                                    <View style={styles.playerPhotoContainer}>
                                        <Skeleton width="100%" height={160} borderRadius={20} />
                                        <View style={styles.playerNumberBadgePlaceholder}>
                                            <Skeleton width={34} height={20} borderRadius={10} />
                                        </View>
                                    </View>
                                    <View style={styles.playerInfo}>
                                        <Skeleton width="75%" height={14} borderRadius={4} style={{ marginTop: 12, marginBottom: 4 }} />
                                        <Skeleton width="55%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                                        <Skeleton width="40%" height={10} borderRadius={4} />
                                    </View>
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
    scrollContent: { paddingBottom: 60 },
    heroSection: {
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        overflow: 'hidden',
        paddingBottom: 40,
        paddingTop: 60,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderTopWidth: 0,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    heroContent: { alignItems: 'center', marginTop: 20 },
    mainLogoWrapper: { width: 140, height: 140, borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    heroTextContainer: { alignItems: 'center', marginTop: 24, paddingHorizontal: 20 },
    badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    heroStatsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 15, gap: 10 },
    statDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
    mainContent: { paddingHorizontal: 20, marginTop: 30 },
    section: { marginBottom: 35 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    squadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
    playerCard: {
        width: (width - 55) / 2,
        borderRadius: 30,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        overflow: 'hidden',
    },
    playerPhotoContainer: { width: '100%', height: 160, position: 'relative', overflow: 'hidden', borderRadius: 20 },
    playerNumberBadgePlaceholder: { position: 'absolute', bottom: 8, right: 8 },
    playerInfo: { paddingHorizontal: 4 },
});

export default TeamProfileSkeleton;

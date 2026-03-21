import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Skeleton from './Skeleton';
import Colors from '../constants/Colors';

const { width } = Dimensions.get('window');

const PlayerProfileSkeleton = () => {
    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Hero Section Skeleton */}
                <View style={styles.heroSection}>
                    <View style={styles.profileHeader}>
                        {/* Photo Placeholder */}
                        <View style={styles.photoContainer}>
                            <Skeleton width={160} height={160} borderRadius={24} />
                        </View>

                        {/* Name & Badges Placeholder */}
                        <View style={styles.nameContainer}>
                            <View style={styles.badgeRow}>
                                <Skeleton width={100} height={24} borderRadius={12} />
                                <Skeleton width={60} height={24} borderRadius={12} />
                            </View>
                            <Skeleton width={150} height={32} borderRadius={8} style={{ marginTop: 12 }} />
                            <Skeleton width={120} height={32} borderRadius={8} style={{ marginTop: 8 }} />

                            <View style={[styles.socialRow, { marginTop: 20 }]}>
                                <Skeleton width={36} height={36} borderRadius={18} />
                                <Skeleton width={36} height={36} borderRadius={18} style={{ marginLeft: 12 }} />
                                <Skeleton width={36} height={36} borderRadius={18} style={{ marginLeft: 12 }} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Content Section Skeleton */}
                <View style={styles.mainContent}>
                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        {[1, 2, 3, 4].map((i) => (
                            <View key={i} style={styles.statBoxSkeleton}>
                                <Skeleton width="100%" height={100} borderRadius={24} />
                            </View>
                        ))}
                    </View>

                    {/* Performance Bars */}
                    <View style={styles.performanceSection}>
                        {[1, 2].map((i) => (
                            <View key={i} style={{ marginBottom: 20 }}>
                                <Skeleton width={150} height={14} borderRadius={4} style={{ marginBottom: 10 }} />
                                <Skeleton width="100%" height={8} borderRadius={4} />
                            </View>
                        ))}
                    </View>

                    {/* Info Section */}
                    <View style={styles.infoSection}>
                        <Skeleton width={200} height={24} borderRadius={4} style={{ marginBottom: 20 }} />
                        {[1, 2, 3].map((i) => (
                            <View key={i} style={styles.infoRowSkeleton}>
                                <Skeleton width={40} height={40} borderRadius={20} />
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Skeleton width="40%" height={12} borderRadius={4} style={{ marginBottom: 6 }} />
                                    <Skeleton width="70%" height={16} borderRadius={4} />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0E1A',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    heroSection: {
        backgroundColor: '#050A18',
        paddingTop: 30,
        paddingBottom: 30,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 50,
        borderBottomRightRadius: 50,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginTop: 80,
        gap: 24,
        paddingBottom: 0,
    },
    photoContainer: {
        position: 'relative',
    },
    nameContainer: {
        flex: 1,
        marginBottom: 0,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    socialRow: {
        flexDirection: 'row',
    },
    mainContent: {
        padding: 24,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -8,
        marginBottom: 24,
    },
    statBoxSkeleton: {
        width: '50%',
        padding: 8,
    },
    performanceSection: {
        marginBottom: 32,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 20,
        borderRadius: 30,
    },
    infoSection: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 20,
        borderRadius: 30,
    },
    infoRowSkeleton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
});

export default PlayerProfileSkeleton;

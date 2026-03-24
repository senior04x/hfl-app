import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Skeleton from './Skeleton';

const { width } = Dimensions.get('window');

const HomeSkeleton = () => {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header Skeleton */}
            <View style={styles.header}>
                <Skeleton width={44} height={44} borderRadius={22} style={{ marginRight: 15 }} />
                <View style={{ flex: 1 }}>
                    <Skeleton width={100} height={12} style={{ marginBottom: 6 }} />
                    <Skeleton width={160} height={20} />
                </View>
            </View>

            {/* Slider Skeleton */}
            <View style={styles.slider}>
                <Skeleton width={width - 40} height={180} borderRadius={20} />
            </View>

            {/* Section 1 Skeleton */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Skeleton width={120} height={20} />
                    <Skeleton width={60} height={15} />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                    {[1, 2].map((i) => (
                        <View key={i} style={styles.hMatchCard}>
                            <View style={styles.hMatchHeader}>
                                <Skeleton width={80} height={12} />
                                <Skeleton width={40} height={12} />
                            </View>
                            <View style={styles.hMatchTeamsRow}>
                                <View style={styles.hTeamColumn}>
                                    <Skeleton width={50} height={50} borderRadius={25} style={{ marginBottom: 8 }} />
                                    <Skeleton width={40} height={12} />
                                </View>
                                <Skeleton width={40} height={25} style={{ marginHorizontal: 10 }} />
                                <View style={styles.hTeamColumn}>
                                    <Skeleton width={50} height={50} borderRadius={25} style={{ marginBottom: 8 }} />
                                    <Skeleton width={40} height={12} />
                                </View>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* Mini Banner Skeleton */}
            <View style={styles.miniBannerSkeleton}>
                <View style={{ flex: 1 }}>
                    <Skeleton width={130} height={18} style={{ marginBottom: 6 }} />
                    <Skeleton width={180} height={12} />
                </View>
                <Skeleton width={100} height={32} borderRadius={8} />
            </View>

            {/* Section 2 Skeleton */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Skeleton width={140} height={20} />
                </View>
                {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.listItem}>
                        <Skeleton width="100%" height={60} borderRadius={12} />
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 15,
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    slider: {
        paddingHorizontal: 20,
        marginBottom: 25,
    },
    section: {
        marginBottom: 25,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    hMatchCard: {
        width: width - 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    hMatchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    hMatchTeamsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    hTeamColumn: {
        alignItems: 'center',
    },
    miniBannerSkeleton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginHorizontal: 20,
        borderRadius: 16,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    listItem: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
});

export default HomeSkeleton;

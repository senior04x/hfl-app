import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Skeleton from './Skeleton';

const { width } = Dimensions.get('window');

const HomeSkeleton = () => {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header Skeleton */}
            <View style={styles.header}>
                <View>
                    <Skeleton width={100} height={15} style={{ marginBottom: 6 }} />
                    <Skeleton width={150} height={30} />
                </View>
                <Skeleton width={40} height={40} borderRadius={20} />
            </View>

            {/* Slider Skeleton */}
            <View style={styles.slider}>
                <Skeleton width={width - 40} height={180} borderRadius={20} />
            </View>

            {/* Section 1 Skeleton (Live or Recommended) */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Skeleton width={120} height={25} />
                    <Skeleton width={60} height={20} />
                </View>
                <View style={styles.horizontalScroll}>
                    <View style={styles.hMatchCard}>
                        {/* Match Header */}
                        <View style={styles.hMatchHeader}>
                            <Skeleton width={100} height={15} />
                            <Skeleton width={40} height={15} />
                        </View>
                        {/* Teams Row */}
                        <View style={styles.hMatchTeamsRow}>
                            <View style={styles.hTeamColumn}>
                                <Skeleton width={60} height={60} borderRadius={30} style={{ marginBottom: 10 }} />
                                <Skeleton width={60} height={15} />
                            </View>
                            <Skeleton width={50} height={30} />
                            <View style={styles.hTeamColumn}>
                                <Skeleton width={60} height={60} borderRadius={30} style={{ marginBottom: 10 }} />
                                <Skeleton width={60} height={15} />
                            </View>
                        </View>
                        {/* Footer */}
                        <View style={{ alignItems: 'center' }}>
                            <Skeleton width={80} height={12} />
                        </View>
                    </View>
                </View>
            </View>

            {/* Banner Skeleton */}
            <View style={styles.banner}>
                <Skeleton width={width - 40} height={100} borderRadius={16} />
            </View>

            {/* Section 2 Skeleton (Recent) */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Skeleton width={150} height={25} />
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
        backgroundColor: '#0a1020',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#1A2138',
    },
    hMatchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#1A2138',
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
    horizontalScroll: {
        paddingHorizontal: 20,
    },
    banner: {
        paddingHorizontal: 20,
        marginBottom: 25,
    },
    listItem: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
});

export default HomeSkeleton;

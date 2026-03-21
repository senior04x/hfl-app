import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import Skeleton from './Skeleton';
import Colors from '../constants/Colors';

const LeaguesSkeleton = () => {
    return (
        <View style={styles.container}>
            {/* Header Skeleton */}
            <View style={styles.header}>
                <Skeleton width={150} height={30} />
                <Skeleton width={40} height={40} borderRadius={8} />
            </View>

            <View style={styles.list}>
                {[1, 2].map((i) => (
                    <View key={i} style={styles.leagueCard}>
                        {/* Image area */}
                        <View style={styles.cardImage}>
                            <Skeleton width="100%" height="100%" borderRadius={0} />
                            <View style={styles.badge}>
                                <Skeleton width={80} height={20} borderRadius={10} />
                            </View>
                        </View>
                        {/* Info area */}
                        <View style={styles.infoArea}>
                            <View style={styles.infoTop}>
                                <View>
                                    <Skeleton width={180} height={25} style={{ marginBottom: 6 }} />
                                    <Skeleton width={100} height={15} />
                                </View>
                                <Skeleton width={40} height={40} borderRadius={12} />
                            </View>
                            <View style={styles.stats}>
                                <Skeleton width={80} height={30} borderRadius={10} style={{ marginRight: 10 }} />
                                <Skeleton width={80} height={30} borderRadius={10} />
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    list: {
        padding: 16,
    },
    leagueCard: {
        width: '100%',
        backgroundColor: Colors.surface,
        marginBottom: 24,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    cardImage: {
        width: '100%',
        aspectRatio: 1,
    },
    badge: {
        position: 'absolute',
        top: 12,
        left: 12,
    },
    infoArea: {
        padding: 18,
    },
    infoTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    stats: {
        flexDirection: 'row',
    },
});

export default LeaguesSkeleton;

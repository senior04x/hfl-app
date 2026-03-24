import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Skeleton from './Skeleton';

interface MatchesListSkeletonProps {
    count?: number;
}

const MatchesListSkeleton: React.FC<MatchesListSkeletonProps> = ({ count = 5 }) => {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {[...Array(count)].map((_, i) => (
                <View key={i} style={styles.matchCard}>
                    <View style={styles.metaRow}>
                        <Skeleton width={80} height={12} borderRadius={4} />
                        <Skeleton width={60} height={12} borderRadius={4} />
                    </View>
                    <View style={styles.teamsRow}>
                        <View style={styles.sideTeam}>
                            <Skeleton width={50} height={16} borderRadius={4} />
                            <Skeleton circle height={34} width={34} style={{ marginLeft: 8 }} />
                        </View>
                        <Skeleton width={60} height={30} borderRadius={8} style={{ marginHorizontal: 10 }} />
                        <View style={styles.sideTeam}>
                            <Skeleton circle height={34} width={34} style={{ marginRight: 8 }} />
                            <Skeleton width={50} height={16} borderRadius={4} />
                        </View>
                    </View>
                    <View style={styles.stadiumRow}>
                        <Skeleton width={120} height={10} borderRadius={4} />
                    </View>
                </View>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    matchCard: {
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    teamsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    sideTeam: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 100,
        justifyContent: 'center',
    },
    stadiumRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default MatchesListSkeleton;

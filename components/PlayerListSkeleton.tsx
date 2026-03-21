import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Skeleton from './Skeleton';
import Colors from '../constants/Colors';

const PlayerListSkeleton = () => {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <View key={i} style={styles.playerCard}>
                    <View style={styles.rankContainer}>
                        <Skeleton width={20} height={20} />
                    </View>

                    <Skeleton width={44} height={44} borderRadius={22} style={{ marginRight: 12 }} />

                    <View style={styles.info}>
                        <Skeleton width={120} height={16} style={{ marginBottom: 6 }} />
                        <Skeleton width={80} height={12} />
                    </View>

                    <View style={styles.statContainer}>
                        <Skeleton width={20} height={18} style={{ marginBottom: 4 }} />
                        <Skeleton width={40} height={10} />
                    </View>
                </View>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
    playerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#051024',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1A2138',
    },
    rankContainer: { width: 30, alignItems: 'center', marginRight: 8 },
    info: { flex: 1 },
    statContainer: { alignItems: 'center', paddingLeft: 10 },
});

export default PlayerListSkeleton;

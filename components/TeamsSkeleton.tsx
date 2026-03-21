import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import Skeleton from './Skeleton';

const TeamsSkeleton = () => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Skeleton width={32} height={32} borderRadius={16} />
                <Skeleton width={100} height={25} />
                <Skeleton width={32} height={32} borderRadius={16} />
            </View>
            <View style={styles.list}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <View key={i} style={styles.teamCard}>
                        <Skeleton width={50} height={50} borderRadius={25} style={{ marginRight: 16 }} />
                        <View style={styles.info}>
                            <Skeleton width={120} height={20} style={{ marginBottom: 6 }} />
                            <Skeleton width={80} height={15} />
                        </View>
                        <Skeleton width={20} height={24} />
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#2a3245',
    },
    list: {
        padding: 16,
    },
    teamCard: {
        backgroundColor: '#121722',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2a3245',
    },
    info: {
        flex: 1,
    },
});

export default TeamsSkeleton;

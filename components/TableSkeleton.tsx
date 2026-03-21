import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Skeleton from './Skeleton';
import Colors from '../constants/Colors';

const TableSkeleton = () => {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header Row */}
            <View style={styles.headerRow}>
                <Skeleton width={30} height={12} style={{ marginRight: 10 }} />
                <Skeleton width={120} height={12} style={{ flex: 1 }} />
                <View style={styles.statsRow}>
                    <Skeleton width={20} height={12} style={{ marginLeft: 8 }} />
                    <Skeleton width={20} height={12} style={{ marginLeft: 8 }} />
                    <Skeleton width={30} height={12} style={{ marginLeft: 12 }} />
                </View>
            </View>

            {/* Content Rows */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                <View key={i} style={styles.contentRow}>
                    <Skeleton width={25} height={14} style={{ marginRight: 10 }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Skeleton width={24} height={24} borderRadius={12} style={{ marginRight: 10 }} />
                        <Skeleton width={100} height={14} />
                    </View>
                    <View style={styles.statsRow}>
                        <Skeleton width={20} height={14} style={{ marginLeft: 8 }} />
                        <Skeleton width={20} height={14} style={{ marginLeft: 8 }} />
                        <Skeleton width={30} height={14} style={{ marginLeft: 12 }} />
                    </View>
                </View>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, padding: 10 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.surface,
        borderRadius: 8,
        marginBottom: 8
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.surface,
        borderRadius: 8,
        marginVertical: 2
    },
    statsRow: { flexDirection: 'row', alignItems: 'center' },
});

export default TableSkeleton;

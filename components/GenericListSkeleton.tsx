import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Skeleton from './Skeleton';

interface GenericListSkeletonProps {
    itemHeight?: number;
    count?: number;
    hasPadding?: boolean;
}

const GenericListSkeleton: React.FC<GenericListSkeletonProps> = ({
    itemHeight = 84,
    count = 8,
    hasPadding = true
}) => {
    return (
        <ScrollView style={[styles.container, !hasPadding && { padding: 0 }]} showsVerticalScrollIndicator={false}>
            {[...Array(count)].map((_, i) => (
                <View key={i} style={[styles.item, { height: itemHeight }]}>
                    <Skeleton width="100%" height="100%" borderRadius={16} />
                </View>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#020610'
    },
    item: {
        marginBottom: 12,
        backgroundColor: '#051024',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1A2138'
    },
});

export default GenericListSkeleton;

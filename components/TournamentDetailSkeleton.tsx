import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Skeleton from './Skeleton';
import Colors from '../constants/Colors';

const TournamentDetailSkeleton = () => {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Skeleton width={28} height={28} borderRadius={14} style={{ marginRight: 16 }} />
                <Skeleton width={180} height={24} style={{ flex: 1 }} />
                <Skeleton width={80} height={30} borderRadius={4} />
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} width={80} height={20} style={{ marginHorizontal: 20, marginVertical: 14 }} />
                    ))}
                </ScrollView>
            </View>

            <ScrollView style={{ flex: 1 }}>
                {/* Information Card */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Skeleton width={120} height={20} />
                    </View>
                    {[1, 2, 3, 4, 5].map(i => (
                        <View key={i} style={styles.infoRow}>
                            <Skeleton width={100} height={15} />
                            <Skeleton width={80} height={15} />
                        </View>
                    ))}
                </View>

                {/* Organizers Card */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Skeleton width={140} height={20} />
                    </View>
                    <View style={styles.organizerRow}>
                        <Skeleton width={40} height={40} borderRadius={20} style={{ marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                            <Skeleton width={120} height={18} style={{ marginBottom: 6 }} />
                            <Skeleton width={100} height={14} />
                        </View>
                        <Skeleton width={32} height={32} borderRadius={16} />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020610' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#020610' },
    tabsContainer: { borderBottomWidth: 1, borderBottomColor: '#1A2138', backgroundColor: '#020610' },
    sectionCard: { marginTop: 10, backgroundColor: '#081021', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1A2138' },
    sectionHeader: { backgroundColor: '#040B18', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1A2138' },
    infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
    organizerRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
});

export default TournamentDetailSkeleton;

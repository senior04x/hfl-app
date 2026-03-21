import React from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import Skeleton from './Skeleton';
import Colors from '../constants/Colors';

const CalendarSkeleton = () => {
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Skeleton width={50} height={24} style={{ marginRight: 10 }} />
                <Skeleton width={100} height={22} />
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <Skeleton width={120} height={20} style={{ marginHorizontal: 20, marginVertical: 12 }} />
                <Skeleton width={120} height={20} style={{ marginHorizontal: 20, marginVertical: 12 }} />
            </View>

            {/* Date Filters */}
            <View style={styles.dateFiltersRow}>
                <Skeleton width="45%" height={45} borderRadius={8} />
                <View style={{ width: 1, height: '70%', backgroundColor: '#1A2138', marginHorizontal: 10 }} />
                <Skeleton width="45%" height={45} borderRadius={8} />
            </View>

            {/* Matches List */}
            <ScrollView style={styles.listContainer}>
                {[1, 2, 3].map(day => (
                    <View key={day} style={styles.dayGroup}>
                        {/* Section Header */}
                        <View style={styles.sectionHeaderContainer}>
                            <Skeleton width={150} height={30} borderRadius={6} />
                        </View>

                        {/* Tournament Rows */}
                        <View style={styles.tournamentsList}>
                            {[1, 2, 3, 4].map(tourney => (
                                <View key={tourney} style={styles.tournamentRow}>
                                    <Skeleton width={180} height={18} />
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Skeleton width={60} height={16} style={{ marginRight: 8 }} />
                                        <Skeleton width={16} height={16} borderRadius={8} />
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
    tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1A2138' },
    dateFiltersRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
    listContainer: { flex: 1 },
    dayGroup: { marginBottom: 20 },
    sectionHeaderContainer: { paddingHorizontal: 16, marginTop: 15, marginBottom: 5 },
    tournamentsList: { paddingHorizontal: 16 },
    tournamentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1A2138' },
});

export default CalendarSkeleton;

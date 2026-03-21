import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Modal,
    Pressable,
    ActivityIndicator,
    Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import CalendarSkeleton from '../components/CalendarSkeleton';

export default function CalendarScreen({ navigation }: any) {
    const [selectedTab, setSelectedTab] = useState<'all' | 'my'>('all');
    const [calendarData, setCalendarData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Date Picker State
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [startDate, setStartDate] = useState(9);
    const [endDate, setEndDate] = useState(16);
    const [tempStartDate, setTempStartDate] = useState(9);
    const [tempEndDate, setTempEndDate] = useState(16);

    useEffect(() => {
        fetchMatches();
    }, []);

    const fetchMatches = async () => {
        try {
            setLoading(true);
            const data = await apiService.getMatches();
            if (data && Array.isArray(data)) {
                // Group matches by date
                const groups: { [key: string]: any } = {};

                data.forEach(match => {
                    const dateObj = new Date(match.date || match.scheduledAt);
                    const dateKey = dateObj.toLocaleDateString('uz-UZ', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        weekday: 'short'
                    });

                    if (!groups[dateKey]) {
                        groups[dateKey] = {
                            date: dateKey,
                            tournaments: {}
                        };
                    }

                    const tId = match.tournamentId || 'unassigned';
                    const tName = match.tournamentName || "No'malum Turnir";

                    if (!groups[dateKey].tournaments[tId]) {
                        groups[dateKey].tournaments[tId] = {
                            id: tId,
                            name: tName,
                            matches: 0
                        };
                    }
                    groups[dateKey].tournaments[tId].matches += 1;
                });

                // Convert to array format
                const formattedData = Object.values(groups).map((day: any) => ({
                    ...day,
                    tournaments: Object.values(day.tournaments)
                })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                setCalendarData(formattedData);
            }
        } catch (error) {
            console.error('Error fetching calendar matches:', error);
        } finally {
            setLoading(false);
        }
    };

    const openDatePicker = () => {
        setTempStartDate(startDate);
        setTempEndDate(endDate);
        setDatePickerVisible(true);
    };

    const confirmDates = () => {
        setStartDate(tempStartDate);
        setEndDate(tempEndDate);
        setDatePickerVisible(false);
    };

    const handleDayPress = (day: number) => {
        if (!tempStartDate || (tempStartDate && tempEndDate)) {
            // Start a new selection
            setTempStartDate(day);
            setTempEndDate(0); // Reset end date
        } else if (day < tempStartDate) {
            // Selected a date before start date, make it the new start date
            setTempStartDate(day);
        } else {
            // Selected an end date
            setTempEndDate(day);
        }
    };

    // Calendar UI helper (Hardcoded for March 2026 to match screenshot context)
    const daysInMonth = 31;
    const startDayOfWeek = 6; // March 1, 2026 is a Sunday (index 6 if Monday is 0)

    const renderCalendarGrid = () => {
        const days = [];
        const daysOfWeek = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']; // Uzbek days

        // Render Day Headers
        const headerRow = daysOfWeek.map((d, i) => (
            <View key={`header-${i}`} style={styles.calCell}>
                <Text style={styles.calHeaderText}>{d}</Text>
            </View>
        ));
        days.push(<View key="headers" style={styles.calRow}>{headerRow}</View>);

        // Render Days
        let currentRow: any[] = [];
        // Empty cells before the 1st
        for (let i = 0; i < startDayOfWeek; i++) {
            currentRow.push(<View key={`empty-${i}`} style={styles.calCell} />);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const isStart = i === tempStartDate;
            const isEnd = i === tempEndDate;
            const isInRange = tempStartDate && tempEndDate && i > tempStartDate && i < tempEndDate;
            const isSelected = isStart || isEnd;

            // Determine if we need rounded corners for range
            const leftRounded = isStart ? styles.calCellStart : null;
            const rightRounded = isEnd ? styles.calCellEnd : null;
            const bgStyle = isInRange ? styles.calCellInRange : (isSelected ? styles.calCellSelected : null);

            currentRow.push(
                <TouchableOpacity
                    key={`day-${i}`}
                    style={[styles.calCell, bgStyle, leftRounded, rightRounded]}
                    onPress={() => handleDayPress(i)}
                >
                    <Text style={[styles.calDayText, isSelected && styles.calDayTextSelected]}>{i}</Text>
                </TouchableOpacity>
            );

            if (currentRow.length === 7) {
                days.push(<View key={`row-${i}`} style={styles.calRow}>{currentRow}</View>);
                currentRow = [];
            }
        }

        // Add remaining row if not empty
        if (currentRow.length > 0) {
            while (currentRow.length < 7) {
                currentRow.push(<View key={`empty-end-${currentRow.length}`} style={styles.calCell} />);
            }
            days.push(<View key={`row-end`} style={styles.calRow}>{currentRow}</View>);
        }

        return days;
    };

    if (loading && calendarData.length === 0) {
        return <CalendarSkeleton />;
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Amatora</Text>
                <Text style={styles.headerSubtitle}>Taqvim</Text>
            </View>

            {/* Top Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'all' && styles.activeTab]}
                    onPress={() => setSelectedTab('all')}
                >
                    <Text style={[styles.tabText, selectedTab === 'all' && styles.activeTabText]}>Barcha o'yinlar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'my' && styles.activeTab]}
                    onPress={() => setSelectedTab('my')}
                >
                    <Text style={[styles.tabText, selectedTab === 'my' && styles.activeTabText]}>Mening taqvimim</Text>
                </TouchableOpacity>
            </View>

            {/* Date Filters */}
            <View style={styles.dateFiltersRow}>
                <TouchableOpacity style={styles.dateFilterBox} onPress={openDatePicker}>
                    <View>
                        <Text style={styles.dateLabel}>Dan</Text>
                        <Text style={styles.dateValue}>{String(startDate).padStart(2, '0')} mart. 2026</Text>
                    </View>
                    <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>

                <View style={styles.dateSeparator} />

                <TouchableOpacity style={styles.dateFilterBox} onPress={openDatePicker}>
                    <View>
                        <Text style={styles.dateLabel}>Gacha</Text>
                        <Text style={styles.dateValue}>{tempEndDate || endDate ? `${String(endDate).padStart(2, '0')} mart. 2026` : 'Tanlanmagan'}</Text>
                    </View>
                    <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Matches List */}
            <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
                {calendarData.length === 0 ? (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <Text style={{ color: Colors.textMuted }}>O'yinlar topilmadi</Text>
                    </View>
                ) : (
                    calendarData.map((dayGroup: any, index: number) => (
                        <View key={index} style={styles.dayGroup}>
                            {/* Section Header */}
                            <View style={styles.sectionHeaderContainer}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionHeaderText}>{dayGroup.date}</Text>
                                </View>
                            </View>

                            {/* Tournament Rows */}
                            <View style={styles.tournamentsList}>
                                {dayGroup.tournaments.map((tourney: any) => (
                                    <TouchableOpacity
                                        key={tourney.id}
                                        style={styles.tournamentRow}
                                        onPress={() => navigation.navigate('CalendarMatches', {
                                            tournamentName: tourney.name,
                                            date: dayGroup.date
                                        })}
                                    >
                                        <Text style={styles.tournamentName}>{tourney.name}</Text>
                                        <View style={styles.matchCountBadge}>
                                            <Text style={styles.matchCountText}>
                                                {tourney.matches} {tourney.matches === 1 ? 'ta o\'yin' : 'ta o\'yin'}
                                            </Text>
                                            <Ionicons name="arrow-forward" size={16} color={Colors.primary} style={{ marginLeft: 4, marginTop: 1 }} />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Date Picker Bottom Sheet Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isDatePickerVisible}
                onRequestClose={() => setDatePickerVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setDatePickerVisible(false)} />
                    <View style={styles.modalContent}>
                        {/* Drag indicator */}
                        <View style={styles.dragIndicator} />

                        {/* Top Selected Dates Display */}
                        <View style={styles.modalDatesDisplay}>
                            <View style={styles.modalDateBox}>
                                <Text style={styles.modalDateLabel}>Dan</Text>
                                <Text style={styles.modalDateValue}>{String(tempStartDate).padStart(2, '0')} mart. 2026</Text>
                            </View>
                            <View style={styles.modalDateBox}>
                                <Text style={styles.modalDateLabel}>Gacha</Text>
                                <Text style={styles.modalDateValue}>{tempEndDate ? `${String(tempEndDate).padStart(2, '0')} mart. 2026` : 'Tanlang'}</Text>
                            </View>
                        </View>

                        {/* Month Header */}
                        <View style={styles.monthHeaderRow}>
                            <TouchableOpacity><Ionicons name="chevron-back" size={20} color={Colors.primary} /></TouchableOpacity>
                            <Text style={styles.monthHeaderText}>mart 2026</Text>
                            <TouchableOpacity><Ionicons name="chevron-forward" size={20} color={Colors.primary} /></TouchableOpacity>
                        </View>

                        {/* Calendar Grid */}
                        <View style={styles.calendarGrid}>
                            {renderCalendarGrid()}
                        </View>

                        {/* Confirm Button */}
                        <TouchableOpacity style={styles.confirmBtn} onPress={confirmDates}>
                            <Text style={styles.confirmBtnText}>Tasdiqlash</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 15,
        backgroundColor: Colors.background,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '900',
        fontStyle: 'italic',
        letterSpacing: 1,
    },
    headerSubtitle: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#1A2138',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#051024',
    },
    tabText: {
        color: '#8A94A6',
        fontSize: 14,
        fontWeight: '600',
    },
    activeTabText: {
        color: '#FFF',
    },
    dateFiltersRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#1A2138',
    },
    dateFilterBox: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#051024',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    dateSeparator: {
        width: 1,
        height: '70%',
        backgroundColor: '#1A2138',
        marginHorizontal: 10,
    },
    dateLabel: {
        color: '#8A94A6',
        fontSize: 12,
        marginBottom: 2,
    },
    dateValue: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    listContainer: {
        flex: 1,
    },
    dayGroup: {
        marginBottom: 20,
    },
    sectionHeaderContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginTop: 15,
        marginBottom: 5,
    },
    sectionHeader: {
        backgroundColor: '#051024',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: Colors.primary,
    },
    sectionHeaderText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
    tournamentsList: {
        paddingHorizontal: 16,
    },
    tournamentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1A2138',
    },
    tournamentName: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '500',
    },
    matchCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    matchCountText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalBackdrop: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: '#051024',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingTop: 12,
    },
    dragIndicator: {
        width: 40,
        height: 4,
        backgroundColor: '#1A2138',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalDatesDisplay: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1A2138',
    },
    modalDateBox: {
        flex: 1,
    },
    modalDateLabel: {
        color: '#8A94A6',
        fontSize: 12,
        marginBottom: 4,
    },
    modalDateValue: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    monthHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#0A142F',
    },
    monthHeaderText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    calendarGrid: {
        paddingHorizontal: 10,
        paddingBottom: 20,
        backgroundColor: '#051024',
    },
    calRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 8,
    },
    calCell: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calHeaderText: {
        color: '#8A94A6',
        fontSize: 13,
        fontWeight: '500',
    },
    calDayText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
    },
    calCellSelected: {
        backgroundColor: Colors.primary,
    },
    calCellInRange: {
        backgroundColor: 'rgba(0, 255, 102, 0.15)',
    },
    calCellStart: {
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
    },
    calCellEnd: {
        borderTopRightRadius: 20,
        borderBottomRightRadius: 20,
    },
    calDayTextSelected: {
        color: '#000',
        fontWeight: 'bold',
    },
    confirmBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 18,
        alignItems: 'center',
    },
    confirmBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

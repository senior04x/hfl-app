import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    Modal,
    Pressable,
    ActivityIndicator,
    Image,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import AnimatedBackground from '../components/AnimatedBackground';
import backgroundImage from '../assets/images/backroud-image.png';
import CustomRefreshControl from '../components/CustomRefreshControl';
import { useTranslation } from 'react-i18next';
import AppNavbar from '../components/AppNavbar';

// ─── Skeleton Components ────────────────────────────────────────────────────
const SkeletonBox: React.FC<{ width?: number | string; height?: number; borderRadius?: number; style?: any }> = ({
    width = '100%', height = 14, borderRadius = 6, style
}) => {
    const anim = useRef(new Animated.Value(0.3)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 0.65, duration: 750, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.3, duration: 750, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return (
        <Animated.View style={[{ width, height, borderRadius, backgroundColor: 'rgba(255,255,255,0.18)', opacity: anim }, style]} />
    );
};

const CalendarSkeletonLoader = () => (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
        {[1, 2, 3].map((g) => (
            <View key={g} style={{ gap: 8 }}>
                {/* Date header */}
                <View style={{ borderRadius: 10, overflow: 'hidden', padding: 12, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <SkeletonBox width={180} height={13} borderRadius={5} />
                </View>
                {/* Match rows */}
                {[1, 2].map((r) => (
                    <View key={r} style={{ borderRadius: 12, overflow: 'hidden', padding: 16, backgroundColor: 'rgba(255,255,255,0.04)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ gap: 6, flex: 1 }}>
                            <SkeletonBox width={'70%'} height={14} borderRadius={5} />
                            <SkeletonBox width={80} height={11} borderRadius={4} />
                        </View>
                        <SkeletonBox width={36} height={24} borderRadius={8} />
                    </View>
                ))}
            </View>
        ))}
    </View>
);

export default function CalendarScreen({ navigation }: any) {
    const { t, i18n } = useTranslation();
    const [selectedTab, setSelectedTab] = useState<'all' | 'my'>('all');
    const [calendarData, setCalendarData] = useState<any[]>([]);
    const [displayData, setDisplayData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Date Picker State
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    
    // Dynamic defaults: Today and Today + 7 days
    const today = new Date();
    const [startDate, setStartDate] = useState(today.getDate());
    const [endDate, setEndDate] = useState(today.getDate() + 7);
    const [tempStartDate, setTempStartDate] = useState(today.getDate());
    const [tempEndDate, setTempEndDate] = useState(today.getDate() + 7);
    
    // Current viewed month/year
    const [viewDate, setViewDate] = useState(new Date()); 


    useEffect(() => {
        fetchMatches();
    }, [startDate, endDate, viewDate]);

    const fetchMatches = async () => {
        try {
            setLoading(true);
            
            // Format dates for local filtering
            const startLimit = new Date(viewDate.getFullYear(), viewDate.getMonth(), startDate);
            startLimit.setHours(0, 0, 0, 0);
            const endLimit = new Date(viewDate.getFullYear(), viewDate.getMonth(), endDate || startDate);
            endLimit.setHours(23, 59, 59, 999);
            
            // Fetch all matches (safest since backend filtering is inconsistent)
            const data = await apiService.getMatches();
            
            if (data && Array.isArray(data)) {
                // Filter matches by selected date range in frontend
                const filteredByDate = data.filter(match => {
                    const matchDate = new Date(match.date || match.scheduledAt);
                    return matchDate >= startLimit && matchDate <= endLimit;
                });

                const groups: { [key: string]: any } = {};
                filteredByDate.forEach(match => {
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
                            timestamp: dateObj.getTime(),
                            tournaments: {}
                        };
                    }

                    const tourneyName = match.tournamentName || match.league || 'Boshqa';
                    if (!groups[dateKey].tournaments[tourneyName]) {
                        groups[dateKey].tournaments[tourneyName] = {
                            id: `${dateKey}_${tourneyName}`,
                            name: tourneyName,
                            matches: []
                        };
                    }

                    groups[dateKey].tournaments[tourneyName].matches.push(match);
                });

                const formatted = Object.values(groups)
                    .sort((a: any, b: any) => a.timestamp - b.timestamp)
                    .map((group: any) => ({
                        date: group.date,
                        tournaments: Object.values(group.tournaments)
                    }));

                setCalendarData(formatted);
                setDisplayData(formatted);
            }
        } catch (error) {
            console.error('Error fetching calendar matches:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchMatches();
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
            setTempStartDate(day);
            setTempEndDate(0);
        } else if (day < tempStartDate) {
            setTempStartDate(day);
        } else {
            setTempEndDate(day);
        }
    };

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        let day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust for Monday start
    };

    const renderCalendarGrid = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const startDayOfWeek = getFirstDayOfMonth(year, month);
        
        const days = [];
        const daysOfWeek = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']; 

        const headerRow = daysOfWeek.map((d, i) => (
            <View key={`header-${i}`} style={styles.calCell}>
                <Text style={styles.calHeaderText}>{d}</Text>
            </View>
        ));
        days.push(<View key="headers" style={styles.calRow}>{headerRow}</View>);

        let currentRow: any[] = [];
        for (let i = 0; i < startDayOfWeek; i++) {
            currentRow.push(<View key={`empty-${i}`} style={styles.calCell} />);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const isStart = i === tempStartDate;
            const isEnd = i === tempEndDate;
            const isInRange = tempStartDate && tempEndDate && i > tempStartDate && i < tempEndDate;
            const isSelected = isStart || isEnd;

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

        if (currentRow.length > 0) {
            while (currentRow.length < 7) {
                currentRow.push(<View key={`empty-end-${currentRow.length}`} style={styles.calCell} />);
            }
            days.push(<View key={`row-end`} style={styles.calRow}>{currentRow}</View>);
        }

        return days;
    };

    return (
        <AnimatedBackground overlayOpacity={0.75} backgroundImage={backgroundImage}>

            <SafeAreaView style={styles.container}>
                {/* Universal App Navbar */}
                <AppNavbar
                    title={t('calendar.title', 'TAQVIM')}
                    subtitle="AMATORA"
                />

                {/* Top Tabs */}
                <View style={styles.tabsContainer}>
                    <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
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
                    <BlurView intensity={5} tint="dark" style={StyleSheet.absoluteFill} />
                    <TouchableOpacity style={styles.dateFilterBox} onPress={openDatePicker}>
                        <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={{ padding: 10 }}>
                            <Text style={styles.dateLabel}>{t('common.from')}</Text>
                            <Text style={styles.dateValue}>{`${String(startDate).padStart(2, '0')} ${viewDate.toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : (i18n.language === 'en' ? 'en-US' : 'uz-UZ'), { month: 'short' })}. ${viewDate.getFullYear()}`}</Text>
                        </View>
                        <Ionicons name="calendar-outline" size={20} color={Colors.primary} style={{ marginRight: 10 }} />
                    </TouchableOpacity>

                    <View style={styles.dateSeparator} />

                    <TouchableOpacity style={styles.dateFilterBox} onPress={openDatePicker}>
                        <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={{ padding: 10 }}>
                            <Text style={styles.dateLabel}>{t('common.to')}</Text>
                            <Text style={styles.dateValue}>{tempEndDate || endDate ? `${String(endDate).padStart(2, '0')} ${viewDate.toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : (i18n.language === 'en' ? 'en-US' : 'uz-UZ'), { month: 'short' })}. ${viewDate.getFullYear()}` : t('common.not_selected')}</Text>
                        </View>
                        <Ionicons name="calendar-outline" size={20} color={Colors.primary} style={{ marginRight: 10 }} />
                    </TouchableOpacity>
                </View>

                {/* Matches List */}
                <FlatList
                    style={styles.listContainer}
                    data={displayData}
                    keyExtractor={(item, index) => item.id || item.date || String(index)}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 110 }}
                    refreshControl={
                        <CustomRefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                    ListEmptyComponent={
                        loading ? (
                            <CalendarSkeletonLoader />
                        ) : (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <Text style={{ color: Colors.textMuted }}>{t('common.no_data')}</Text>
                            </View>
                        )
                    }
                    renderItem={({ item: dayGroup }) => (
                        <View style={styles.dayGroup}>
                            <View style={styles.sectionHeaderContainer}>
                                <View style={styles.sectionHeader}>
                                    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                                    <Text style={styles.sectionHeaderText}>{dayGroup.date.toUpperCase()}</Text>
                                </View>
                            </View>

                            <View style={styles.tournamentsList}>
                                {dayGroup.tournaments.map((tourney: any) => (
                                    <TouchableOpacity
                                        key={tourney.id}
                                        style={styles.tournamentRow}
                                        onPress={() => navigation.navigate('CalendarMatches', {
                                            tournamentId: tourney.id,
                                            tournamentName: tourney.name,
                                            date: dayGroup.date,
                                            matches: tourney.matches
                                        })}
                                    >
                                        <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
                                        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                                            <Text style={styles.tournamentName}>{tourney.name.toUpperCase()}</Text>
                                            <View style={styles.matchCountBadge}>
                                                <Text style={styles.matchCountText}>{tourney.matches.length} TA O'YIN</Text>
                                                <Ionicons name="chevron-forward" size={16} color={Colors.primary} style={{ marginLeft: 4 }} />
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                />

                {/* Date Picker Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={isDatePickerVisible}
                    onRequestClose={() => setDatePickerVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <Pressable style={styles.modalBackdrop} onPress={() => setDatePickerVisible(false)} />
                        <View style={styles.modalContent}>
                            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
                            <View style={styles.dragIndicator} />
                            <View style={styles.modalDatesDisplay}>
                                <View style={styles.modalDateBox}>
                                    <Text style={styles.modalDateLabel}>{t('common.from').toUpperCase()}</Text>
                                    <Text style={styles.modalDateValue}>{String(tempStartDate).padStart(2, '0')} {viewDate.toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : (i18n.language === 'en' ? 'en-US' : 'uz-UZ'), { month: 'short' })}. {viewDate.getFullYear()}</Text>
                                </View>
                                <View style={styles.modalDateBox}>
                                    <Text style={styles.modalDateLabel}>{t('common.to').toUpperCase()}</Text>
                                    <Text style={styles.modalDateValue}>{tempEndDate ? `${String(tempEndDate).padStart(2, '0')} ${viewDate.toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : (i18n.language === 'en' ? 'en-US' : 'uz-UZ'), { month: 'short' })}. ${viewDate.getFullYear()}` : t('common.not_selected').toUpperCase()}</Text>
                                </View>
                            </View>
                            <View style={styles.monthHeaderRow}>
                                <TouchableOpacity onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>
                                    <Ionicons name="chevron-back" size={20} color={Colors.primary} />
                                </TouchableOpacity>
                                <Text style={styles.monthHeaderText}>{viewDate.toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : (i18n.language === 'en' ? 'en-US' : 'uz-UZ'), { month: 'long', year: 'numeric' }).toUpperCase()}</Text>
                                <TouchableOpacity onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>
                                    <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.calendarGrid}>
                                {renderCalendarGrid()}
                            </View>
                            <TouchableOpacity style={styles.confirmBtn} onPress={confirmDates}>
                                <Text style={styles.confirmBtnText}>{t('common.confirm')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </AnimatedBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: { overflow: 'hidden' },
    headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },
    headerSubtitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginLeft: 10 },
    tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, height: 50, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: Colors.primary },
    tabText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700' },
    activeTabText: { color: '#FFF' },
    dateFiltersRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', overflow: 'hidden' },
    dateFilterBox: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    dateSeparator: { width: 1, height: '70%', backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 10 },
    dateLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
    dateValue: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
    listContainer: { flex: 1 },
    dayGroup: { marginBottom: 10 },
    sectionHeaderContainer: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 15, marginBottom: 8 },
    sectionHeader: { overflow: 'hidden', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderLeftWidth: 4, borderLeftColor: Colors.primary },
    sectionHeaderText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
    tournamentsList: { paddingHorizontal: 16 },
    tournamentRow: { marginBottom: 8, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    tournamentName: { color: '#FFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 },
    matchCountBadge: { flexDirection: 'row', alignItems: 'center' },
    matchCountText: { color: Colors.primary, fontSize: 12, fontWeight: '900' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', paddingTop: 12 },
    dragIndicator: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalDatesDisplay: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    modalDateBox: { flex: 1 },
    modalDateLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '900', marginBottom: 4 },
    modalDateValue: { color: '#FFF', fontSize: 18, fontWeight: '900' },
    monthHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
    monthHeaderText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    calendarGrid: { paddingHorizontal: 10, paddingBottom: 20 },
    calRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
    calCell: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    calHeaderText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 'bold' },
    calDayText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
    calCellSelected: { backgroundColor: Colors.primary },
    calCellInRange: { backgroundColor: 'rgba(0, 255, 102, 0.2)' },
    calCellStart: { borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
    calCellEnd: { borderTopRightRadius: 20, borderBottomRightRadius: 20 },
    calDayTextSelected: { color: '#000', fontWeight: '900' },
    confirmBtn: { backgroundColor: Colors.primary, paddingVertical: 20, alignItems: 'center' },
    confirmBtnText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
});

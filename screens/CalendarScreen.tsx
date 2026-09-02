import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Modal,
    Pressable,
    ActivityIndicator,
    Image,
    Animated,
    Dimensions,
    Platform,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import CustomRefreshControl from '../components/CustomRefreshControl';
import { useTranslation } from 'react-i18next';
import AppNavbar from '../components/AppNavbar';
import { useNavBarScroll } from '../context/NavBarScrollContext';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { useAuthStore } from '../store/useAuthStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Skeleton Components ────────────────────────────────────────────────────
const SkeletonBox: React.FC<{ width?: number | string; height?: number; borderRadius?: number; style?: any; isDark?: boolean }> = ({
    width = '100%', height = 14, borderRadius = 6, style, isDark = true
}) => {
    const anim = useRef(new Animated.Value(0.35)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 0.7, duration: 750, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.35, duration: 750, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const baseColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

    return (
        <Animated.View style={[{ width, height, borderRadius, backgroundColor: baseColor, opacity: anim }, style]} />
    );
};

const CalendarSkeletonLoader = ({ isDark = true }: { isDark?: boolean }) => {
    const homeColors = getHomeScreenColors(isDark);
    return (
        <View style={{ paddingTop: 6, gap: 14 }}>
            {[1, 2, 3].map((g) => (
                <View
                    key={g}
                    style={{
                        marginHorizontal: 16,
                        borderRadius: 16,
                        overflow: 'hidden',
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : homeColors.border,
                    }}
                >
                    {/* Date card header skeleton */}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8F9FA',
                            borderBottomWidth: 1,
                            borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : homeColors.border,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <SkeletonBox width={14} height={14} borderRadius={3} isDark={isDark} />
                            <SkeletonBox width={150} height={14} borderRadius={4} isDark={isDark} />
                        </View>
                        <SkeletonBox width={65} height={20} borderRadius={8} isDark={isDark} />
                    </View>

                    {/* Tournament rows inside date card */}
                    {[1, 2].map((r, idx) => (
                        <View
                            key={r}
                            style={{
                                paddingHorizontal: 16,
                                paddingVertical: 13,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderTopWidth: idx > 0 ? 1 : 0,
                                borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                <SkeletonBox width={26} height={26} borderRadius={13} isDark={isDark} />
                                <SkeletonBox width={'60%'} height={14} borderRadius={4} isDark={isDark} />
                            </View>
                            <SkeletonBox width={60} height={22} borderRadius={8} isDark={isDark} />
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
};

// ─── Localization Dictionaries ───────────────────────────────────────────────
const MONTHS_UZ = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
];
const MONTHS_RU = [
    'Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
    'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'
];
const MONTHS_RU_NOM = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];
const MONTHS_EN = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS_UZ = [
    'Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba',
    'Payshanba', 'Juma', 'Shanba'
];
const WEEKDAYS_RU = [
    'Воскресенье', 'Понедельник', 'Вторник', 'Среда',
    'Четверг', 'Пятница', 'Суббота'
];
const WEEKDAYS_EN = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday'
];

const DAYS_OF_WEEK_SHORT: Record<string, string[]> = {
    uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
    ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};

const formatLocalizedGroupDate = (dateObj: Date, lang: string) => {
    const day = dateObj.getDate();
    const year = dateObj.getFullYear();
    if (lang === 'uz') {
        const month = MONTHS_UZ[dateObj.getMonth()];
        const weekday = WEEKDAYS_UZ[dateObj.getDay()];
        return `${day}-${month} ${year}, ${weekday}`;
    } else if (lang === 'ru') {
        const month = MONTHS_RU[dateObj.getMonth()];
        const weekday = WEEKDAYS_RU[dateObj.getDay()];
        return `${day} ${month} ${year}, ${weekday}`;
    } else {
        const month = MONTHS_EN[dateObj.getMonth()];
        const weekday = WEEKDAYS_EN[dateObj.getDay()];
        return `${month} ${day}, ${year}, ${weekday}`;
    }
};

const formatFilterDate = (day: number, vDate: Date, lang: string) => {
    if (!day) return '';
    const mIdx = vDate.getMonth();
    const year = vDate.getFullYear();
    const padDay = String(day).padStart(2, '0');
    if (lang === 'uz') {
        return `${padDay} ${MONTHS_UZ[mIdx]} ${year}`;
    } else if (lang === 'ru') {
        return `${padDay} ${MONTHS_RU[mIdx]} ${year}`;
    } else {
        return `${MONTHS_EN[mIdx]} ${padDay}, ${year}`;
    }
};

const formatMonthHeader = (vDate: Date, lang: string) => {
    const mIdx = vDate.getMonth();
    const year = vDate.getFullYear();
    if (lang === 'uz') {
        return `${MONTHS_UZ[mIdx]} ${year}`;
    } else if (lang === 'ru') {
        return `${MONTHS_RU_NOM[mIdx]} ${year}`;
    } else {
        return `${MONTHS_EN[mIdx]} ${year}`;
    }
};

export default function CalendarScreen({ navigation }: any) {
    const { t, i18n } = useTranslation();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const currentLang = i18n.language || 'uz';
    const { handleScroll: handleNavBarScroll } = useNavBarScroll();
    const { user } = useAuthStore();
    // MyTeamScreen'dagi bilan bir xil qoida: foydalanuvchining o'z jamoasi ID'si
    const userTeamId = user?.teamId || user?.team_id || (user?.role === 'manager' ? (user?.id || user?._id) : null);
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
    }, [startDate, endDate, viewDate, currentLang, selectedTab, userTeamId]);

    const getMatchFieldNum = (m: any): number => {
        if (!m) return 999;
        const raw = m.field_number || m.fieldNumber || m.pitch_number || m.pitchNumber || m.field || m.pitch || m.maydon;
        if (raw !== undefined && raw !== null) {
            const match = String(raw).match(/\d+/);
            if (match) return parseInt(match[0], 10);
        }
        const venue = m.venue || m.location || m.stadium_name || m.stadium || '';
        if (venue) {
            const match = String(venue).match(/\d+/);
            if (match) return parseInt(match[0], 10);
        }
        return 999;
    };

    const getMatchTimeInMinutes = (m: any): number => {
        if (!m) return 0;
        const rawTime = m.match_time || m.time || m.matchTime || m.scheduled_time || m.start_time;
        if (rawTime && String(rawTime).includes(':')) {
            const parts = String(rawTime).split(':');
            const h = parseInt(parts[0], 10) || 0;
            const min = parseInt(parts[1], 10) || 0;
            return h * 60 + min;
        }
        const rawDate = m.date || m.scheduledAt || m.match_date;
        if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
                return d.getHours() * 60 + d.getMinutes();
            }
        }
        return 18 * 60;
    };

    const compareMatchesByTimeAndField = (a: any, b: any): number => {
        const timeA = getMatchTimeInMinutes(a);
        const timeB = getMatchTimeInMinutes(b);

        if (timeA !== timeB) {
            return timeA - timeB;
        }

        const fieldA = getMatchFieldNum(a);
        const fieldB = getMatchFieldNum(b);
        if (fieldA !== fieldB) {
            return fieldA - fieldB;
        }

        const dateA = new Date(a.date || a.scheduledAt || a.match_date || a.createdAt || 0).getTime();
        const dateB = new Date(b.date || b.scheduledAt || b.match_date || b.createdAt || 0).getTime();
        return dateA - dateB;
    };

    const fetchMatches = async () => {
        try {
            setLoading(true);
            
            // Format dates for local filtering
            const startLimit = new Date(viewDate.getFullYear(), viewDate.getMonth(), startDate);
            startLimit.setHours(0, 0, 0, 0);
            const endLimit = new Date(viewDate.getFullYear(), viewDate.getMonth(), endDate || startDate);
            endLimit.setHours(23, 59, 59, 999);
            
            // Fetch all matches
            const data = await apiService.getMatches();

            if (data && Array.isArray(data)) {
                // "Mening taqvimim": faqat foydalanuvchining o'z jamoasi qatnashgan o'yinlar
                const sourceData = selectedTab === 'my'
                    ? data.filter((match: any) =>
                        userTeamId && (
                            String(match.home_team_id) === String(userTeamId) ||
                            String(match.away_team_id) === String(userTeamId)
                        )
                      )
                    : data;

                // Filter matches by selected date range
                const filteredByDate = sourceData.filter(match => {
                    const matchDate = new Date(match.date || match.scheduledAt);
                    return matchDate >= startLimit && matchDate <= endLimit;
                });

                const groups: { [key: string]: any } = {};
                filteredByDate.forEach(match => {
                    const dateObj = new Date(match.date || match.scheduledAt);
                    const formattedDateStr = formatLocalizedGroupDate(dateObj, currentLang);
                    const groupKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;

                    if (!groups[groupKey]) {
                        groups[groupKey] = {
                            id: groupKey,
                            date: formattedDateStr,
                            dateObj: dateObj,
                            timestamp: dateObj.getTime(),
                            tournaments: {}
                        };
                    }

                    const tourneyName = match.tournamentName || match.league || 'Boshqa';
                    if (!groups[groupKey].tournaments[tourneyName]) {
                        groups[groupKey].tournaments[tourneyName] = {
                            id: `${groupKey}_${tourneyName}`,
                            name: tourneyName,
                            matches: []
                        };
                    }

                    groups[groupKey].tournaments[tourneyName].matches.push(match);
                });

                const formatted = Object.values(groups)
                    .sort((a: any, b: any) => a.timestamp - b.timestamp)
                    .map((group: any) => ({
                        id: group.id,
                        date: group.date,
                        timestamp: group.timestamp,
                        tournaments: Object.values(group.tournaments).map((tourney: any) => ({
                            ...tourney,
                            matches: tourney.matches.sort(compareMatchesByTimeAndField)
                        }))
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
        if (tempStartDate !== startDate || tempEndDate !== endDate) {
            setDisplayData([]);
            setLoading(true);
        }
        setStartDate(tempStartDate);
        setEndDate(tempEndDate);
        setDatePickerVisible(false);
    };

    const resetToDefaultRange = () => {
        // Bugungi sana va +7 kun — rejalashtirilgan o'yinlar ko'rinadigan standart oraliq
        const now = new Date();
        const defaultStart = now.getDate();
        const defaultEnd = now.getDate() + 7;
        const defaultView = new Date(now.getFullYear(), now.getMonth(), 1);

        setTempStartDate(defaultStart);
        setTempEndDate(defaultEnd);
        setViewDate(defaultView);

        if (startDate !== defaultStart || endDate !== defaultEnd) {
            setDisplayData([]);
            setLoading(true);
        }
        setStartDate(defaultStart);
        setEndDate(defaultEnd);
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
        const daysOfWeek = DAYS_OF_WEEK_SHORT[currentLang] || DAYS_OF_WEEK_SHORT.uz; 

        const headerRow = daysOfWeek.map((d, i) => (
            <View key={`header-${i}`} style={styles.calCell}>
                <Text style={[styles.calHeaderText, { color: homeColors.textSecondary }]}>{d}</Text>
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
            
            let bgStyle = null;
            if (isSelected) {
                bgStyle = { backgroundColor: homeColors.accent };
            } else if (isInRange) {
                bgStyle = { backgroundColor: isDark ? 'rgba(0, 255, 102, 0.18)' : 'rgba(0, 200, 80, 0.15)' };
            }

            currentRow.push(
                <TouchableOpacity
                    key={`day-${i}`}
                    style={[styles.calCell, bgStyle, leftRounded, rightRounded]}
                    onPress={() => handleDayPress(i)}
                    activeOpacity={0.7}
                >
                    <Text
                        style={[
                            styles.calDayText,
                            { color: homeColors.textPrimary },
                            isSelected && { color: '#000000', fontWeight: '900' },
                            isInRange && { color: isDark ? '#00FF66' : '#008833', fontWeight: '700' },
                        ]}
                    >
                        {i}
                    </Text>
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
        <View style={{ flex: 1, backgroundColor: homeColors.background }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Universal App Navbar */}
                <AppNavbar
                    title={t('calendar.title', 'TAQVIM')}
                    subtitle="AMATORA"
                />

                {/* Top Tabs (Barcha o'yinlar / Mening taqvimim) */}
                <View style={[styles.tabsContainer, { backgroundColor: homeColors.background, borderBottomColor: homeColors.border }]}>
                    <TouchableOpacity
                        style={[
                            styles.tab,
                            selectedTab === 'all' && [styles.activeTab, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]
                        ]}
                        onPress={() => {
                            if (selectedTab !== 'all') {
                                setDisplayData([]);
                                setLoading(true);
                                setSelectedTab('all');
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabText, { color: selectedTab === 'all' ? homeColors.textPrimary : homeColors.textSecondary }, selectedTab === 'all' && { fontWeight: '800' }]}>
                            {t('calendar.all_matches', "Barcha o'yinlar")}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.tab,
                            selectedTab === 'my' && [styles.activeTab, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]
                        ]}
                        onPress={() => {
                            if (selectedTab !== 'my') {
                                setDisplayData([]);
                                setLoading(true);
                                setSelectedTab('my');
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabText, { color: selectedTab === 'my' ? homeColors.textPrimary : homeColors.textSecondary }, selectedTab === 'my' && { fontWeight: '800' }]}>
                            {t('calendar.my_calendar', 'Mening taqvimim')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Date Filter Range Row */}
                <View style={[styles.dateFiltersRow, { backgroundColor: homeColors.background }]}>
                    <TouchableOpacity
                        style={[
                            styles.dateFilterBox,
                            {
                                backgroundColor: isDark ? homeColors.background : '#FFFFFF',
                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : homeColors.border,
                            }
                        ]}
                        onPress={openDatePicker}
                        activeOpacity={0.8}
                    >
                        <View style={{ padding: 10, flex: 1 }}>
                            <Text style={[styles.dateLabel, { color: homeColors.textSecondary }]}>{t('common.from').toUpperCase()}</Text>
                            <Text style={[styles.dateValue, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                {formatFilterDate(startDate, viewDate, currentLang)}
                            </Text>
                        </View>
                        <Ionicons name="calendar-outline" size={16} color={homeColors.accent} style={{ marginRight: 10 }} />
                    </TouchableOpacity>

                    <View style={[styles.dateSeparator, { backgroundColor: homeColors.border }]} />

                    <TouchableOpacity
                        style={[
                            styles.dateFilterBox,
                            {
                                backgroundColor: isDark ? homeColors.background : '#FFFFFF',
                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : homeColors.border,
                            }
                        ]}
                        onPress={openDatePicker}
                        activeOpacity={0.8}
                    >
                        <View style={{ padding: 10, flex: 1 }}>
                            <Text style={[styles.dateLabel, { color: homeColors.textSecondary }]}>{t('common.to').toUpperCase()}</Text>
                            <Text style={[styles.dateValue, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                {tempEndDate || endDate ? formatFilterDate(tempEndDate || endDate, viewDate, currentLang) : t('common.not_selected')}
                            </Text>
                        </View>
                        <Ionicons name="calendar-outline" size={16} color={homeColors.accent} style={{ marginRight: 10 }} />
                    </TouchableOpacity>
                </View>

                {/* Matches List */}
                <FlatList
                    style={styles.listContainer}
                    data={displayData}
                    keyExtractor={(item, index) => item.id || item.date || String(index)}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 110 }}
                    onScroll={(e) => handleNavBarScroll('calendar', e)}
                    scrollEventThrottle={16}
                    refreshControl={
                        <CustomRefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                    ListEmptyComponent={
                        loading ? (
                            <CalendarSkeletonLoader isDark={isDark} />
                        ) : (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <Ionicons name="calendar-outline" size={48} color={homeColors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
                                <Text style={{ color: homeColors.textSecondary, fontSize: 14, fontWeight: '600' }}>{t('common.no_data')}</Text>
                            </View>
                        )
                    }
                    renderItem={({ item: dayGroup }) => {
                        const totalMatches = dayGroup.tournaments.reduce((sum: number, t: any) => sum + (t.matches?.length || 0), 0);

                        return (
                            <View
                                style={[
                                    styles.dayCard,
                                    {
                                        backgroundColor: isDark ? homeColors.background : '#FFFFFF',
                                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : homeColors.border,
                                    }
                                ]}
                            >
                                {/* Unified Date Card Header */}
                                <View
                                    style={[
                                        styles.dayCardHeader,
                                        {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                                            borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : homeColors.border,
                                        }
                                    ]}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                                        <Ionicons name="calendar-outline" size={14} color={homeColors.accent} />
                                        <Text
                                            style={[
                                                styles.dayTitleText,
                                                { color: homeColors.textPrimary }
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {dayGroup.date.toUpperCase()}
                                        </Text>
                                    </View>

                                    <View
                                        style={[
                                            styles.dayTotalBadge,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }
                                        ]}
                                    >
                                        <Text style={[styles.dayTotalBadgeText, { color: homeColors.textSecondary }]}>
                                            {t('matches.matches_count', { count: totalMatches }).toUpperCase()}
                                        </Text>
                                    </View>
                                </View>

                                {/* Tournaments list divided into rows inside this date card */}
                                <View>
                                    {dayGroup.tournaments.map((tourney: any, tourneyIdx: number) => (
                                        <TouchableOpacity
                                            key={tourney.id || tourneyIdx}
                                            style={[
                                                styles.tournamentRowInsideCard,
                                                {
                                                    borderTopWidth: tourneyIdx > 0 ? 1 : 0,
                                                    borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                                                }
                                            ]}
                                            onPress={() => navigation.navigate('CalendarMatches', {
                                                tournamentId: tourney.id,
                                                tournamentName: tourney.name,
                                                date: dayGroup.date,
                                                timestamp: dayGroup.timestamp,
                                                matches: tourney.matches
                                            })}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 8 }}>
                                                <View
                                                    style={[
                                                        styles.trophyCircle,
                                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
                                                    ]}
                                                >
                                                    <Ionicons name="trophy-outline" size={13} color={homeColors.textSecondary} />
                                                </View>
                                                <Text
                                                    style={[styles.tournamentName, { color: homeColors.textPrimary }]}
                                                    numberOfLines={1}
                                                >
                                                    {tourney.name.toUpperCase()}
                                                </Text>
                                            </View>

                                            <View style={styles.matchCountBadge}>
                                                <Text style={[styles.matchCountText, { color: homeColors.accent }]}>
                                                    {t('matches.matches_count', { count: tourney.matches.length }).toUpperCase()}
                                                </Text>
                                                <Ionicons name="chevron-forward" size={14} color={homeColors.accent} style={{ marginLeft: 3 }} />
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        );
                    }}
                />

                {/* Range Date Picker Modal */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={isDatePickerVisible}
                    onRequestClose={() => setDatePickerVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <Pressable style={styles.modalBackdrop} onPress={() => setDatePickerVisible(false)} />
                        <View style={[styles.modalContent, { backgroundColor: isDark ? '#141414' : '#FFFFFF', borderTopColor: homeColors.border, borderWidth: 1 }]}>
                            <TouchableOpacity
                                style={styles.clearIconBtn}
                                onPress={resetToDefaultRange}
                                hitSlop={10}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="refresh-outline" size={22} color={homeColors.textSecondary} />
                            </TouchableOpacity>
                            <View style={[styles.dragIndicator, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }]} />
                            <View style={[styles.modalDatesDisplay, { borderBottomColor: homeColors.border }]}>
                                <View style={styles.modalDateBox}>
                                    <Text style={[styles.modalDateLabel, { color: homeColors.textSecondary }]}>{t('common.from').toUpperCase()}</Text>
                                    <Text style={[styles.modalDateValue, { color: homeColors.textPrimary }]}>
                                        {tempStartDate ? formatFilterDate(tempStartDate, viewDate, currentLang) : t('common.not_selected').toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.modalDateBox}>
                                    <Text style={[styles.modalDateLabel, { color: homeColors.textSecondary }]}>{t('common.to').toUpperCase()}</Text>
                                    <Text style={[styles.modalDateValue, { color: homeColors.textPrimary }]}>
                                        {tempEndDate ? formatFilterDate(tempEndDate, viewDate, currentLang) : t('common.not_selected').toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.monthHeaderRow}>
                                <TouchableOpacity onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} hitSlop={10}>
                                    <Ionicons name="chevron-back" size={22} color={homeColors.textPrimary} />
                                </TouchableOpacity>
                                <Text style={[styles.monthHeaderText, { color: homeColors.textPrimary }]}>
                                    {formatMonthHeader(viewDate, currentLang).toUpperCase()}
                                </Text>
                                <TouchableOpacity onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} hitSlop={10}>
                                    <Ionicons name="chevron-forward" size={22} color={homeColors.textPrimary} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.calendarGrid}>
                                {renderCalendarGrid()}
                            </View>
                            <TouchableOpacity
                                style={[styles.confirmBtn, { backgroundColor: homeColors.accent }]}
                                onPress={confirmDates}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.confirmBtnText}>{t('common.confirm').toUpperCase()}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
        borderBottomWidth: 1,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    activeTab: {},
    tabText: {
        fontSize: 12.5,
        fontWeight: '600',
    },
    dateFiltersRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 10,
        alignItems: 'center',
    },
    dateFilterBox: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
    },
    dateSeparator: {
        width: 1,
        height: '60%',
        marginHorizontal: 8,
    },
    dateLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        marginBottom: 2,
        letterSpacing: 0.3,
    },
    dateValue: {
        fontSize: 12.5,
        fontWeight: '800',
    },
    listContainer: { flex: 1 },
    dayCard: {
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    dayCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    dayPill: {
        width: 4,
        height: 14,
        borderRadius: 2,
    },
    dayTitleText: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    dayTotalBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    dayTotalBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    tournamentRowInsideCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
    },
    trophyCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tournamentName: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.2,
        flex: 1,
    },
    matchCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    matchCountText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContent: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 20,
        position: 'relative',
    },
    clearIconBtn: {
        position: 'absolute',
        top: 14,
        right: 16,
        zIndex: 10,
    },
    dragIndicator: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalDatesDisplay: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    modalDateBox: { flex: 1 },
    modalDateLabel: {
        fontSize: 10,
        fontWeight: '800',
        marginBottom: 4,
        letterSpacing: 0.4,
    },
    modalDateValue: {
        fontSize: 16,
        fontWeight: '900',
    },
    monthHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    monthHeaderText: {
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    calendarGrid: {
        paddingHorizontal: 12,
        paddingBottom: 16,
    },
    calRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 6,
    },
    calCell: {
        width: (SCREEN_WIDTH - 36) / 7,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calHeaderText: {
        fontSize: 11,
        fontWeight: '700',
    },
    calDayText: {
        fontSize: 13,
        fontWeight: '600',
    },
    calCellStart: {
        borderTopLeftRadius: 19,
        borderBottomLeftRadius: 19,
    },
    calCellEnd: {
        borderTopRightRadius: 19,
        borderBottomRightRadius: 19,
    },
    confirmBtn: {
        marginHorizontal: 16,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 4,
    },
    confirmBtnText: {
        color: '#000000',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.6,
    },
});


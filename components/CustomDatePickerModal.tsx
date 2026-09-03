import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MONTH_NAMES = [
    { num: '01', name: 'Yanvar' },
    { num: '02', name: 'Fevral' },
    { num: '03', name: 'Mart' },
    { num: '04', name: 'Aprel' },
    { num: '05', name: 'May' },
    { num: '06', name: 'Iyun' },
    { num: '07', name: 'Iyul' },
    { num: '08', name: 'Avgust' },
    { num: '09', name: 'Sentyabr' },
    { num: '10', name: 'Oktyabr' },
    { num: '11', name: 'Noyabr' },
    { num: '12', name: 'Dekabr' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 70 }, (_, i) => String(currentYear - 6 - i)); // e.g. 2020 down to 1951

interface CustomDatePickerModalProps {
    visible: boolean;
    initialDate?: string; // "DD.MM.YYYY" or "YYYY-MM-DD"
    onClose: () => void;
    onSelectDate: (dateStr: string) => void;
}

export const CustomDatePickerModal: React.FC<CustomDatePickerModalProps> = ({
    visible,
    initialDate,
    onClose,
    onSelectDate,
}) => {
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);

    const [selectedDay, setSelectedDay] = useState('01');
    const [selectedMonth, setSelectedMonth] = useState('01');
    const [selectedYear, setSelectedYear] = useState('2000');

    useEffect(() => {
        if (visible && initialDate) {
            let d = '01', m = '01', y = '2000';
            if (initialDate.includes('.')) {
                const parts = initialDate.split('.');
                if (parts[0]) d = parts[0].padStart(2, '0');
                if (parts[1]) m = parts[1].padStart(2, '0');
                if (parts[2]) y = parts[2];
            } else if (initialDate.includes('-')) {
                const parts = initialDate.split('-');
                if (parts[0]) y = parts[0];
                if (parts[1]) m = parts[1].padStart(2, '0');
                if (parts[2]) d = parts[2].padStart(2, '0');
            }
            setSelectedDay(d);
            setSelectedMonth(m);
            setSelectedYear(y);
        }
    }, [visible, initialDate]);

    const handleConfirm = () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        } catch (e) {}
        const formatted = `${selectedDay}.${selectedMonth}.${selectedYear}`;
        onSelectDate(formatted);
        onClose();
    };

    const handleSelectDay = (day: string) => {
        try {
            Haptics.selectionAsync().catch(() => {});
        } catch (e) {}
        setSelectedDay(day);
    };

    const handleSelectMonth = (monthNum: string) => {
        try {
            Haptics.selectionAsync().catch(() => {});
        } catch (e) {}
        setSelectedMonth(monthNum);
    };

    const handleSelectYear = (year: string) => {
        try {
            Haptics.selectionAsync().catch(() => {});
        } catch (e) {}
        setSelectedYear(year);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.backdropTouch}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <View style={[styles.modalCard, { backgroundColor: homeColors.background, borderColor: homeColors.border, shadowColor: isDark ? '#FFFFFF' : '#000000' }]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: homeColors.border }]}>
                        <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                            <Text style={[styles.btnCancelText, { color: homeColors.textSecondary }]}>Bekor qilish</Text>
                        </TouchableOpacity>

                        <View style={{ alignItems: 'center' }}>
                            <Text style={[styles.title, { color: homeColors.textPrimary }]}>Tug'ilgan sana</Text>
                            <Text style={[styles.previewDate, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                {selectedDay}.{selectedMonth}.{selectedYear}
                            </Text>
                        </View>

                        <TouchableOpacity onPress={handleConfirm} style={styles.headerBtn}>
                            <Text style={[styles.btnDoneText, { color: isDark ? '#FFFFFF' : '#000000' }]}>Tayyor</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Column Headers */}
                    <View style={[styles.columnHeadersRow, { borderBottomColor: homeColors.border }]}>
                        <Text style={[styles.columnHeaderLabel, { color: homeColors.textSecondary, flex: 1 }]}>Kun</Text>
                        <Text style={[styles.columnHeaderLabel, { color: homeColors.textSecondary, flex: 1.5 }]}>Oy</Text>
                        <Text style={[styles.columnHeaderLabel, { color: homeColors.textSecondary, flex: 1.2 }]}>Yil</Text>
                    </View>

                    {/* 3 Wheel Columns */}
                    <View style={styles.pickerColumnsRow}>
                        {/* Day Column */}
                        <ScrollView
                            style={styles.columnScroll}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                        >
                            {DAYS.map((day) => {
                                const isSelected = (day === selectedDay);
                                return (
                                    <TouchableOpacity
                                        key={day}
                                        style={[
                                            styles.itemBtn,
                                            isSelected && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)' }
                                        ]}
                                        onPress={() => handleSelectDay(day)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.itemText,
                                            { color: isSelected ? homeColors.textPrimary : homeColors.textSecondary },
                                            isSelected && styles.itemTextSelected
                                        ]}>
                                            {day}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Month Column */}
                        <ScrollView
                            style={[styles.columnScroll, { flex: 1.5, borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, borderColor: homeColors.border }]}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                        >
                            {MONTH_NAMES.map((m) => {
                                const isSelected = (m.num === selectedMonth);
                                return (
                                    <TouchableOpacity
                                        key={m.num}
                                        style={[
                                            styles.itemBtn,
                                            isSelected && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)' }
                                        ]}
                                        onPress={() => handleSelectMonth(m.num)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.itemText,
                                            { color: isSelected ? homeColors.textPrimary : homeColors.textSecondary },
                                            isSelected && styles.itemTextSelected
                                        ]}>
                                            {m.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Year Column */}
                        <ScrollView
                            style={[styles.columnScroll, { flex: 1.2 }]}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                        >
                            {YEARS.map((year) => {
                                const isSelected = (year === selectedYear);
                                return (
                                    <TouchableOpacity
                                        key={year}
                                        style={[
                                            styles.itemBtn,
                                            isSelected && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)' }
                                        ]}
                                        onPress={() => handleSelectYear(year)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.itemText,
                                            { color: isSelected ? homeColors.textPrimary : homeColors.textSecondary },
                                            isSelected && styles.itemTextSelected
                                        ]}>
                                            {year}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default CustomDatePickerModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'flex-end',
    },
    backdropTouch: {
        flex: 1,
    },
    modalCard: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderBottomWidth: 0,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        ...Platform.select({
            ios: {
                shadowOpacity: 0,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerBtn: {
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
    },
    previewDate: {
        fontSize: 16,
        fontWeight: '800',
        marginTop: 2,
    },
    btnCancelText: {
        fontSize: 14,
        fontWeight: '600',
    },
    btnDoneText: {
        fontSize: 15,
        fontWeight: '800',
    },
    columnHeadersRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    columnHeaderLabel: {
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    pickerColumnsRow: {
        flexDirection: 'row',
        height: 240,
        paddingHorizontal: 8,
    },
    columnScroll: {
        flex: 1,
        paddingVertical: 4,
    },
    itemBtn: {
        paddingVertical: 10,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        marginVertical: 2,
        marginHorizontal: 4,
    },
    itemText: {
        fontSize: 14,
        fontWeight: '500',
    },
    itemTextSelected: {
        fontWeight: '800',
        fontSize: 15,
    },
});

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    SafeAreaView,
    Platform,
    Modal,
    FlatList,
    Animated,
    Dimensions,
    PanResponder,
    StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { apiService } from '../services/apiService';
import SmartImage from '../components/SmartImage';
import SlideButton from '../components/SlideButton';

const { width } = Dimensions.get('window');
const BRAND_ORANGE = '#FF6B00';

const DEFAULT_LEAGUES = [
    { id: 'super', name: 'Super liga' },
    { id: 'pro', name: 'Pro liga' },
    { id: '3liga', name: '3-liga' },
    { id: '7x7', name: '7x7 liga' }
];

export default function TransferRequestScreen({ route, navigation }: any) {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const { playerId } = route.params || {};

    const [selectedLeague, setSelectedLeague] = useState('');
    const [leagueModalVisible, setLeagueModalVisible] = useState(false);
    const [leaguesList, setLeaguesList] = useState<any[]>(DEFAULT_LEAGUES);

    const [teams, setTeams] = useState<any[]>([]);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [loadingTeams, setLoadingTeams] = useState(false);
    const [teamModalVisible, setTeamModalVisible] = useState(false);
    const [teamSearchQuery, setTeamSearchQuery] = useState('');

    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const [isTransferWindowOpen, setIsTransferWindowOpen] = useState<boolean>(true);
    const [infoLoading, setInfoLoading] = useState(true);
    const [playerInfo, setPlayerInfo] = useState<any>(null);
    const [currentTeam, setCurrentTeam] = useState<any>(null);

    // Interactive Swipe to Back Animation
    const swipeBackAnim = useRef(new Animated.Value(0)).current;
    const swipeBackPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                return gestureState.dx > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.3;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dx > 0) {
                    swipeBackAnim.setValue(gestureState.dx);
                } else {
                    swipeBackAnim.setValue(0);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                const shouldExit = gestureState.dx > width * 0.35 || (gestureState.dx > 60 && gestureState.vx > 0.6);
                if (shouldExit) {
                    Animated.timing(swipeBackAnim, {
                        toValue: width,
                        duration: 180,
                        useNativeDriver: true,
                    }).start(() => {
                        navigation.goBack();
                    });
                } else {
                    Animated.spring(swipeBackAnim, {
                        toValue: 0,
                        friction: 8,
                        tension: 45,
                        useNativeDriver: true,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(swipeBackAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 45,
                    useNativeDriver: true,
                }).start();
            }
        })
    ).current;

    const cardSurface = {
        backgroundColor: homeColors.background,
        ...Platform.select({
            ios: {
                borderWidth: 1,
                borderColor: homeColors.border,
                shadowOpacity: 0,
            },
            android: {
                borderWidth: 1,
                borderColor: homeColors.border,
                elevation: 2,
                shadowColor: isDark ? '#FFFFFF' : '#000000',
            },
        }),
    };

    useEffect(() => {
        const initData = async () => {
            try {
                const [isOpen, leagues] = await Promise.all([
                    apiService.getTransferWindowStatus().catch(() => true),
                    apiService.getLeagues().catch(() => null)
                ]);
                setIsTransferWindowOpen(isOpen);
                if (leagues && Array.isArray(leagues) && leagues.length > 0) {
                    setLeaguesList(leagues);
                }
            } catch (e) {
                console.warn('Error fetching transfer config:', e);
            }
        };

        initData();
        fetchPlayerInfo();
    }, [playerId]);

    const fetchPlayerInfo = async () => {
        try {
            setInfoLoading(true);
            const targetPlayerId = playerId || user?.id || user?._id || user?.playerId;
            if (targetPlayerId) {
                const player = await apiService.getPlayerById(targetPlayerId);
                if (player) {
                    setPlayerInfo(player);
                    const teamId = player.team_id || player.teamId || user?.teamId || user?.team_id;
                    if (teamId) {
                        const team = await apiService.getTeamById(teamId).catch(() => null);
                        if (team) setCurrentTeam(team);
                    }
                }
            }
        } catch (e) {
            console.warn('Error fetching player info:', e);
        } finally {
            setInfoLoading(false);
        }
    };

    const fetchTeams = async (leagueName: string) => {
        try {
            setLoadingTeams(true);
            const data = await apiService.getTeams(1, 100, leagueName);
            if (data && Array.isArray(data)) {
                const currentTeamId = currentTeam?.id || currentTeam?._id || user?.teamId || user?.team_id;
                const filtered = currentTeamId
                    ? data.filter((t: any) => t.id !== currentTeamId && t._id !== currentTeamId)
                    : data;
                setTeams(filtered);
            }
        } catch (error) {
            console.error('Error fetching teams:', error);
        } finally {
            setLoadingTeams(false);
        }
    };

    const getFilteredTeams = () => {
        if (!teamSearchQuery) return teams;
        return teams.filter((t: any) =>
            (t.name || '').toLowerCase().includes(teamSearchQuery.toLowerCase())
        );
    };

    const getSelectedTeamObj = () => {
        return teams.find((t: any) => (t._id || t.id) === selectedTeam);
    };

    const handleSubmit = async () => {
        if (!selectedTeam) {
            Alert.alert(t('common.notice', 'Eslatma'), t('transfers.select_team_error', 'Iltimos, yangi jamoani tanlang'));
            setSubmitStatus('idle');
            return;
        }

        if (!isTransferWindowOpen) {
            Alert.alert(t('common.notice', 'Eslatma'), t('transfers.window_closed_error', 'Transfer oynasi yopilgan'));
            setSubmitStatus('idle');
            return;
        }

        try {
            setSubmitting(true);
            setSubmitStatus('loading');
            const targetPlayerId = playerId || user?.id || user?._id || user?.playerId;
            const transferData = {
                playerId: targetPlayerId,
                currentTeamId: currentTeam?.id || currentTeam?._id || user?.teamId || user?.team_id || 'unknown_old_team',
                newTeamId: selectedTeam,
                reason: reason.trim() || null,
            };

            const response: any = await apiService.createTransferRequest(transferData);
            if (response && response.success) {
                setSubmitStatus('success');
                try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch (e) {}
                setShowSuccessModal(true);
            } else {
                setSubmitStatus('error');
                Alert.alert(t('common.notice', 'Xatolik'), response?.error || "So'rov yuborib bo'lmadi");
            }
        } catch (error) {
            console.error('Error submitting transfer request:', error);
            setSubmitStatus('error');
            Alert.alert(t('common.notice', 'Xatolik'), "Server bilan bog'lanishda xatolik yuz berdi");
        } finally {
            setSubmitting(false);
        }
    };

    const selectedTeamObj = getSelectedTeamObj();

    return (
        <Animated.View
            style={[
                styles.rootContainer,
                {
                    backgroundColor: homeColors.background,
                    transform: [{ translateX: swipeBackAnim }]
                }
            ]}
            {...swipeBackPanResponder.panHandlers}
        >
            <SafeAreaView style={{ flex: 1, backgroundColor: homeColors.background }}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

                {/* Top Header */}
                <View style={[styles.topHeader, { borderBottomColor: homeColors.border }]}>
                    <TouchableOpacity
                        style={[styles.backBtnAction, cardSurface]}
                        activeOpacity={0.7}
                        onPress={() => {
                            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch (e) {}
                            navigation.goBack();
                        }}
                    >
                        <Ionicons name="arrow-back" size={20} color={homeColors.textPrimary} />
                    </TouchableOpacity>

                    <View style={styles.headerTitleGroup}>
                        <Ionicons name="swap-horizontal" size={18} color={BRAND_ORANGE} style={{ marginRight: 6 }} />
                        <Text style={[styles.headerTitleText, { color: homeColors.textPrimary }]}>
                            {t('transfers.title', "TRANSFER SO'ROVI")}
                        </Text>
                    </View>

                    <View style={{ width: 38 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Visual Team Swap Card */}
                    <View style={[styles.transferVisualCard, cardSurface]}>
                        {/* Current Team Box */}
                        <View style={styles.teamVisualBox}>
                            <View style={[styles.teamLogoCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: homeColors.border }]}>
                                {currentTeam?.logo_url || currentTeam?.logo ? (
                                    <SmartImage
                                        uri={currentTeam.logo_url || currentTeam.logo}
                                        style={styles.teamLogo}
                                        contentFit="contain"
                                        fallbackIcon="shield-outline"
                                    />
                                ) : (
                                    <Ionicons name="shield-outline" size={26} color={BRAND_ORANGE} />
                                )}
                            </View>
                            <Text style={[styles.teamVisualName, { color: homeColors.textPrimary }]} numberOfLines={2}>
                                {currentTeam?.name || t('transfers.current_team', 'Hozirgi Jamoa')}
                            </Text>
                        </View>

                        {/* Middle Brand Orange Arrow */}
                        <View style={[styles.swapArrowCircle, { backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.1)', borderColor: 'rgba(255, 107, 0, 0.3)' }]}>
                            <Ionicons name="arrow-forward" size={20} color={BRAND_ORANGE} />
                        </View>

                        {/* Target New Team Box */}
                        <View style={styles.teamVisualBox}>
                            <View
                                style={[
                                    styles.teamLogoCircle,
                                    {
                                        backgroundColor: selectedTeamObj
                                            ? (isDark ? 'rgba(255, 107, 0, 0.12)' : 'rgba(255, 107, 0, 0.08)')
                                            : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                                        borderColor: selectedTeamObj ? BRAND_ORANGE : homeColors.border
                                    }
                                ]}
                            >
                                {selectedTeamObj?.logo_url || selectedTeamObj?.logo ? (
                                    <SmartImage
                                        uri={selectedTeamObj.logo_url || selectedTeamObj.logo}
                                        style={styles.teamLogo}
                                        contentFit="contain"
                                        fallbackIcon="shield-outline"
                                    />
                                ) : (
                                    <Ionicons name="add" size={28} color={BRAND_ORANGE} />
                                )}
                            </View>
                            <Text
                                style={[
                                    styles.teamVisualName,
                                    { color: selectedTeamObj ? BRAND_ORANGE : homeColors.textSecondary }
                                ]}
                                numberOfLines={2}
                            >
                                {selectedTeamObj?.name || t('transfers.new_team', 'Yangi Jamoa')}
                            </Text>
                        </View>
                    </View>

                    {/* Window Status Banner */}
                    <View
                        style={[
                            styles.infoBanner,
                            {
                                backgroundColor: isTransferWindowOpen
                                    ? (isDark ? 'rgba(255, 107, 0, 0.08)' : 'rgba(255, 107, 0, 0.05)')
                                    : (isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)'),
                                borderColor: isTransferWindowOpen
                                    ? (isDark ? 'rgba(255, 107, 0, 0.25)' : 'rgba(255, 107, 0, 0.18)')
                                    : (isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'),
                            }
                        ]}
                    >
                        <Ionicons
                            name={isTransferWindowOpen ? "information-circle-outline" : "alert-circle-outline"}
                            size={20}
                            color={isTransferWindowOpen ? BRAND_ORANGE : '#EF4444'}
                            style={{ marginRight: 10, marginTop: 1 }}
                        />
                        <Text
                            style={[
                                styles.infoBannerText,
                                {
                                    color: isTransferWindowOpen ? homeColors.textPrimary : '#EF4444',
                                    fontWeight: isTransferWindowOpen ? '500' : '700'
                                }
                            ]}
                        >
                            {isTransferWindowOpen
                                ? t('transfers.window_open_desc', "Boshqa jamoaga o'tish uchun liga va yangi jamoani tanlab so'rov yuboring. So'rov adminlar tomonidan ko'rib chiqiladi.")
                                : t('transfers.window_closed_desc', "Tashkilotingizda transfer oynasi hozirda yopilgan. Ariza va o'tishlar vaqtincha to'xtatilgan.")}
                        </Text>
                    </View>

                    {/* Step 1: Select League */}
                    <View style={styles.formSection}>
                        <Text style={[styles.sectionLabel, { color: homeColors.textSecondary }]}>
                            {t('transfers.step_league', '1-QADAM: LIGANI TANLANG')}
                        </Text>
                        <TouchableOpacity
                            style={[
                                styles.selectButton,
                                cardSurface,
                                !isTransferWindowOpen && { opacity: 0.5 }
                            ]}
                            activeOpacity={0.75}
                            disabled={!isTransferWindowOpen}
                            onPress={() => {
                                try { Haptics.selectionAsync().catch(() => {}); } catch (e) {}
                                setLeagueModalVisible(true);
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <Ionicons name="trophy-outline" size={18} color={BRAND_ORANGE} style={{ marginRight: 10 }} />
                                <Text
                                    style={[
                                        styles.selectButtonText,
                                        { color: selectedLeague ? homeColors.textPrimary : homeColors.textSecondary }
                                    ]}
                                >
                                    {selectedLeague || t('transfers.select_league', 'Ligani tanlang')}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={homeColors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Step 2: Select Team */}
                    <View style={styles.formSection}>
                        <Text style={[styles.sectionLabel, { color: homeColors.textSecondary }]}>
                            {t('transfers.step_team', '2-QADAM: YANGI JAMOANI TANLANG')}
                        </Text>
                        <TouchableOpacity
                            style={[
                                styles.selectButton,
                                cardSurface,
                                (!selectedLeague || !isTransferWindowOpen) && { opacity: 0.5 }
                            ]}
                            activeOpacity={0.75}
                            disabled={!selectedLeague || !isTransferWindowOpen}
                            onPress={() => {
                                if (!selectedLeague) {
                                    Alert.alert(t('common.notice', 'Eslatma'), t('transfers.choose_league_first', 'Avval ligani tanlang'));
                                    return;
                                }
                                try { Haptics.selectionAsync().catch(() => {}); } catch (e) {}
                                setTeamModalVisible(true);
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <Ionicons name="shield-outline" size={18} color={BRAND_ORANGE} style={{ marginRight: 10 }} />
                                <Text
                                    style={[
                                        styles.selectButtonText,
                                        { color: selectedTeamObj ? homeColors.textPrimary : homeColors.textSecondary }
                                    ]}
                                >
                                    {selectedTeamObj?.name || t('transfers.select_team', 'Yangi jamoani tanlang')}
                                </Text>
                            </View>
                            {loadingTeams ? (
                                <ActivityIndicator size="small" color={BRAND_ORANGE} />
                            ) : (
                                <Ionicons name="chevron-forward" size={18} color={homeColors.textSecondary} />
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Step 3: Transfer Reason */}
                    <View style={styles.formSection}>
                        <Text style={[styles.sectionLabel, { color: homeColors.textSecondary }]}>
                            {t('transfers.step_reason', "3-QADAM: O'TISH SABABI")}
                        </Text>
                        <TextInput
                            style={[
                                styles.reasonInput,
                                cardSurface,
                                {
                                    color: homeColors.textPrimary,
                                    borderColor: homeColors.border,
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'
                                }
                            ]}
                            placeholder={t('transfers.reason_placeholder', "Boshqa jamoaga o'tish sababingizni yozing...")}
                            placeholderTextColor={homeColors.textSecondary}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            value={reason}
                            onChangeText={setReason}
                            maxLength={300}
                        />
                        <Text style={[styles.charCountText, { color: homeColors.textSecondary }]}>
                            {reason.length}/300
                        </Text>
                    </View>

                    {/* Slide To Send Action Button */}
                    <View style={{ marginTop: 12, marginBottom: 24, alignItems: 'center', width: '100%' }}>
                        <SlideButton
                            title={t('common.slide_to_send', 'Arizani yuborish uchun suring')}
                            loadingTitle={t('common.loading', 'Yuborilmoqda...')}
                            successTitle={t('common.success', 'Muvaffaqiyatli!')}
                            onSwipeSuccess={handleSubmit}
                            loading={submitting}
                            status={submitStatus}
                            disabled={submitting || !selectedTeam || !isTransferWindowOpen}
                            compact={false}
                            showHelperText={false}
                        />
                    </View>
                </ScrollView>

                {/* LEAGUE SELECTOR MODAL */}
                <Modal
                    visible={leagueModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setLeagueModalVisible(false)}
                >
                    <TouchableOpacity
                        style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}
                        activeOpacity={1}
                        onPress={() => setLeagueModalVisible(false)}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            style={[styles.pickerModalCard, cardSurface, { backgroundColor: homeColors.background, borderColor: homeColors.border }]}
                        >
                            <View style={[styles.pickerModalHeader, { borderBottomColor: homeColors.border }]}>
                                <Text style={[styles.pickerModalTitle, { color: homeColors.textPrimary }]}>
                                    {t('transfers.select_league', 'Ligani tanlang')}
                                </Text>
                                <TouchableOpacity onPress={() => setLeagueModalVisible(false)} style={styles.modalCloseBtn}>
                                    <Ionicons name="close" size={20} color={homeColors.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                                {leaguesList.map((item: any) => {
                                    const lName = item.name || item.title || item.id;
                                    const isSel = selectedLeague === lName;
                                    return (
                                        <TouchableOpacity
                                            key={item.id || lName}
                                            style={[
                                                styles.pickerItemRow,
                                                { borderBottomColor: homeColors.border },
                                                isSel && { backgroundColor: isDark ? 'rgba(255, 107, 0, 0.12)' : 'rgba(255, 107, 0, 0.08)' }
                                            ]}
                                            onPress={() => {
                                                try { Haptics.selectionAsync().catch(() => {}); } catch (e) {}
                                                setSelectedLeague(lName);
                                                setSelectedTeam('');
                                                fetchTeams(lName);
                                                setLeagueModalVisible(false);
                                            }}
                                        >
                                            <Ionicons name="trophy-outline" size={18} color={isSel ? BRAND_ORANGE : homeColors.textSecondary} style={{ marginRight: 12 }} />
                                            <Text style={[styles.pickerItemText, { color: isSel ? BRAND_ORANGE : homeColors.textPrimary, fontWeight: isSel ? '800' : '600' }]}>
                                                {lName}
                                            </Text>
                                            {isSel && <Ionicons name="checkmark-circle" size={18} color={BRAND_ORANGE} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>

                {/* TEAM SELECTOR MODAL WITH SEARCH */}
                <Modal
                    visible={teamModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setTeamModalVisible(false)}
                >
                    <TouchableOpacity
                        style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}
                        activeOpacity={1}
                        onPress={() => setTeamModalVisible(false)}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            style={[styles.pickerModalCard, cardSurface, { backgroundColor: homeColors.background, borderColor: homeColors.border, maxHeight: 520 }]}
                        >
                            <View style={[styles.pickerModalHeader, { borderBottomColor: homeColors.border }]}>
                                <Text style={[styles.pickerModalTitle, { color: homeColors.textPrimary }]}>
                                    {t('transfers.select_team', 'Yangi jamoani tanlang')}
                                </Text>
                                <TouchableOpacity onPress={() => setTeamModalVisible(false)} style={styles.modalCloseBtn}>
                                    <Ionicons name="close" size={20} color={homeColors.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            {/* Search Input */}
                            <View style={[styles.searchInputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: homeColors.border }]}>
                                <Ionicons name="search" size={16} color={BRAND_ORANGE} style={{ marginRight: 8 }} />
                                <TextInput
                                    style={[styles.searchInputText, { color: homeColors.textPrimary }]}
                                    placeholder={t('transfers.search_team', 'Jamoani qidirish...')}
                                    placeholderTextColor={homeColors.textSecondary}
                                    value={teamSearchQuery}
                                    onChangeText={setTeamSearchQuery}
                                />
                                {teamSearchQuery ? (
                                    <TouchableOpacity onPress={() => setTeamSearchQuery('')}>
                                        <Ionicons name="close-circle" size={16} color={homeColors.textSecondary} />
                                    </TouchableOpacity>
                                ) : null}
                            </View>

                            <FlatList
                                data={getFilteredTeams()}
                                keyExtractor={(item: any) => String(item._id || item.id)}
                                showsVerticalScrollIndicator={false}
                                ListEmptyComponent={
                                    <View style={{ padding: 24, alignItems: 'center' }}>
                                        <Text style={{ color: homeColors.textSecondary, fontSize: 13 }}>
                                            {t('transfers.no_teams_found', 'Jamoalar topilmadi')}
                                        </Text>
                                    </View>
                                }
                                renderItem={({ item }) => {
                                    const isSel = selectedTeam === (item._id || item.id);
                                    return (
                                        <TouchableOpacity
                                            style={[
                                                styles.pickerItemRow,
                                                { borderBottomColor: homeColors.border },
                                                isSel && { backgroundColor: isDark ? 'rgba(255, 107, 0, 0.12)' : 'rgba(255, 107, 0, 0.08)' }
                                            ]}
                                            onPress={() => {
                                                try { Haptics.selectionAsync().catch(() => {}); } catch (e) {}
                                                setSelectedTeam(item._id || item.id);
                                                setTeamModalVisible(false);
                                            }}
                                        >
                                            <View style={[styles.teamMiniLogo, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                                {item.logo_url || item.logo ? (
                                                    <SmartImage uri={item.logo_url || item.logo} style={{ width: 24, height: 24 }} contentFit="contain" fallbackIcon="shield-outline" />
                                                ) : (
                                                    <Ionicons name="shield-outline" size={16} color={BRAND_ORANGE} />
                                                )}
                                            </View>
                                            <Text style={[styles.pickerItemText, { color: isSel ? BRAND_ORANGE : homeColors.textPrimary, fontWeight: isSel ? '800' : '600' }]} numberOfLines={1}>
                                                {item.name}
                                            </Text>
                                            {isSel && <Ionicons name="checkmark-circle" size={18} color={BRAND_ORANGE} />}
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>

                {/* SUCCESS MODAL */}
                <Modal
                    visible={showSuccessModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => {
                        setShowSuccessModal(false);
                        navigation.goBack();
                    }}
                >
                    <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.82)' }]}>
                        <View style={[styles.pickerModalCard, cardSurface, { backgroundColor: homeColors.background, borderColor: homeColors.border, alignItems: 'center', padding: 24 }]}>
                            <View style={[styles.successIconCircle, { backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.1)' }]}>
                                <Ionicons name="checkmark-done" size={38} color={BRAND_ORANGE} />
                            </View>
                            <Text style={[styles.successTitle, { color: homeColors.textPrimary }]}>
                                {t('transfers.success_title', 'SO\'ROV YUBORILDI')}
                            </Text>
                            <Text style={[styles.successDesc, { color: homeColors.textSecondary }]}>
                                {t('transfers.success_desc', 'Transfer so\'rovingiz muvaffaqiyatli qabul qilindi. Tashkilotchi adminlar ko\'rib chiqqach arizangiz tasdiqlanadi.')}
                            </Text>
                            <TouchableOpacity
                                style={[styles.successBtn, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}
                                activeOpacity={0.8}
                                onPress={() => {
                                    setShowSuccessModal(false);
                                    navigation.goBack();
                                }}
                            >
                                <Text style={[styles.successBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                                    {t('common.done', 'Tayyor')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    rootContainer: {
        flex: 1,
    },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backBtnAction: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitleText: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    scrollContent: {
        padding: 16,
        gap: 16,
    },
    transferVisualCard: {
        borderRadius: 20,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    teamVisualBox: {
        flex: 1,
        alignItems: 'center',
    },
    teamLogoCircle: {
        width: 64,
        height: 64,
        borderRadius: 20,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    teamLogo: {
        width: 44,
        height: 44,
    },
    teamVisualName: {
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
        lineHeight: 17,
    },
    swapArrowCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 8,
    },
    infoBanner: {
        flexDirection: 'row',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'flex-start',
    },
    infoBannerText: {
        flex: 1,
        fontSize: 12.5,
        lineHeight: 18,
    },
    formSection: {
        gap: 8,
    },
    sectionLabel: {
        fontSize: 11.5,
        fontWeight: '800',
        letterSpacing: 0.6,
        marginLeft: 2,
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 14,
    },
    selectButtonText: {
        fontSize: 13.5,
        fontWeight: '600',
    },
    reasonInput: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        fontSize: 13.5,
        minHeight: 90,
    },
    charCountText: {
        fontSize: 11,
        textAlign: 'right',
        marginTop: 2,
        marginRight: 4,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    pickerModalCard: {
        width: '100%',
        maxWidth: 380,
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
    },
    pickerModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 12,
        borderBottomWidth: 1,
        marginBottom: 8,
    },
    pickerModalTitle: {
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    modalCloseBtn: {
        padding: 4,
    },
    pickerItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderRadius: 10,
    },
    pickerItemText: {
        flex: 1,
        fontSize: 14,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 10,
        marginTop: 4,
    },
    searchInputText: {
        flex: 1,
        fontSize: 13.5,
        paddingVertical: 2,
    },
    teamMiniLogo: {
        width: 30,
        height: 30,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    successIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    successTitle: {
        fontSize: 17,
        fontWeight: '900',
        letterSpacing: 0.6,
        marginBottom: 8,
        textAlign: 'center',
    },
    successDesc: {
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
        marginBottom: 20,
    },
    successBtn: {
        width: '100%',
        paddingVertical: 13,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    successBtnText: {
        fontSize: 14.5,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
});

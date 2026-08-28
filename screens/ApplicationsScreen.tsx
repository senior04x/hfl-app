import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    SafeAreaView,
    RefreshControl,
    Modal,
    Pressable,
    Animated,
    Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';
import AnimatedBackground from '../components/AnimatedBackground';
import backgroundImage from '../assets/images/backroud-image.png';
import { useAuthStore } from '../store/useAuthStore';
import { apiService } from '../services/apiService';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function ApplicationsScreen({ navigation }: any) {
    const { user, isGuest } = useAuthStore();
    const { t } = useTranslation();
    const [appTab, setAppTab] = useState<'transfers' | 'profile'>('transfers');
    const [userTransfers, setUserTransfers] = useState<any[]>([]);
    const [userProfileApps, setUserProfileApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Detail Modal State
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [selectedAppType, setSelectedAppType] = useState<'transfer' | 'profile'>('transfer');

    // Skeleton Animation
    const shimmerAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 0.8,
                    duration: 800,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0.3,
                    duration: 800,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    useEffect(() => {
        if (!isGuest && user) {
            loadApplications();
        } else {
            setLoading(false);
        }
    }, [isGuest, user]);

    const loadApplications = async () => {
        try {
            setLoading(true);
            const targetPlayerId = user?.id || user?._id;
            if (targetPlayerId) {
                const transfers = await apiService.getPlayerTransfers(targetPlayerId);
                setUserTransfers(transfers || []);
            }

            const userPhone = user?.phone || user?.phoneNumber || user?.phone_number || user?.tel;
            if (userPhone) {
                const apps = await apiService.getApplicationsByPhone(userPhone);
                setUserProfileApps(apps || []);
            }
        } catch (err) {
            console.error('Error loading ApplicationsScreen data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadApplications();
    };

    return (
        <AnimatedBackground overlayOpacity={0.75} backgroundImage={backgroundImage}>
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('applications.title')}</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* 2-Tab Segmented Slider Switcher */}
                <View style={styles.tabContainerWrapper}>
                    <View style={styles.segmentedTabContainer}>
                        <TouchableOpacity
                            style={[styles.segmentedTab, appTab === 'transfers' && styles.segmentedTabActive]}
                            onPress={() => setAppTab('transfers')}
                        >
                            <Text style={[styles.segmentedTabText, appTab === 'transfers' && styles.segmentedTabTextActive]}>
                                {t('nav.transfers').toUpperCase()} {userTransfers.length > 0 ? `(${userTransfers.length})` : ''}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.segmentedTab, appTab === 'profile' && styles.segmentedTabActive]}
                            onPress={() => setAppTab('profile')}
                        >
                            <Text style={[styles.segmentedTabText, appTab === 'profile' && styles.segmentedTabTextActive]}>
                                {t('profile.account').toUpperCase()} {userProfileApps.length > 0 ? `(${userProfileApps.length})` : ''}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Content */}
                {loading && !refreshing ? (
                    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {[1, 2, 3].map((k) => (
                            <View key={k} style={styles.skeletonCard}>
                                <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
                                <View style={styles.appCardHeader}>
                                    <Animated.View style={[styles.skeletonBlock, { width: 150, height: 16, opacity: shimmerAnim }]} />
                                    <Animated.View style={[styles.skeletonBlock, { width: 90, height: 20, borderRadius: 10, opacity: shimmerAnim }]} />
                                </View>
                                <Animated.View style={[styles.skeletonBlock, { width: '75%', height: 14, marginVertical: 12, opacity: shimmerAnim }]} />
                                <View style={styles.appCardFooter}>
                                    <Animated.View style={[styles.skeletonBlock, { width: 110, height: 12, opacity: shimmerAnim }]} />
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    <ScrollView
                        style={styles.container}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                        }
                    >
                        {appTab === 'transfers' ? (
                            userTransfers.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <View style={styles.emptyIconBg}>
                                        <Ionicons name="swap-horizontal-outline" size={42} color="rgba(255,255,255,0.3)" />
                                    </View>
                                    <Text style={styles.emptyTitle}>{t('applications.transfer_apps_empty')}</Text>
                                </View>
                            ) : (
                                userTransfers.map((item: any, idx: number) => {
                                    const isPending = item.status === 'pending' || item.status === 'kutilmoqda';
                                    const isApproved = item.status === 'approved' || item.status === 'tasdiqlangan' || item.status === 'accepted';
                                    const isRejected = item.status === 'rejected' || item.status === 'rad etilgan';

                                    const formattedDate = item.created_at
                                        ? `${new Date(item.created_at).toLocaleDateString()} ${new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                        : '—';

                                    return (
                                        <TouchableOpacity
                                            key={item.id || idx}
                                            activeOpacity={0.8}
                                            style={styles.appCard}
                                            onPress={() => {
                                                setSelectedApp(item);
                                                setSelectedAppType('transfer');
                                            }}
                                        >
                                            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

                                            <View style={styles.appCardHeader}>
                                                <View style={styles.appCardTitleGroup}>
                                                    <Ionicons name="swap-horizontal" size={18} color="#00FF66" style={{ marginRight: 8 }} />
                                                    <Text style={styles.appCardTitle} numberOfLines={1}>
                                                        {item.old_team_name || 'Eski Jamoa'} ➡️ {item.new_team_name || 'Yangi Jamoa'}
                                                    </Text>
                                                </View>
                                                <View style={[
                                                    styles.statusBadge,
                                                    isPending && styles.statusPending,
                                                    isApproved && styles.statusApproved,
                                                    isRejected && styles.statusRejected,
                                                ]}>
                                                    <Ionicons
                                                        name={isPending ? 'time-outline' : isApproved ? 'checkmark-circle' : 'close-circle'}
                                                        size={13}
                                                        color={isPending ? '#FFCC00' : isApproved ? '#00FF66' : '#FF3B30'}
                                                        style={{ marginRight: 4 }}
                                                    />
                                                    <Text style={[
                                                        styles.statusBadgeText,
                                                        isPending && { color: '#FFCC00' },
                                                        isApproved && { color: '#00FF66' },
                                                        isRejected && { color: '#FF3B30' },
                                                    ]}>
                                                        {isPending ? t('common.pending').toUpperCase() : isApproved ? t('common.approved').toUpperCase() : t('common.rejected').toUpperCase()}
                                                    </Text>
                                                </View>
                                            </View>

                                            {item.reason ? (
                                                <View style={styles.reasonBox}>
                                                    <Text style={styles.appCardReasonLabel}>{t('applications.reason')}</Text>
                                                    <Text style={styles.appCardReasonText}>"{item.reason}"</Text>
                                                </View>
                                            ) : null}

                                            <View style={styles.appCardFooter}>
                                                <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.4)" style={{ marginRight: 5 }} />
                                                <Text style={styles.appCardDate}>{formattedDate}</Text>
                                                <View style={{ flex: 1 }} />
                                                <Text style={styles.clickHint}>{t('common.details')} ➔</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )
                        ) : (
                            userProfileApps.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <View style={styles.emptyIconBg}>
                                        <Ionicons name="document-text-outline" size={42} color="rgba(255,255,255,0.3)" />
                                    </View>
                                    <Text style={styles.emptyTitle}>Ma'lumotlar arizalari topilmadi</Text>
                                    <Text style={styles.emptySub}>
                                        Siz hali profil ma'lumotlarini o'zgartirish yoki ligaga kirish bo'yicha ariza topshirmadingiz.
                                    </Text>
                                </View>
                            ) : (
                                userProfileApps.map((item: any, idx: number) => {
                                    const isPending = item.status === 'pending' || item.status === 'kutilmoqda';
                                    const isApproved = item.status === 'approved' || item.status === 'tasdiqlangan' || item.status === 'accepted';
                                    const isRejected = item.status === 'rejected' || item.status === 'rad etilgan';

                                    const formattedDate = item.created_at
                                        ? `${new Date(item.created_at).toLocaleDateString('uz-UZ')} ${new Date(item.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`
                                        : '—';

                                    return (
                                        <TouchableOpacity
                                            key={item.id || idx}
                                            activeOpacity={0.8}
                                            style={styles.appCard}
                                            onPress={() => {
                                                setSelectedApp(item);
                                                setSelectedAppType('profile');
                                            }}
                                        >
                                            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

                                            <View style={styles.appCardHeader}>
                                                <View style={styles.appCardTitleGroup}>
                                                    <Ionicons name="person" size={18} color="#00FF66" style={{ marginRight: 8 }} />
                                                    <Text style={styles.appCardTitle} numberOfLines={1}>
                                                        {item.first_name || item.name} {item.last_name || ''}
                                                    </Text>
                                                </View>
                                                <View style={[
                                                    styles.statusBadge,
                                                    isPending && styles.statusPending,
                                                    isApproved && styles.statusApproved,
                                                    isRejected && styles.statusRejected,
                                                ]}>
                                                    <Ionicons
                                                        name={isPending ? 'time-outline' : isApproved ? 'checkmark-circle' : 'close-circle'}
                                                        size={13}
                                                        color={isPending ? '#FFCC00' : isApproved ? '#00FF66' : '#FF3B30'}
                                                        style={{ marginRight: 4 }}
                                                    />
                                                    <Text style={[
                                                        styles.statusBadgeText,
                                                        isPending && { color: '#FFCC00' },
                                                        isApproved && { color: '#00FF66' },
                                                        isRejected && { color: '#FF3B30' },
                                                    ]}>
                                                        {isPending ? 'KUTILMOQDA' : isApproved ? 'TASDIQLANGAN' : 'RAD ETILGAN'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.reasonBox}>
                                                <Text style={styles.appCardReasonLabel}>Ariza turi:</Text>
                                                <Text style={styles.appCardReasonText}>
                                                    {item.type === 'player' ? "O'yinchi profili" : "Jamoa / Sardor profili"} {item.position ? `(${item.position})` : ''}
                                                </Text>
                                            </View>

                                            <View style={styles.appCardFooter}>
                                                <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.4)" style={{ marginRight: 5 }} />
                                                <Text style={styles.appCardDate}>{formattedDate}</Text>
                                                <View style={{ flex: 1 }} />
                                                <Text style={styles.clickHint}>Batafsil ➔</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )
                        )}
                    </ScrollView>
                )}

                {/* Full Details Modal */}
                <Modal
                    visible={!!selectedApp}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setSelectedApp(null)}
                >
                    <Pressable style={styles.modalOverlay} onPress={() => setSelectedApp(null)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>ARIZA TAFSILOTLARI</Text>
                            <TouchableOpacity onPress={() => setSelectedApp(null)}>
                                <Ionicons name="close-circle" size={26} color="rgba(255,255,255,0.6)" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
                            {selectedApp && (() => {
                                const isPending = selectedApp.status === 'pending' || selectedApp.status === 'kutilmoqda';
                                const isApproved = selectedApp.status === 'approved' || selectedApp.status === 'tasdiqlangan' || selectedApp.status === 'accepted';
                                const isRejected = selectedApp.status === 'rejected' || selectedApp.status === 'rad etilgan';

                                const formattedFullDate = selectedApp.created_at
                                    ? `${new Date(selectedApp.created_at).toLocaleDateString('uz-UZ')} soat ${new Date(selectedApp.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`
                                    : '—';

                                return (
                                    <View style={{ paddingTop: 6, paddingBottom: 16 }}>
                                        {/* Status Header Banner */}
                                        <View style={[
                                            styles.detailStatusBanner,
                                            isPending && styles.statusPending,
                                            isApproved && styles.statusApproved,
                                            isRejected && styles.statusRejected,
                                        ]}>
                                            <Ionicons
                                                name={isPending ? 'time-outline' : isApproved ? 'checkmark-circle-outline' : 'close-circle-outline'}
                                                size={28}
                                                color={isPending ? '#FFCC00' : isApproved ? '#00FF66' : '#FF3B30'}
                                                style={{ marginRight: 10 }}
                                            />
                                            <View style={{ flex: 1 }}>
                                                <Text style={[
                                                    styles.detailStatusTitle,
                                                    isPending && { color: '#FFCC00' },
                                                    isApproved && { color: '#00FF66' },
                                                    isRejected && { color: '#FF3B30' },
                                                ]}>
                                                    {isPending ? 'KUTILMOQDA' : isApproved ? 'TASDIQLANGAN' : 'RAD ETILGAN'}
                                                </Text>
                                                <Text style={styles.detailStatusSub}>
                                                    {isPending
                                                        ? "Ariza tashkilotchilar tomonidan ko'rib chiqilmoqda"
                                                        : isApproved
                                                            ? "Ariza tasdiqlandi va qabul qilindi"
                                                            : "Ariza tashkilotchi tomonidan rad etilgan"}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Fields List */}
                                        {selectedAppType === 'transfer' ? (
                                            <>
                                                <View style={styles.detailRow}>
                                                    <Text style={styles.detailLabel}>O'YINCHI ISMI</Text>
                                                    <Text style={styles.detailValue}>{selectedApp.player_name || user?.name || '—'}</Text>
                                                </View>

                                                <View style={styles.detailRow}>
                                                    <Text style={styles.detailLabel}>HOZIRGI JAMOA (ESKI)</Text>
                                                    <Text style={styles.detailValue}>{selectedApp.old_team_name || 'Eski jamoa'}</Text>
                                                </View>

                                                <View style={styles.detailRow}>
                                                    <Text style={styles.detailLabel}>O'TAYOTGAN JAMOA (YANGI)</Text>
                                                    <Text style={[styles.detailValue, { color: '#00FF66' }]}>{selectedApp.new_team_name || 'Yangi jamoa'}</Text>
                                                </View>

                                                <View style={styles.detailRow}>
                                                    <Text style={styles.detailLabel}>O'TISH SABABI</Text>
                                                    <Text style={styles.detailValue}>"{selectedApp.reason || 'Keltirilmagan'}"</Text>
                                                </View>
                                            </>
                                        ) : (
                                            <>
                                                <View style={styles.detailRow}>
                                                    <Text style={styles.detailLabel}>ISMI VA FAMILIYASI</Text>
                                                    <Text style={styles.detailValue}>{selectedApp.first_name || selectedApp.name} {selectedApp.last_name || ''}</Text>
                                                </View>

                                                <View style={styles.detailRow}>
                                                    <Text style={styles.detailLabel}>TELEFON RAQAMI</Text>
                                                    <Text style={styles.detailValue}>{selectedApp.phone || user?.phone || '—'}</Text>
                                                </View>

                                                <View style={styles.detailRow}>
                                                    <Text style={styles.detailLabel}>ARIZA TURI</Text>
                                                    <Text style={styles.detailValue}>
                                                        {selectedApp.type === 'player' ? "O'yinchi profili" : "Jamoa / Sardor profili"}
                                                    </Text>
                                                </View>

                                                {selectedApp.position && (
                                                    <View style={styles.detailRow}>
                                                        <Text style={styles.detailLabel}>MAYDONDAGI POZITSIYA</Text>
                                                        <Text style={styles.detailValue}>{selectedApp.position}</Text>
                                                    </View>
                                                )}

                                                {selectedApp.birth_date && (
                                                    <View style={styles.detailRow}>
                                                        <Text style={styles.detailLabel}>TUG'ILGAN YILI</Text>
                                                        <Text style={styles.detailValue}>{selectedApp.birth_date}</Text>
                                                    </View>
                                                )}

                                                {selectedApp.teams?.name && (
                                                    <View style={styles.detailRow}>
                                                        <Text style={styles.detailLabel}>JAMOA</Text>
                                                        <Text style={styles.detailValue}>{selectedApp.teams.name}</Text>
                                                    </View>
                                                )}
                                            </>
                                        )}

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>YUBORILGAN SANA VA VAQT</Text>
                                            <Text style={styles.detailValue}>{formattedFullDate}</Text>
                                        </View>
                                    </View>
                                );
                            })()}
                        </ScrollView>

                        <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedApp(null)}>
                            <Ionicons name="close-circle" size={20} color="#0b0e17" style={{ marginRight: 6 }} />
                            <Text style={styles.closeBtnText}>YOPISH</Text>
                        </TouchableOpacity>
                    </View>
                </Modal>
            </SafeAreaView>
        </AnimatedBackground>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    backIconCenter: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    tabContainerWrapper: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    segmentedTabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 14,
        padding: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    segmentedTab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    segmentedTabActive: {
        backgroundColor: Colors.primary,
    },
    segmentedTabText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    segmentedTabTextActive: {
        color: '#0b0e17',
        fontWeight: '900',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
        marginTop: 12,
        fontWeight: '600',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 40,
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 6,
    },
    emptySub: {
        color: 'rgba(255, 255, 255, 0.45)',
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 30,
        lineHeight: 18,
    },
    appCard: {
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        overflow: 'hidden',
    },
    appCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    appCardTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    appCardTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
        flex: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
    },
    statusPending: {
        backgroundColor: 'rgba(255, 204, 0, 0.12)',
        borderColor: 'rgba(255, 204, 0, 0.4)',
    },
    statusApproved: {
        backgroundColor: 'rgba(0, 255, 102, 0.12)',
        borderColor: 'rgba(0, 255, 102, 0.4)',
    },
    statusRejected: {
        backgroundColor: 'rgba(255, 59, 48, 0.12)',
        borderColor: 'rgba(255, 59, 48, 0.4)',
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    reasonBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
    },
    appCardReasonLabel: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 2,
    },
    appCardReasonText: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 13,
        fontWeight: '500',
    },
    appCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 4,
    },
    appCardDate: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
        fontWeight: '500',
    },
    clickHint: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    modalContent: {
        backgroundColor: '#0d1117',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 34,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.2)',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 10,
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    detailStatusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        marginBottom: 16,
        borderWidth: 1,
    },
    detailStatusTitle: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    detailStatusSub: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
    },
    detailRow: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    detailLabel: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    detailValue: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    closeBtn: {
        width: '100%',
        height: 48,
        borderRadius: 14,
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
    },
    closeBtnText: {
        color: '#0b0e17',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    skeletonCard: {
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        overflow: 'hidden',
    },
    skeletonBlock: {
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 6,
    },
});

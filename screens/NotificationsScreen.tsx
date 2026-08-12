import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';
import AnimatedBackground from '../components/AnimatedBackground';
import backgroundImage from '../assets/images/backroud-image.png';
import { apiService } from '../services/apiService';
import { useAuthStore } from '../store/useAuthStore';
import * as Haptics from 'expo-haptics';

const READ_STORAGE_KEY = 'read_notification_ids_v1';

export default function NotificationsScreen({ navigation }: any) {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [readIds, setReadIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<'all' | 'match' | 'news' | 'system'>('all');
    const { user } = useAuthStore();

    useEffect(() => {
        loadNotificationsData();
    }, []);

    const loadNotificationsData = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        else setLoading(true);

        try {
            // Load saved read notification IDs
            const savedReadJson = await AsyncStorage.getItem(READ_STORAGE_KEY);
            const savedReadIds: string[] = savedReadJson ? JSON.parse(savedReadJson) : [];
            setReadIds(savedReadIds);

            // Fetch real matches, news, and org data in parallel
            const [matchesData, newsData] = await Promise.all([
                apiService.getMatches().catch(() => []),
                apiService.supabase.from('news').select('*').order('created_at', { ascending: false }).limit(10).then(res => res.data || []).catch(() => [])
            ]);

            const generatedList: any[] = [];

            // 1. Process Real Matches (Live, Scheduled, Finished)
            if (Array.isArray(matchesData)) {
                matchesData.forEach((m: any) => {
                    const homeName = m.homeTeamName || m.homeTeam?.name || 'Uy jamoasi';
                    const awayName = m.awayTeamName || m.awayTeam?.name || 'Mehmon jamoasi';
                    const mId = m._id || m.id;

                    if (m.status === 'live') {
                        generatedList.push({
                            id: `notif_match_live_${mId}`,
                            targetId: mId,
                            category: 'match',
                            type: 'match_live',
                            title: '🔴 JONLI UCHRASHUV DAKIQALARI',
                            subtitle: `${homeName} vs ${awayName} uchrashuvi ayni damda jonli efirda! Natija: ${m.score?.home || 0} - ${m.score?.away || 0}`,
                            date: m.date || new Date().toISOString(),
                            icon: 'football',
                            iconColor: '#FF3B30',
                            screenName: 'MatchDetail',
                            params: { matchId: mId }
                        });
                    } else if (m.status === 'scheduled') {
                        const rawDate = m.date || m.match_date;
                        const matchDate = new Date(rawDate);
                        const isValidDate = !isNaN(matchDate.getTime());
                        const dateStr = isValidDate ? matchDate.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }) : "Yaqin orada";

                        generatedList.push({
                            id: `notif_match_sched_${mId}`,
                            targetId: mId,
                            category: 'match',
                            type: 'match_scheduled',
                            title: '📅 NAVBATDAGI O\'YIN BOSHSI',
                            subtitle: `${homeName} vs ${awayName} uchrashuvi ${dateStr} sanasida bo'lib o'tadi. O'tkazilmay qolmang!`,
                            date: m.date || new Date().toISOString(),
                            icon: 'calendar',
                            iconColor: '#00E5FF',
                            screenName: 'MatchDetail',
                            params: { matchId: mId }
                        });
                    } else if (m.status === 'finished') {
                        generatedList.push({
                            id: `notif_match_fin_${mId}`,
                            targetId: mId,
                            category: 'match',
                            type: 'match_finished',
                            title: '⚽ O\'YIN NATIJASI YAKUNLANDI',
                            subtitle: `${homeName} ${m.score?.home || 0} - ${m.score?.away || 0} ${awayName} uchrashuvi yakunlandi. Barcha statistikalar mavjud.`,
                            date: m.date || new Date().toISOString(),
                            icon: 'trophy',
                            iconColor: '#FFD700',
                            screenName: 'MatchDetail',
                            params: { matchId: mId }
                        });
                    }
                });
            }

            // 2. Process Real News
            if (Array.isArray(newsData)) {
                newsData.forEach((n: any) => {
                    const nId = n.id || n._id;
                    generatedList.push({
                        id: `notif_news_${nId}`,
                        targetId: nId,
                        category: 'news',
                        type: 'news_item',
                        title: `📰 ${n.title || 'Yangi Liga Yangiligi'}`,
                        subtitle: n.summary || (n.content ? n.content.slice(0, 110) + '...' : 'Batafsil ma\'lumot bilan tanishing.'),
                        date: n.created_at || new Date().toISOString(),
                        icon: 'newspaper',
                        iconColor: '#00FF87',
                        screenName: 'NewsDetail',
                        params: { newsId: nId }
                    });
                });
            }

            // 3. System Announcement
            generatedList.push({
                id: 'notif_system_welcome',
                category: 'system',
                type: 'system_welcome',
                title: '⚡ AMATORA LIGA XUSH KELIBSIZ',
                subtitle: 'Akkountingiz muvaffaqiyatli ulangan. Barcha tur natijalari va yangiliklarni bildirishnomalar orqali kuzatib boring.',
                date: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
                icon: 'shield-checkmark',
                iconColor: '#00FF87',
            });

            // Sort newest first
            generatedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setNotifications(generatedList);
        } catch (e) {
            console.error('Error loading notifications:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}

        if (!readIds.includes(id)) {
            const updated = [...readIds, id];
            setReadIds(updated);
            await AsyncStorage.setItem(READ_STORAGE_KEY, JSON.stringify(updated));
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {}

        const allIds = notifications.map(n => n.id);
        setReadIds(allIds);
        await AsyncStorage.setItem(READ_STORAGE_KEY, JSON.stringify(allIds));
    };

    const handleNotificationPress = async (item: any) => {
        await handleMarkAsRead(item.id);
        if (item.screenName) {
            navigation.navigate(item.screenName, item.params || {});
        }
    };

    // Filtering
    const filteredNotifications = notifications.filter(n => {
        if (activeFilter === 'all') return true;
        return n.category === activeFilter;
    });

    const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

    return (
        <AnimatedBackground overlayOpacity={0.8} backgroundImage={backgroundImage}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header Bar */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backBtn} 
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.headerTitle}>BILDIRISHNOMALAR</Text>
                        <Text style={styles.headerSubtitle}>
                            {unreadCount > 0 ? `${unreadCount} ta o'qilmagan xabar` : "Barcha xabarlar o'qilgan"}
                        </Text>
                    </View>

                    {unreadCount > 0 && (
                        <TouchableOpacity 
                            style={styles.markAllBtn} 
                            onPress={handleMarkAllRead}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="checkmark-done" size={18} color="#00FF87" />
                            <Text style={styles.markAllText}>O'qildi</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filter Tabs */}
                <View style={styles.filterRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                        {[
                            { key: 'all', label: 'BARCHASI' },
                            { key: 'match', label: "O'YINLAR" },
                            { key: 'news', label: 'YANGILIKLAR' },
                            { key: 'system', label: 'TIZIM' },
                        ].map((filter) => {
                            const isActive = activeFilter === filter.key;
                            return (
                                <TouchableOpacity
                                    key={filter.key}
                                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                                    onPress={() => setActiveFilter(filter.key as any)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                                        {filter.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Main List */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={() => loadNotificationsData(true)} 
                            tintColor={Colors.primary} 
                        />
                    }
                >
                    {loading ? (
                        <View style={{ paddingVertical: 50, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#00FF87" />
                            <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 12, fontSize: 13 }}>
                                Bildirishnomalar yuklanmoqda...
                            </Text>
                        </View>
                    ) : filteredNotifications.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={48} color="rgba(255,255,255,0.3)" />
                            <Text style={styles.emptyTitle}>Bildirishnomalar topilmadi</Text>
                            <Text style={styles.emptySubtitle}>Sizda hozircha ushbu bo'lim bo'yicha yangi ma'lumotlar yo'q.</Text>
                        </View>
                    ) : (
                        filteredNotifications.map((item) => {
                            const isRead = readIds.includes(item.id);

                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.notifCard, !isRead && styles.notifCardUnread]}
                                    onPress={() => handleNotificationPress(item)}
                                    activeOpacity={0.8}
                                >
                                    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

                                    <View style={styles.cardContent}>
                                        <View style={[styles.iconContainer, { backgroundColor: `${item.iconColor}18`, borderColor: `${item.iconColor}40` }]}>
                                            <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
                                        </View>

                                        <View style={{ flex: 1, marginLeft: 14 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <Text style={[styles.notifTitle, !isRead && styles.notifTitleUnread]} numberOfLines={1}>
                                                    {item.title}
                                                </Text>
                                                {!isRead && <View style={styles.unreadDot} />}
                                            </View>

                                            <Text style={styles.notifSubtitle} numberOfLines={2}>
                                                {item.subtitle}
                                            </Text>

                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                                                <Text style={styles.notifDate}>
                                                    {new Date(item.date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                                {item.screenName && (
                                                    <View style={styles.actionArrow}>
                                                        <Text style={styles.actionArrowText}>Ko'rish</Text>
                                                        <Ionicons name="chevron-forward" size={14} color="#00FF87" />
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            </SafeAreaView>
        </AnimatedBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.55)',
        marginTop: 2,
    },
    markAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 135, 0.12)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 135, 0.3)',
        gap: 4,
    },
    markAllText: {
        color: '#00FF87',
        fontSize: 12,
        fontWeight: '700',
    },
    filterRow: {
        marginBottom: 16,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    filterChipActive: {
        backgroundColor: 'rgba(0, 255, 135, 0.15)',
        borderColor: 'rgba(0, 255, 135, 0.5)',
    },
    filterChipText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    filterChipTextActive: {
        color: '#00FF87',
    },
    notifCard: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(20, 25, 40, 0.4)',
    },
    notifCardUnread: {
        borderColor: 'rgba(0, 255, 135, 0.35)',
        backgroundColor: 'rgba(0, 255, 135, 0.06)',
    },
    cardContent: {
        flexDirection: 'row',
        padding: 16,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    notifTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.85)',
        flex: 1,
    },
    notifTitleUnread: {
        color: '#FFFFFF',
        fontWeight: '900',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#00FF87',
        marginLeft: 6,
    },
    notifSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.65)',
        lineHeight: 17,
    },
    notifDate: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.4)',
        fontWeight: '500',
    },
    actionArrow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    actionArrowText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#00FF87',
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        marginTop: 14,
    },
    emptySubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        textAlign: 'center',
        marginTop: 6,
        paddingHorizontal: 30,
    },
});

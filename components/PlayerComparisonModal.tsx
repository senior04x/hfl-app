import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    TextInput,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { SmartBlurView } from './SmartBlurView';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import SmartImage from './SmartImage';
import PlayerRadarChart, { RadarStatItem } from './PlayerRadarChart';
import FifaPlayerCard from './FifaPlayerCard';
import Colors from '../constants/Colors';
import { calculateFifaAttributes, FifaAttributes } from '../utils/playerCardUtils';
import { apiService } from '../services/apiService';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PlayerComparisonModalProps {
    visible: boolean;
    onClose: () => void;
    player1: any;
    player2?: any;
    allPlayers?: any[];
}

export default function PlayerComparisonModal({
    visible,
    onClose,
    player1,
    player2: initialPlayer2,
    allPlayers = [],
}: PlayerComparisonModalProps) {
    const { t } = useTranslation();
    // Default to null if no player2 is explicitly provided - NEVER auto-select a random player
    const [selectedP2, setSelectedP2] = useState<any>(initialPlayer2 || null);
    const [activeTab, setActiveTab] = useState<'radar' | 'stats' | 'cards'>('radar');
    const [isSearchingP2, setIsSearchingP2] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [availablePlayers, setAvailablePlayers] = useState<any[]>(allPlayers);
    const [loadingPlayers, setLoadingPlayers] = useState(false);

    useEffect(() => {
        if (initialPlayer2) {
            setSelectedP2(initialPlayer2);
        } else {
            setSelectedP2(null);
        }
    }, [initialPlayer2, visible]);

    // Fetch players if list is empty
    useEffect(() => {
        if (visible && (!availablePlayers || availablePlayers.length === 0)) {
            fetchPlayersList();
        }
    }, [visible]);

    const fetchPlayersList = async () => {
        try {
            setLoadingPlayers(true);
            const data = await apiService.getPlayers(1, 60);
            if (data && Array.isArray(data)) {
                // Filter out archived or unapproved players from selection pool
                const activePool = data.filter((p: any) => {
                    const st = String(p.status || '').toLowerCase().trim();
                    const isArchived = p.is_archived === true || st === 'archived' || st === 'arxivlangan';
                    return !isArchived;
                });
                setAvailablePlayers(activePool);
            }
        } catch (e) {
            console.error('Error fetching player comparison pool:', e);
        } finally {
            setLoadingPlayers(false);
        }
    };

    if (!player1) return null;

    let p1Attrs: FifaAttributes = { ovr: 60, pac: 60, sho: 60, pas: 60, dri: 60, def: 60, phy: 60 };
    try {
        p1Attrs = calculateFifaAttributes(player1);
    } catch (e) {}

    let p2Attrs: FifaAttributes | null = null;
    if (selectedP2) {
        try {
            p2Attrs = calculateFifaAttributes(selectedP2);
        } catch (e) {}
    }

    const p1Name = player1.firstName && player1.lastName
        ? `${player1.firstName} ${player1.lastName}`
        : player1.name || player1.fullName || 'O\'yinchi 1';

    const p2Name = selectedP2
        ? selectedP2.firstName && selectedP2.lastName
            ? `${selectedP2.firstName} ${selectedP2.lastName}`
            : selectedP2.name || selectedP2.fullName || 'O\'yinchi 2'
        : 'Tanlang...';

    const p1Team = player1.teams?.name || player1.team_name || player1.teamName || 'Amatora';
    const p2Team = selectedP2 ? selectedP2.teams?.name || selectedP2.team_name || selectedP2.teamName || 'Amatora' : '—';

    // Detailed Stats Comparison Definitions
    const statRows = [
        {
            label: 'Umumiy Reyting (OVR)',
            p1: p1Attrs.ovr,
            p2: p2Attrs?.ovr || 0,
            icon: 'star',
            max: 100,
        },
        {
            label: 'O\'yinlar Soni',
            p1: Number(player1.stats?.matchesPlayed || player1.careerMatches || 0),
            p2: Number(selectedP2?.stats?.matchesPlayed || selectedP2?.careerMatches || 0),
            icon: 'calendar',
            max: 50,
        },
        {
            label: 'Urgan Gollari',
            p1: Number(player1.stats?.goals || player1.careerGoals || 0),
            p2: Number(selectedP2?.stats?.goals || selectedP2?.careerGoals || 0),
            icon: 'football',
            max: 40,
        },
        {
            label: 'Golli Uzatmalar (Assists)',
            p1: Number(player1.stats?.assists || player1.careerAssists || 0),
            p2: Number(selectedP2?.stats?.assists || selectedP2?.careerAssists || 0),
            icon: 'git-pull-request',
            max: 30,
        },
        {
            label: 'Tezlik (PAC)',
            p1: p1Attrs.pac,
            p2: p2Attrs?.pac || 0,
            icon: 'flash',
            max: 99,
        },
        {
            label: 'Zarba (SHO)',
            p1: p1Attrs.sho,
            p2: p2Attrs?.sho || 0,
            icon: 'flame',
            max: 99,
        },
        {
            label: 'Pas (PAS)',
            p1: p1Attrs.pas,
            p2: p2Attrs?.pas || 0,
            icon: 'swap-horizontal',
            max: 99,
        },
        {
            label: 'Dribling (DRI)',
            p1: p1Attrs.dri,
            p2: p2Attrs?.dri || 0,
            icon: 'sparkles',
            max: 99,
        },
        {
            label: 'Himoya (DEF)',
            p1: p1Attrs.def,
            p2: p2Attrs?.def || 0,
            icon: 'shield-checkmark',
            max: 99,
        },
        {
            label: 'Jismoniy Kuch (PHY)',
            p1: p1Attrs.phy,
            p2: p2Attrs?.phy || 0,
            icon: 'barbell',
            max: 99,
        },
        {
            label: 'Bo\'yi (sm)',
            p1: Number(player1.height || 178),
            p2: Number(selectedP2?.height || 178),
            icon: 'resize',
            max: 205,
        },
        {
            label: 'Vazni (kg)',
            p1: Number(player1.weight || 72),
            p2: Number(selectedP2?.weight || 72),
            icon: 'fitness',
            max: 100,
        },
    ];

    // Filter players for search modal
    const filteredPlayers = availablePlayers.filter((p: any) => {
        const id = p.id || p._id;
        const p1Id = player1.id || player1._id;
        if (id === p1Id) return false;
        const name = `${p.firstName || ''} ${p.lastName || ''} ${p.name || ''}`.toLowerCase();
        return name.includes(searchQuery.toLowerCase());
    });

    const handleSelectOpponent = (player: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        setSelectedP2(player);
        setIsSearchingP2(false);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <SmartBlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />

                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleBadge}>
                            <Ionicons name="git-compare" size={16} color={Colors.primary} />
                            <Text style={styles.headerTitle}>O'YINCHILAR TAQQOSI</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                onClose();
                            }}
                        >
                            <Ionicons name="close" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Dual Player Selection Cards Header */}
                    <View style={styles.playersCompareRow}>
                        {/* Player 1 Card */}
                        <View style={[styles.playerHeaderCard, styles.playerHeaderCardP1]}>
                            <View style={styles.playerAvatarRingP1}>
                                <SmartImage
                                    uri={player1.avatar || player1.photo}
                                    style={styles.playerHeaderAvatar}
                                    contentFit="cover"
                                />
                            </View>
                            <View style={styles.playerHeaderInfo}>
                                <Text style={styles.playerHeaderOvrP1}>{p1Attrs.ovr}</Text>
                                <Text style={styles.playerHeaderName} numberOfLines={1}>
                                    {p1Name}
                                </Text>
                                <Text style={styles.playerHeaderTeam} numberOfLines={1}>
                                    {p1Team}
                                </Text>
                            </View>
                        </View>

                        {/* VS Center Badge */}
                        <View style={styles.vsBadgeContainer}>
                            <LinearGradient
                                colors={['#00DF82', '#00F0FF']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.vsBadgeCircle}
                            >
                                <Text style={styles.vsBadgeText}>VS</Text>
                            </LinearGradient>
                        </View>

                        {/* Player 2 Card / Selector */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                setIsSearchingP2(true);
                            }}
                            style={[styles.playerHeaderCard, styles.playerHeaderCardP2]}
                        >
                            {selectedP2 ? (
                                <>
                                    <View style={styles.playerAvatarRingP2}>
                                        <SmartImage
                                            uri={selectedP2.avatar || selectedP2.photo}
                                            style={styles.playerHeaderAvatar}
                                            contentFit="cover"
                                        />
                                    </View>
                                    <View style={styles.playerHeaderInfo}>
                                        <Text style={styles.playerHeaderOvrP2}>{p2Attrs?.ovr || '--'}</Text>
                                        <Text style={styles.playerHeaderName} numberOfLines={1}>
                                            {p2Name}
                                        </Text>
                                        <Text style={styles.playerHeaderTeam} numberOfLines={1}>
                                            {p2Team}
                                        </Text>
                                    </View>
                                    <View style={styles.switchIcon}>
                                        <Ionicons name="swap-horizontal" size={14} color="#00F0FF" />
                                    </View>
                                </>
                            ) : (
                                <View style={styles.chooseOpponentWrapper}>
                                    <Ionicons name="person-add" size={24} color="#00F0FF" />
                                    <Text style={styles.chooseOpponentText}>O'yinchi Tanlash</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Navigation Tabs */}
                    <View style={styles.tabsRow}>
                        <TouchableOpacity
                            onPress={() => setActiveTab('radar')}
                            style={[styles.tabBtn, activeTab === 'radar' && styles.tabBtnActive]}
                        >
                            <Ionicons
                                name="pie-chart"
                                size={15}
                                color={activeTab === 'radar' ? '#00DF82' : '#94A3B8'}
                            />
                            <Text
                                style={[
                                    styles.tabBtnText,
                                    activeTab === 'radar' && styles.tabBtnTextActive,
                                ]}
                            >
                                3D Radar
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setActiveTab('stats')}
                            style={[styles.tabBtn, activeTab === 'stats' && styles.tabBtnActive]}
                        >
                            <Ionicons
                                name="bar-chart"
                                size={15}
                                color={activeTab === 'stats' ? '#00DF82' : '#94A3B8'}
                            />
                            <Text
                                style={[
                                    styles.tabBtnText,
                                    activeTab === 'stats' && styles.tabBtnTextActive,
                                ]}
                            >
                                Barcha Statistika
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setActiveTab('cards')}
                            style={[styles.tabBtn, activeTab === 'cards' && styles.tabBtnActive]}
                        >
                            <Ionicons
                                name="albums"
                                size={15}
                                color={activeTab === 'cards' ? '#00DF82' : '#94A3B8'}
                            />
                            <Text
                                style={[
                                    styles.tabBtnText,
                                    activeTab === 'cards' && styles.tabBtnTextActive,
                                ]}
                            >
                                FIFA Kartalar
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tab Content */}
                    <ScrollView
                        style={styles.scrollArea}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {activeTab === 'radar' && (
                            <View style={styles.radarTabWrapper}>
                                <PlayerRadarChart
                                    player1={player1}
                                    player2={selectedP2}
                                    player1Name={p1Name}
                                    player2Name={p2Name}
                                    player1Color="#00DF82"
                                    player2Color="#00F0FF"
                                    size={Math.min(SCREEN_WIDTH - 40, 330)}
                                    showLegend={true}
                                />

                                {/* Quick Attribute Summary Cards */}
                                <View style={styles.advantagesContainer}>
                                    <Text style={styles.advantagesSectionTitle}>ASOSIY USTUNLIKLAR</Text>
                                    <View style={styles.advCardsRow}>
                                        <View style={[styles.advCard, { borderColor: '#00DF82' }]}>
                                            <Text style={[styles.advPlayer, { color: '#00DF82' }]}>{p1Name}</Text>
                                            <Text style={styles.advStatText}>
                                                {p1Attrs.sho >= (p2Attrs?.sho || 0)
                                                    ? `🎯 Zarba: ${p1Attrs.sho} vs ${p2Attrs?.sho || 0}`
                                                    : `⚡ Tezlik: ${p1Attrs.pac} vs ${p2Attrs?.pac || 0}`}
                                            </Text>
                                        </View>
                                        {selectedP2 && (
                                            <View style={[styles.advCard, { borderColor: '#00F0FF' }]}>
                                                <Text style={[styles.advPlayer, { color: '#00F0FF' }]}>{p2Name}</Text>
                                                <Text style={styles.advStatText}>
                                                    {(p2Attrs?.pas || 0) >= p1Attrs.pas
                                                        ? `🪄 Pas: ${p2Attrs?.pas || 0} vs ${p1Attrs.pas}`
                                                        : `🛡️ Himoya: ${p2Attrs?.def || 0} vs ${p1Attrs.def}`}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        )}

                        {activeTab === 'stats' && (
                            <View style={styles.statsListWrapper}>
                                {statRows.map((row, idx) => {
                                    const p1Val = row.p1;
                                    const p2Val = row.p2;
                                    const total = Math.max(p1Val + p2Val, 1);
                                    const p1Percent = Math.round((p1Val / total) * 100);
                                    const p2Percent = 100 - p1Percent;

                                    const isP1Leading = p1Val > p2Val;
                                    const isP2Leading = p2Val > p1Val;

                                    return (
                                        <View key={idx} style={styles.statCompareBarCard}>
                                            <View style={styles.statLabelRow}>
                                                <Text
                                                    style={[
                                                        styles.statValueLeft,
                                                        isP1Leading && styles.leadingValueP1,
                                                    ]}
                                                >
                                                    {p1Val}
                                                </Text>
                                                <View style={styles.statLabelCenter}>
                                                    <Ionicons
                                                        name={(row.icon as any) || 'ellipse'}
                                                        size={12}
                                                        color="#94A3B8"
                                                    />
                                                    <Text style={styles.statLabelTitle}>{row.label}</Text>
                                                </View>
                                                <Text
                                                    style={[
                                                        styles.statValueRight,
                                                        isP2Leading && styles.leadingValueP2,
                                                    ]}
                                                >
                                                    {p2Val}
                                                </Text>
                                            </View>

                                            {/* Dual Split Bar */}
                                            <View style={styles.splitBarTrack}>
                                                <View
                                                    style={[
                                                        styles.barFillP1,
                                                        { width: `${p1Percent}%` },
                                                        isP1Leading && styles.leadingBarGlowP1,
                                                    ]}
                                                />
                                                <View
                                                    style={[
                                                        styles.barFillP2,
                                                        { width: `${p2Percent}%` },
                                                        isP2Leading && styles.leadingBarGlowP2,
                                                    ]}
                                                />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {activeTab === 'cards' && (
                            <View style={styles.cardsTabWrapper}>
                                <Text style={styles.cardsHintText}>
                                    Kartani ushlab turing va 3D burchak ostida harakatlantiring
                                </Text>
                                <View style={styles.cardsSideBySide}>
                                    <View style={styles.singleCardCol}>
                                        <FifaPlayerCard
                                            player={player1}
                                            size="sm"
                                            interactive3D={true}
                                        />
                                    </View>
                                    {selectedP2 ? (
                                        <View style={styles.singleCardCol}>
                                            <FifaPlayerCard
                                                player={selectedP2}
                                                size="sm"
                                                interactive3D={true}
                                            />
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={[styles.singleCardCol, {
                                                height: 220,
                                                borderRadius: 18,
                                                borderWidth: 1.5,
                                                borderColor: 'rgba(0, 240, 255, 0.4)',
                                                borderStyle: 'dashed',
                                                backgroundColor: 'rgba(0, 240, 255, 0.05)',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: 16,
                                            }]}
                                            activeOpacity={0.8}
                                            onPress={() => setIsSearchingP2(true)}
                                        >
                                            <Ionicons name="person-add" size={32} color="#00F0FF" />
                                            <Text style={{ color: '#00F0FF', fontSize: 12, fontWeight: '800', marginTop: 10, textAlign: 'center' }}>
                                                {"Raqib O'yinchini Tanlash"}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </View>

                {/* Opponent Selection Sub-Modal */}
                {isSearchingP2 && (
                    <View style={styles.searchModalOverlay}>
                        <View style={styles.searchModalContainer}>
                            <View style={styles.searchModalHeader}>
                                <Text style={styles.searchModalTitle}>Raqib o'yinchini tanlang</Text>
                                <TouchableOpacity
                                    onPress={() => setIsSearchingP2(false)}
                                    style={styles.searchModalClose}
                                >
                                    <Ionicons name="close" size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.searchInputWrapper}>
                                <Ionicons name="search" size={18} color="#94A3B8" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="O'yinchi ismini qidiring..."
                                    placeholderTextColor="#64748B"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoFocus
                                />
                            </View>

                            {loadingPlayers ? (
                                <ActivityIndicator size="large" color="#00DF82" style={{ marginVertical: 30 }} />
                            ) : (
                                <ScrollView style={{ maxHeight: 360 }}>
                                    {filteredPlayers.map((item: any) => {
                                        const fullName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.name || 'O\'yinchi';
                                        const attrs = calculateFifaAttributes(item);
                                        return (
                                            <TouchableOpacity
                                                key={item.id || item._id}
                                                style={styles.playerSearchItem}
                                                onPress={() => handleSelectOpponent(item)}
                                            >
                                                <SmartImage
                                                    uri={item.avatar || item.photo}
                                                    style={styles.playerSearchAvatar}
                                                />
                                                <View style={{ flex: 1, marginLeft: 12 }}>
                                                    <Text style={styles.playerSearchName}>{fullName}</Text>
                                                    <Text style={styles.playerSearchSub}>
                                                        {item.position || 'ST'} • {item.teams?.name || 'Amatora'}
                                                    </Text>
                                                </View>
                                                <View style={styles.playerSearchOvrBadge}>
                                                    <Text style={styles.playerSearchOvrText}>{attrs.ovr}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(3, 7, 18, 0.85)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: SCREEN_HEIGHT * 0.9,
        backgroundColor: '#090D1A',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 10,
    },
    headerTitleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0, 223, 130, 0.12)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(0, 223, 130, 0.3)',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    closeBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    playersCompareRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginVertical: 8,
    },
    playerHeaderCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        borderRadius: 16,
        padding: 8,
        borderWidth: 1,
    },
    playerHeaderCardP1: {
        borderColor: 'rgba(0, 223, 130, 0.35)',
    },
    playerHeaderCardP2: {
        borderColor: 'rgba(0, 240, 255, 0.35)',
    },
    playerAvatarRingP1: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: '#00DF82',
        overflow: 'hidden',
    },
    playerAvatarRingP2: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: '#00F0FF',
        overflow: 'hidden',
    },
    playerHeaderAvatar: {
        width: '100%',
        height: '100%',
    },
    playerHeaderInfo: {
        flex: 1,
        marginLeft: 8,
    },
    playerHeaderOvrP1: {
        color: '#00DF82',
        fontSize: 14,
        fontWeight: '900',
    },
    playerHeaderOvrP2: {
        color: '#00F0FF',
        fontSize: 14,
        fontWeight: '900',
    },
    playerHeaderName: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    playerHeaderTeam: {
        color: '#94A3B8',
        fontSize: 10,
    },
    vsBadgeContainer: {
        marginHorizontal: 6,
    },
    vsBadgeCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    vsBadgeText: {
        color: '#050914',
        fontSize: 11,
        fontWeight: '900',
    },
    switchIcon: {
        marginLeft: 4,
    },
    chooseOpponentWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
    },
    chooseOpponentText: {
        color: '#00F0FF',
        fontSize: 11,
        fontWeight: '700',
        marginTop: 2,
    },
    tabsRow: {
        flexDirection: 'row',
        marginHorizontal: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 3,
        marginBottom: 8,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 9,
        gap: 6,
    },
    tabBtnActive: {
        backgroundColor: 'rgba(0, 223, 130, 0.16)',
        borderWidth: 1,
        borderColor: 'rgba(0, 223, 130, 0.4)',
    },
    tabBtnText: {
        color: '#94A3B8',
        fontSize: 11.5,
        fontWeight: '700',
    },
    tabBtnTextActive: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
        alignItems: 'center',
    },
    radarTabWrapper: {
        alignItems: 'center',
        width: '100%',
    },
    advantagesContainer: {
        width: '92%',
        marginTop: 12,
    },
    advantagesSectionTitle: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    advCardsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    advCard: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
    },
    advPlayer: {
        fontSize: 11,
        fontWeight: '800',
        marginBottom: 4,
    },
    advStatText: {
        color: '#E2E8F0',
        fontSize: 11,
        fontWeight: '600',
    },
    statsListWrapper: {
        width: '92%',
        paddingTop: 8,
        gap: 10,
    },
    statCompareBarCard: {
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    statLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    statValueLeft: {
        color: '#94A3B8',
        fontSize: 13,
        fontWeight: '800',
        width: 32,
        textAlign: 'left',
    },
    statValueRight: {
        color: '#94A3B8',
        fontSize: 13,
        fontWeight: '800',
        width: 32,
        textAlign: 'right',
    },
    leadingValueP1: {
        color: '#00DF82',
        fontSize: 15,
        fontWeight: '900',
    },
    leadingValueP2: {
        color: '#00F0FF',
        fontSize: 15,
        fontWeight: '900',
    },
    statLabelCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    statLabelTitle: {
        color: '#CBD5E1',
        fontSize: 11.5,
        fontWeight: '700',
    },
    splitBarTrack: {
        flexDirection: 'row',
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    barFillP1: {
        height: '100%',
        backgroundColor: '#00DF82',
    },
    barFillP2: {
        height: '100%',
        backgroundColor: '#00F0FF',
    },
    leadingBarGlowP1: {
        shadowColor: '#00DF82',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    leadingBarGlowP2: {
        shadowColor: '#00F0FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    cardsTabWrapper: {
        alignItems: 'center',
        width: '100%',
        paddingVertical: 10,
    },
    cardsHintText: {
        color: '#94A3B8',
        fontSize: 11,
        marginBottom: 16,
        textAlign: 'center',
    },
    cardsSideBySide: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    singleCardCol: {
        alignItems: 'center',
    },
    searchModalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    searchModalContainer: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: '#0F172A',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 223, 130, 0.4)',
        padding: 16,
    },
    searchModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    searchModalTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    searchModalClose: {
        padding: 4,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        color: '#FFFFFF',
        marginLeft: 8,
        fontSize: 13,
    },
    playerSearchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    playerSearchAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
    },
    playerSearchName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    playerSearchSub: {
        color: '#94A3B8',
        fontSize: 11,
    },
    playerSearchOvrBadge: {
        backgroundColor: 'rgba(0, 223, 130, 0.15)',
        borderWidth: 1,
        borderColor: '#00DF82',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    playerSearchOvrText: {
        color: '#00DF82',
        fontSize: 12,
        fontWeight: '800',
    },
});

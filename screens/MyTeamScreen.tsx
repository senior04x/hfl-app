import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Pressable,
    Image,
    Animated,
    PanResponder,
    SafeAreaView,
    StatusBar,
    Linking,
    Dimensions,
    ActivityIndicator,
    Alert,
    Platform,
    Modal,
    TextInput
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import VideoBackground from '../components/VideoBackground';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import SmartImage from '../components/SmartImage';
import TeamProfileSkeleton from '../components/TeamProfileSkeleton';
import TacticsBoard from '../components/TacticsBoard';
import { useTranslation } from 'react-i18next';
import { Player, Team } from '../types';
import Translations from '../constants/Translations';
import { useAuthStore } from '../store/useAuthStore';
import { useSocket } from '../context/SocketContext';

const { width } = Dimensions.get('window');

export default function MyTeamScreen({ route, navigation }: any) {
    const { t } = useTranslation();
    const { user, unreadCount, isChatMuted } = useAuthStore();
    const { socket } = useSocket();

    const initialTeamId = route?.params?.teamId || route?.params?.id;
    const userTeamId = user?.teamId || user?.team_id || (user?.role === 'manager' ? (user?.id || user?._id) : null);
    const activeTeamId = initialTeamId || userTeamId;

    const [team, setTeam] = useState<any | null>(route?.params?.team || null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPlayersLoading, setIsPlayersLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'squad' | 'tactics' | 'matches'>('squad');
    const [scrollEnabled, setScrollEnabled] = useState(true);

    const [selectedPlayerForPhone, setSelectedPlayerForPhone] = useState<any | null>(null);
    const [phoneInputText, setPhoneInputText] = useState('');
    const [savingPhone, setSavingPhone] = useState(false);

    const isOwnerOrMember = user && activeTeamId && userTeamId && (String(userTeamId) === String(activeTeamId));
    const isSystemAdmin = user && (user.role === 'admin' || user.role === 'trainer');
    const canEdit = isSystemAdmin || (isOwnerOrMember && (user?.role === 'manager' || user?.role === 'coach' || user?.role === 'team_admin'));
    const canChat = isSystemAdmin || isOwnerOrMember;

    const slideAnim = useRef(new Animated.Value(0)).current;
    const tabs: ('squad' | 'tactics' | 'matches')[] = ['squad', 'tactics', 'matches'];
    const activeTabRef = useRef(activeTab);

    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    const fetchData = async () => {
        try {
            if (!team) setIsLoading(true);
            setIsPlayersLoading(true);
            if (!activeTeamId) {
                setIsLoading(false);
                setIsPlayersLoading(false);
                return;
            }

            const teamData = await apiService.getTeamById(activeTeamId).catch(() => null);
            if (teamData) setTeam(teamData);
            setIsLoading(false);

            const [playersData, matchesData] = await Promise.all([
                apiService.getPlayersByTeam(activeTeamId).catch(() => []),
                apiService.getMatches({ teamId: activeTeamId }).catch(() => null)
            ]);

            setPlayers(playersData || []);
            setMatches(matchesData?.slice(0, 8) || []);
        } catch (error) {
            console.error('MyTeamScreen fetch error:', error);
        } finally {
            setIsLoading(false);
            setIsPlayersLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        if (socket && activeTeamId) {
            socket.emit('join-team', activeTeamId);
            socket.on('formation-updated', (data: any) => {
                if (data.teamId === activeTeamId) {
                    setTeam((prev: any) => prev ? { ...prev, formation: data.formation } : null);
                }
            });
            return () => {
                socket.off('formation-updated');
            };
        }
    }, [activeTeamId, socket]);

    const nextTab = () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}

        const currentIndex = tabs.indexOf(activeTabRef.current);
        const nextIndex = (currentIndex + 1) % tabs.length;
        const nextTabName = tabs[nextIndex];
        
        Animated.timing(slideAnim, {
            toValue: -80,
            duration: 100,
            useNativeDriver: true,
        }).start(() => {
            setActiveTab(nextTabName);
            slideAnim.setValue(80);
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 7,
                tension: 45,
                useNativeDriver: true,
            }).start();
        });
    };

    const prevTab = () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}

        const currentIndex = tabs.indexOf(activeTabRef.current);
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        const prevTabName = tabs[prevIndex];
        
        Animated.timing(slideAnim, {
            toValue: 80,
            duration: 100,
            useNativeDriver: true,
        }).start(() => {
            setActiveTab(prevTabName);
            slideAnim.setValue(-80);
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 7,
                tension: 45,
                useNativeDriver: true,
            }).start();
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2.2 && Math.abs(gestureState.dx) > 12;
            },
            onPanResponderGrant: () => {
                setScrollEnabled(false);
            },
            onPanResponderMove: (evt, gestureState) => {
                slideAnim.setValue(gestureState.dx / 2.2);
            },
            onPanResponderRelease: (evt, gestureState) => {
                setScrollEnabled(true);
                if (gestureState.dx < -45) {
                    nextTab();
                } else if (gestureState.dx > 45) {
                    prevTab();
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        friction: 7,
                        tension: 50,
                        useNativeDriver: true,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                setScrollEnabled(true);
                Animated.spring(slideAnim, {
                    toValue: 0,
                    friction: 7,
                    tension: 50,
                    useNativeDriver: true,
                }).start();
            }
        })
    ).current;

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#050811' }}>
                <VideoBackground
                    source={require('../assets/images/welcomeScreenVideo1.mp4')}
                    overlayOpacity={0.85}
                    style={StyleSheet.absoluteFill}
                />
                <TeamProfileSkeleton />
            </View>
        );
    }

    if (!activeTeamId || !team) {
        return (
            <SafeAreaView style={styles.emptyContainer}>
                <StatusBar barStyle="light-content" />
                <VideoBackground
                    source={require('../assets/images/welcomeScreenVideo1.mp4')}
                    overlayOpacity={0.85}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.emptyContent}>
                    <Ionicons name="shield-outline" size={80} color="rgba(0, 255, 135, 0.4)" />
                    <Text style={styles.emptyTitle}>{t('teams.team_not_found')}</Text>
                    <Text style={styles.emptySub}>
                        {t('teams.no_teams')}
                    </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Teams')} style={styles.loginBtn}>
                        <Text style={styles.loginBtnText}>{t('teams.view_teams')}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                overlayOpacity={0.8}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView 
                scrollEnabled={scrollEnabled}
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
            >
                <View style={styles.heroSection}>
                    {/* IOS BRAND HEADER */}
                    {Platform.OS === 'ios' && (
                        <View style={styles.brandHeaderWrapper}>
                            <Image
                                source={require('../assets/logo.png')}
                                style={{ width: 18, height: 18, marginRight: 6 }}
                                resizeMode="contain"
                            />
                            <Text style={styles.brandText}>AMATORA</Text>
                        </View>
                    )}

                    {/* TOP PARALLEL ROW: BACK BUTTON & ADMIN ACTIONS */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 20, marginBottom: 16 }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonBtn}>
                            <Ionicons name="arrow-back" size={22} color="#FFF" />
                        </TouchableOpacity>

                        {/* ACTION BUTTONS (CHAT & TACTICS) */}
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {canChat && (
                                <TouchableOpacity 
                                    style={styles.actionPillBtn} 
                                    onPress={() => navigation.navigate('TeamChat', { teamId: activeTeamId })}
                                >
                                    <Ionicons name="chatbubbles" size={16} color="#00FF87" />
                                    <Text style={styles.actionPillText}>{t('teams.team_chat').toUpperCase()}</Text>
                                    {unreadCount > 0 && (
                                        <View style={styles.unreadBadge}>
                                            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )}

                            {canEdit && (
                                <TouchableOpacity 
                                    style={styles.actionPillBtn} 
                                    onPress={() => navigation.navigate('FormationBoard', { teamId: activeTeamId })}
                                >
                                    <Ionicons name="grid" size={16} color="#00FF87" />
                                    <Text style={styles.actionPillText}>{t('teams.squad').toUpperCase()}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* TEAM HERO CARD */}
                    <View style={{ alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ position: 'relative', marginBottom: 14 }}>
                            <View style={{
                                width: 120,
                                height: 120,
                                borderRadius: 24,
                                borderWidth: 1.5,
                                borderColor: 'rgba(0, 255, 135, 0.7)',
                                padding: 3,
                                backgroundColor: '#0A1224',
                                overflow: 'hidden',
                                shadowColor: '#00FF87',
                                shadowRadius: 18,
                                shadowOpacity: 0.35,
                                elevation: 8
                            }}>
                                <SmartImage
                                    uri={team?.logo_url || team?.logo}
                                    style={{ width: '100%', height: '100%', borderRadius: 20 }}
                                    contentFit="contain"
                                    fallbackIcon="shield-outline"
                                />
                            </View>
                        </View>

                        <Text style={{
                            color: '#FFFFFF',
                            fontWeight: '900',
                            fontSize: 24,
                            letterSpacing: 0.5,
                            textAlign: 'center',
                            textTransform: 'uppercase'
                        }}>
                            {(team?.name || 'JAMOA').toUpperCase()}
                        </Text>

                        {/* LEAGUE & STATS BADGES */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: 'rgba(0, 255, 135, 0.12)',
                                borderWidth: 1,
                                borderColor: 'rgba(0, 255, 135, 0.3)',
                                paddingHorizontal: 12,
                                paddingVertical: 5,
                                borderRadius: 20
                            }}>
                                <Ionicons name="trophy" size={12} color="#00FF87" />
                                <Text style={{ color: '#00FF87', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 }}>
                                    {(team?.league || 'HFL LIGA').toUpperCase()}
                                </Text>
                            </View>

                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: 'rgba(255, 255, 255, 0.07)',
                                borderWidth: 1,
                                borderColor: 'rgba(255, 255, 255, 0.14)',
                                paddingHorizontal: 12,
                                paddingVertical: 5,
                                borderRadius: 20
                            }}>
                                <Ionicons name="people" size={14} color="#3B82F6" />
                                <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: '800', fontSize: 11 }}>
                                    {players.length} O'YINCHI
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* TAB SWITCHER CAROUSEL */}
                <View style={styles.switcherWrapper}>
                    <TouchableOpacity 
                        style={[styles.tabChip, activeTab === 'squad' && styles.tabChipActive]} 
                        onPress={() => setActiveTab('squad')}
                    >
                        <Ionicons name="people" size={16} color={activeTab === 'squad' ? '#050A14' : '#FFF'} />
                        <Text style={[styles.tabChipText, activeTab === 'squad' && styles.tabChipTextActive]}>TARKIB</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.tabChip, activeTab === 'tactics' && styles.tabChipActive]} 
                        onPress={() => setActiveTab('tactics')}
                    >
                        <Ionicons name="grid" size={16} color={activeTab === 'tactics' ? '#050A14' : '#FFF'} />
                        <Text style={[styles.tabChipText, activeTab === 'tactics' && styles.tabChipTextActive]}>TAKTIKA</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.tabChip, activeTab === 'matches' && styles.tabChipActive]} 
                        onPress={() => setActiveTab('matches')}
                    >
                        <Ionicons name="football" size={16} color={activeTab === 'matches' ? '#050A14' : '#FFF'} />
                        <Text style={[styles.tabChipText, activeTab === 'matches' && styles.tabChipTextActive]}>O'YINLAR</Text>
                    </TouchableOpacity>
                </View>

                {/* MAIN CONTENT WITH HORIZONTAL SWIPE */}
                <View style={styles.mainContent} {...panResponder.panHandlers}>
                    <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
                        {activeTab === 'squad' && (
                            isPlayersLoading ? (
                                <View style={styles.squadGrid}>
                                    {[1, 2, 3, 4, 5, 6].map((key) => (
                                        <View key={key} style={[styles.playerCard, { opacity: 0.5, backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                                            <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
                                            <View style={styles.playerPhotoContainer}>
                                                <View style={[styles.playerPhoto, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                                                <View style={[styles.playerNumberBadge, { backgroundColor: 'rgba(0,255,135,0.3)', width: 24, height: 14 }]} />
                                            </View>
                                            <View style={styles.playerInfo}>
                                                <View style={{ width: '80%', height: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, marginBottom: 4 }} />
                                                <View style={{ width: '60%', height: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, marginBottom: 6 }} />
                                                <View style={{ width: '50%', height: 8, backgroundColor: 'rgba(0,255,135,0.2)', borderRadius: 4 }} />
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.squadGrid}>
                                    {players.map((player: any, idx: number) => {
                                        const pPhone = player.phone || player.phoneNumber || player.phone_number || player.tel;
                                        return (
                                            <View
                                                key={player._id || player.id || idx}
                                                style={styles.playerCard}
                                            >
                                                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
                                                <TouchableOpacity
                                                    activeOpacity={0.8}
                                                    onPress={() => navigation.navigate('PlayerStats', { playerId: player._id || player.id, player })}
                                                >
                                                    <View style={styles.playerPhotoContainer}>
                                                        <SmartImage uri={player.photo || player.photo_url || player.avatar} style={styles.playerPhoto} contentFit="cover" fallbackIcon="person" />
                                                        <View style={styles.playerNumberBadge}>
                                                            <Text style={styles.playerNumberText}>#{player.number || player.player_number || player.shirt_number || '10'}</Text>
                                                        </View>
                                                    </View>
                                                    <View style={styles.playerInfo}>
                                                        <Text style={styles.playerCardName} numberOfLines={1}>
                                                            <Text style={{ color: '#00FF87' }}>{(player.firstName || player.name || player.first_name || 'FUTBOLCHI').toUpperCase()}</Text>
                                                        </Text>
                                                        <Text style={styles.playerCardLastName} numberOfLines={1}>
                                                            {(player.lastName || player.last_name || '').toUpperCase()}
                                                        </Text>
                                                        <Text style={styles.playerCardPosition}>{Translations.translatePosition(player.position || 'O\'yinchi').toUpperCase()}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                                {/* PHONE — ONLY FOR THIS TEAM'S MANAGER */}
                                                {canEdit && (
                                                    <View style={{ marginTop: 6 }}>
                                                        {pPhone ? (
                                                            <TouchableOpacity
                                                                style={styles.phoneBadgeContainer}
                                                                activeOpacity={0.6}
                                                                onPress={() => Linking.openURL(`tel:${pPhone}`)}
                                                            >
                                                                <Ionicons name="call" size={12} color="#00FF87" style={{ marginRight: 5 }} />
                                                                <Text style={styles.phoneBadgeText} numberOfLines={1}>{pPhone}</Text>
                                                            </TouchableOpacity>
                                                        ) : (
                                                            <TouchableOpacity
                                                                style={styles.addPhoneBtn}
                                                                activeOpacity={0.6}
                                                                onPress={() => {
                                                                    setSelectedPlayerForPhone(player);
                                                                    setPhoneInputText('');
                                                                }}
                                                            >
                                                                <Ionicons name="call-outline" size={10} color="#FFD700" style={{ marginRight: 3 }} />
                                                                <Text style={styles.addPhoneBtnText}>+ TEL</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            )
                        )}

                        {activeTab === 'tactics' && (
                            <View style={{ marginTop: 10 }}>
                                <TacticsBoard 
                                    formation={team?.formation || '4-3-3'} 
                                    players={players as any} 
                                    onPlayerPress={(player: any) => navigation.navigate('PlayerStats', { playerId: player.id || player._id, player })}
                                />
                            </View>
                        )}

                        {activeTab === 'matches' && (
                            <View style={{ marginTop: 10, gap: 12 }}>
                                {matches.length > 0 ? (
                                    matches.map((match: any) => (
                                        <TouchableOpacity 
                                            key={match.id || match._id} 
                                            style={styles.matchCard}
                                            onPress={() => navigation.navigate('MatchDetail', { matchId: match.id || match._id })}
                                        >
                                            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                                            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{match.homeTeam?.name || 'JAMOA 1'} vs {match.awayTeam?.name || 'JAMOA 2'}</Text>
                                            <Text style={{ color: '#00FF87', fontWeight: '900', fontSize: 16, marginTop: 4 }}>{match.homeScore ?? 0} - {match.awayScore ?? 0}</Text>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View style={styles.emptyCareer}>
                                        <Text style={styles.emptyCareerText}>O'yinlar tarixi mavjud emas</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </Animated.View>
                </View>
            </ScrollView>

            {/* ADD PHONE MODAL */}
            <Modal
                visible={!!selectedPlayerForPhone}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedPlayerForPhone(null)}
            >
                <View style={styles.phoneModalOverlay}>
                    <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.phoneModalCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Ionicons name="call" size={20} color="#00FF87" style={{ marginRight: 8 }} />
                            <Text style={styles.phoneModalTitle}>TEL RAQAM QO'SHISH</Text>
                        </View>

                        <Text style={styles.phoneModalSub}>
                            {(selectedPlayerForPhone?.firstName || selectedPlayerForPhone?.first_name || selectedPlayerForPhone?.name || 'O\'yinchi')} uchun 9 xonali telefon raqam:
                        </Text>

                        <View style={styles.phoneInputRow}>
                            <Text style={styles.phonePrefixText}>+998</Text>
                            <TextInput
                                style={styles.phoneInput}
                                value={phoneInputText}
                                onChangeText={setPhoneInputText}
                                keyboardType="phone-pad"
                                maxLength={9}
                                placeholder="901234567"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                autoFocus
                            />
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' }}>
                            <TouchableOpacity
                                style={styles.cancelPhoneBtn}
                                onPress={() => setSelectedPlayerForPhone(null)}
                            >
                                <Ionicons name="close" size={18} color="#FF3B30" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.savePhoneBtn}
                                disabled={savingPhone}
                                onPress={async () => {
                                    if (!canEdit) {
                                        Alert.alert('Ruxsat berilmadi', 'Faqat o\'z jamoangiz menejeri o\'yinchilar telefon raqamini tahrirlay oladi!');
                                        setSelectedPlayerForPhone(null);
                                        return;
                                    }
                                    if (phoneInputText.length < 9) {
                                        Alert.alert('Xato', 'Iltimos, 9 xonali telefon raqamini kiriting.');
                                        return;
                                    }
                                    try {
                                        setSavingPhone(true);
                                        const fullPhone = `+998${phoneInputText.replace(/\D/g, '')}`;
                                        const pId = selectedPlayerForPhone.id || selectedPlayerForPhone._id;
                                        const res = await apiService.updatePlayerPhone(pId, fullPhone);
                                        if (res.success) {
                                            setPlayers((prev: any[]) => prev.map((p: any) => (p.id === pId || p._id === pId) ? { ...p, phone: fullPhone } : p));
                                            setSelectedPlayerForPhone(null);
                                            setPhoneInputText('');
                                            Alert.alert("Muvaffaqiyatli", "Telefon raqami saqlandi!");
                                        } else {
                                            Alert.alert('Xato', res.error || 'Saqlashda xatolik');
                                        }
                                    } catch (err: any) {
                                        Alert.alert('Xato', 'Server bilan bog\'lanishda xatolik');
                                    } finally {
                                        setSavingPhone(false);
                                    }
                                }}
                            >
                                {savingPhone ? (
                                    <ActivityIndicator size="small" color="#050A14" />
                                ) : (
                                    <Ionicons name="checkmark" size={18} color="#050A14" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050811' },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 60 },
    heroSection: { paddingTop: Platform.OS === 'ios' ? 12 : (StatusBar.currentHeight ? StatusBar.currentHeight + 5 : 20), paddingBottom: 15 },
    brandHeaderWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 2, marginBottom: 8 },
    brandText: { fontSize: 13, fontWeight: '900', color: '#FFF', letterSpacing: 2, fontStyle: 'italic', textAlign: 'center' },
    backButtonBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    actionPillBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    actionPillText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    unreadBadge: { backgroundColor: Colors.danger, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    unreadBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
    switcherWrapper: { flexDirection: 'row', gap: 8, marginVertical: 14, justifyContent: 'center' },
    tabChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
    tabChipActive: { backgroundColor: '#00FF87', borderColor: '#00FF87' },
    tabChipText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
    tabChipTextActive: { color: '#050A14', fontWeight: '900' },
    mainContent: { minHeight: 350 },
    squadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    playerCard: { width: (width - 44) / 2, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 12, overflow: 'hidden' },
    playerPhotoContainer: { width: '100%', height: 115, borderRadius: 16, overflow: 'hidden', position: 'relative' },
    playerPhoto: { width: '100%', height: '100%' },
    playerNumberBadge: { position: 'absolute', bottom: 6, right: 6, backgroundColor: '#00FF87', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1.5, borderColor: '#050A14' },
    playerNumberText: { color: '#050A14', fontWeight: '900', fontSize: 11, fontStyle: 'italic' },
    playerInfo: { marginTop: 10 },
    playerCardName: { fontWeight: '900', fontSize: 13 },
    playerCardLastName: { color: '#FFF', fontWeight: '900', fontSize: 13 },
    playerCardPosition: { color: 'rgba(255,255,255,0.4)', fontWeight: '800', fontSize: 10, marginTop: 2, letterSpacing: 0.5 },
    matchCard: { padding: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
    emptyCareer: { padding: 20, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14 },
    emptyCareerText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
    emptyContainer: { flex: 1, backgroundColor: '#050811' },
    emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
    emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 16, letterSpacing: 1 },
    emptySub: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 18 },
    loginBtn: { marginTop: 20, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
    loginBtnText: { color: '#000', fontWeight: '900', fontSize: 12 },
    phoneBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 255, 135, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 135, 0.3)',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        width: '100%',
    },
    phoneBadgeText: {
        color: '#00FF87',
        fontWeight: '900',
        fontSize: 10,
        letterSpacing: 0.3
    },
    addPhoneBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.4)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        alignSelf: 'flex-start'
    },
    addPhoneBtnText: {
        color: '#FFD700',
        fontWeight: '900',
        fontSize: 9,
        letterSpacing: 0.5
    },
    phoneModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    phoneModalCard: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: '#0F1626',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        padding: 20,
        alignItems: 'center'
    },
    phoneModalTitle: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.5
    },
    phoneModalSub: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 14
    },
    phoneInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        height: 46,
        paddingHorizontal: 14,
        width: '100%'
    },
    phonePrefixText: {
        color: '#00FF87',
        fontSize: 15,
        fontWeight: '900',
        marginRight: 8
    },
    phoneInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800'
    },
    cancelPhoneBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 59, 48, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.3)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    savePhoneBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#00FF87',
        alignItems: 'center',
        justifyContent: 'center'
    }
});

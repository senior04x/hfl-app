import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Linking,
    Dimensions,
    ActivityIndicator,
    TextInput,
    Alert,
    StatusBar,
    Platform,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import VideoBackground from '../components/VideoBackground';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import SmartImage from '../components/SmartImage';
import TeamProfileSkeleton from '../components/TeamProfileSkeleton';
import TacticsBoard from '../components/TacticsBoard';
import { Player, Team } from '../types';
import Translations from '../constants/Translations';
import { useAuthStore } from '../store/useAuthStore';
import { useSocket } from '../context/SocketContext';

const { width } = Dimensions.get('window');

export default function TeamProfileScreen({ route, navigation }: any) {
    const { teamId, team: initialTeam } = route?.params || {};
    const [team, setTeam] = useState<any | null>(initialTeam || null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(!initialTeam);
    const [isPlayersLoading, setIsPlayersLoading] = useState(true);
    const [selectedPlayerForPhone, setSelectedPlayerForPhone] = useState<any | null>(null);
    const [phoneInputText, setPhoneInputText] = useState('');
    const [savingPhone, setSavingPhone] = useState(false);
    const { user, unreadCount, isChatMuted } = useAuthStore();
    const { socket } = useSocket();
    
    const userTeamId = user?.teamId || user?.team_id || (user?.role === 'manager' ? (user?.id || user?._id) : null);
    const activeTeamId = teamId || route?.params?.id || route?.params?.teamId || initialTeam?.id || initialTeam?._id || userTeamId;

    const isOwnerOrMember = user && activeTeamId && userTeamId && (String(userTeamId) === String(activeTeamId));
    const isSystemAdmin = user && (user.role === 'admin' || user.role === 'trainer');

    const canEdit = isSystemAdmin || (isOwnerOrMember && (user?.role === 'manager' || user?.role === 'coach' || user?.role === 'team_admin'));
    const canChat = isSystemAdmin || isOwnerOrMember;

    const fetchData = async () => {
        try {
            if (!initialTeam && !team) setIsLoading(true);
            setIsPlayersLoading(true);
            const currentId = activeTeamId;
            if (!currentId) return;

            const [teamData, playersData, matchesData] = await Promise.all([
                apiService.getTeamById(currentId).catch(() => null),
                apiService.getPlayersByTeam(currentId).catch(() => []),
                apiService.getMatches({ teamId: currentId }).catch(() => null)
            ]);

            if (teamData) setTeam(teamData);
            setPlayers(playersData || []);
            setMatches(matchesData?.slice(0, 5) || []);
        } catch (error) {
            console.error('Error fetching team details:', error);
        } finally {
            setIsLoading(false);
            setIsPlayersLoading(false);
        }
    };

    useEffect(() => {
        if (activeTeamId) {
            fetchData();
        }
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

    const renderHeader = () => (
        <View style={styles.heroSection}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={28} color={Colors.primary} />
            </TouchableOpacity>

            <View style={styles.adminActionRow}>
                {canEdit && (
                    <TouchableOpacity style={styles.adminBtn} onPress={() => navigation.navigate('FormationBoard', { teamId: activeTeamId })}>
                        <Ionicons name="grid-outline" size={20} color="#FFF" />
                        <Text style={styles.adminBtnText}>SOSTAV</Text>
                    </TouchableOpacity>
                )}
                {canChat && (
                    <TouchableOpacity style={styles.adminBtn} onPress={() => navigation.navigate('TeamChat', { teamId: activeTeamId })}>
                        <Ionicons name="chatbubbles-outline" size={20} color="#FFF" />
                        <Text style={styles.adminBtnText}>CHAT</Text>
                        {unreadCount > 0 && (
                            <View style={[
                                styles.badgeContainer,
                                isChatMuted ? { backgroundColor: 'rgba(255,255,255,0.3)' } : { backgroundColor: Colors.danger }
                            ]}>
                                <Text style={styles.badgeText}>{unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.heroContent}>
                <View style={[styles.mainLogoWrapper, { shadowColor: team?.color || Colors.primary }]}>
                    <SmartImage uri={team?.logo_url || team?.logo} style={styles.mainLogoImage} contentFit="contain" fallbackIcon="shield-outline" />
                </View>

                <View style={styles.heroTextContainer}>
                    <View style={styles.badgeRow}>
                        <View style={styles.premiumBadge}>
                            <Ionicons name="trophy" size={10} color={Colors.primary} />
                            <Text style={styles.premiumBadgeText}>{(team?.league || 'HFL LIGA').toUpperCase()}</Text>
                        </View>
                    </View>

                    <Text style={styles.teamNameHero}>{(team?.name || 'JAMOA').toUpperCase()}</Text>

                    <View style={styles.heroStatsRow}>
                        <Ionicons name="people" size={14} color={Colors.primary} />
                        <Text style={styles.heroStatText}>{isPlayersLoading ? '...' : `${players.length} O'YINCHI`}</Text>
                        <View style={styles.statDot} />
                        <Ionicons name="flash" size={14} color={Colors.primary} />
                        <Text style={styles.heroStatText}>{team?.points || team?.stats?.points || 0} OCHKO</Text>
                    </View>
                </View>
            </View>

            {(team?.instagram || team?.facebook || team?.youtube) && (
                <View style={styles.socialRowHero}>
                    {['instagram', 'facebook', 'youtube'].map(plat => (
                        team[plat as keyof Team] && (
                            <TouchableOpacity key={plat} style={styles.socialBtn} onPress={() => Linking.openURL(team[plat as keyof Team] as string)}>
                                <Ionicons name={`logo-${plat}` as any} size={18} color="#FFF" />
                            </TouchableOpacity>
                        )
                    ))}
                </View>
            )}
        </View>
    );

    const renderSquad = () => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                    <Ionicons name="people" size={20} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>JAMOA <Text style={styles.sectionTitleHighlight}>TARKIBI</Text></Text>
                </View>
                <Text style={styles.sectionCount}>{isPlayersLoading ? 'YUKLANMOQDA...' : `${players.length} TA FUTBOLCHI`}</Text>
            </View>

            {isPlayersLoading ? (
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
                            <TouchableOpacity
                                key={player._id || player.id || idx}
                                style={styles.playerCard}
                                onPress={() => navigation.navigate('PlayerStats', { playerId: player._id || player.id, player })}
                            >
                                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                                <View style={styles.playerPhotoContainer}>
                                    <SmartImage uri={player.photo || player.photo_url || player.avatar} style={styles.playerPhoto} contentFit="cover" fallbackIcon="person" />
                                    <View style={styles.playerNumberBadge}>
                                        <Text style={styles.playerNumberText}>#{player.number || player.player_number || player.shirt_number || '10'}</Text>
                                    </View>
                                </View>
                                <View style={styles.playerInfo}>
                                    <Text style={styles.playerCardName} numberOfLines={1}>{(player.firstName || player.name || player.first_name || 'Futbolchi').toUpperCase()}</Text>
                                    <Text style={styles.playerCardLastName} numberOfLines={1}>{(player.lastName || player.last_name || '').toUpperCase()}</Text>
                                    <Text style={styles.playerCardPosition}>{Translations.translatePosition(player.position || 'O\'yinchi').toUpperCase()}</Text>

                                    {/* PHONE BADGE / ADD PHONE BUTTON — ONLY FOR THIS TEAM'S MANAGER */}
                                    {canEdit && (
                                        <View style={{ marginTop: 6, width: '100%' }}>
                                            {pPhone ? (
                                                <TouchableOpacity
                                                    style={styles.phoneBadgeContainer}
                                                    activeOpacity={0.6}
                                                    onPress={(e) => {
                                                        e?.stopPropagation?.();
                                                        Linking.openURL(`tel:${pPhone}`);
                                                    }}
                                                >
                                                    <Ionicons name="call" size={10} color="#00FF87" style={{ marginRight: 4 }} />
                                                    <Text style={styles.phoneBadgeText} numberOfLines={1}>{pPhone}</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <TouchableOpacity
                                                    style={styles.addPhoneBtn}
                                                    activeOpacity={0.7}
                                                    onPress={(e) => {
                                                        e?.stopPropagation?.();
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
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );

    if (isLoading && !team) return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                overlayOpacity={0.8}
                style={StyleSheet.absoluteFill}
            />
            <TeamProfileSkeleton />
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                posterSource={require('../assets/images/splash-icon.png')}
                overlayOpacity={0.7}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {renderHeader()}
                <View style={styles.mainContent}>
                    {renderSquad()}
                    {/* Matches and Tactics can be added/glassified here */}
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
    scrollContent: { paddingBottom: 60 },
    heroSection: { borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: 'hidden', paddingBottom: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderTopWidth: 0 },
    backButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginLeft: 20, marginTop: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    adminActionRow: { position: 'absolute', top: 50, right: 20, flexDirection: 'row', gap: 8 },
    adminBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    adminBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    adminBtnText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
    heroContent: { alignItems: 'center', marginTop: 30 },
    mainLogoWrapper: { width: 140, height: 140, borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    mainLogoImage: { width: '100%', height: '100%' },
    heroTextContainer: { alignItems: 'center', marginTop: 24, paddingHorizontal: 20 },
    badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
    premiumBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,223,130,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,223,130,0.2)', gap: 6 },
    premiumBadgeText: { color: Colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    teamNameHero: { color: '#FFF', fontSize: 36, fontWeight: '900', textAlign: 'center', letterSpacing: -1 },
    heroStatsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 15, gap: 10 },
    heroStatText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    statDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
    socialRowHero: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginTop: 25 },
    socialBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    editForm: { width: '100%', alignItems: 'center', gap: 10 },
    editInput: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#FFF', paddingHorizontal: 20, paddingVertical: 12, fontSize: 18, fontWeight: '900', textAlign: 'center' },
    saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 15, marginTop: 5 },
    saveBtnText: { color: '#000', fontWeight: '900', fontSize: 12 },
    mainContent: { paddingHorizontal: 20, marginTop: 30 },
    section: { marginBottom: 35 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
    sectionTitleHighlight: { color: Colors.primary },
    sectionCount: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    squadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
    playerCard: { width: (width - 55) / 2, borderRadius: 30, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
    playerPhotoContainer: { width: '100%', height: 130, position: 'relative', overflow: 'hidden', borderRadius: 20 },
    playerPhoto: { width: '100%', height: '100%' },
    playerNumberBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    playerNumberText: { color: '#000', fontSize: 12, fontWeight: '900' },
    playerInfo: { marginTop: 12, paddingHorizontal: 4 },
    playerCardName: { color: '#FFF', fontSize: 14, fontWeight: '900' },
    playerCardLastName: { color: Colors.primary, fontSize: 14, fontWeight: '900', marginTop: -2 },
    playerCardPosition: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', marginTop: 4, letterSpacing: 0.5 },
    badgeContainer: {
        position: 'absolute',
        top: -6,
        right: -8,
        backgroundColor: Colors.danger,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: '#000',
        zIndex: 10,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '900',
    },
    phoneBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 135, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 135, 0.3)',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
        alignSelf: 'flex-start'
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

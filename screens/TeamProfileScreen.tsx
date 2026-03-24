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
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
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
    const { teamId } = route?.params || {};
    const [team, setTeam] = useState<Team | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, unreadCount, isChatMuted } = useAuthStore();
    const { socket } = useSocket();
    
    const isMember = user && team && (user.teamId?.toString() === teamId?.toString() || user.teamId?.toString() === team?._id?.toString());
    const isAdmin = user && (user.role === 'admin' || user.role === 'trainer');
    const canEdit = isAdmin || (isMember && user?.role === 'manager');
    const canChat = isMember || isAdmin;

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [teamData, playersData, matchesData] = await Promise.all([
                apiService.getTeamById(teamId),
                apiService.getPlayersByTeam(teamId),
                apiService.getMatches({ teamId })
            ]);

            setTeam(teamData);
            setPlayers(playersData || []);
            setMatches(matchesData?.slice(0, 5) || []);
        } catch (error) {
            console.error('Error fetching team details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        if (socket && teamId) {
            socket.emit('join-team', teamId);
            socket.on('formation-updated', (data: any) => {
                if (data.teamId === teamId) {
                    setTeam(prev => prev ? { ...prev, formation: data.formation } : null);
                }
            });
            return () => {
                socket.off('formation-updated');
            };
        }
    }, [teamId, socket]);

    const renderHeader = () => (
        <View style={styles.heroSection}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={28} color={Colors.primary} />
            </TouchableOpacity>

            <View style={styles.adminActionRow}>
                {canEdit && (
                    <TouchableOpacity style={styles.adminBtn} onPress={() => navigation.navigate('FormationBoard', { teamId })}>
                        <Ionicons name="grid-outline" size={20} color="#FFF" />
                        <Text style={styles.adminBtnText}>SOSTAV</Text>
                    </TouchableOpacity>
                )}
                {canChat && (
                    <TouchableOpacity style={styles.adminBtn} onPress={() => navigation.navigate('TeamChat', { teamId })}>
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
                    <SmartImage uri={team?.logo} style={styles.mainLogoImage} contentFit="contain" fallbackIcon="shield-outline" />
                </View>

                <View style={styles.heroTextContainer}>
                    <View style={styles.badgeRow}>
                        <View style={styles.premiumBadge}>
                            <Ionicons name="trophy" size={10} color={Colors.primary} />
                            <Text style={styles.premiumBadgeText}>OFFICIAL CLUB</Text>
                        </View>
                    </View>

                    <Text style={styles.teamNameHero}>{team?.name?.toUpperCase()}</Text>

                    <View style={styles.heroStatsRow}>
                        <Ionicons name="people" size={14} color={Colors.primary} />
                        <Text style={styles.heroStatText}>{players.length} O'YINCHI</Text>
                        <View style={styles.statDot} />
                        <Ionicons name="flash" size={14} color={Colors.primary} />
                        <Text style={styles.heroStatText}>{team?.stats?.points || 0} OCHKO</Text>
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
                <Text style={styles.sectionCount}>{players.length} TA FUTBOLCHI</Text>
            </View>

            <View style={styles.squadGrid}>
                {players.map((player) => (
                    <TouchableOpacity
                        key={player._id}
                        style={styles.playerCard}
                        onPress={() => navigation.navigate('PlayerStats', { playerId: player._id, player: player })}
                    >
                        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={styles.playerPhotoContainer}>
                            <SmartImage uri={player.photo || player.avatar} style={styles.playerPhoto} contentFit="cover" fallbackIcon="person" />
                            <View style={styles.playerNumberBadge}>
                                <Text style={styles.playerNumberText}>#{player.number || '00'}</Text>
                            </View>
                        </View>
                        <View style={styles.playerInfo}>
                            <Text style={styles.playerCardName} numberOfLines={1}>{player.firstName.toUpperCase()}</Text>
                            <Text style={styles.playerCardLastName} numberOfLines={1}>{player.lastName.toUpperCase()}</Text>
                            <Text style={styles.playerCardPosition}>{Translations.translatePosition(player.position).toUpperCase()}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
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
    playerPhotoContainer: { width: '100%', height: 160, position: 'relative', overflow: 'hidden', borderRadius: 20 },
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
});

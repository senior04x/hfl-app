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
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import SmartImage from '../components/SmartImage';
import Skeleton from '../components/Skeleton';
import TeamProfileSkeleton from '../components/TeamProfileSkeleton';
import TacticsBoard from '../components/TacticsBoard';
import { Player, Team } from '../types';
import Translations from '../constants/Translations';
import { useAuthStore } from '../store/useAuthStore';
import { useSocket } from '../context/SocketContext';

const { width } = Dimensions.get('window');

export default function TeamProfileScreen({ route, navigation }: any) {
    const { teamId, tournamentId } = route?.params || {};
    const [team, setTeam] = useState<Team | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<any>({});
    const [isUpdating, setIsUpdating] = useState(false);
    const { user } = useAuthStore();
    const { socket } = useSocket();
    
    // Improved access control
    const isOwner = user && team && (
        (user.teamId?.toString() === teamId?.toString()) || 
        (user.id?.toString() === teamId?.toString()) ||
        (user.teamId?.toString() === team?._id?.toString())
    );
    const isAdmin = user && (user.role === 'admin' || user.role === 'trainer');
    const canEdit = isAdmin || (isOwner && user?.role === 'manager');
    const isMember = isOwner || isAdmin || (user && team && user.teamId?.toString() === teamId?.toString());
    const canChat = isMember;
    const canViewBoard = isMember || true; // Everyone can view the board? Or only members? Let's say everyone.

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [teamData, playersData, matchesData] = await Promise.all([
                apiService.getTeamById(teamId),
                apiService.getPlayersByTeam(teamId),
                apiService.getMatches({ teamId })
            ]);

            setTeam(teamData);
            setEditData({
                name: teamData?.name,
                instagram: teamData?.instagram,
                facebook: teamData?.facebook,
                youtube: teamData?.youtube
            });
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

    const handleUpdateTeam = async () => {
        try {
            setIsUpdating(true);
            const res = await apiService.updateTeam(teamId, editData);
            if (res.success) {
                setTeam({ ...team, ...editData } as Team);
                setIsEditing(false);
                Alert.alert('Muvaffaqiyat', 'Jamoa ma\'lumotlari yangilandi');
            }
        } catch (error) {
            console.error('Error updating team:', error);
            Alert.alert('Xatolik', 'Ma\'lumotlarni saqlab bo\'lmadi');
        } finally {
            setIsUpdating(false);
        }
    };

    const renderHeader = () => (
        <View style={styles.heroSection}>
            {/* Blurred Background Logo */}
            <View style={styles.heroBackgroundContainer}>
                <Image 
                    source={{ uri: team?.logo }} 
                    style={[styles.heroBackgroundImage, { opacity: 0.3 }]} 
                    blurRadius={20}
                />
                <View style={styles.heroOverlay} />
            </View>

            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.adminActionRow}>
                {canEdit && (
                    <TouchableOpacity
                        style={[styles.adminBtn, isEditing && styles.adminBtnActive]}
                        onPress={() => setIsEditing(!isEditing)}
                    >
                        <Ionicons name={isEditing ? "close" : "create-outline"} size={20} color="#FFF" />
                        <Text style={styles.adminBtnText}>{isEditing ? "BEKOR QILISH" : "TAHRIRLASH"}</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.adminBtn}
                    onPress={() => navigation.navigate('FormationBoard', { teamId, isReadOnly: !canEdit })}
                >
                    <Ionicons name="grid-outline" size={20} color="#FFF" />
                    <Text style={styles.adminBtnText}>{canEdit ? "SOSTAV" : "TAKTIKA"}</Text>
                </TouchableOpacity>
                
                {canChat && (
                    <TouchableOpacity
                        style={styles.adminBtn}
                        onPress={() => navigation.navigate('TeamChat', { 
                            teamId, 
                            userId: user?._id || user?.id || 'guest_' + Math.random().toString(36).substr(2, 5), 
                            userName: user?.firstName || 'Mehmon' 
                        })}
                    >
                        <Ionicons name="chatbubbles-outline" size={20} color="#FFF" />
                        <Text style={styles.adminBtnText}>CHAT</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.heroContent}>
                <View style={[styles.mainLogoWrapper, { shadowColor: team?.color || Colors.primary }]}>
                    <SmartImage
                        uri={team?.logo}
                        style={styles.mainLogoImage}
                        contentFit="contain"
                        fallbackIcon="shield-outline"
                    />
                </View>

                <View style={styles.heroTextContainer}>
                    <View style={styles.badgeRow}>
                        <View style={styles.premiumBadge}>
                            <Ionicons name="trophy" size={10} color={Colors.primary} />
                            <Text style={styles.premiumBadgeText}>OFFICIAL CLUB</Text>
                        </View>
                        <View style={styles.estBadge}>
                            <Text style={styles.estBadgeText}>EST. 2024</Text>
                        </View>
                    </View>

                    {isEditing ? (
                        <View style={styles.editForm}>
                            <TextInput
                                style={styles.editInput}
                                value={editData.name}
                                onChangeText={(text) => setEditData({ ...editData, name: text })}
                                placeholder="Jamoa nomi"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                            />
                            <TouchableOpacity 
                                style={styles.saveBtn} 
                                onPress={handleUpdateTeam}
                                disabled={isUpdating}
                            >
                                {isUpdating ? (
                                    <ActivityIndicator size="small" color="#000" />
                                ) : (
                                    <Text style={styles.saveBtnText}>SAQLASH</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <Text style={styles.teamNameHero}>{team?.name}</Text>
                    )}

                    <View style={styles.heroStatsRow}>
                        <Ionicons name="people" size={14} color={Colors.primary} />
                        <Text style={styles.heroStatText}>{players.length} O'YINCHI</Text>
                        <View style={styles.statDot} />
                        <Ionicons name="flash" size={14} color={Colors.primary} />
                        <Text style={styles.heroStatText}>{team?.stats?.points || 0} OCHKO</Text>
                    </View>
                </View>
            </View>

            {/* Social Media Edit or Display */}
            {isEditing ? (
                <View style={styles.socialEditRow}>
                    <View style={styles.socialInputContainer}>
                        <Ionicons name="logo-instagram" size={16} color="#FFF" />
                        <TextInput
                            style={styles.socialInput}
                            value={editData.instagram}
                            onChangeText={(text) => setEditData({ ...editData, instagram: text })}
                            placeholder="Instagram URL"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                        />
                    </View>
                    <View style={styles.socialInputContainer}>
                        <Ionicons name="logo-facebook" size={16} color="#FFF" />
                        <TextInput
                            style={styles.socialInput}
                            value={editData.facebook}
                            onChangeText={(text) => setEditData({ ...editData, facebook: text })}
                            placeholder="Facebook URL"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                        />
                    </View>
                </View>
            ) : (
                (team?.instagram || team?.facebook || team?.youtube) && (
                    <View style={styles.socialRowHero}>
                        {team.instagram && (
                            <TouchableOpacity
                                style={styles.socialBtn}
                                onPress={() => Linking.openURL(team.instagram!)}
                            >
                                <Ionicons name="logo-instagram" size={18} color="#FFF" />
                            </TouchableOpacity>
                        )}
                        {team.facebook && (
                            <TouchableOpacity
                                style={styles.socialBtn}
                                onPress={() => Linking.openURL(team.facebook!)}
                            >
                                <Ionicons name="logo-facebook" size={18} color="#FFF" />
                            </TouchableOpacity>
                        )}
                        {team.youtube && (
                            <TouchableOpacity
                                style={styles.socialBtn}
                                onPress={() => Linking.openURL(team.youtube!)}
                            >
                                <Ionicons name="logo-youtube" size={18} color="#FFF" />
                            </TouchableOpacity>
                        )}
                    </View>
                )
            )}
        </View>
    );

    const renderTactics = () => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                    <Ionicons name="grid" size={20} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>JAMOA <Text style={styles.sectionTitleHighlight}>TAKTIKASI</Text></Text>
                </View>
                {canEdit && (
                    <TouchableOpacity 
                        style={styles.editTacticsBtn}
                        onPress={() => navigation.navigate('FormationBoard', { teamId })}
                    >
                        <Text style={styles.editTacticsBtnText}>TAHRIRLASH</Text>
                    </TouchableOpacity>
                )}
            </View>

            {team?.formation?.players && team.formation.players.length > 0 ? (
                <TouchableOpacity 
                    activeOpacity={canEdit ? 0.9 : 1}
                    onPress={() => canViewBoard && navigation.navigate('FormationBoard', { teamId, isReadOnly: !canEdit })}
                >
                    <TacticsBoard 
                        players={team.formation.players} 
                        teamColor={team.color || Colors.primary} 
                    />
                </TouchableOpacity>
            ) : (
                <View style={styles.emptyTacticsBox}>
                    <Ionicons name="construct-outline" size={40} color="rgba(255,255,255,0.1)" />
                    <Text style={styles.emptyText}>Taktika hali belgilanmagan</Text>
                    {canEdit && (
                        <TouchableOpacity 
                            style={styles.createTacticsBtn}
                            onPress={() => navigation.navigate('FormationBoard', { teamId })}
                        >
                            <Text style={styles.createTacticsBtnText}>YARATISH</Text>
                        </TouchableOpacity>
                    )}
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
                        <View style={styles.playerPhotoContainer}>
                            <SmartImage
                                uri={player.photo || player.avatar}
                                style={styles.playerPhoto}
                                contentFit="cover"
                                fallbackIcon="person"
                                borderRadius={20}
                            />
                            <View style={styles.playerNumberBadge}>
                                <Text style={styles.playerNumberText}>#{player.number || '00'}</Text>
                            </View>
                        </View>
                        <View style={styles.playerInfo}>
                            <Text style={styles.playerCardName} numberOfLines={1}>
                                {player.firstName}
                            </Text>
                            <Text style={styles.playerCardLastName} numberOfLines={1}>
                                {player.lastName}
                            </Text>
                            <Text style={styles.playerCardPosition}>{Translations.translatePosition(player.position)}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderMatches = () => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                    <Ionicons name="calendar" size={20} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>SO'NGGI <Text style={styles.sectionTitleHighlight}>O'YINLAR</Text></Text>
                </View>
            </View>

            {matches.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="time-outline" size={40} color="rgba(255,255,255,0.1)" />
                    <Text style={styles.emptyText}>Hozircha o'yinlar mavjud emas</Text>
                </View>
            ) : (
                <View style={styles.matchesList}>
                    {matches.map((match, index) => {
                        // Aggressive fallback chain for maximum reliability
                        const hName = match.homeTeamName || match.homeTeam?.name || 'JAMOA A';
                        const aName = match.awayTeamName || match.awayTeam?.name || 'JAMOA B';
                        const hLogo = match.homeTeamLogo || match.homeTeam?.logo;
                        const aLogo = match.awayTeamLogo || match.awayTeam?.logo;
                        const tName = match.tournamentName || match.tournament?.name || match.round || 'Amatora CUP';

                        return (
                            <TouchableOpacity
                                key={match._id || index}
                                style={styles.matchItem}
                                onPress={() => navigation.navigate('MatchDetail', { matchId: match._id })}
                            >
                                <View style={styles.matchTeams}>
                                    <View style={styles.matchTeam}>
                                        <SmartImage 
                                            uri={hLogo} 
                                            style={styles.matchLogo} 
                                            contentFit="contain" 
                                            fallbackIcon="shield-outline"
                                            fallbackIconSize={24}
                                        />
                                        <Text style={styles.matchTeamName} numberOfLines={2}>{hName}</Text>
                                    </View>

                                    <View style={styles.matchResultBox}>
                                        <Text style={styles.matchResultText}>
                                            {match.status === 'finished' ? `${match.score?.home ?? 0} : ${match.score?.away ?? 0}` : 'VS'}
                                        </Text>
                                    </View>

                                    <View style={styles.matchTeam}>
                                        <SmartImage 
                                            uri={aLogo} 
                                            style={styles.matchLogo} 
                                            contentFit="contain" 
                                            fallbackIcon="shield-outline"
                                            fallbackIconSize={24}
                                        />
                                        <Text style={styles.matchTeamName} numberOfLines={2}>{aName}</Text>
                                    </View>
                                </View>

                                <View style={styles.matchFooter}>
                                    <Text style={styles.matchDate}>
                                        {new Date(match.date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </Text>
                                    <Text style={styles.matchTournament}>{tName}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );

    if (isLoading && !team) {
        return <TeamProfileSkeleton />;
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {renderHeader()}
                <View style={styles.mainContent}>
                    {renderTactics()}
                    {renderSquad()}
                    {renderMatches()}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0E1A',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    heroSection: {
        backgroundColor: '#050A18',
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 50,
        borderBottomRightRadius: 50,
        position: 'relative',
    },
    heroBackgroundContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: -1,
        overflow: 'hidden',
        borderBottomLeftRadius: 50,
        borderBottomRightRadius: 50,
    },
    heroBackgroundImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(5, 10, 24, 0.7)',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        width: 44,
        height: 44,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    heroContent: {
        alignItems: 'center',
        marginTop: 40,
    },
    mainLogoWrapper: {
        width: 140,
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
        // Neon Shadow Effect (No box/div)
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 30,
        elevation: 15,
        overflow: 'visible',
    },
    mainLogoImage: {
        width: '100%',
        height: '100%',
        overflow: 'visible',
    },
    heroTextContainer: {
        alignItems: 'center',
        marginTop: 24,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    premiumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,255,102,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(0,255,102,0.2)',
        gap: 6,
    },
    premiumBadgeText: {
        color: Colors.primary,
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    estBadge: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    estBadgeText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 9,
        fontWeight: '900',
    },
    teamNameHero: {
        color: '#FFF',
        fontSize: 42,
        fontWeight: '900',
        fontStyle: 'italic',
        textTransform: 'uppercase',
        textAlign: 'center',
        letterSpacing: -1,
    },
    heroStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 8,
    },
    heroStatText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    statDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    socialRowHero: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 15,
        marginTop: 24,
    },
    socialBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    adminActionRow: {
        position: 'absolute',
        top: 50,
        right: 20,
        flexDirection: 'row',
        gap: 8,
        zIndex: 10,
    },
    adminBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    adminBtnActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    adminBtnText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '900',
    },
    editTacticsBtn: {
        backgroundColor: 'rgba(0,255,102,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,255,102,0.2)',
    },
    editTacticsBtnText: {
        color: Colors.primary,
        fontSize: 10,
        fontWeight: '900',
    },
    emptyTacticsBox: {
        backgroundColor: '#1A2138',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    createTacticsBtn: {
        marginTop: 15,
        backgroundColor: Colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 10,
    },
    createTacticsBtnText: {
        color: '#000',
        fontSize: 12,
        fontWeight: '900',
    },
    editForm: {
        width: '100%',
        alignItems: 'center',
        gap: 10,
    },
    editInput: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        color: '#FFF',
        paddingHorizontal: 20,
        paddingVertical: 12,
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    saveBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 15,
        marginTop: 5,
    },
    saveBtnText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 12,
    },
    socialEditRow: {
        marginTop: 20,
        gap: 10,
        paddingHorizontal: 20,
    },
    socialInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    socialInput: {
        flex: 1,
        color: '#FFF',
        paddingVertical: 10,
        paddingHorizontal: 10,
        fontSize: 12,
    },
    mainContent: {
        paddingHorizontal: 20,
        marginTop: 30,
    },
    section: {
        marginBottom: 35,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        fontStyle: 'italic',
        letterSpacing: -0.5,
    },
    sectionTitleHighlight: {
        color: Colors.primary,
    },
    sectionCount: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    squadGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
    },
    playerCard: {
        width: (width - 55) / 2,
        backgroundColor: '#1A2138',
        borderRadius: 30,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    playerPhotoContainer: {
        width: '100%',
        height: 160,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 20,
    },
    playerPhoto: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    playerNumberBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: Colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    playerNumberText: {
        color: '#000',
        fontSize: 12,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    playerInfo: {
        marginTop: 12,
        paddingHorizontal: 4,
    },
    playerCardName: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '900',
        fontStyle: 'italic',
        textTransform: 'uppercase',
    },
    playerCardLastName: {
        color: Colors.primary,
        fontSize: 15,
        fontWeight: '900',
        fontStyle: 'italic',
        textTransform: 'uppercase',
        marginTop: -2,
    },
    playerCardPosition: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
        marginTop: 6,
    },
    matchesList: {
        gap: 15,
    },
    matchItem: {
        backgroundColor: '#1A2138',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    matchTeams: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    matchTeam: {
        flex: 1,
        alignItems: 'center',
        gap: 10,
    },
    matchLogo: {
        width: 50,
        height: 50,
    },
    matchTeamName: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '900',
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    matchResultBox: {
        backgroundColor: 'rgba(0,255,102,0.1)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,255,102,0.2)',
    },
    matchResultText: {
        color: Colors.primary,
        fontSize: 22,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    matchFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    matchDate: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
        fontWeight: 'bold',
    },
    matchTournament: {
        color: Colors.primary,
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    emptyText: {
        color: 'rgba(255,255,255,0.2)',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 15,
    }
});

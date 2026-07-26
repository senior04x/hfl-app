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
    Pressable,
    Animated,
    Easing
} from 'react-native';
import { Image } from 'expo-image';
import { apiService } from '../services/apiService';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import VideoBackground from '../components/VideoBackground';
import Colors from '../constants/Colors';

const TransferRequestScreen = ({ route, navigation }: any) => {
    const { user } = useAuthStore();
    const { playerId } = route.params || {};

    const LEAGUES = [
        { id: 'super', name: 'Super liga' },
        { id: 'pro', name: 'Pro liga' },
        { id: '3liga', name: '3-liga' },
        { id: '7x7', name: '7x7 liga' }
    ];

    const [selectedLeague, setSelectedLeague] = useState('');
    const [leagueModalVisible, setLeagueModalVisible] = useState(false);
    const [teams, setTeams] = useState<any[]>([]);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [loadingTeams, setLoadingTeams] = useState(false);
    const [reason, setReason] = useState('');
    const [loadingSubmit, setLoadingSubmit] = useState(false);

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Player & current team info loading state
    const [infoLoading, setInfoLoading] = useState(true);
    const [playerInfo, setPlayerInfo] = useState<any>(null);
    const [currentTeam, setCurrentTeam] = useState<any>(null);

    // Skeleton Shimmer Animation
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
    }, [shimmerAnim]);

    useEffect(() => {
        fetchPlayerInfo();
    }, [playerId]);

    const fetchPlayerInfo = async () => {
        try {
            setInfoLoading(true);
            const targetPlayerId = playerId || user?.id || user?._id;
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
        if (!searchQuery) return teams;
        return teams.filter((t: any) =>
            (t.name || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const getSelectedTeamObj = () => {
        return teams.find((t: any) => (t._id || t.id) === selectedTeam);
    };

    const handleSubmit = async () => {
        if (!selectedTeam) {
            Alert.alert('Xatolik', 'Iltimos, yangi jamoani tanlang');
            return;
        }

        try {
            setLoadingSubmit(true);
            const targetPlayerId = playerId || user?.id || user?._id;
            const transferData = {
                playerId: targetPlayerId,
                currentTeamId: currentTeam?.id || currentTeam?._id || user?.teamId || user?.team_id || 'unknown_old_team',
                newTeamId: selectedTeam,
                reason: reason.trim() || null,
            };

            const response = await apiService.createTransferRequest(transferData);
            if (response.success) {
                Alert.alert(
                    'Muvaffaqiyat! ✅',
                    "Transfer so'rovi yuborildi. Admin ko'rib chiqqach siz bilan bog'lanadi.",
                    [{ text: 'TUSHUNDIM', onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert('Xatolik', response.error || "So'rov yuborib bo'lmadi");
            }
        } catch (error) {
            console.error('Error submitting transfer request:', error);
            Alert.alert('Xatolik', "Server bilan bog'lanishda xatolik yuz berdi");
        } finally {
            setLoadingSubmit(false);
        }
    };

    const selectedTeamObj = getSelectedTeamObj();

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <VideoBackground 
                source={require('../assets/images/welcomeScreenVideo1.mp4')} 
                overlayOpacity={0.78}
                style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#00FF66" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Transfer So'rovi</Text>
                    <View style={{ width: 32 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Transfer Visual Card with Skeleton */}
                    {infoLoading ? (
                        <View style={styles.transferVisualCardSkeleton}>
                            <View style={styles.teamVisual}>
                                <Animated.View style={[styles.skeletonCircle, { opacity: shimmerAnim }]} />
                                <Animated.View style={[styles.skeletonText, { width: 70, opacity: shimmerAnim }]} />
                            </View>
                            <View style={styles.arrowContainer}>
                                <Ionicons name="swap-horizontal" size={28} color="rgba(0, 255, 102, 0.4)" />
                            </View>
                            <View style={styles.teamVisual}>
                                <Animated.View style={[styles.skeletonCircle, { opacity: shimmerAnim }]} />
                                <Animated.View style={[styles.skeletonText, { width: 70, opacity: shimmerAnim }]} />
                            </View>
                        </View>
                    ) : (
                        <View style={styles.transferVisualCard}>
                            {/* Current Team */}
                            <View style={styles.teamVisual}>
                                <View style={styles.teamLogoCircle}>
                                    {currentTeam?.logo_url || currentTeam?.logo ? (
                                        <Image
                                            source={{ uri: currentTeam.logo_url || currentTeam.logo }}
                                            style={styles.teamLogo}
                                            contentFit="contain"
                                        />
                                    ) : (
                                        <Ionicons name="shield-outline" size={28} color="#00FF66" />
                                    )}
                                </View>
                                <Text style={styles.teamVisualName} numberOfLines={2}>
                                    {currentTeam?.name || 'Hozirgi Jamoa'}
                                </Text>
                            </View>

                            {/* Swap Icon */}
                            <View style={styles.arrowContainer}>
                                <Ionicons name="swap-horizontal" size={28} color="#00FF66" />
                            </View>

                            {/* New Team */}
                            <View style={styles.teamVisual}>
                                <View style={[styles.teamLogoCircle, selectedTeamObj && styles.teamLogoCircleActive]}>
                                    {selectedTeamObj?.logo_url || selectedTeamObj?.logo ? (
                                        <Image
                                            source={{ uri: selectedTeamObj.logo_url || selectedTeamObj.logo }}
                                            style={styles.teamLogo}
                                            contentFit="contain"
                                        />
                                    ) : (
                                        <Ionicons name="add-circle-outline" size={32} color="rgba(255,255,255,0.4)" />
                                    )}
                                </View>
                                <Text style={[styles.teamVisualName, selectedTeamObj && { color: '#00FF66' }]} numberOfLines={2}>
                                    {selectedTeamObj?.name || 'Yangi Jamoa'}
                                </Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={22} color="#00FF66" />
                        <Text style={styles.infoText}>
                            Boshqa jamoaga o'tish uchun liga va yangi jamoani tanlab so'rov yuboring. So'rov adminlar tomonidan ko'rib chiqiladi.
                        </Text>
                    </View>

                    {/* Step 1: Select League */}
                    <Text style={styles.label}>1. LIGANI TANLANG</Text>
                    <TouchableOpacity
                        style={styles.selectButton}
                        onPress={() => setLeagueModalVisible(true)}
                    >
                        <Text style={[styles.selectButtonText, !selectedLeague && styles.placeholderText]}>
                            {selectedLeague || 'Liganing nomini tanlang...'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#00FF66" />
                    </TouchableOpacity>

                    {/* Step 2: Select Team */}
                    <Text style={styles.label}>2. YANGI JAMOANI TANLANG</Text>
                    <TouchableOpacity
                        style={[styles.selectButton, !selectedLeague && styles.disabledButton]}
                        onPress={() => {
                            if (!selectedLeague) {
                                Alert.alert('Eslatma', 'Iltimos, avval ligani tanlang');
                                return;
                            }
                            setSearchQuery('');
                            setModalVisible(true);
                        }}
                        disabled={!selectedLeague}
                    >
                        <Text style={[styles.selectButtonText, !selectedTeam && styles.placeholderText]}>
                            {loadingTeams ? "Jamoalar yuklanmoqda..." : (!selectedLeague ? "Avval ligani tanlang..." : (selectedTeamObj?.name || 'Jamoani tanlang...'))}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#00FF66" />
                    </TouchableOpacity>

                    {/* Step 3: Reason */}
                    <Text style={styles.label}>3. O'TISH SABABI (IXTIYORIY)</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Nima uchun jamoani almashtirmoqchisiz? (ixtiyoriy)..."
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        multiline
                        numberOfLines={5}
                        value={reason}
                        onChangeText={setReason}
                    />

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitButton, loadingSubmit && styles.disabledButton]}
                        onPress={handleSubmit}
                        disabled={loadingSubmit}
                    >
                        {loadingSubmit ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <>
                                <Ionicons name="send" size={20} color="#0b0e17" style={{ marginRight: 8 }} />
                                <Text style={styles.submitButtonText}>Transfer So'rovini Yuborish</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>

                {/* Team Selection Modal */}
                <Modal
                    visible={modalVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setModalVisible(false)}
                >
                    <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Jamoani Tanlang</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close-circle" size={26} color="rgba(255,255,255,0.6)" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="rgba(255,255,255,0.5)" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Jamoa nomini qidiring..."
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery !== '' && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <FlatList
                            data={getFilteredTeams()}
                            keyExtractor={(item) => item._id || item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.modalItem, (item._id || item.id) === selectedTeam && styles.modalItemActive]}
                                    onPress={() => {
                                        setSelectedTeam(item._id || item.id);
                                        setModalVisible(false);
                                    }}
                                >
                                    <View style={styles.modalItemRow}>
                                        <View style={styles.modalTeamLogo}>
                                            {item.logo_url || item.logo ? (
                                                <Image
                                                    source={{ uri: item.logo_url || item.logo }}
                                                    style={{ width: 34, height: 34 }}
                                                    contentFit="contain"
                                                />
                                            ) : (
                                                <Ionicons name="shield-outline" size={22} color="#00FF66" />
                                            )}
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.modalItemText}>{item.name}</Text>
                                            {item.league && (
                                                <Text style={styles.modalItemSub}>{item.league}</Text>
                                            )}
                                        </View>
                                    </View>
                                    {(item._id || item.id) === selectedTeam && (
                                        <Ionicons name="checkmark-circle" size={22} color="#00FF66" />
                                    )}
                                </TouchableOpacity>
                            )}
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                            ListEmptyComponent={<Text style={styles.emptyText}>Hech qanday jamoa topilmadi</Text>}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                </Modal>

                {/* League Selection Modal */}
                <Modal
                    visible={leagueModalVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setLeagueModalVisible(false)}
                >
                    <Pressable style={styles.modalOverlay} onPress={() => setLeagueModalVisible(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Ligani Tanlang</Text>
                            <TouchableOpacity onPress={() => setLeagueModalVisible(false)}>
                                <Ionicons name="close-circle" size={26} color="rgba(255,255,255,0.6)" />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={LEAGUES}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.modalItem, item.name === selectedLeague && styles.modalItemActive]}
                                    onPress={() => {
                                        setSelectedLeague(item.name);
                                        setSelectedTeam('');
                                        fetchTeams(item.name);
                                        setLeagueModalVisible(false);
                                    }}
                                >
                                    <View style={styles.modalItemRow}>
                                        <Ionicons name="trophy-outline" size={22} color="#00FF66" />
                                        <Text style={[styles.modalItemText, { marginLeft: 14 }]}>{item.name}</Text>
                                    </View>
                                    {item.name === selectedLeague && (
                                        <Ionicons name="checkmark-circle" size={22} color="#00FF66" />
                                    )}
                                </TouchableOpacity>
                            )}
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(18, 23, 34, 0.65)',
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    scrollContent: {
        padding: 20,
    },

    /* Transfer Visual Card */
    transferVisualCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(18, 23, 34, 0.75)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.25)',
        boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
    },
    transferVisualCardSkeleton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(18, 23, 34, 0.65)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    teamVisual: {
        alignItems: 'center',
        flex: 1,
    },
    teamLogoCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        overflow: 'hidden',
    },
    teamLogoCircleActive: {
        borderColor: '#00FF66',
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
    },
    teamLogo: {
        width: 44,
        height: 44,
    },
    teamVisualName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
        marginTop: 8,
        maxWidth: 100,
    },
    arrowContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 255, 102, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* Skeleton Loading Elements */
    skeletonCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    skeletonText: {
        height: 14,
        borderRadius: 7,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        marginTop: 10,
    },

    /* Info Box */
    infoBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 255, 102, 0.08)',
        padding: 14,
        borderRadius: 14,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.2)',
        alignItems: 'center',
    },
    infoText: {
        color: '#D0DFD5',
        fontSize: 13,
        marginLeft: 10,
        flex: 1,
        lineHeight: 18,
    },

    /* Form Elements */
    label: {
        color: '#8A9BB4',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 8,
        marginLeft: 4,
    },
    selectButton: {
        backgroundColor: 'rgba(18, 23, 34, 0.75)',
        borderRadius: 14,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        height: 54,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    selectButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
    placeholderText: {
        color: 'rgba(255, 255, 255, 0.4)',
    },
    disabledButton: {
        opacity: 0.5,
    },
    textArea: {
        backgroundColor: 'rgba(18, 23, 34, 0.75)',
        borderRadius: 14,
        color: '#FFFFFF',
        padding: 16,
        height: 120,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        marginBottom: 28,
        fontSize: 15,
        lineHeight: 22,
    },

    /* Submit Button */
    submitButton: {
        backgroundColor: '#00FF66',
        borderRadius: 14,
        height: 54,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 15px rgba(0, 255, 102, 0.3)',
    },
    submitButtonText: {
        color: '#0B0E17',
        fontSize: 16,
        fontWeight: '800',
    },

    /* Modal Styles */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
    modalContent: {
        backgroundColor: '#121722',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.25)',
        padding: 20,
        maxHeight: '75%',
        marginTop: 'auto',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '800',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 48,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    searchInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 15,
        marginLeft: 10,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    modalItemActive: {
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
    },
    modalItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    modalTeamLogo: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    modalItemText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    modalItemSub: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        marginTop: 2,
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    emptyText: {
        color: 'rgba(255, 255, 255, 0.5)',
        textAlign: 'center',
        marginTop: 30,
        marginBottom: 30,
        fontSize: 14,
    },
});

export default TransferRequestScreen;

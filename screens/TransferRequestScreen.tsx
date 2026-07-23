import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import { apiService } from '../services/apiService';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';

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

    // Player & current team info
    const [playerInfo, setPlayerInfo] = useState<any>(null);
    const [currentTeam, setCurrentTeam] = useState<any>(null);

    useEffect(() => {
        fetchPlayerInfo();
    }, []);

    const fetchPlayerInfo = async () => {
        try {
            if (playerId) {
                const player = await apiService.getPlayerById(playerId);
                if (player) {
                    setPlayerInfo(player);
                    const teamId = player.team_id || player.teamId;
                    if (teamId) {
                        const team = await apiService.getTeamById(teamId);
                        if (team) setCurrentTeam(team);
                    }
                }
            }
        } catch (e) {
            console.warn('Error fetching player info:', e);
        }
    };

    const fetchTeams = async (leagueName: string) => {
        try {
            setLoadingTeams(true);
            const data = await apiService.getTeams(1, 100, leagueName);
            if (data && Array.isArray(data)) {
                // Filter out current team
                const currentTeamId = user?.teamId || user?.team_id;
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
        if (reason.trim().length < 10) {
            Alert.alert('Xatolik', "O'tish sababi eng kamida 10 ta belgidan iborat bo'lishi shart.");
            return;
        }

        try {
            setLoadingSubmit(true);
            const transferData = {
                playerId,
                currentTeamId: user?.teamId || user?.team_id || 'unknown_old_team',
                newTeamId: selectedTeam,
                reason: reason.trim(),
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
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Transfer So'rovi</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Transfer Visual Card */}
                {(currentTeam || selectedTeamObj) && (
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
                                    <Ionicons name="shield" size={28} color="#666" />
                                )}
                            </View>
                            <Text style={styles.teamVisualName} numberOfLines={2}>
                                {currentTeam?.name || 'Joriy jamoa'}
                            </Text>
                        </View>

                        {/* Arrow */}
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
                                    <Ionicons name="help" size={28} color="#444" />
                                )}
                            </View>
                            <Text style={styles.teamVisualName} numberOfLines={2}>
                                {selectedTeamObj?.name || 'Yangi jamoa?'}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#00FF66" />
                    <Text style={styles.infoText}>
                        Boshqa jamoaga o'tish uchun so'rov yuboring. So'rov adminlar tomonidan ko'rib chiqiladi.
                    </Text>
                </View>

                <Text style={styles.label}>Ligani Tanlang</Text>
                <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => setLeagueModalVisible(true)}
                >
                    <Text style={[styles.selectButtonText, !selectedLeague && styles.placeholderText]}>
                        {selectedLeague || 'Ligani tanlang...'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#00FF66" />
                </TouchableOpacity>

                <Text style={styles.label}>Yangi Jamoani Tanlang</Text>
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
                        {loadingTeams ? "Yuklanmoqda..." : (!selectedLeague ? "Avval ligani tanlang..." : (selectedTeamObj?.name || 'Jamoani tanlang...'))}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#00FF66" />
                </TouchableOpacity>

                <Text style={styles.label}>O'tish Sababi</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="Nima uchun jamoani almashtirmoqchisiz?..."
                    placeholderTextColor="#666"
                    multiline
                    numberOfLines={6}
                    value={reason}
                    onChangeText={setReason}
                />

                <TouchableOpacity
                    style={[styles.submitButton, loadingSubmit && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={loadingSubmit}
                >
                    {loadingSubmit ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <>
                            <Ionicons name="send" size={20} color="#000" />
                            <Text style={styles.submitButtonText}>So'rovni Yuborish</Text>
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
                            <Ionicons name="close-circle" size={28} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#666" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Jamoa nomi..."
                            placeholderTextColor="#666"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
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
                                                style={{ width: 32, height: 32 }}
                                                contentFit="contain"
                                            />
                                        ) : (
                                            <Ionicons name="shield" size={20} color="#666" />
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
                        ListEmptyComponent={<Text style={styles.emptyText}>Hech narsa topilmadi</Text>}
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
                            <Ionicons name="close-circle" size={28} color="#666" />
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
                                    <Ionicons name="trophy-outline" size={24} color="#00FF66" />
                                    <Text style={[styles.modalItemText, { marginLeft: 15 }]}>{item.name}</Text>
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
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1A1A1A',
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    scrollContent: {
        padding: 20,
    },
    transferVisualCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#222',
    },
    teamVisual: {
        alignItems: 'center',
        flex: 1,
    },
    teamLogoCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#333',
        overflow: 'hidden',
    },
    teamLogoCircleActive: {
        borderColor: '#00FF66',
    },
    teamLogo: {
        width: 40,
        height: 40,
    },
    teamVisualName: {
        color: '#CCC',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 8,
        maxWidth: 100,
    },
    arrowContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#111',
        padding: 15,
        borderRadius: 12,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#333',
        alignItems: 'center',
    },
    infoText: {
        color: '#DDD',
        fontSize: 13,
        marginLeft: 10,
        flex: 1,
        lineHeight: 18,
    },
    label: {
        color: '#BBB',
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 10,
        marginLeft: 5,
    },
    selectButton: {
        backgroundColor: '#111',
        borderRadius: 12,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#333',
        height: 55,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
    },
    selectButtonText: {
        color: '#FFF',
        fontSize: 15,
        flex: 1,
    },
    placeholderText: {
        color: '#666',
    },
    textArea: {
        backgroundColor: '#111',
        borderRadius: 12,
        color: '#FFF',
        padding: 15,
        height: 130,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 30,
        fontSize: 15,
    },
    submitButton: {
        backgroundColor: '#00FF66',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 15,
        shadowColor: '#00FF66',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    submitButtonText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 14,
        textTransform: 'uppercase',
        marginLeft: 10,
    },
    disabledButton: {
        opacity: 0.6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    modalContent: {
        backgroundColor: '#1A1A1A',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '75%',
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    modalTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0A0A0A',
        borderRadius: 10,
        paddingHorizontal: 12,
        marginBottom: 15,
        height: 45,
        borderWidth: 1,
        borderColor: '#333',
    },
    searchInput: {
        flex: 1,
        color: '#FFF',
        marginLeft: 10,
        fontSize: 15,
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 10,
    },
    modalItemActive: {
        backgroundColor: 'rgba(0, 255, 102, 0.08)',
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
        backgroundColor: '#222',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    modalItemText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
    },
    modalItemSub: {
        color: '#666',
        fontSize: 12,
        marginTop: 2,
    },
    separator: {
        height: 1,
        backgroundColor: '#222',
    },
    emptyText: {
        color: '#666',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 15,
    },
});

export default TransferRequestScreen;

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
import { apiService } from '../services/apiService';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';

const TransferRequestScreen = ({ route, navigation }: any) => {
    const { user } = useAuthStore();
    const { playerId } = route.params || {};
    const [leagues, setLeagues] = useState<any[]>([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [loadingLeagues, setLoadingLeagues] = useState(false);

    const [tournaments, setTournaments] = useState<any[]>([]);
    const [selectedTournament, setSelectedTournament] = useState('');
    const [loadingTournaments, setLoadingTournaments] = useState(false);

    const [teams, setTeams] = useState<any[]>([]);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [loadingTeams, setLoadingTeams] = useState(false);

    const [reason, setReason] = useState('');
    const [loadingSubmit, setLoadingSubmit] = useState(false);

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'league' | 'tournament' | 'team'>('league');
    const [searchQuery, setSearchQuery] = useState('');

    const openModal = (type: 'league' | 'tournament' | 'team') => {
        setModalType(type);
        setSearchQuery('');
        setModalVisible(true);
    };

    const getModalData = () => {
        let data: any[] = [];
        if (modalType === 'league') data = leagues;
        if (modalType === 'tournament') data = tournaments;
        if (modalType === 'team') data = teams;
        
        if (searchQuery) {
            return data.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return data;
    };

    const handleSelect = (item: any) => {
        if (modalType === 'league') {
            setSelectedLeague(item._id || item.id);
        } else if (modalType === 'tournament') {
            setSelectedTournament(item._id || item.id);
        } else if (modalType === 'team') {
            setSelectedTeam(item._id || item.id);
        }
        setModalVisible(false);
    };

    const getSelectedName = (type: 'league' | 'tournament' | 'team') => {
        if (type === 'league') {
            return leagues.find(l => (l._id || l.id) === selectedLeague)?.name || 'Ligani tanlang...';
        }
        if (type === 'tournament') {
            return tournaments.find(t => (t._id || t.id) === selectedTournament)?.name || 'Turnirni tanlang...';
        }
        if (type === 'team') {
            return teams.find(t => (t._id || t.id) === selectedTeam)?.name || 'Jamoani tanlang...';
        }
        return '';
    };

    useEffect(() => {
        fetchLeagues();
    }, []);

    const fetchLeagues = async () => {
        try {
            setLoadingLeagues(true);
            const data = await apiService.getLeagues();
            if (data && Array.isArray(data)) {
                setLeagues(data);
            }
        } catch (error) {
            console.error('Error fetching leagues:', error);
        } finally {
            setLoadingLeagues(false);
        }
    };

    useEffect(() => {
        if (selectedLeague) {
            fetchTournaments(selectedLeague);
        } else {
            setTournaments([]);
            setSelectedTournament('');
            setTeams([]);
            setSelectedTeam('');
        }
    }, [selectedLeague]);

    const fetchTournaments = async (leagueId: string) => {
        try {
            setLoadingTournaments(true);
            const data = await apiService.getTournaments(1, 100, leagueId);
            if (data && Array.isArray(data)) {
                setTournaments(data);
            }
            setSelectedTournament('');
            setTeams([]);
            setSelectedTeam('');
        } catch (error) {
            console.error('Error fetching tournaments:', error);
        } finally {
            setLoadingTournaments(false);
        }
    };

    useEffect(() => {
        if (selectedTournament) {
            fetchTeamsForTournament(selectedTournament);
        } else {
            setTeams([]);
            setSelectedTeam('');
        }
    }, [selectedTournament]);

    const fetchTeamsForTournament = async (tournamentId: string) => {
        try {
            setLoadingTeams(true);
            const data = await apiService.getTeams(1, 100, tournamentId);
            if (data && Array.isArray(data)) {
                setTeams(data);
            }
            setSelectedTeam('');
        } catch (error) {
            console.error('Error fetching teams:', error);
        } finally {
            setLoadingTeams(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedTeam || !reason.trim()) {
            Alert.alert('Xatolik', 'Iltimos, barcha tanlovlarni bajaring va sababni yozing');
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
                currentTeamId: user?.teamId || 'unknown_old_team',
                newTeamId: selectedTeam,
                reason: reason.trim(),
            };

            const response = await apiService.createTransferRequest(transferData);
            if (response.success) {
                Alert.alert('Muvaffaqiyat', 'Transfer so\'rovi yuborildi. Admin javobini kuting.');
                navigation.goBack();
            } else {
                Alert.alert('Xatolik', response.error || 'So\'rov yuborib bo\'lmadi');
            }
        } catch (error) {
            console.error('Error submitting transfer request:', error);
            Alert.alert('Xatolik', 'Server bilan bog\'lanishda xatolik yuz berdi');
        } finally {
            setLoadingSubmit(false);
        }
    };

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
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#00FF66" />
                    <Text style={styles.infoText}>
                        Boshqa jamoaga o'tish uchun so'rov yuboring. So'rov adminlar tomonidan ko'rib chiqiladi.
                    </Text>
                </View>

                <Text style={styles.label}>Ligani Tanlang</Text>
                <TouchableOpacity 
                    style={styles.selectButton} 
                    onPress={() => openModal('league')}
                >
                    <Text style={[styles.selectButtonText, !selectedLeague && styles.placeholderText]}>
                        {loadingLeagues ? "Yuklanmoqda..." : getSelectedName('league')}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#00FF66" />
                </TouchableOpacity>

                {selectedLeague ? (
                    <>
                        <Text style={styles.label}>Turnirni Tanlang</Text>
                        <TouchableOpacity 
                            style={styles.selectButton} 
                            onPress={() => openModal('tournament')}
                            disabled={loadingTournaments || tournaments.length === 0}
                        >
                            <Text style={[styles.selectButtonText, !selectedTournament && styles.placeholderText]}>
                                {loadingTournaments ? "Yuklanmoqda..." : getSelectedName('tournament')}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#00FF66" />
                        </TouchableOpacity>
                    </>
                ) : null}

                {selectedTournament ? (
                    <>
                        <Text style={styles.label}>Yangi Jamoani Tanlang</Text>
                        <TouchableOpacity 
                            style={styles.selectButton} 
                            onPress={() => openModal('team')}
                            disabled={loadingTeams || teams.length === 0}
                        >
                            <Text style={[styles.selectButtonText, !selectedTeam && styles.placeholderText]}>
                                {loadingTeams ? "Yuklanmoqda..." : getSelectedName('team')}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#00FF66" />
                        </TouchableOpacity>
                    </>
                ) : null}

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

            {/* Bottom Sheet Modal for Selections */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)} />
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {modalType === 'league' ? 'Ligani Tanlang' : modalType === 'tournament' ? 'Turnirni Tanlang' : 'Jamoani Tanlang'}
                        </Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Ionicons name="close-circle" size={28} color="#666" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#666" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Qidirish..."
                            placeholderTextColor="#666"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    <FlatList
                        data={getModalData()}
                        keyExtractor={(item) => item._id || item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={styles.modalItem}
                                onPress={() => handleSelect(item)}
                            >
                                <Text style={styles.modalItemText}>{item.name}</Text>
                                <Ionicons name="chevron-forward" size={20} color="#333" />
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        ListEmptyComponent={<Text style={styles.emptyText}>Hech narsa topilmadi</Text>}
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
        height: 150,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 30,
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
        paddingVertical: 15,
    },
    modalItemText: {
        color: '#FFF',
        fontSize: 16,
    },
    separator: {
        height: 1,
        backgroundColor: '#333',
    },
    emptyText: {
        color: '#666',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 15,
    },
});

export default TransferRequestScreen;

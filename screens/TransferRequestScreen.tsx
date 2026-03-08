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
} from 'react-native';
import { apiService } from '../services/apiService';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

const TransferRequestScreen = ({ route, navigation }: any) => {
    const { playerId } = route.params || {};
    const [loading, setLoading] = useState(false);
    const [teams, setTeams] = useState<any[]>([]);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        try {
            const response = await apiService.getTeams(1, 100);
            if (response.data.success) {
                setTeams(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching teams:', error);
        }
    };

    const handleSubmit = async () => {
        if (!selectedTeam || !reason.trim()) {
            Alert.alert('Xatolik', 'Iltimos, jamoa tanlang va sababni yozing');
            return;
        }

        try {
            setLoading(true);
            const transferData = {
                playerId,
                currentTeamId: 'old_team_id', // This should come from user session
                newTeamId: selectedTeam,
                reason: reason.trim(),
            };

            const response = await apiService.createTransferRequest(transferData);
            if (response.data.success) {
                Alert.alert('Muvaffaqiyat', 'Transfer so\'rovi yuborildi. Admin javobini kuting.');
                navigation.goBack();
            } else {
                Alert.alert('Xatolik', response.data.error || 'So\'rov yuborib bo\'lmadi');
            }
        } catch (error) {
            console.error('Error submitting transfer request:', error);
            Alert.alert('Xatolik', 'Server bilan bog\'lanishda xatolik');
        } finally {
            setLoading(false);
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

                <Text style={styles.label}>Yangi Jamoani Tanlang</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={selectedTeam}
                        onValueChange={(itemValue) => setSelectedTeam(itemValue)}
                        style={styles.picker}
                        dropdownIconColor="#00FF66"
                    >
                        <Picker.Item label="Jamoani tanlang..." value="" />
                        {teams.map((team) => (
                            <Picker.Item
                                key={team._id || team.id}
                                label={team.name}
                                value={team._id || team.id}
                            />
                        ))}
                    </Picker>
                </View>

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
                    style={[styles.submitButton, loading && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <>
                            <Ionicons name="send" size={20} color="#000" />
                            <Text style={styles.submitButtonText}>So'rovni Yuborish</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
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
        justifyContent: 'between',
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
    pickerContainer: {
        backgroundColor: '#111',
        borderRadius: 12,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#333',
        overflow: 'hidden',
    },
    picker: {
        color: '#FFF',
        height: 55,
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
});

export default TransferRequestScreen;

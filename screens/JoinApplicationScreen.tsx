import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';

type ApplicationType = 'player' | 'team' | 'league';

const JoinApplicationScreen = ({ navigation }: any) => {
    const [loading, setLoading] = useState(false);
    const [leagues, setLeagues] = useState<any[]>([]);
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [applicationType, setApplicationType] = useState<ApplicationType>('player');

    const [formData, setFormData] = useState({
        // General
        phone: '',
        email: '',

        // Player specific
        firstName: '',
        lastName: '',
        middleName: '',
        number: '',
        position: '',
        experience: '',
        photo: null as string | null,

        // Team specific
        teamName: '',
        teamLogo: null as string | null,
        teamFoundedDate: '',

        // League specific
        leagueName: '',
        leagueLogo: null as string | null,
        leagueFoundedDate: '',

        // Selections
        selectedLeague: '',
        selectedTournament: '',
        selectedTeam: '',
    });

    useEffect(() => {
        loadLeagues();
    }, []);

    const loadLeagues = async () => {
        try {
            setLoadingData(true);
            const response = await apiService.getTournaments();
            if (response.data.success && response.data.data) {
                setLeagues(response.data.data);
            }
        } catch (error) {
            console.error('Error loading leagues:', error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleLeagueSelect = (leagueId: string) => {
        setFormData({
            ...formData,
            selectedLeague: leagueId,
            selectedTournament: '',
            selectedTeam: ''
        });
        const league = leagues.find(l => l._id === leagueId);
        if (league && league.tournaments) {
            setTournaments(league.tournaments);
        } else {
            setTournaments([]);
        }
        setTeams([]);
    };

    const handleTournamentSelect = async (tournamentId: string) => {
        setFormData({ ...formData, selectedTournament: tournamentId, selectedTeam: '' });
        try {
            setLoadingData(true);
            const response = await apiService.getTeams(1, 100, tournamentId);
            if (response.data.success) {
                setTeams(response.data.data);
            }
        } catch (error) {
            console.error('Error loading teams:', error);
        } finally {
            setLoadingData(false);
        }
    };

    const pickImage = async (field: 'photo' | 'teamLogo' | 'leagueLogo') => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Xato', 'Galereyaga ruxsat berilmadi');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
            setFormData({ ...formData, [field]: base64Image });
        }
    };

    const handleSubmit = async () => {
        // Validation logic
        if (applicationType === 'player') {
            if (!formData.firstName || !formData.lastName || !formData.phone || !formData.selectedLeague || !formData.selectedTeam) {
                Alert.alert('Xato', 'Iltimos, barcha majburiy maydonlarni to\'ldiring');
                return;
            }
        } else if (applicationType === 'team') {
            if (!formData.teamName || !formData.phone || !formData.selectedLeague || !formData.selectedTournament) {
                Alert.alert('Xato', 'Iltimos, barcha majburiy maydonlarni to\'ldiring');
                return;
            }
        } else if (applicationType === 'league') {
            if (!formData.leagueName || !formData.phone) {
                Alert.alert('Xato', 'Iltimos, barcha majburiy maydonlarni to\'ldiring');
                return;
            }
        }

        try {
            setLoading(true);
            const response = await apiService.createApplication({
                ...formData,
                type: applicationType,
                status: 'pending',
                createdAt: new Date(),
            });

            if (response.data.success) {
                Alert.alert(
                    'Muvaffaqiyatli',
                    'Sizning arizangiz qabul qilindi. Tez orada administratorlarimiz siz bilan bog\'lanishadi.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            }
        } catch (error: any) {
            console.error('Error submitting application:', error);
            Alert.alert('Xato', 'Ariza yuborishda xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    const renderTypeSelector = () => (
        <View style={styles.typeContainer}>
            <TouchableOpacity
                style={[styles.typeButton, applicationType === 'player' && styles.typeButtonActive]}
                onPress={() => setApplicationType('player')}
            >
                <Ionicons name="person" size={18} color={applicationType === 'player' ? '#000' : Colors.textMuted} />
                <Text style={[styles.typeButtonText, applicationType === 'player' && styles.typeButtonTextActive]}>O'yinchi</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.typeButton, applicationType === 'team' && styles.typeButtonActive]}
                onPress={() => setApplicationType('team')}
            >
                <Ionicons name="shield" size={18} color={applicationType === 'team' ? '#000' : Colors.textMuted} />
                <Text style={[styles.typeButtonText, applicationType === 'team' && styles.typeButtonTextActive]}>Jamoa</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.typeButton, applicationType === 'league' && styles.typeButtonActive]}
                onPress={() => setApplicationType('league')}
            >
                <Ionicons name="trophy" size={18} color={applicationType === 'league' ? '#000' : Colors.textMuted} />
                <Text style={[styles.typeButtonText, applicationType === 'league' && styles.typeButtonTextActive]}>Liga</Text>
            </TouchableOpacity>
        </View>
    );

    const renderPlayerForm = () => (
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Shaxsiy ma'lumotlar</Text>

            <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('photo')}>
                {formData.photo ? (
                    <Image source={{ uri: formData.photo }} style={styles.pickedImage} />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Ionicons name="camera" size={30} color={Colors.textMuted} />
                        <Text style={styles.imagePlaceholderText}>Rasm yuklash</Text>
                    </View>
                )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Familiya *</Text>
                <TextInput
                    style={styles.input}
                    value={formData.lastName}
                    onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                    placeholder="Familiyangizni kiriting"
                    placeholderTextColor={Colors.textMuted}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Ism *</Text>
                <TextInput
                    style={styles.input}
                    value={formData.firstName}
                    onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                    placeholder="Ismingizni kiriting"
                    placeholderTextColor={Colors.textMuted}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Otasining ismi</Text>
                <TextInput
                    style={styles.input}
                    value={formData.middleName}
                    onChangeText={(text) => setFormData({ ...formData, middleName: text })}
                    placeholder="Sharifingizni kiriting"
                    placeholderTextColor={Colors.textMuted}
                />
            </View>

            <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.label}>Raqam</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.number}
                        onChangeText={(text) => setFormData({ ...formData, number: text })}
                        placeholder="7"
                        keyboardType="number-pad"
                        placeholderTextColor={Colors.textMuted}
                    />
                </View>
                <View style={[styles.inputGroup, { flex: 2 }]}>
                    <Text style={styles.label}>Ampluasi (Rol)</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.position}
                        onChangeText={(text) => setFormData({ ...formData, position: text })}
                        placeholder="Hujumchi"
                        placeholderTextColor={Colors.textMuted}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Tajriba (Qayerda o'ynagan)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.experience}
                    onChangeText={(text) => setFormData({ ...formData, experience: text })}
                    placeholder="Oldingi jamoalaringiz va tajribangiz haqida..."
                    multiline
                    numberOfLines={3}
                    placeholderTextColor={Colors.textMuted}
                />
            </View>

            <Text style={styles.sectionTitle}>Jamoa tanlash</Text>

            <Text style={styles.label}>Ligani tanlang *</Text>
            <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {leagues.map((league) => (
                        <TouchableOpacity
                            key={league._id}
                            style={[styles.pickerItem, formData.selectedLeague === league._id && styles.pickerItemActive]}
                            onPress={() => handleLeagueSelect(league._id)}
                        >
                            <Text style={[styles.pickerItemText, formData.selectedLeague === league._id && styles.pickerItemTextActive]}>{league.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {formData.selectedLeague !== '' && (
                <>
                    <Text style={styles.label}>Turnirni tanlang *</Text>
                    <View style={styles.pickerContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {tournaments.map((tournament) => (
                                <TouchableOpacity
                                    key={tournament._id}
                                    style={[styles.pickerItem, formData.selectedTournament === tournament._id && styles.pickerItemActive]}
                                    onPress={() => handleTournamentSelect(tournament._id)}
                                >
                                    <Text style={[styles.pickerItemText, formData.selectedTournament === tournament._id && styles.pickerItemTextActive]}>{tournament.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </>
            )}

            {formData.selectedTournament !== '' && (
                <>
                    <Text style={styles.label}>Jamoani tanlang *</Text>
                    <View style={styles.pickerContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {teams.map((team) => (
                                <TouchableOpacity
                                    key={team._id}
                                    style={[styles.pickerItem, formData.selectedTeam === team._id && styles.pickerItemActive]}
                                    onPress={() => setFormData({ ...formData, selectedTeam: team._id })}
                                >
                                    <Text style={[styles.pickerItemText, formData.selectedTeam === team._id && styles.pickerItemTextActive]}>{team.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </>
            )}
        </View>
    );

    const renderTeamForm = () => (
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Jamoa ma'lumotlari</Text>

            <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('teamLogo')}>
                {formData.teamLogo ? (
                    <Image source={{ uri: formData.teamLogo }} style={styles.pickedImage} />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Ionicons name="shield" size={30} color={Colors.textMuted} />
                        <Text style={styles.imagePlaceholderText}>Logo yuklash</Text>
                    </View>
                )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Jamoa nomi *</Text>
                <TextInput
                    style={styles.input}
                    value={formData.teamName}
                    onChangeText={(text) => setFormData({ ...formData, teamName: text })}
                    placeholder="Jamoangiz nomini kiriting"
                    placeholderTextColor={Colors.textMuted}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Tashkil topgan sana</Text>
                <TextInput
                    style={styles.input}
                    value={formData.teamFoundedDate}
                    onChangeText={(text) => setFormData({ ...formData, teamFoundedDate: text })}
                    placeholder="Masalan: 2023-yil"
                    placeholderTextColor={Colors.textMuted}
                />
            </View>

            <Text style={styles.sectionTitle}>Musobaqa tanlash</Text>
            <Text style={styles.label}>Ligani tanlang *</Text>
            <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {leagues.map((league) => (
                        <TouchableOpacity
                            key={league._id}
                            style={[styles.pickerItem, formData.selectedLeague === league._id && styles.pickerItemActive]}
                            onPress={() => handleLeagueSelect(league._id)}
                        >
                            <Text style={[styles.pickerItemText, formData.selectedLeague === league._id && styles.pickerItemTextActive]}>{league.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {formData.selectedLeague !== '' && (
                <>
                    <Text style={styles.label}>Turnirni tanlang *</Text>
                    <View style={styles.pickerContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {tournaments.map((tournament) => (
                                <TouchableOpacity
                                    key={tournament._id}
                                    style={[styles.pickerItem, formData.selectedTournament === tournament._id && styles.pickerItemActive]}
                                    onPress={() => setFormData({ ...formData, selectedTournament: tournament._id })}
                                >
                                    <Text style={[styles.pickerItemText, formData.selectedTournament === tournament._id && styles.pickerItemTextActive]}>{tournament.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </>
            )}
        </View>
    );

    const renderLeagueForm = () => (
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Liga ma'lumotlari</Text>

            <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('leagueLogo')}>
                {formData.leagueLogo ? (
                    <Image source={{ uri: formData.leagueLogo }} style={styles.pickedImage} />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Ionicons name="trophy" size={30} color={Colors.textMuted} />
                        <Text style={styles.imagePlaceholderText}>Logo yuklash</Text>
                    </View>
                )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Liga nomi *</Text>
                <TextInput
                    style={styles.input}
                    value={formData.leagueName}
                    onChangeText={(text) => setFormData({ ...formData, leagueName: text })}
                    placeholder="Liga nomini kiriting"
                    placeholderTextColor={Colors.textMuted}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Tashkil topgan sana</Text>
                <TextInput
                    style={styles.input}
                    value={formData.leagueFoundedDate}
                    onChangeText={(text) => setFormData({ ...formData, leagueFoundedDate: text })}
                    placeholder="Masalan: 2024-yil"
                    placeholderTextColor={Colors.textMuted}
                />
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ariza topshirish</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>HFL oilasiga qo'shilish uchun quyidagi shaklni to'ldiring</Text>

                {renderTypeSelector()}

                <View style={styles.contactSection}>
                    <Text style={styles.sectionTitle}>Aloqa ma'lumotlari</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Telefon raqami *</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.phone}
                            onChangeText={(text) => setFormData({ ...formData, phone: text })}
                            placeholder="+998 90 123 45 67"
                            keyboardType="phone-pad"
                            placeholderTextColor={Colors.textMuted}
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Telegram yoki Email</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.email}
                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                            placeholder="@user yoki email"
                            autoCapitalize="none"
                            placeholderTextColor={Colors.textMuted}
                        />
                    </View>
                </View>

                {applicationType === 'player' && renderPlayerForm()}
                {applicationType === 'team' && renderTeamForm()}
                {applicationType === 'league' && renderLeagueForm()}

                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={styles.submitButtonText}>Arzani Jo'natish</Text>
                    )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        backgroundColor: Colors.background,
    },
    headerTitle: {
        color: Colors.text,
        fontSize: 20,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 5,
    },
    content: {
        padding: 20,
    },
    subtitle: {
        color: Colors.textMuted,
        fontSize: 14,
        marginBottom: 25,
        lineHeight: 20,
    },
    typeContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 5,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
    },
    typeButtonActive: {
        backgroundColor: Colors.primary,
    },
    typeButtonText: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 6,
    },
    typeButtonTextActive: {
        color: '#000',
    },
    formSection: {
        marginTop: 10,
    },
    contactSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        marginTop: 10,
    },
    inputGroup: {
        marginBottom: 15,
    },
    label: {
        color: Colors.text,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 15,
        color: Colors.text,
        borderWidth: 1,
        borderColor: Colors.border,
        fontSize: 15,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    imagePicker: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 20,
        overflow: 'hidden',
    },
    pickedImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        alignItems: 'center',
    },
    imagePlaceholderText: {
        color: Colors.textMuted,
        fontSize: 10,
        marginTop: 5,
        fontWeight: 'bold',
    },
    pickerContainer: {
        marginBottom: 20,
    },
    pickerItem: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
        backgroundColor: Colors.surface,
        marginRight: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    pickerItemActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    pickerItemText: {
        color: Colors.text,
        fontSize: 13,
    },
    pickerItemTextActive: {
        color: '#000',
        fontWeight: 'bold',
    },
    submitButton: {
        backgroundColor: Colors.primary,
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        marginTop: 30,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#000',
        fontSize: 17,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
});

export default JoinApplicationScreen;

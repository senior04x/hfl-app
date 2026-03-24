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
    Platform,
    Dimensions,
    SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import { Video, ResizeMode } from 'expo-av';
import VideoBackground from '../components/VideoBackground';

const { width } = Dimensions.get('window');

type ApplicationType = 'player' | 'team';

const PLAYER_POSITIONS = [
    { id: 'GK', label: 'GK' },
    { id: 'CB', label: 'CB' },
    { id: 'LB', label: 'LB' },
    { id: 'RB', label: 'RB' },
    { id: 'LWB', label: 'LWB' },
    { id: 'RWB', label: 'RWB' },
    { id: 'CDM', label: 'CDM' },
    { id: 'CM', label: 'CM' },
    { id: 'CAM', label: 'CAM' },
    { id: 'LM', label: 'LM' },
    { id: 'RM', label: 'RM' },
    { id: 'LW', label: 'LW' },
    { id: 'RW', label: 'RW' },
    { id: 'ST', label: 'ST' },
    { id: 'CF', label: 'CF' },
];

const TEAM_ROLES = [
    { id: 'Owner', label: 'Rahbar' },
    { id: 'Manager', label: 'Manager' },
    { id: 'Coach', label: 'Murabbiy' },
    { id: 'Admin', label: 'Admin' },
    { id: 'Captain', label: 'Sardor' },
];

const JoinApplicationScreen = ({ navigation }: any) => {
    const [loading, setLoading] = useState(false);
    const [leagues, setLeagues] = useState<any[]>([]);
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [applicationType, setApplicationType] = useState<ApplicationType>('player');

    const [formData, setFormData] = useState({
        phone: '',
        firstName: '',
        lastName: '',
        number: '',
        position: '',
        experience: '',
        photo: null as string | null,
        teamName: '',
        teamLogo: null as string | null,
        staffName: '',
        staffRole: '',
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
            const data = await apiService.getLeagues();
            setLeagues(data || []);
        } catch (error) {
            console.error('Error loading leagues:', error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleLeagueSelect = async (leagueId: string) => {
        setFormData({
            ...formData,
            selectedLeague: leagueId,
            selectedTournament: '',
            selectedTeam: ''
        });
        setTournaments([]);
        setTeams([]);
        
        try {
            setLoadingData(true);
            const data = await apiService.getTournaments(1, 50, leagueId);
            setTournaments(data || []);
        } catch (error) {
            console.error('Error loading tournaments:', error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleTournamentSelect = async (tournamentId: string) => {
        setFormData({ ...formData, selectedTournament: tournamentId, selectedTeam: '' });
        setTeams([]);

        if (applicationType === 'player') {
            try {
                setLoadingData(true);
                const data = await apiService.getTeams(1, 100, tournamentId);
                setTeams(data || []);
            } catch (error) {
                console.error('Error loading teams:', error);
            } finally {
                setLoadingData(false);
            }
        }
    };

    const pickImage = async (field: 'photo' | 'teamLogo') => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Xato', 'Galereyaga ruxsat berilmadi');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8, // Better quality since WebP compression happens on backend
        });

        if (!result.canceled && result.assets[0].uri) {
            setFormData({ ...formData, [field]: result.assets[0].uri }); // URI saqlaymiz, Base64 emas
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.phone || formData.phone.length < 9) {
            Alert.alert('Xato', 'Telefon raqamini to\'g\'ri kiriting');
            return;
        }

        if (applicationType === 'player') {
            if (!formData.firstName || !formData.lastName || !formData.position || !formData.selectedTeam) {
                Alert.alert('Xato', 'Iltimos, barcha majburiy maydonlarni to\'ldiring');
                return;
            }
        } else {
            if (!formData.teamName || !formData.selectedLeague || !formData.selectedTournament || !formData.staffName || !formData.staffRole) {
                Alert.alert('Xato', 'Iltimos, barcha majburiy maydonlarni to\'ldiring');
                return;
            }
        }

        try {
            setLoading(true);

            // 1. Agar rasm bo'lsa, uni alohida API ga yuklaymiz va URL ni olamiz
            let uploadedPhotoUrl = null;
            let uploadedTeamLogoUrl = null;

            if (applicationType === 'player' && formData.photo && !formData.photo.startsWith('http')) {
                const uploadRes = await apiService.uploadPhoto(formData.photo);
                uploadedPhotoUrl = uploadRes.url;
            } else if (applicationType === 'team' && formData.teamLogo && !formData.teamLogo.startsWith('http')) {
                const uploadRes = await apiService.uploadPhoto(formData.teamLogo);
                uploadedTeamLogoUrl = uploadRes.url;
            }
            
            // Format phone number before sending
            let phone = formData.phone.replace(/\D/g, '');
            if (phone.length === 9) {
                phone = `+998${phone}`;
            } else if (phone.length === 12 && phone.startsWith('998')) {
                phone = `+${phone}`;
            } else if (!phone.startsWith('+')) {
                phone = `+${phone}`;
            }

            const applicationData = {
                ...formData,
                photo: uploadedPhotoUrl || formData.photo,
                teamLogo: uploadedTeamLogoUrl || formData.teamLogo,
                phone: phone,
                type: applicationType,
                status: 'pending',
                createdAt: new Date(),
            };

            const response = await apiService.createApplication(applicationData);

            if (response && response.success) {
                Alert.alert(
                    'Muvaffaqiyatli',
                    'Arizangiz qabul qilindi! Admin ko\'rib chiqqach sizga xabar beriladi.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            } else {
                throw new Error('Server error');
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert('Xato', 'Ariza yuborishda xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={28} color={Colors.text} />
            </TouchableOpacity>
            <View>
                <Text style={styles.headerTitle}>ARIZA TOPSHIRISH</Text>
                <Text style={styles.headerSubtitle}>Amatora Sports oilasiga qo'shiling</Text>
            </View>
            <View style={{ width: 40 }} />
        </View>
    );

    const renderTypeSelector = () => (
        <View style={styles.typeSelectorWrapper}>
            <TouchableOpacity
                style={[styles.typeOption, applicationType === 'player' && styles.typeOptionActive]}
                onPress={() => setApplicationType('player')}
            >
                <Ionicons name="person" size={20} color={applicationType === 'player' ? '#000' : Colors.textMuted} />
                <Text style={[styles.typeOptionText, applicationType === 'player' && styles.typeOptionTextActive]}>O'YINCHI</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.typeOption, applicationType === 'team' && styles.typeOptionActive]}
                onPress={() => setApplicationType('team')}
            >
                <Ionicons name="shield" size={20} color={applicationType === 'team' ? '#000' : Colors.textMuted} />
                <Text style={[styles.typeOptionText, applicationType === 'team' && styles.typeOptionTextActive]}>JAMOA</Text>
            </TouchableOpacity>
        </View>
    );

    const playerPhoto = formData.photo || undefined;
    const teamLogo = formData.teamLogo || undefined;

    return (
        <View style={styles.container}>
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                overlayOpacity={0.85}
            >
            <SafeAreaView style={{ flex: 1 }}>
                {renderHeader()}
                
                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {renderTypeSelector()}

                    {/* Step 1: Basic Info */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>{applicationType === 'player' ? 'SHAXSIY MA\'LUMOTLAR' : 'JAMOA MA\'LUMOTLARI'}</Text>
                        
                        <TouchableOpacity 
                            style={styles.photoUpload} 
                            onPress={() => pickImage(applicationType === 'player' ? 'photo' : 'teamLogo')}
                        >
                            {(applicationType === 'player' ? playerPhoto : teamLogo) ? (
                                <Image 
                                    source={{ uri: (applicationType === 'player' ? playerPhoto : teamLogo) as string }} 
                                    style={styles.uploadedImage} 
                                />
                            ) : (
                                <View style={styles.photoPlaceholder}>
                                    <Ionicons 
                                        name={applicationType === 'player' ? "camera-outline" : "shield-outline"} 
                                        size={32} 
                                        color={Colors.primary} 
                                    />
                                    <Text style={styles.photoText}>RASM YUKLASH</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.inputStack}>
                            {applicationType === 'player' ? (
                                <>
                                    <View style={styles.inputBox}>
                                        <Text style={styles.boxLabel}>FAMILIYA</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            value={formData.lastName}
                                            onChangeText={(t) => setFormData({...formData, lastName: t})}
                                            placeholder="Masalan: Karimov"
                                            placeholderTextColor="rgba(255,255,255,0.2)"
                                        />
                                    </View>
                                    <View style={styles.inputBox}>
                                        <Text style={styles.boxLabel}>ISM</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            value={formData.firstName}
                                            onChangeText={(t) => setFormData({...formData, firstName: t})}
                                            placeholder="Masalan: Aziz"
                                            placeholderTextColor="rgba(255,255,255,0.2)"
                                        />
                                    </View>
                                </>
                            ) : (
                                <>
                                    <View style={styles.inputBox}>
                                        <Text style={styles.boxLabel}>JAMOA NOMI *</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            value={formData.teamName}
                                            onChangeText={(t) => setFormData({ ...formData, teamName: t })}
                                            placeholder="Masalan: Zarba FC"
                                            placeholderTextColor="rgba(255,255,255,0.2)"
                                        />
                                    </View>

                                    <View style={styles.inputBox}>
                                        <Text style={styles.boxLabel}>XODIM ISMI VA FAMILYASI *</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            value={formData.staffName}
                                            onChangeText={(t) => setFormData({ ...formData, staffName: t })}
                                            placeholder="Ism sharifingizni kiriting"
                                            placeholderTextColor="rgba(255,255,255,0.2)"
                                        />
                                    </View>

                                    <View style={styles.inputBox}>
                                        <Text style={styles.boxLabel}>ROLINGIZ *</Text>
                                        <View style={styles.positionCloud}>
                                            {TEAM_ROLES.map((role) => (
                                                <TouchableOpacity
                                                    key={role.id}
                                                    style={[
                                                        styles.positionCloudItem,
                                                        formData.staffRole === role.id && styles.positionCloudItemActive
                                                    ]}
                                                    onPress={() => setFormData({ ...formData, staffRole: role.id })}
                                                >
                                                    <Text style={[
                                                        styles.positionCloudText,
                                                        formData.staffRole === role.id && styles.positionCloudTextActive
                                                    ]}>
                                                        {role.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </>
                            )}

                            <View style={styles.inputBox}>
                                <Text style={styles.boxLabel}>TELEFON RAQAM</Text>
                                <View style={styles.phoneInputContainer}>
                                    <View style={styles.phonePrefix}>
                                        <Text style={styles.phonePrefixText}>+998</Text>
                                    </View>
                                    <TextInput
                                        style={styles.phoneInput}
                                        value={formData.phone}
                                        onChangeText={(t) => {
                                            const cleaned = t.replace(/\D/g, '');
                                            if (cleaned.length <= 9) {
                                                setFormData({ ...formData, phone: cleaned });
                                            }
                                        }}
                                        placeholder="90 123 45 67"
                                        keyboardType="phone-pad"
                                        maxLength={9}
                                        placeholderTextColor="rgba(255,255,255,0.2)"
                                    />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Step 2: Player Position (Only for players) */}
                    {applicationType === 'player' && (
                        <View style={styles.card}>
                            <Text style={styles.cardLabel}>AMPLUA (ROL)</Text>
                        <View style={styles.positionCloud}>
                            {PLAYER_POSITIONS.map((pos) => (
                                <TouchableOpacity
                                    key={pos.id}
                                    style={[
                                        styles.positionCloudItem,
                                        formData.position === pos.id && styles.positionCloudItemActive
                                    ]}
                                    onPress={() => setFormData({...formData, position: pos.id})}
                                >
                                    <Text style={[
                                        styles.positionCloudText,
                                        formData.position === pos.id && styles.positionCloudTextActive
                                    ]}>{pos.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        </View>
                    )}

                    {/* Step 3: Selection Hierarchy */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>MUSOBAQA TANLASH</Text>
                        
                        {/* League */}
                        <Text style={styles.subLabel}>LIGA</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelect}>
                            {leagues.map(l => (
                                <TouchableOpacity 
                                    key={l._id} 
                                    style={[styles.selectBtn, formData.selectedLeague === l._id && styles.selectBtnActive]}
                                    onPress={() => handleLeagueSelect(l._id)}
                                >
                                    <Text style={[styles.selectBtnText, formData.selectedLeague === l._id && styles.selectBtnTextActive]}>{l.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Tournament */}
                        {formData.selectedLeague !== '' && (
                            <>
                                <Text style={styles.subLabel}>TURNIR</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelect}>
                                    {tournaments.map(t => (
                                        <TouchableOpacity 
                                            key={t._id} 
                                            style={[styles.selectBtn, formData.selectedTournament === t._id && styles.selectBtnActive]}
                                            onPress={() => handleTournamentSelect(t._id)}
                                        >
                                            <Text style={[styles.selectBtnText, formData.selectedTournament === t._id && styles.selectBtnTextActive]}>{t.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </>
                        )}

                        {/* Team (Only for players) */}
                        {applicationType === 'player' && formData.selectedTournament !== '' && (
                            <>
                                <Text style={styles.subLabel}>JAMOA</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelect}>
                                    {teams.map(tm => (
                                        <TouchableOpacity 
                                            key={tm._id} 
                                            style={[styles.selectBtn, formData.selectedTeam === tm._id && styles.selectBtnActive]}
                                            onPress={() => setFormData({...formData, selectedTeam: tm._id})}
                                        >
                                            <Text style={[styles.selectBtnText, formData.selectedTeam === tm._id && styles.selectBtnTextActive]}>{tm.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </>
                        )}

                        {loadingData && <ActivityIndicator color={Colors.primary} style={{ marginTop: 10 }} />}
                    </View>

                    <TouchableOpacity 
                        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.submitBtnText}>ARIZANI YUBORISH</Text>
                        )}
                    </TouchableOpacity>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>
            </VideoBackground>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: Platform.OS === 'ios' ? 0 : 30,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
        textAlign: 'center',
    },
    headerSubtitle: {
        color: Colors.textMuted,
        fontSize: 10,
        textAlign: 'center',
        opacity: 0.6,
    },
    scrollContent: {
        padding: 20,
    },
    typeSelectorWrapper: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 6,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    typeOption: {
        flex: 1,
        flexDirection: 'row',
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
    typeOptionActive: {
        backgroundColor: Colors.primary,
    },
    typeOptionText: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '800',
        marginLeft: 8,
    },
    typeOptionTextActive: {
        color: '#000',
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    cardLabel: {
        color: Colors.primary,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 20,
        opacity: 0.8,
    },
    photoUpload: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 24,
        overflow: 'hidden',
    },
    uploadedImage: {
        width: '100%',
        height: '100%',
    },
    photoPlaceholder: {
        alignItems: 'center',
    },
    photoText: {
        color: Colors.textMuted,
        fontSize: 8,
        fontWeight: '800',
        marginTop: 4,
    },
    inputStack: {
        // Gap is handled via margin for compatibility if needed, but modern RN supports gap
    },
    inputBox: {
        marginBottom: 16,
    },
    boxLabel: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '700',
        marginLeft: 4,
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        height: 52,
        paddingHorizontal: 16,
        color: Colors.text,
        fontSize: 15,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    phoneInputContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        height: 52,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
    },
    phonePrefix: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.05)',
    },
    phonePrefixText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '900',
    },
    phoneInput: {
        flex: 1,
        paddingHorizontal: 16,
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
    },
    positionCloud: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    positionCloudItem: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 10,
        margin: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    positionCloudItemActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    positionCloudText: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    positionCloudTextActive: {
        color: '#000',
    },
    subLabel: {
        color: Colors.textMuted,
        fontSize: 10,
        fontWeight: '800',
        marginBottom: 10,
        opacity: 0.5,
    },
    horizontalSelect: {
        marginBottom: 20,
    },
    selectBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.03)',
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    selectBtnActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    selectBtnText: {
        color: Colors.text,
        fontSize: 13,
        fontWeight: '600',
    },
    selectBtnTextActive: {
        color: '#000',
        fontWeight: '800',
    },
    submitBtn: {
        backgroundColor: Colors.primary,
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    submitBtnDisabled: {
        opacity: 0.5,
    },
    submitBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
});

export default JoinApplicationScreen;

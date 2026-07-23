import React, { useState, useEffect, useRef } from 'react';
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
    Modal,
    Animated,
    ActionSheetIOS,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import VideoBackground from '../components/VideoBackground';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';

const { width } = Dimensions.get('window');

type ApplicationType = 'player' | 'team';

const PLAYER_POSITIONS = [
    { id: 'Darvozabon', label: 'Darvozabon (GK)' },
    { id: 'Himoyachi', label: 'Himoyachi (DEF)' },
    { id: 'Yarim himoyachi', label: 'Yarim himoyachi (MID)' },
    { id: 'Hujumchi', label: 'Hujumchi (FWD)' },
];

const DETAILED_POSITIONS = [
    'GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 
    'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF'
];

const TEAM_ROLES = [
    { id: 'Owner', label: 'Rahbar' },
    { id: 'Manager', label: 'Manager' },
    { id: 'Coach', label: 'Murabbiy' },
    { id: 'Admin', label: 'Admin' },
    { id: 'Captain', label: 'Sardor' },
];

const LEAGUE_LOGOS: Record<string, any> = {
    'Super liga': require('../assets/images/super-liga.png'),
    'Pro liga': require('../assets/images/pro-liga.png'),
    '3-liga': require('../assets/images/3-liga.png'),
    '7x7 liga': require('../assets/images/7x7-liga.png'),
};

const LEAGUE_OPTIONS = [
    { id: 'Super liga', label: 'Super liga', subLabel: 'Bosh Futbol Musobaqasi' },
    { id: 'Pro liga', label: 'Pro liga', subLabel: 'Ikkinchi Darajali Divizion' },
    { id: '3-liga', label: '3-liga', subLabel: 'Havas Futbol Ligasi' },
    { id: '7x7 liga', label: '7x7 liga', subLabel: 'Kichik Maydon Musobaqasi' },
];

export default function JoinApplicationScreen({ route, navigation }: any) {
    const { user } = useAuthStore();
    const targetTeamId = route?.params?.teamId || user?.teamId || user?.team_id || (user?.role === 'manager' ? (user?.id || user?._id) : null);

    const [loading, setLoading] = useState(false);
    const [leagues, setLeagues] = useState<any[]>(LEAGUE_OPTIONS);
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [applicationType, setApplicationType] = useState<ApplicationType>(route?.params?.initialType || 'player');

    // Validation state
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<{ isChecked: boolean; isValid: boolean; message: string }>({
        isChecked: false,
        isValid: false,
        message: ''
    });

    const checkTimerRef = useRef<any>(null);

    // Main Form State
    const [formData, setFormData] = useState({
        phone: '',
        firstName: '',
        lastName: '',
        fatherName: '',
        birthDate: '',
        number: '',
        position: '',
        detailedPosition: '',
        passportSeries: '',
        passportNumber: '',
        comment: '',
        photo: null as string | null,
        teamName: '',
        teamLogo: null as string | null,
        staffName: '',
        staffRole: 'Captain',
        selectedLeague: 'Super liga',
        selectedTournament: '',
        selectedTeam: '',
    });

    // Team Squad Roster State
    const [squadPlayers, setSquadPlayers] = useState<any[]>([]);
    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const [modalPlayerData, setModalPlayerData] = useState({
        firstName: '',
        lastName: '',
        fatherName: '',
        birthDate: '',
        position: 'Yarim himoyachi',
        number: '',
        passportSeries: '',
        passportNumber: '',
        phone: '',
        photo: null as string | null
    });

    // Dropdown animation state
    const [isLeagueDropdownOpen, setIsLeagueDropdownOpen] = useState(false);
    const leagueAnimVal = useRef(new Animated.Value(0)).current;

    const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
    const teamAnimVal = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(leagueAnimVal, {
            toValue: isLeagueDropdownOpen ? 1 : 0,
            duration: 250,
            useNativeDriver: false,
        }).start();
    }, [isLeagueDropdownOpen]);

    useEffect(() => {
        Animated.timing(teamAnimVal, {
            toValue: isTeamDropdownOpen ? 1 : 0,
            duration: 250,
            useNativeDriver: false,
        }).start();
    }, [isTeamDropdownOpen]);

    useEffect(() => {
        if (route?.params?.initialType) {
            setApplicationType(route.params.initialType);
        }
        loadLeaguesData();
        handleLeagueSelect('Super liga');
        if (targetTeamId) {
            autoPreSelectTeam(targetTeamId);
        }
    }, [targetTeamId, route?.params?.initialType]);

    const getSelectedTeamObj = () => {
        return teams.find(t => (t.id || t._id) === formData.selectedTeam);
    };

    const autoPreSelectTeam = async (tId: string) => {
        try {
            setLoadingData(true);
            const teamData = await apiService.getTeamById(tId);
            if (teamData) {
                const leagueName = teamData.league_name || teamData.league || teamData.leagueName || 'Super liga';
                const teamList = await apiService.getTeams(1, 100, leagueName);
                setTeams(teamList || [teamData]);

                setFormData(prev => ({
                    ...prev,
                    selectedLeague: leagueName,
                    selectedTeam: teamData.id || teamData._id || tId,
                    teamName: teamData.name || '',
                }));
            }
        } catch (e) {
            console.warn('Auto pre-select team error:', e);
        } finally {
            setLoadingData(false);
        }
    };

    const handleTypeChange = (type: ApplicationType) => {
        setApplicationType(type);
        setValidationResult({ isChecked: false, isValid: false, message: '' });
    };

    const triggerValidation = (type: 'player' | 'team', firstNameVal: string, teamNameVal: string, phoneVal: string) => {
        if (checkTimerRef.current) clearTimeout(checkTimerRef.current);

        const cleanPhone = phoneVal.replace(/\D/g, '');

        if (type === 'team') {
            if (teamNameVal.trim().length < 2 || cleanPhone.length !== 9) {
                setValidationResult({ isChecked: false, isValid: false, message: '' });
                return;
            }
        } else {
            if (firstNameVal.trim().length < 2 || cleanPhone.length !== 9) {
                setValidationResult({ isChecked: false, isValid: false, message: '' });
                return;
            }
        }

        setIsValidating(true);
        checkTimerRef.current = setTimeout(async () => {
            const res = await apiService.checkTeamOrPhoneExists({
                teamName: teamNameVal,
                phone: phoneVal,
                type: type
            });
            setIsValidating(false);
            setValidationResult({
                isChecked: true,
                isValid: !res.exists,
                message: res.message
            });
        }, 500);
    };

    const loadLeaguesData = async () => {
        try {
            setLoadingData(true);
            const data = await apiService.getLeagues();
            if (data && data.length > 0) {
                setLeagues(data);
            }
        } catch (error) {
            console.warn('Leagues load error:', error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleLeagueSelect = async (leagueName: string) => {
        setFormData(prev => ({
            ...prev,
            selectedLeague: leagueName,
            selectedTournament: '',
            selectedTeam: ''
        }));
        setTeams([]);

        try {
            setLoadingData(true);
            const teamData = await apiService.getTeams(1, 100, leagueName);
            setTeams(teamData || []);
        } catch (error) {
            console.warn('Error loading league teams:', error);
        } finally {
            setLoadingData(false);
        }
    };

    const openGallery = async (onPick: (uri: string) => void) => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Xato', 'Galereyaga ruxsat berilmadi');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
            });
            if (!result.canceled && result.assets[0]?.uri) {
                onPick(result.assets[0].uri);
            }
        } catch (e) {
            console.warn('Gallery launch error:', e);
        }
    };

    const openCamera = async (onPick: (uri: string) => void) => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Xato', 'Kameraga ruxsat berilmadi');
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
            });
            if (!result.canceled && result.assets[0]?.uri) {
                onPick(result.assets[0].uri);
            }
        } catch (e) {
            console.warn('Camera launch error:', e);
        }
    };

    const pickImage = (onPick: (uri: string) => void) => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Медиатека (Galereya)', 'Сделать снимок (Kamera)', 'Bekor qilish'],
                    cancelButtonIndex: 2,
                    title: 'Rasm yuklash',
                },
                (buttonIndex) => {
                    if (buttonIndex === 0) {
                        openGallery(onPick);
                    } else if (buttonIndex === 1) {
                        openCamera(onPick);
                    }
                }
            );
        } else {
            Alert.alert(
                "Rasm yuklash",
                "Rasmni qaysi usulda yuklamoqchisiz?",
                [
                    { text: "🖼️ Galereya (Медиатека)", onPress: () => openGallery(onPick) },
                    { text: "📸 Kamera (Сделать снимок)", onPress: () => openCamera(onPick) },
                    { text: "Bekor qilish", style: "cancel" }
                ]
            );
        }
    };

    const handleAddSquadPlayer = () => {
        if (!modalPlayerData.firstName.trim() || !modalPlayerData.lastName.trim()) {
            Alert.alert('Xato', 'O\'yinchi ismi va familiyasini to\'ldiring');
            return;
        }

        setSquadPlayers(prev => [...prev, { ...modalPlayerData, id: Date.now().toString() }]);
        setModalPlayerData({
            firstName: '',
            lastName: '',
            fatherName: '',
            birthDate: '',
            position: 'Yarim himoyachi',
            number: '',
            passportSeries: '',
            passportNumber: '',
            phone: '',
            photo: null
        });
        setIsPlayerModalOpen(false);
    };

    const removeSquadPlayer = (id: string) => {
        setSquadPlayers(prev => prev.filter(p => p.id !== id));
    };

    const handleSubmit = async () => {
        // Validation matching web application
        if (!formData.phone || formData.phone.length < 9) {
            Alert.alert('Xato', 'Telefon raqamini to\'liq kiriting (masalan: 901234567)');
            return;
        }

        if (applicationType === 'player') {
            if (!formData.firstName.trim() || !formData.lastName.trim()) {
                Alert.alert('Xato', 'Iltimos, Ism va Familiyangizni to\'ldiring');
                return;
            }
        } else {
            if (!formData.teamName.trim()) {
                Alert.alert('Xato', 'Iltimos, Jamoa nomini kiriting');
                return;
            }
        }

        try {
            setLoading(true);

            // Upload photos if present
            let photoUrl = formData.photo;
            let teamLogoUrl = formData.teamLogo;

            if (applicationType === 'player' && formData.photo && !formData.photo.startsWith('http')) {
                const uploadRes = await apiService.uploadPhoto(formData.photo);
                if (uploadRes.url) photoUrl = uploadRes.url;
            } else if (applicationType === 'team' && formData.teamLogo && !formData.teamLogo.startsWith('http')) {
                const uploadRes = await apiService.uploadPhoto(formData.teamLogo);
                if (uploadRes.url) teamLogoUrl = uploadRes.url;
            }

            // Upload squad players photos if any
            const uploadedSquad = await Promise.all(
                squadPlayers.map(async (player) => {
                    let pPhoto = player.photo;
                    if (player.photo && !player.photo.startsWith('http')) {
                        const uRes = await apiService.uploadPhoto(player.photo);
                        if (uRes.url) pPhoto = uRes.url;
                    }
                    return { ...player, photo: pPhoto };
                })
            );

            // Format phone number with +998
            let formattedPhone = formData.phone.replace(/\D/g, '');
            if (formattedPhone.length === 9) {
                formattedPhone = `+998${formattedPhone}`;
            } else if (!formattedPhone.startsWith('+')) {
                formattedPhone = `+${formattedPhone}`;
            }

            if (applicationType === 'player') {
                const applicationPayload = {
                    first_name: formData.firstName.trim(),
                    last_name: formData.lastName.trim(),
                    father_name: formData.fatherName ? formData.fatherName.trim() : null,
                    passport_series: (formData.passportSeries || '').toUpperCase(),
                    passport_number: formData.passportNumber || '',
                    phone: formattedPhone,
                    photo_url: photoUrl || '',
                    birth_date: formData.birthDate || null,
                    position: formData.position || formData.detailedPosition || null,
                    player_number: formData.number || null,
                    comment: formData.comment || null,
                    team_id: formData.selectedTeam || targetTeamId || null,
                    status: 'pending'
                };

                const response = await apiService.createApplication(applicationPayload);

                if (response && response.success) {
                    Alert.alert(
                        'Zayavkangiz qabul qilindi!',
                        'Barcha ma\'lumotlar muvaffaqiyatli saqlandi. Admin ko\'rib chiqqach siz bilan bog\'lanadi.',
                        [{ text: 'TUSHUNDIM', onPress: () => navigation.goBack() }]
                    );
                } else {
                    throw new Error('Server error');
                }
            } else {
                // Team Mode
                const teamPayload = {
                    name: formData.teamName.trim(),
                    league: formData.selectedLeague || 'Super liga',
                    logo_url: teamLogoUrl || '',
                    captain_phone: formattedPhone,
                    status: 'pending'
                };

                const teamResponse = await apiService.createTeam(teamPayload);

                if (teamResponse && teamResponse.success) {
                    const newTeamId = teamResponse.data?.id;

                    // Insert squad players into applications table linked by team_id
                    if (uploadedSquad && uploadedSquad.length > 0) {
                        const squadApplications = uploadedSquad.map((p: any) => ({
                            team_id: newTeamId,
                            first_name: p.firstName?.trim() || '',
                            last_name: p.lastName?.trim() || '',
                            father_name: p.fatherName?.trim() || null,
                            passport_series: (p.passportSeries || '').toUpperCase(),
                            passport_number: p.passportNumber || '',
                            phone: p.phone ? (p.phone.startsWith('+') ? p.phone : `+998${p.phone.replace(/\D/g, '')}`) : formattedPhone,
                            photo_url: p.photo || '',
                            birth_date: p.birthDate || null,
                            position: p.position || null,
                            player_number: p.number || null,
                            status: 'pending'
                        }));

                        await Promise.all(squadApplications.map((app: any) => apiService.createApplication(app)));
                    }

                    Alert.alert(
                        'Jamoa zayavkasi qabul qilindi!',
                        'Jamoangiz muvaffaqiyatli ro\'yxatga olindi. Admin ko\'rib chiqqach tasdiqlaydi.',
                        [{ text: 'TUSHUNDIM', onPress: () => navigation.goBack() }]
                    );
                } else {
                    throw new Error('Team creation failed');
                }
            }
        } catch (error: any) {
            console.error('Submit application error:', error);
            Alert.alert('Xato', 'Zayavka yuborishda xatolik yuz berdi. Ma\'lumotlarni tekshirib qayta urinib ko\'ring.');
        } finally {
            setLoading(false);
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={26} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.headerTitle}>ZAYAVKA TOPSHIRISH</Text>
                <Text style={styles.headerSubtitle}>HAVAS FUTBOL LIGASI</Text>
            </View>
            <View style={{ width: 40 }} />
        </View>
    );

    const renderTypeSelector = () => (
        <View style={styles.typeSelectorWrapper}>
            <TouchableOpacity
                style={[styles.typeOption, applicationType === 'player' && styles.typeOptionActive]}
                onPress={() => handleTypeChange('player')}
            >
                <Ionicons name="person" size={18} color={applicationType === 'player' ? '#000' : Colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={[styles.typeOptionText, applicationType === 'player' && styles.typeOptionTextActive]}>YAKKAXON O'YINCHI</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.typeOption, applicationType === 'team' && styles.typeOptionActive]}
                onPress={() => handleTypeChange('team')}
            >
                <Ionicons name="people" size={18} color={applicationType === 'team' ? '#000' : Colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={[styles.typeOptionText, applicationType === 'team' && styles.typeOptionTextActive]}>JAMOA</Text>
            </TouchableOpacity>
        </View>
    );

    const renderValidationBadge = () => {
        if (isValidating) {
            return (
                <View style={styles.validatingBox}>
                    <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.validatingText}>Ma'lumotlaringiz tekshirilmoqda...</Text>
                </View>
            );
        }

        if (validationResult.isChecked) {
            if (!validationResult.isValid) {
                return (
                    <View style={styles.validationErrorBox}>
                        <Ionicons name="alert-circle" size={20} color="#FF3B30" style={{ marginRight: 8 }} />
                        <Text style={styles.validationErrorText}>{validationResult.message}</Text>
                    </View>
                );
            } else {
                return (
                    <View style={styles.validationSuccessBox}>
                        <Ionicons name="checkmark-circle" size={20} color="#00FF66" style={{ marginRight: 8 }} />
                        <Text style={styles.validationSuccessText}>{validationResult.message}</Text>
                    </View>
                );
            }
        }

        return null;
    };

    return (
        <View style={styles.container}>
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                overlayOpacity={0.88}
            >
                <SafeAreaView style={{ flex: 1 }}>
                    {renderHeader()}

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {!route?.params?.initialType && renderTypeSelector()}

                        {/* SECTION 1: TURNIR TANLASH (EXPANDABLE SELECT) */}
                        {!targetTeamId && (
                            <>
                                <View style={styles.card}>
                                    <View style={styles.cardTitleRow}>
                                        <Ionicons name="trophy" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                                        <Text style={styles.cardTitle}>TURNIR (LIGA) TANLASH</Text>
                                    </View>
                                    
                                    {/* Selected Trigger Button */}
                                    <TouchableOpacity
                                        style={styles.leagueSelectTrigger}
                                        onPress={() => setIsLeagueDropdownOpen(prev => !prev)}
                                        activeOpacity={0.8}
                                    >
                                        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                                        <View style={styles.leagueTriggerLeft}>
                                            <View style={styles.triggerLogoWrapper}>
                                                {LEAGUE_LOGOS[formData.selectedLeague] ? (
                                                    <Image
                                                        source={LEAGUE_LOGOS[formData.selectedLeague]}
                                                        style={styles.triggerLeagueLogo}
                                                        contentFit="contain"
                                                    />
                                                ) : (
                                                    <Ionicons name="trophy" size={24} color={Colors.primary} />
                                                )}
                                            </View>
                                            <View style={{ marginLeft: 12, flex: 1 }}>
                                                <Text style={styles.triggerLeagueTitle} numberOfLines={1}>
                                                    {(formData.selectedLeague || 'LIGA TANLANG').toUpperCase()}
                                                </Text>
                                                <Text style={styles.triggerLeagueSubTitle} numberOfLines={1}>
                                                    {LEAGUE_OPTIONS.find(l => l.id === formData.selectedLeague)?.subLabel || 'Musobaqa ligasini tanlang'}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.triggerRightBadge}>
                                            <Ionicons
                                                name={isLeagueDropdownOpen ? "chevron-up" : "chevron-down"}
                                                size={20}
                                                color="#00FF66"
                                            />
                                        </View>
                                    </TouchableOpacity>

                                    {/* Animated Expandable Dropdown List */}
                                    <Animated.View style={[
                                        styles.leagueDropdownContainer,
                                        {
                                            maxHeight: leagueAnimVal.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0, 360]
                                            }),
                                            opacity: leagueAnimVal,
                                            overflow: 'hidden',
                                            marginTop: leagueAnimVal.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0, 8]
                                            })
                                        }
                                    ]}>
                                        {LEAGUE_OPTIONS.map((league) => {
                                            const isSelected = formData.selectedLeague === league.id;
                                            return (
                                                <TouchableOpacity
                                                    key={league.id}
                                                    style={[styles.leagueOptionItem, isSelected && styles.leagueOptionItemActive]}
                                                    onPress={() => {
                                                        handleLeagueSelect(league.id);
                                                        setIsLeagueDropdownOpen(false);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <BlurView intensity={isSelected ? 30 : 15} tint="dark" style={StyleSheet.absoluteFill} />
                                                    <View style={styles.leagueOptionLeft}>
                                                        <View style={styles.optionLogoWrapper}>
                                                            {LEAGUE_LOGOS[league.id] ? (
                                                                <Image
                                                                    source={LEAGUE_LOGOS[league.id]}
                                                                    style={styles.optionLeagueLogo}
                                                                    contentFit="contain"
                                                                />
                                                            ) : (
                                                                <Ionicons name="shield" size={20} color={Colors.primary} />
                                                            )}
                                                        </View>
                                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                                            <Text style={[styles.optionLeagueTitle, isSelected && styles.optionLeagueTitleActive]}>
                                                                {league.label.toUpperCase()}
                                                            </Text>
                                                            <Text style={styles.optionLeagueSubTitle}>
                                                                {league.subLabel}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    {isSelected && (
                                                        <View style={styles.optionCheckBadge}>
                                                            <Ionicons name="checkmark-circle" size={20} color="#00FF66" />
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </Animated.View>
                                </View>

                                {/* TEAM SELECTION (FILTERED BY SELECTED LEAGUE - ONLY FOR PLAYER APPLICATION) */}
                                {applicationType === 'player' && (
                                    <View style={styles.card}>
                                        <View style={styles.cardTitleRow}>
                                            <Ionicons name="shield" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                                            <Text style={styles.cardTitle}>JAMOA TANLASH (IXTIYORIY)</Text>
                                        </View>
                                        
                                        {/* Selected Team Trigger */}
                                        <TouchableOpacity
                                            style={styles.leagueSelectTrigger}
                                            onPress={() => setIsTeamDropdownOpen(prev => !prev)}
                                            activeOpacity={0.8}
                                        >
                                            <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                                            <View style={styles.leagueTriggerLeft}>
                                                <View style={styles.triggerLogoWrapper}>
                                                    {getSelectedTeamObj()?.logo_url || getSelectedTeamObj()?.logo ? (
                                                        <Image
                                                            source={{ uri: getSelectedTeamObj()?.logo_url || getSelectedTeamObj()?.logo }}
                                                            style={styles.triggerLeagueLogo}
                                                            contentFit="contain"
                                                        />
                                                    ) : (
                                                        <Ionicons name="shield-outline" size={24} color={Colors.primary} />
                                                    )}
                                                </View>
                                                <View style={{ marginLeft: 12, flex: 1 }}>
                                                    <Text style={styles.triggerLeagueTitle} numberOfLines={1}>
                                                        {(getSelectedTeamObj()?.name || 'JAMOANI TANLANG').toUpperCase()}
                                                    </Text>
                                                    <Text style={styles.triggerLeagueSubTitle} numberOfLines={1}>
                                                        {getSelectedTeamObj() ? `${formData.selectedLeague} jamoasi` : 'O\'tmoqchi bo\'lgan jamoangizni tanlang'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.triggerRightBadge}>
                                                <Ionicons
                                                    name={isTeamDropdownOpen ? "chevron-up" : "chevron-down"}
                                                    size={20}
                                                    color="#00FF66"
                                                />
                                            </View>
                                        </TouchableOpacity>

                                        {/* Animated Expandable Teams List */}
                                        <Animated.View style={[
                                            styles.leagueDropdownContainer,
                                            {
                                                maxHeight: teamAnimVal.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0, 360]
                                                }),
                                                opacity: teamAnimVal,
                                                overflow: 'hidden',
                                                marginTop: teamAnimVal.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0, 8]
                                                })
                                            }
                                        ]}>
                                            <ScrollView nestedScrollEnabled style={{ maxHeight: 300 }}>
                                                {loadingData ? (
                                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                                        <ActivityIndicator color={Colors.primary} />
                                                        <Text style={{ color: '#888', marginTop: 8, fontSize: 12 }}>Jamoalar yuklanmoqda...</Text>
                                                    </View>
                                                ) : teams.length === 0 ? (
                                                    <View style={{ padding: 16, alignItems: 'center' }}>
                                                        <Text style={{ color: '#888', fontSize: 13 }}>Ushbu ligada jamoalar topilmadi</Text>
                                                    </View>
                                                ) : (
                                                    teams.map((team) => {
                                                        const teamId = team.id || team._id;
                                                        const isSelected = formData.selectedTeam === teamId;
                                                        return (
                                                            <TouchableOpacity
                                                                key={teamId}
                                                                style={[styles.leagueOptionItem, isSelected && styles.leagueOptionItemActive]}
                                                                onPress={() => {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        selectedTeam: teamId,
                                                                        teamName: team.name || ''
                                                                    }));
                                                                    setIsTeamDropdownOpen(false);
                                                                }}
                                                                activeOpacity={0.7}
                                                            >
                                                                <BlurView intensity={isSelected ? 30 : 15} tint="dark" style={StyleSheet.absoluteFill} />
                                                                <View style={styles.leagueOptionLeft}>
                                                                    <View style={styles.optionLogoWrapper}>
                                                                        {team.logo_url || team.logo ? (
                                                                            <Image
                                                                                source={{ uri: team.logo_url || team.logo }}
                                                                                style={styles.optionLeagueLogo}
                                                                                contentFit="contain"
                                                                            />
                                                                        ) : (
                                                                            <Ionicons name="shield-outline" size={20} color={Colors.primary} />
                                                                        )}
                                                                    </View>
                                                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                                                        <Text style={[styles.optionLeagueTitle, isSelected && styles.optionLeagueTitleActive]}>
                                                                            {(team.name || 'Jamoa').toUpperCase()}
                                                                        </Text>
                                                                        <Text style={styles.optionLeagueSubTitle}>
                                                                            {team.league || formData.selectedLeague}
                                                                        </Text>
                                                                    </View>
                                                                </View>

                                                                {isSelected && (
                                                                    <View style={styles.optionCheckBadge}>
                                                                        <Ionicons name="checkmark-circle" size={20} color="#00FF66" />
                                                                    </View>
                                                                )}
                                                            </TouchableOpacity>
                                                        );
                                                    })
                                                )}
                                            </ScrollView>
                                        </Animated.View>
                                    </View>
                                )}
                            </>
                        )}

                        {/* MODE 1: YAKKAXON OYINCHI FORM */}
                        {applicationType === 'player' ? (
                            <>
                                {/* INITIAL CHECK: FIRST NAME & PHONE NUMBER ONLY */}
                                <View style={styles.card}>
                                    <View style={styles.cardTitleRow}>
                                        <Ionicons name="person" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                                        <Text style={styles.cardTitle}>DASTLABKI TEKSHIRUV</Text>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>ISM *</Text>
                                        <TextInput
                                            style={styles.inputField}
                                            value={formData.firstName}
                                            onChangeText={(t) => {
                                                setFormData({ ...formData, firstName: t });
                                                triggerValidation('player', t, formData.teamName, formData.phone);
                                            }}
                                            placeholder="Masalan: Alisher"
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>TELEFON RAQAM *</Text>
                                        <View style={styles.phoneRow}>
                                            <View style={styles.phonePrefixBox}>
                                                <Text style={styles.phonePrefixText}>+998</Text>
                                            </View>
                                            <TextInput
                                                style={styles.phoneInputField}
                                                value={formData.phone}
                                                onChangeText={(t) => {
                                                    const cleaned = t.replace(/\D/g, '');
                                                    if (cleaned.length <= 9) {
                                                        const newPhone = cleaned;
                                                        setFormData({ ...formData, phone: newPhone });
                                                        triggerValidation('player', formData.firstName, formData.teamName, newPhone);
                                                    }
                                                }}
                                                placeholder="90 123 45 67"
                                                keyboardType="phone-pad"
                                                maxLength={9}
                                                placeholderTextColor="rgba(255,255,255,0.3)"
                                            />
                                        </View>
                                    </View>

                                    {renderValidationBadge()}
                                </View>

                                {/* CONDITIONAL FIELDS (REVEALED ONLY IF VALIDATION PASSED) */}
                                {validationResult.isChecked && validationResult.isValid && (
                                    <>
                                        {/* SURNAME & FATHER NAME */}
                                        <View style={styles.card}>
                                            <View style={styles.cardTitleRow}>
                                                <Ionicons name="person-add" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                                                <Text style={styles.cardTitle}>QO’SHIMCHA MA’LUMOTLAR</Text>
                                            </View>

                                            <View style={styles.inputGroup}>
                                                <Text style={styles.inputLabel}>FAMILIYA *</Text>
                                                <TextInput
                                                    style={styles.inputField}
                                                    value={formData.lastName}
                                                    onChangeText={(t) => setFormData({ ...formData, lastName: t })}
                                                    placeholder="Masalan: Karimov"
                                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                                />
                                            </View>

                                            <View style={styles.inputGroup}>
                                                <Text style={styles.inputLabel}>OTASINING ISMI (IXTIYORIY)</Text>
                                                <TextInput
                                                    style={styles.inputField}
                                                    value={formData.fatherName}
                                                    onChangeText={(t) => setFormData({ ...formData, fatherName: t })}
                                                    placeholder="Masalan: Bahodirovich"
                                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                                />
                                            </View>
                                        </View>
                                        {/* PHOTO UPLOAD */}
                                        <View style={styles.card}>
                                            <View style={styles.cardTitleRow}>
                                                <Ionicons name="camera" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                                                <Text style={styles.cardTitle}>1x1 RASM YUKLASH</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.photoUploadBox}
                                                onPress={() => pickImage((uri) => setFormData({ ...formData, photo: uri }))}
                                            >
                                                {formData.photo ? (
                                                    <Image source={{ uri: formData.photo }} style={styles.uploadedPhoto} />
                                                ) : (
                                                    <View style={styles.photoPlaceholderInner}>
                                                        <Ionicons name="camera" size={36} color={Colors.primary} />
                                                        <Text style={styles.photoUploadText}>RASMNI TANLANG</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>

                                            <View style={styles.inputGroup}>
                                                <Text style={styles.inputLabel}>TUG'ILGAN SANA (IXTIYORIY)</Text>
                                                <TextInput
                                                    style={styles.inputField}
                                                    value={formData.birthDate}
                                                    onChangeText={(t) => setFormData({ ...formData, birthDate: t })}
                                                    placeholder="01.04.1990"
                                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                                />
                                            </View>
                                        </View>

                                        {/* POSITION & NUMBER */}
                                        <View style={styles.card}>
                                            <View style={styles.cardTitleRow}>
                                                <Ionicons name="football" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                                                <Text style={styles.cardTitle}>AMPLUA VA O'YINCHI RAQAMI</Text>
                                            </View>

                                            <Text style={styles.subTitle}>AMPLUA (IXTIYORIY)</Text>
                                            <View style={styles.posGrid}>
                                                {PLAYER_POSITIONS.map((pos) => {
                                                    const isSelected = formData.position === pos.id;
                                                    return (
                                                        <TouchableOpacity
                                                            key={pos.id}
                                                            style={[styles.posBtn, isSelected && styles.posBtnActive]}
                                                            onPress={() => setFormData({ ...formData, position: pos.id })}
                                                        >
                                                            <Text style={[styles.posBtnText, isSelected && styles.posBtnTextActive]}>
                                                                {pos.label}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>

                                            <Text style={[styles.subTitle, { marginTop: 14 }]}>ANIQ POZITSIYA (IXTIYORIY)</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                                {DETAILED_POSITIONS.map((p) => {
                                                    const isSelected = formData.detailedPosition === p;
                                                    return (
                                                        <TouchableOpacity
                                                            key={p}
                                                            style={[styles.detailPosPill, isSelected && styles.detailPosPillActive]}
                                                            onPress={() => setFormData({ ...formData, detailedPosition: p })}
                                                        >
                                                            <Text style={[styles.detailPosPillText, isSelected && styles.detailPosPillTextActive]}>{p}</Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </ScrollView>

                                            <View style={styles.inputGroup}>
                                                <Text style={styles.inputLabel}>O'YINCHI RAQAMI (IXTIYORIY)</Text>
                                                <TextInput
                                                    style={styles.inputField}
                                                    value={formData.number}
                                                    onChangeText={(t) => setFormData({ ...formData, number: t })}
                                                    placeholder="Masalan: 10"
                                                    keyboardType="number-pad"
                                                    maxLength={2}
                                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                                />
                                            </View>
                                        </View>

                                        {/* PASSPORT & COMMENT */}
                                        <View style={styles.card}>
                                            <View style={styles.cardTitleRow}>
                                                <Ionicons name="card" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                                                <Text style={styles.cardTitle}>PASPORT VA IZOH</Text>
                                            </View>

                                            <View style={styles.inputGroup}>
                                                <Text style={styles.inputLabel}>PASPORT SERIYA VA RAQAMI (IXTIYORIY)</Text>
                                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                                    <TextInput
                                                        style={[styles.inputField, { width: 70, textTransform: 'uppercase' }]}
                                                        value={formData.passportSeries}
                                                        onChangeText={(t) => setFormData({ ...formData, passportSeries: t.toUpperCase() })}
                                                        placeholder="AA"
                                                        maxLength={2}
                                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                                    />
                                                    <TextInput
                                                        style={[styles.inputField, { flex: 1 }]}
                                                        value={formData.passportNumber}
                                                        onChangeText={(t) => setFormData({ ...formData, passportNumber: t })}
                                                        placeholder="1234567"
                                                        keyboardType="number-pad"
                                                        maxLength={7}
                                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                                    />
                                                </View>
                                            </View>

                                            {/* TEAM SELECT OR ENTER */}
                                            {!targetTeamId && teams.length > 0 && (
                                                <View style={styles.inputGroup}>
                                                    <Text style={styles.inputLabel}>JAMOA TANLASH (IXTIYORIY)</Text>
                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                        {teams.map((tm) => {
                                                            const isSelected = formData.selectedTeam === tm._id || formData.selectedTeam === tm.id;
                                                            return (
                                                                <TouchableOpacity
                                                                    key={tm._id || tm.id}
                                                                    style={[styles.detailPosPill, isSelected && styles.detailPosPillActive]}
                                                                    onPress={() => setFormData({ ...formData, selectedTeam: tm._id || tm.id })}
                                                                >
                                                                    <Text style={[styles.detailPosPillText, isSelected && styles.detailPosPillTextActive]}>{tm.name}</Text>
                                                                </TouchableOpacity>
                                                            );
                                                        })}
                                                    </ScrollView>
                                                </View>
                                            )}

                                            <View style={styles.inputGroup}>
                                                <Text style={styles.inputLabel}>IZOH / TAJRIBA (IXTIYORIY)</Text>
                                                <TextInput
                                                    style={[styles.inputField, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                                                    value={formData.comment}
                                                    onChangeText={(t) => setFormData({ ...formData, comment: t })}
                                                    placeholder="Avval qaysi komandada o'ynaganingiz yoki niyatlaringiz haqida yozing..."
                                                    multiline
                                                    numberOfLines={3}
                                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                                />
                                            </View>
                                        </View>

                                        {/* SUBMIT BUTTON */}
                                        <TouchableOpacity
                                            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                                            onPress={handleSubmit}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="#000" />
                                            ) : (
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Ionicons name="checkmark-circle" size={22} color="#000" style={{ marginRight: 8 }} />
                                                    <Text style={styles.submitBtnText}>ZAYAVKANI YUBORISH</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </>
                                )}
                            </>
                        ) : (
                            /* MODE 2: JAMOA REGISTRATION FORM */
                            <>
                                {/* TEAM INITIAL DETAILS & CHECK */}
                                <View style={styles.card}>
                                    <View style={styles.cardTitleRow}>
                                        <Ionicons name="shield-checkmark" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                                        <Text style={styles.cardTitle}>JAMOA TEKSHIRUVI</Text>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>JAMOA NOMI *</Text>
                                        <TextInput
                                            style={styles.inputField}
                                            value={formData.teamName}
                                            onChangeText={(t) => {
                                                setFormData({ ...formData, teamName: t });
                                                triggerValidation('team', t, formData.phone);
                                            }}
                                            placeholder="Masalan: Paxtakor FC"
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>SARDOR (KAPITAN) TELEFONI *</Text>
                                        <View style={styles.phoneRow}>
                                            <View style={styles.phonePrefixBox}>
                                                <Text style={styles.phonePrefixText}>+998</Text>
                                            </View>
                                            <TextInput
                                                style={styles.phoneInputField}
                                                value={formData.phone}
                                                onChangeText={(t) => {
                                                    const cleaned = t.replace(/\D/g, '');
                                                    if (cleaned.length <= 9) {
                                                        const newPhone = cleaned;
                                                        setFormData({ ...formData, phone: newPhone });
                                                        triggerValidation('team', formData.teamName, newPhone);
                                                    }
                                                }}
                                                placeholder="90 123 45 67"
                                                keyboardType="phone-pad"
                                                maxLength={9}
                                                placeholderTextColor="rgba(255,255,255,0.3)"
                                            />
                                        </View>
                                    </View>

                                    {renderValidationBadge()}
                                </View>

                                {/* CONDITIONAL TEAM FIELDS (REVEALED ONLY IF VALIDATION PASSED) */}
                                {validationResult.isChecked && validationResult.isValid && (
                                    <>
                                        <View style={styles.card}>
                                            <View style={styles.cardTitleRow}>
                                                <Ionicons name="image" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                                                <Text style={styles.cardTitle}>JAMOA LOGOTIPI VA MAS'UL SHAXS</Text>
                                            </View>
                                            
                                            <Text style={styles.inputLabel}>JAMOA LOGOTIPI (1x1 FORMAT)</Text>
                                            <TouchableOpacity
                                                style={styles.photoUploadBox}
                                                onPress={() => pickImage((uri) => setFormData({ ...formData, teamLogo: uri }))}
                                            >
                                                {formData.teamLogo ? (
                                                    <Image source={{ uri: formData.teamLogo }} style={styles.uploadedPhoto} />
                                                ) : (
                                                    <View style={styles.photoPlaceholderInner}>
                                                        <Ionicons name="shield" size={36} color={Colors.primary} />
                                                        <Text style={styles.photoUploadText}>LOGOTIP YUKLASH</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>

                                            <View style={[styles.inputGroup, { marginTop: 14 }]}>
                                                <Text style={styles.inputLabel}>MAS'UL SHAXS (KAPITAN/MANAGER) ISMI *</Text>
                                                <TextInput
                                                    style={styles.inputField}
                                                    value={formData.staffName}
                                                    onChangeText={(t) => setFormData({ ...formData, staffName: t })}
                                                    placeholder="Ism sharifingizni kiriting"
                                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                                />
                                            </View>

                                            <Text style={styles.subTitle}>ROLINGIZ</Text>
                                            <View style={styles.posGrid}>
                                                {TEAM_ROLES.map((r) => {
                                                    const isSelected = formData.staffRole === r.id;
                                                    return (
                                                        <TouchableOpacity
                                                            key={r.id}
                                                            style={[styles.posBtn, isSelected && styles.posBtnActive]}
                                                            onPress={() => setFormData({ ...formData, staffRole: r.id })}
                                                        >
                                                            <Text style={[styles.posBtnText, isSelected && styles.posBtnTextActive]}>
                                                                {r.label}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        </View>

                                        {/* SQUAD PLAYERS LIST SECTION */}
                                        <View style={styles.card}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                <View style={styles.cardTitleRow}>
                                                    <Ionicons name="people" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                                                    <Text style={styles.cardTitle}>O'YINCHILAR RO'YXATI</Text>
                                                </View>
                                                <View style={styles.countBadge}>
                                                    <Text style={styles.countBadgeText}>{squadPlayers.length} TA</Text>
                                                </View>
                                            </View>

                                            {/* Added Squad Player Cards */}
                                            {squadPlayers.map((player) => (
                                                <View key={player.id} style={styles.squadPlayerCard}>
                                                    <View style={styles.squadAvatar}>
                                                        {player.photo ? (
                                                            <Image source={{ uri: player.photo }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                                                        ) : (
                                                            <Ionicons name="person" size={24} color={Colors.primary} />
                                                        )}
                                                    </View>
                                                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                                                        <Text style={styles.squadPlayerName} numberOfLines={1}>
                                                            {player.firstName} {player.lastName} {player.fatherName}
                                                        </Text>
                                                        <Text style={styles.squadPlayerMeta}>
                                                            {player.position} {player.number ? `• #${player.number}` : ''}
                                                        </Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        style={styles.removeSquadBtn}
                                                        onPress={() => removeSquadPlayer(player.id)}
                                                    >
                                                        <Ionicons name="close" size={18} color="#FF3B30" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}

                                            <TouchableOpacity
                                                style={styles.addSquadBtn}
                                                onPress={() => setIsPlayerModalOpen(true)}
                                            >
                                                <Ionicons name="person-add" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                                                <Text style={styles.addSquadBtnText}>YANGI O'YINCHI QO'SHISH</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* SUBMIT BUTTON */}
                                        <TouchableOpacity
                                            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                                            onPress={handleSubmit}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="#000" />
                                            ) : (
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Ionicons name="checkmark-circle" size={22} color="#000" style={{ marginRight: 8 }} />
                                                    <Text style={styles.submitBtnText}>ZAYAVKANI YUBORISH</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </>
                                )}
                            </>
                        )}

                        <View style={{ height: 60 }} />
                    </ScrollView>
                </SafeAreaView>
            </VideoBackground>

            {/* ADD SQUAD PLAYER MODAL */}
            <Modal
                visible={isPlayerModalOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsPlayerModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={{ padding: 20 }}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>O'YINCHI QO'SHISH</Text>
                                <TouchableOpacity onPress={() => setIsPlayerModalOpen(false)}>
                                    <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.6)" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
                                {/* Player Photo */}
                                <TouchableOpacity
                                    style={styles.photoUploadBoxSmall}
                                    onPress={() => pickImage((uri) => setModalPlayerData({ ...modalPlayerData, photo: uri }))}
                                >
                                    {modalPlayerData.photo ? (
                                        <Image source={{ uri: modalPlayerData.photo }} style={{ width: 70, height: 70, borderRadius: 35 }} />
                                    ) : (
                                        <View style={{ alignItems: 'center' }}>
                                            <Ionicons name="camera" size={24} color={Colors.primary} />
                                            <Text style={{ color: Colors.primary, fontSize: 10, fontWeight: '700', marginTop: 2 }}>RASM</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>ISM *</Text>
                                    <TextInput
                                        style={styles.inputField}
                                        value={modalPlayerData.firstName}
                                        onChangeText={(t) => setModalPlayerData({ ...modalPlayerData, firstName: t })}
                                        placeholder="Masalan: Alisher"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>FAMILIYA *</Text>
                                    <TextInput
                                        style={styles.inputField}
                                        value={modalPlayerData.lastName}
                                        onChangeText={(t) => setModalPlayerData({ ...modalPlayerData, lastName: t })}
                                        placeholder="Masalan: Karimov"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>OTASINING ISMI (IXTIYORIY)</Text>
                                    <TextInput
                                        style={styles.inputField}
                                        value={modalPlayerData.fatherName}
                                        onChangeText={(t) => setModalPlayerData({ ...modalPlayerData, fatherName: t })}
                                        placeholder="Masalan: Bahodirovich"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>TUG'ILGAN SANA</Text>
                                    <TextInput
                                        style={styles.inputField}
                                        value={modalPlayerData.birthDate}
                                        onChangeText={(t) => setModalPlayerData({ ...modalPlayerData, birthDate: t })}
                                        placeholder="01.04.1990"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                    />
                                </View>

                                <Text style={styles.subTitle}>AMPLUA</Text>
                                <View style={styles.posGrid}>
                                    {PLAYER_POSITIONS.map((pos) => (
                                        <TouchableOpacity
                                            key={pos.id}
                                            style={[styles.posBtn, modalPlayerData.position === pos.id && styles.posBtnActive]}
                                            onPress={() => setModalPlayerData({ ...modalPlayerData, position: pos.id })}
                                        >
                                            <Text style={[styles.posBtnText, modalPlayerData.position === pos.id && styles.posBtnTextActive]}>
                                                {pos.id}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>O'YINCHI RAQAMI (IXTIYORIY)</Text>
                                    <TextInput
                                        style={styles.inputField}
                                        value={modalPlayerData.number}
                                        onChangeText={(t) => setModalPlayerData({ ...modalPlayerData, number: t })}
                                        placeholder="20"
                                        keyboardType="number-pad"
                                        maxLength={2}
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>TELEFON RAQAMI (IXTIYORIY)</Text>
                                    <View style={styles.phoneRow}>
                                        <View style={styles.phonePrefixBox}>
                                            <Text style={styles.phonePrefixText}>+998</Text>
                                        </View>
                                        <TextInput
                                            style={styles.phoneInputField}
                                            value={modalPlayerData.phone}
                                            onChangeText={(t) => {
                                                const cleaned = t.replace(/\D/g, '');
                                                if (cleaned.length <= 9) {
                                                    setModalPlayerData({ ...modalPlayerData, phone: cleaned });
                                                }
                                            }}
                                            placeholder="90 123 45 67"
                                            keyboardType="phone-pad"
                                            maxLength={9}
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                        />
                                    </View>
                                </View>
                            </ScrollView>

                            <TouchableOpacity
                                style={styles.saveModalBtn}
                                onPress={handleAddSquadPlayer}
                            >
                                <Text style={styles.saveModalBtnText}>QO'SHISH</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: Platform.OS === 'ios' ? 0 : 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
    headerSubtitle: { color: Colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    scrollContent: { padding: 16 },
    typeSelectorWrapper: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: 4,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    typeOption: {
        flex: 1,
        flexDirection: 'row',
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
    typeOptionActive: { backgroundColor: Colors.primary },
    typeOptionText: { color: Colors.textMuted, fontSize: 12, fontWeight: '900' },
    typeOptionTextActive: { color: '#000' },

    card: {
        backgroundColor: 'rgba(20, 25, 40, 0.7)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
    subTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', marginBottom: 8 },

    leagueSelectTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1.5,
        borderColor: 'rgba(0, 255, 102, 0.35)',
        overflow: 'hidden',
    },
    leagueTriggerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    triggerLogoWrapper: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        padding: 2,
    },
    triggerLeagueLogo: {
        width: '100%',
        height: '100%',
    },
    triggerLeagueTitle: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    triggerLeagueSubTitle: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 1,
    },
    triggerRightBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.25)',
    },

    leagueDropdownContainer: {
        borderRadius: 16,
        backgroundColor: 'rgba(10, 15, 30, 0.95)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    leagueOptionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
    },
    leagueOptionItemActive: {
        backgroundColor: 'rgba(0, 255, 102, 0.12)',
    },
    leagueOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    optionLogoWrapper: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
    },
    optionLeagueLogo: {
        width: '100%',
        height: '100%',
    },
    optionLeagueTitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontWeight: '800',
    },
    optionLeagueTitleActive: {
        color: Colors.primary,
    },
    optionLeagueSubTitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontWeight: '500',
        marginTop: 1,
    },
    optionCheckBadge: {
        marginLeft: 8,
    },

    photoUploadBox: {
        height: 110,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(0, 255, 102, 0.3)',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 102, 0.04)',
        overflow: 'hidden',
        marginBottom: 12,
    },
    uploadedPhoto: { width: '100%', height: '100%', borderRadius: 16 },
    photoPlaceholderInner: { alignItems: 'center' },
    photoUploadText: { color: Colors.primary, fontSize: 11, fontWeight: '900', marginTop: 4 },

    inputGroup: { marginBottom: 12 },
    inputLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800', marginBottom: 6 },
    inputField: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 46,
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },

    phoneRow: { flexDirection: 'row', gap: 8 },
    phonePrefixBox: {
        width: 64,
        height: 46,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.25)',
    },
    phonePrefixText: { color: Colors.primary, fontWeight: '900', fontSize: 14 },
    phoneInputField: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 46,
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },

    validatingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 12,
        borderRadius: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    validatingText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        fontWeight: '600',
    },
    validationErrorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 59, 48, 0.12)',
        padding: 12,
        borderRadius: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.3)',
    },
    validationErrorText: {
        color: '#FF3B30',
        fontSize: 12,
        fontWeight: '800',
        flex: 1,
    },
    validationSuccessBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 102, 0.12)',
        padding: 12,
        borderRadius: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.3)',
    },
    validationSuccessText: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: '800',
        flex: 1,
    },

    posGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    posBtn: {
        flex: 1,
        minWidth: '45%',
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    posBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    posBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '800' },
    posBtnTextActive: { color: '#000' },

    detailPosPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.06)',
        marginRight: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    detailPosPillActive: { backgroundColor: 'rgba(0, 255, 102, 0.2)', borderColor: Colors.primary },
    detailPosPillText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' },
    detailPosPillTextActive: { color: Colors.primary },

    countBadge: { backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10 },
    countBadgeText: { color: '#000', fontWeight: '900', fontSize: 11 },

    squadPlayerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        padding: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    squadAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    squadPlayerName: { color: '#FFF', fontSize: 14, fontWeight: '800' },
    squadPlayerMeta: { color: Colors.primary, fontSize: 12, fontWeight: '700', marginTop: 2 },
    removeSquadBtn: { padding: 6 },

    addSquadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(0, 255, 102, 0.3)',
        borderStyle: 'dashed',
        backgroundColor: 'rgba(0, 255, 102, 0.04)',
        marginTop: 6,
    },
    addSquadBtnText: { color: Colors.primary, fontWeight: '900', fontSize: 13 },

    submitBtn: {
        backgroundColor: Colors.primary,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: Colors.primary,
        shadowOpacity: 0.4,
        shadowRadius: 10,
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 1 },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        padding: 16,
    },
    modalContainer: {
        backgroundColor: 'rgba(20, 25, 40, 0.95)',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    modalTitle: { color: Colors.primary, fontSize: 15, fontWeight: '900', letterSpacing: 1 },
    photoUploadBoxSmall: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.3)',
    },
    saveModalBtn: {
        backgroundColor: Colors.primary,
        height: 46,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 14,
    },
    saveModalBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
});

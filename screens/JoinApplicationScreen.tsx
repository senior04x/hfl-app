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
    KeyboardAvoidingView,
    Linking,
    PanResponder,
    StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { apiService } from '../services/apiService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { formatUzPhone, cleanPhoneForDb } from '../utils/stringUtils';
import SmartImage from '../components/SmartImage';
import { SlideButton } from '../components/SlideButton';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const targetTeamId = route?.params?.teamId || user?.teamId || user?.team_id || (user?.role === 'manager' ? (user?.id || user?._id) : null);
    const [targetTeamData, setTargetTeamData] = useState<any>(null);

    // Swipe back animation (matching MatchDetailScreen)
    const swipeBackAnim = useRef(new Animated.Value(0)).current;
    const exitPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                return gestureState.dx > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.3;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dx > 0) {
                    swipeBackAnim.setValue(gestureState.dx);
                } else {
                    swipeBackAnim.setValue(0);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                const shouldExit = gestureState.dx > width * 0.35 || (gestureState.dx > 60 && gestureState.vx > 0.6);
                if (shouldExit) {
                    Animated.timing(swipeBackAnim, {
                        toValue: width,
                        duration: 180,
                        useNativeDriver: true,
                    }).start(() => {
                        navigation.goBack();
                    });
                } else {
                    Animated.spring(swipeBackAnim, {
                        toValue: 0,
                        friction: 8,
                        tension: 45,
                        useNativeDriver: true,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(swipeBackAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 45,
                    useNativeDriver: true,
                }).start();
            },
            onPanResponderTerminationRequest: () => true,
        })
    ).current;

    const handleBack = () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        } catch (e) {}
        Animated.timing(swipeBackAnim, {
            toValue: width,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            navigation.goBack();
        });
    };

    const [loading, setLoading] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
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
    const passportNumberInputRef = useRef<TextInput>(null);

    // Player Number check state
    const [numberCheckResult, setNumberCheckResult] = useState<{ isChecked: boolean; isDuplicate: boolean; message: string }>({
        isChecked: false,
        isDuplicate: false,
        message: ''
    });
    const [isCheckingNumber, setIsCheckingNumber] = useState(false);
    const numberCheckTimerRef = useRef<any>(null);

    const handleNumberChange = (num: string) => {
        const cleanNum = num.replace(/\D/g, '').slice(0, 3);
        setFormData(prev => ({ ...prev, number: cleanNum }));

        if (numberCheckTimerRef.current) clearTimeout(numberCheckTimerRef.current);
        if (!cleanNum) {
            setNumberCheckResult({ isChecked: false, isDuplicate: false, message: '' });
            return;
        }

        const currentTeamId = targetTeamId || formData.selectedTeam;
        if (!currentTeamId) {
            setNumberCheckResult({ isChecked: false, isDuplicate: false, message: '' });
            return;
        }

        setIsCheckingNumber(true);
        numberCheckTimerRef.current = setTimeout(async () => {
            try {
                const res = await apiService.checkPlayerNumberInTeam({
                    teamId: currentTeamId,
                    playerNumber: cleanNum
                });
                setIsCheckingNumber(false);
                setNumberCheckResult({
                    isChecked: true,
                    isDuplicate: res.exists,
                    message: res.message || ''
                });
            } catch (e) {
                setIsCheckingNumber(false);
            }
        }, 300);
    };

    const [organizations, setOrganizations] = useState<any[]>([]);

    // Main Form State
    const [formData, setFormData] = useState({
        selectedOrgId: null as number | null,
        selectedOrgName: '' as string,
        selectedOrgLogo: '' as string,
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
        selectedLeague: '',
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

    // Custom Status Modal State (Replaces Default Alert)
    const [statusModal, setStatusModal] = useState<{
        visible: boolean;
        type: 'success' | 'error' | 'info';
        title: string;
        message: string;
        onClose?: () => void;
    }>({
        visible: false,
        type: 'info',
        title: '',
        message: ''
    });

    const showNotice = (type: 'success' | 'error' | 'info', title: string, message: string, onClose?: () => void) => {
        setStatusModal({ visible: true, type, title, message, onClose });
    };

    const openTelegramBot = async (phone?: string) => {
        try {
            const cleanDigits = (phone || formData.phone || '').replace(/\D/g, '').slice(-9);
            const startParam = cleanDigits ? `status_${cleanDigits}` : '';
            const webUrl = `https://t.me/amatora_bot${startParam ? `?start=${startParam}` : ''}`;
            const nativeUrl = `tg://resolve?domain=amatora_bot${startParam ? `&start=${startParam}` : ''}`;

            try {
                await Linking.openURL(nativeUrl);
            } catch (nativeErr) {
                await Linking.openURL(webUrl);
            }
        } catch (e) {
            console.warn('Telegram deep link error:', e);
            try {
                await Linking.openURL('https://t.me/amatora_bot');
            } catch (err2) {}
        }
    };

    // Dropdown animation state
    const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
    const orgAnimVal = useRef(new Animated.Value(0)).current;

    const [isLeagueDropdownOpen, setIsLeagueDropdownOpen] = useState(false);
    const leagueAnimVal = useRef(new Animated.Value(0)).current;

    const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
    const teamAnimVal = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const orgs = await apiService.getOrganizations();
            setOrganizations(orgs || []);
            if (orgs && orgs.length > 0) {
                const firstOrg = orgs[0];
                setFormData(prev => ({
                    ...prev,
                    selectedOrgId: firstOrg.id,
                    selectedOrgName: firstOrg.name,
                    selectedOrgLogo: firstOrg.logo_url || firstOrg.logo || ''
                }));
                const lData = await apiService.getLeaguesByOrgId(firstOrg.id);
                setLeagues(lData && lData.length > 0 ? lData : LEAGUE_OPTIONS);
            } else {
                setFormData(prev => ({ ...prev, selectedOrgId: 1, selectedOrgName: 'Havas Futbol Ligasi' }));
                const lData = await apiService.getLeaguesByOrgId(1);
                setLeagues(lData && lData.length > 0 ? lData : LEAGUE_OPTIONS);
            }
        } catch (e) {
            console.warn('Load orgs error:', e);
            setFormData(prev => ({ ...prev, selectedOrgId: 1, selectedOrgName: 'Havas Futbol Ligasi' }));
            setLeagues(LEAGUE_OPTIONS);
        }
    };

    const autoPreSelectTeam = async (tId: string) => {
        try {
            setLoadingData(true);
            const teamData = await apiService.getTeamById(tId);
            if (teamData) {
                setTargetTeamData(teamData);
                const leagueName = teamData.league_name || teamData.league || teamData.leagueName || 'Super liga';
                const orgId = teamData.organization_id || teamData.org_id || 1;
                const teamList = await apiService.getTeams(1, 100, leagueName);
                setTeams(teamList || [teamData]);

                setFormData(prev => ({
                    ...prev,
                    selectedOrgId: orgId,
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

    const triggerValidation = (
        type: 'player' | 'team',
        teamNameVal?: string,
        phoneVal?: string,
        firstNameVal?: string,
        lastNameVal?: string,
        customTeamId?: string | number | null
    ) => {
        if (checkTimerRef.current) clearTimeout(checkTimerRef.current);

        const safePhone = phoneVal !== undefined ? phoneVal : (formData.phone || '');
        const safeTeamName = teamNameVal !== undefined ? teamNameVal : (formData.teamName || '');
        const safeFirstName = firstNameVal !== undefined ? firstNameVal : (formData.firstName || '');
        const safeLastName = lastNameVal !== undefined ? lastNameVal : (formData.lastName || '');
        const cleanPhone = String(safePhone).replace(/\D/g, '').slice(-9);

        if (type === 'team') {
            if (safeTeamName.trim().length < 2 || cleanPhone.length < 9) {
                setValidationResult({ isChecked: false, isValid: false, message: '' });
                return;
            }
        } else {
            // Player type requires: Ism, Familiya, and 9-digit Phone
            if (safeFirstName.trim().length < 2 || safeLastName.trim().length < 2 || cleanPhone.length < 9) {
                setValidationResult({ isChecked: false, isValid: false, message: '' });
                return;
            }
        }

        setIsValidating(true);
        checkTimerRef.current = setTimeout(async () => {
            try {
                if (type === 'player') {
                    const currentTeamId = customTeamId !== undefined ? customTeamId : (targetTeamId || formData.selectedTeam);
                    const res = await apiService.checkPlayerExistsInTeam({
                        teamId: currentTeamId,
                        firstName: safeFirstName,
                        lastName: safeLastName,
                        phone: cleanPhone,
                    });
                    setIsValidating(false);
                    setValidationResult({
                        isChecked: true,
                        isValid: !res.exists,
                        message: res.message,
                    });
                } else {
                    const res = await apiService.checkTeamOrPhoneExists({
                        teamName: safeTeamName,
                        phone: cleanPhone,
                        type: type,
                    });
                    setIsValidating(false);
                    setValidationResult({
                        isChecked: true,
                        isValid: !res.exists,
                        message: res.message,
                    });
                }
            } catch (e) {
                setIsValidating(false);
                setValidationResult({
                    isChecked: true,
                    isValid: true,
                    message: "Ma'lumotlar tasdiqlandi. Davom etishingiz mumkin!",
                });
            }
        }, 300);
    };

    useEffect(() => {
        Animated.timing(orgAnimVal, {
            toValue: isOrgDropdownOpen ? 1 : 0,
            duration: 250,
            useNativeDriver: false,
        }).start();
    }, [isOrgDropdownOpen]);

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
        if (targetTeamId) {
            autoPreSelectTeam(targetTeamId);
        }
    }, [targetTeamId, route?.params?.initialType]);

    const getSelectedTeamObj = () => {
        return teams.find(t => (t.id || t._id) === formData.selectedTeam);
    };

    const handleOrgSelect = async (org: any) => {
        setIsOrgDropdownOpen(false);
        setFormData(prev => ({
            ...prev,
            selectedOrgId: org.id,
            selectedOrgName: org.name,
            selectedOrgLogo: org.logo_url || org.logo || '',
            selectedLeague: '',
            selectedTeam: ''
        }));
        setTeams([]);

        try {
            setLoadingData(true);
            const lData = await apiService.getLeaguesByOrgId(org.id);
            setLeagues(lData && lData.length > 0 ? lData : LEAGUE_OPTIONS);
        } catch (err) {
            console.warn('Error loading org leagues:', err);
            setLeagues(LEAGUE_OPTIONS);
        } finally {
            setLoadingData(false);
        }
    };

    const handleLeagueSelect = async (leagueName: string) => {
        setIsLeagueDropdownOpen(false);
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
            if (applicationType === 'player') {
                setIsTeamDropdownOpen(true);
            }
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
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
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
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
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
                    options: ['Galereyadan tanlash', 'Kameradan olish', 'Bekor qilish'],
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
                    { text: "Galereya", onPress: () => openGallery(onPick) },
                    { text: "Kamera", onPress: () => openCamera(onPick) },
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
            showNotice('error', 'XATO', 'Telefon raqamini to\'liq kiriting');
            return;
        }

        if (applicationType === 'player') {
            if (!formData.firstName.trim() || !formData.lastName.trim()) {
                showNotice('error', 'XATO', 'Ism va familiyangizni to\'ldiring');
                return;
            }
            if (formData.number && numberCheckResult.isDuplicate) {
                showNotice('error', 'RAQAM BAND', numberCheckResult.message || 'Ushbu raqam allaqachon boshqa o\'yinchiga tegishli');
                return;
            }
        } else {
            if (!formData.teamName.trim()) {
                showNotice('error', 'XATO', 'Jamoa nomini kiriting');
                return;
            }
        }

        try {
            setLoading(true);
            setSubmitStatus('loading');

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
                    if (pPhoto && !pPhoto.startsWith('http')) {
                        const upRes = await apiService.uploadPhoto(pPhoto);
                        if (upRes.url) pPhoto = upRes.url;
                    }
                    return { ...player, photo: pPhoto };
                })
            );

            const cleanPhone = formData.phone.replace(/\D/g, '').slice(-9);
            const formattedPhone = `+998${cleanPhone}`;

            if (applicationType === 'player') {
                const appPayload = {
                    first_name: formData.firstName.trim(),
                    last_name: formData.lastName.trim(),
                    father_name: formData.fatherName ? formData.fatherName.trim() : null,
                    phone: formattedPhone,
                    passport_series: formData.passportSeries ? formData.passportSeries.toUpperCase().trim() : null,
                    passport_number: formData.passportNumber ? formData.passportNumber.trim() : null,
                    photo_url: photoUrl || '',
                    birth_date: formData.birthDate || null,
                    position: formData.position || null,
                    player_number: formData.number || null,
                    comment: formData.detailedPosition ? `[${formData.detailedPosition}] ${formData.comment || ''}` : (formData.comment || null),
                    organization_id: formData.selectedOrgId || 1,
                    team_id: targetTeamId || formData.selectedTeam || null,
                    status: 'pending'
                };

                const res = await apiService.createApplication(appPayload);
                if (res && (res.id || res._id || res.success)) {
                    setSubmitStatus('success');
                    showNotice(
                        'success',
                        'ARIZANGIZ QABUL QILINDI',
                        'Arizangiz qabul qilindi. Tashkilotchilar tomonidan ko\'rib chiqilib sizga xabar beriladi.',
                        () => {
                            openTelegramBot(formattedPhone);
                            navigation.goBack();
                        }
                    );
                } else {
                    setSubmitStatus('error');
                    throw new Error('Application creation failed');
                }
            } else {
                // Team application
                const teamPayload = {
                    name: formData.teamName.trim(),
                    logo_url: teamLogoUrl || '',
                    captain_name: formData.staffName.trim(),
                    captain_phone: formattedPhone,
                    organization_id: formData.selectedOrgId || 1,
                    league: formData.selectedLeague || 'Super liga',
                    status: 'pending'
                };

                const res = await apiService.createTeam(teamPayload);
                const createdTeamId = res?.id || res?._id;

                if (createdTeamId) {
                    if (uploadedSquad.length > 0) {
                        const squadApplications = uploadedSquad.map(p => ({
                            first_name: p.firstName.trim(),
                            last_name: p.lastName.trim(),
                            father_name: p.fatherName ? p.fatherName.trim() : null,
                            team_id: createdTeamId,
                            organization_id: formData.selectedOrgId || 1,
                            passport_series: p.passportSeries ? p.passportSeries.toUpperCase().trim() : null,
                            passport_number: p.passportNumber ? p.passportNumber.trim() : null,
                            phone: p.phone ? (p.phone.startsWith('+') ? p.phone : `+998${p.phone.replace(/\D/g, '')}`) : formattedPhone,
                            photo_url: p.photo || '',
                            birth_date: p.birthDate || null,
                            position: p.position || null,
                            player_number: p.number || null,
                            status: 'pending'
                        }));

                        await Promise.all(squadApplications.map((app: any) => apiService.createApplication(app)));
                    }

                    setSubmitStatus('success');
                    showNotice(
                        'success',
                        'ARIZANGIZ QABUL QILINDI',
                        'Arizangiz qabul qilindi. Tashkilotchilar tomonidan ko\'rib chiqilib sizga xabar beriladi.',
                        () => {
                            openTelegramBot(formattedPhone);
                            navigation.goBack();
                        }
                    );
                } else {
                    setSubmitStatus('error');
                    throw new Error('Team creation failed');
                }
            }
        } catch (error: any) {
            setSubmitStatus('error');
            console.error('Submit application error:', error);
            showNotice('error', 'XATOLIK', 'Ariza yuborishda xatolik bo\'ldi.');
        } finally {
            setLoading(false);
        }
    };

    const renderHeader = () => (
        <View style={[styles.header, { borderBottomColor: homeColors.border }]}>
            <TouchableOpacity
                style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: homeColors.border }]}
                onPress={handleBack}
                activeOpacity={0.7}
            >
                <Ionicons name="chevron-back" size={22} color={homeColors.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[styles.headerTitle, { color: homeColors.textPrimary }]}>
                    {targetTeamId ? t('teams.add_player', "O'yinchi qo'shish") : t('applications.submit_app', 'Ariza topshirish')}
                </Text>
            </View>
            <View style={{ width: 42 }} />
        </View>
    );

    const renderTypeSelector = () => (
        <View style={[styles.typeSelectorWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderColor: homeColors.border }]}>
            <TouchableOpacity
                style={[styles.typeOption, applicationType === 'player' && { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}
                onPress={() => handleTypeChange('player')}
            >
                <Ionicons
                    name="person"
                    size={16}
                    color={applicationType === 'player' ? (isDark ? '#000000' : '#FFFFFF') : homeColors.textSecondary}
                    style={{ marginRight: 6 }}
                />
                <Text style={[styles.typeOptionText, { color: applicationType === 'player' ? (isDark ? '#000000' : '#FFFFFF') : homeColors.textSecondary }]}>
                    {t('applications.solo_player', "Yakkaxon o'yinchi")}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.typeOption, applicationType === 'team' && { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}
                onPress={() => handleTypeChange('team')}
            >
                <Ionicons
                    name="people"
                    size={16}
                    color={applicationType === 'team' ? (isDark ? '#000000' : '#FFFFFF') : homeColors.textSecondary}
                    style={{ marginRight: 6 }}
                />
                <Text style={[styles.typeOptionText, { color: applicationType === 'team' ? (isDark ? '#000000' : '#FFFFFF') : homeColors.textSecondary }]}>
                    {t('applications.team', 'Jamoa')}
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderValidationBadge = () => {
        if (isValidating) {
            return (
                <View style={[styles.validatingBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: homeColors.border }]}>
                    <ActivityIndicator size="small" color={homeColors.textPrimary} style={{ marginRight: 8 }} />
                    <Text style={[styles.validatingText, { color: homeColors.textSecondary }]}>{t('applications.checking_info', 'Ma\'lumotlar tekshirilmoqda...')}</Text>
                </View>
            );
        }

        if (validationResult.isChecked) {
            if (!validationResult.isValid) {
                return (
                    <View style={styles.validationErrorBox}>
                        <Ionicons name="alert-circle" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                        <Text style={styles.validationErrorText}>{validationResult.message}</Text>
                    </View>
                );
            } else {
                return (
                    <View style={styles.validationSuccessBox}>
                        <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 8 }} />
                        <Text style={styles.validationSuccessText}>{validationResult.message}</Text>
                    </View>
                );
            }
        }

        return null;
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: homeColors.background,
                    transform: [{ translateX: swipeBackAnim }],
                }
            ]}
            {...exitPanResponder.panHandlers}
        >
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
            <SafeAreaView style={{ flex: 1, backgroundColor: homeColors.background }}>
                {renderHeader()}

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={[styles.scrollContent, { paddingBottom: 160 }]}
                    >
                        {!route?.params?.initialType && renderTypeSelector()}

                        {/* TARGET TEAM HEADER BANNER */}
                        {targetTeamId && (
                            <View style={[styles.card, { backgroundColor: homeColors.surface, borderColor: homeColors.border, marginBottom: 14 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                    <SmartImage
                                        uri={targetTeamData?.logo_url || targetTeamData?.logo || formData.selectedOrgLogo}
                                        style={{ width: 48, height: 48, borderRadius: 14 }}
                                        contentFit="cover"
                                        fallbackIcon="shield-outline"
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: homeColors.textPrimary }}>
                                            {targetTeamData?.name || formData.teamName || t('teams.my_team', 'Mening jamoam')}
                                        </Text>
                                        <Text style={{ fontSize: 13, color: homeColors.textSecondary, marginTop: 2 }}>
                                            {t('teams.add_player_to_squad', 'Jamoa tarkibiga yangi o\'yinchi qo\'shish')}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* STEP 1: TASHKILOT TANLASH */}
                        {!targetTeamId && organizations.length > 0 && (
                            <View style={[styles.card, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}>
                                <View style={styles.cardTitleRow}>
                                    <Ionicons name="business-outline" size={18} color={homeColors.textPrimary} style={{ marginRight: 8 }} />
                                    <Text style={[styles.cardTitle, { color: homeColors.textPrimary }]}>Tashkilotni tanlang</Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.leagueSelectTrigger, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border }]}
                                    onPress={() => setIsOrgDropdownOpen(prev => !prev)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.leagueTriggerLeft}>
                                        <View style={[styles.triggerLogoWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: homeColors.border }]}>
                                            {formData.selectedOrgLogo ? (
                                                <Image
                                                    source={{ uri: formData.selectedOrgLogo }}
                                                    style={styles.triggerLeagueLogo}
                                                    contentFit="contain"
                                                />
                                            ) : (
                                                <Ionicons name="business" size={20} color={homeColors.textPrimary} />
                                            )}
                                        </View>
                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                            <Text style={[styles.triggerLeagueTitle, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                                {formData.selectedOrgName || 'Tashkilotni tanlang'}
                                            </Text>
                                            <Text style={[styles.triggerLeagueSubTitle, { color: homeColors.textSecondary }]} numberOfLines={1}>
                                                {formData.selectedOrgName ? 'Tanlangan futbol tashkiloti' : 'Iltimos, avval tashkilotni tanlang'}
                                            </Text>
                                        </View>
                                    </View>

                                    <Ionicons
                                        name={isOrgDropdownOpen ? "chevron-up" : "chevron-down"}
                                        size={18}
                                        color={homeColors.textSecondary}
                                    />
                                </TouchableOpacity>

                                <Animated.View style={[
                                    styles.leagueDropdownContainer,
                                    {
                                        backgroundColor: homeColors.surface,
                                        borderColor: homeColors.border,
                                        maxHeight: orgAnimVal.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, 360]
                                        }),
                                        opacity: orgAnimVal,
                                        overflow: 'hidden',
                                        marginTop: orgAnimVal.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, 8]
                                        })
                                    }
                                ]}>
                                    <ScrollView nestedScrollEnabled style={{ maxHeight: 280 }}>
                                        {organizations.map((org) => {
                                            const isSelected = (formData.selectedOrgId === org.id);
                                            return (
                                                <TouchableOpacity
                                                    key={org.id}
                                                    style={[styles.leagueOptionItem, { borderBottomColor: homeColors.border }, isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                                    onPress={() => handleOrgSelect(org)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.leagueOptionLeft}>
                                                        <View style={[styles.optionLogoWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                                            {org.logo_url ? (
                                                                <Image
                                                                    source={{ uri: org.logo_url }}
                                                                    style={styles.optionLeagueLogo}
                                                                    contentFit="contain"
                                                                />
                                                            ) : (
                                                                <Ionicons name="business" size={18} color={homeColors.textPrimary} />
                                                            )}
                                                        </View>
                                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                                            <Text style={[styles.optionLeagueTitle, { color: homeColors.textPrimary }]}>
                                                                {org.name}
                                                            </Text>
                                                            <Text style={[styles.optionLeagueSubTitle, { color: homeColors.textSecondary }]}>
                                                                {org.slug || 'Futbol Tashkiloti'}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    {isSelected && (
                                                        <Ionicons name="checkmark" size={18} color={homeColors.textPrimary} />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </Animated.View>
                            </View>
                        )}

                        {/* STEP 2: TURNIR TANLASH */}
                        {!targetTeamId && (
                            <View style={[styles.card, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}>
                                <View style={styles.cardTitleRow}>
                                    <Ionicons name="trophy-outline" size={18} color={homeColors.textPrimary} style={{ marginRight: 8 }} />
                                    <Text style={[styles.cardTitle, { color: homeColors.textPrimary }]}>Turnir (Liga) tanlash</Text>
                                </View>
                                
                                <TouchableOpacity
                                    style={[styles.leagueSelectTrigger, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border }]}
                                    onPress={() => setIsLeagueDropdownOpen(prev => !prev)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.leagueTriggerLeft}>
                                        <View style={[styles.triggerLogoWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: homeColors.border }]}>
                                            {LEAGUE_LOGOS[formData.selectedLeague] ? (
                                                <Image
                                                    source={LEAGUE_LOGOS[formData.selectedLeague]}
                                                    style={styles.triggerLeagueLogo}
                                                    contentFit="contain"
                                                />
                                            ) : (
                                                <Ionicons name="trophy" size={20} color={homeColors.textPrimary} />
                                            )}
                                        </View>
                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                            <Text style={[styles.triggerLeagueTitle, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                                {formData.selectedLeague || 'Liga tanlang'}
                                            </Text>
                                            <Text style={[styles.triggerLeagueSubTitle, { color: homeColors.textSecondary }]} numberOfLines={1}>
                                                {formData.selectedLeague ? 'Tanlangan turnir ligasi' : 'Iltimos, ligani tanlang'}
                                            </Text>
                                        </View>
                                    </View>

                                    <Ionicons
                                        name={isLeagueDropdownOpen ? "chevron-up" : "chevron-down"}
                                        size={18}
                                        color={homeColors.textSecondary}
                                    />
                                </TouchableOpacity>

                                <Animated.View style={[
                                    styles.leagueDropdownContainer,
                                    {
                                        backgroundColor: homeColors.surface,
                                        borderColor: homeColors.border,
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
                                    <ScrollView nestedScrollEnabled style={{ maxHeight: 280 }}>
                                        {(leagues.length > 0 ? leagues : LEAGUE_OPTIONS).map((league: any) => {
                                            const lName = league.name || league.id || league.label;
                                            const isSelected = formData.selectedLeague === lName;
                                            return (
                                                <TouchableOpacity
                                                    key={league.id || lName}
                                                    style={[styles.leagueOptionItem, { borderBottomColor: homeColors.border }, isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                                    onPress={() => handleLeagueSelect(lName)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.leagueOptionLeft}>
                                                        <View style={[styles.optionLogoWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                                            {LEAGUE_LOGOS[lName] ? (
                                                                <Image
                                                                    source={LEAGUE_LOGOS[lName]}
                                                                    style={styles.optionLeagueLogo}
                                                                    contentFit="contain"
                                                                />
                                                            ) : (
                                                                <Ionicons name="shield" size={18} color={homeColors.textPrimary} />
                                                            )}
                                                        </View>
                                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                                            <Text style={[styles.optionLeagueTitle, { color: homeColors.textPrimary }]}>
                                                                {String(lName)}
                                                            </Text>
                                                            <Text style={[styles.optionLeagueSubTitle, { color: homeColors.textSecondary }]}>
                                                                {league.subLabel || 'Rasmiy musobaqa ligasi'}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    {isSelected && (
                                                        <Ionicons name="checkmark" size={18} color={homeColors.textPrimary} />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </Animated.View>
                            </View>
                        )}

                        {/* STEP 3: JAMOA TANLASH */}
                        {!targetTeamId && applicationType === 'player' && (
                            <View style={[styles.card, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}>
                                <View style={styles.cardTitleRow}>
                                    <Ionicons name="shield-outline" size={18} color={homeColors.textPrimary} style={{ marginRight: 8 }} />
                                    <Text style={[styles.cardTitle, { color: homeColors.textPrimary }]}>Jamoa tanlash</Text>
                                </View>
                                    
                                <TouchableOpacity
                                    style={[styles.leagueSelectTrigger, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border }]}
                                    onPress={() => setIsTeamDropdownOpen(prev => !prev)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.leagueTriggerLeft}>
                                        <View style={[styles.triggerLogoWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: homeColors.border }]}>
                                            {getSelectedTeamObj()?.logo_url || getSelectedTeamObj()?.logo ? (
                                                <Image
                                                    source={{ uri: getSelectedTeamObj()?.logo_url || getSelectedTeamObj()?.logo }}
                                                    style={styles.triggerLeagueLogo}
                                                    contentFit="contain"
                                                />
                                            ) : (
                                                <Ionicons name="shield-outline" size={20} color={homeColors.textPrimary} />
                                            )}
                                        </View>
                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                            <Text style={[styles.triggerLeagueTitle, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                                {getSelectedTeamObj()?.name || 'Jamoangizni tanlang'}
                                            </Text>
                                            <Text style={[styles.triggerLeagueSubTitle, { color: homeColors.textSecondary }]} numberOfLines={1}>
                                                {getSelectedTeamObj() ? `${formData.selectedLeague} jamoasi` : 'Iltimos, jamoangizni tanlang'}
                                            </Text>
                                        </View>
                                    </View>

                                    <Ionicons
                                        name={isTeamDropdownOpen ? "chevron-up" : "chevron-down"}
                                        size={18}
                                        color={homeColors.textSecondary}
                                    />
                                </TouchableOpacity>

                                <Animated.View style={[
                                    styles.leagueDropdownContainer,
                                    {
                                        backgroundColor: homeColors.surface,
                                        borderColor: homeColors.border,
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
                                    <ScrollView nestedScrollEnabled style={{ maxHeight: 280 }}>
                                        {teams.map((team) => {
                                            const tId = team.id || team._id;
                                            const isSelected = formData.selectedTeam === tId;
                                            return (
                                                <TouchableOpacity
                                                    key={tId}
                                                    style={[styles.leagueOptionItem, { borderBottomColor: homeColors.border }, isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                                    onPress={() => {
                                                        setFormData(prev => ({ ...prev, selectedTeam: tId, teamName: team.name }));
                                                        setIsTeamDropdownOpen(false);
                                                        triggerValidation('player', team.name, formData.phone, formData.firstName, formData.lastName, tId);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.leagueOptionLeft}>
                                                        <View style={[styles.optionLogoWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                                            {team.logo_url || team.logo ? (
                                                                <Image
                                                                    source={{ uri: team.logo_url || team.logo }}
                                                                    style={styles.optionLeagueLogo}
                                                                    contentFit="contain"
                                                                />
                                                            ) : (
                                                                <Ionicons name="shield-outline" size={18} color={homeColors.textPrimary} />
                                                            )}
                                                        </View>
                                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                                            <Text style={[styles.optionLeagueTitle, { color: homeColors.textPrimary }]}>
                                                                {team.name}
                                                            </Text>
                                                            <Text style={[styles.optionLeagueSubTitle, { color: homeColors.textSecondary }]}>
                                                                {team.league || formData.selectedLeague}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    {isSelected && (
                                                        <Ionicons name="checkmark" size={18} color={homeColors.textPrimary} />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </Animated.View>
                            </View>
                        )}

                        {/* MODE 1: YAKKAXON OYINCHI FORM */}
                        {applicationType === 'player' ? (
                            <>
                                {/* DASTLABKI TEKSHIRUV: ISM, FAMILIYA & TELEFON */}
                                <View style={[styles.card, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}>
                                    <View style={styles.cardTitleRow}>
                                        <Ionicons name="shield-checkmark-outline" size={18} color={homeColors.textPrimary} style={{ marginRight: 8 }} />
                                        <Text style={[styles.cardTitle, { color: homeColors.textPrimary }]}>Dastlabki tekshiruv</Text>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Ism *</Text>
                                        <TextInput
                                            style={[styles.inputField, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border, color: homeColors.textPrimary }]}
                                            value={formData.firstName}
                                            onChangeText={(t) => {
                                                setFormData(prev => ({ ...prev, firstName: t }));
                                                triggerValidation('player', formData.teamName, formData.phone, t, formData.lastName);
                                            }}
                                            placeholder="Masalan: Alisher"
                                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Familiya *</Text>
                                        <TextInput
                                            style={[styles.inputField, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border, color: homeColors.textPrimary }]}
                                            value={formData.lastName}
                                            onChangeText={(t) => {
                                                setFormData(prev => ({ ...prev, lastName: t }));
                                                triggerValidation('player', formData.teamName, formData.phone, formData.firstName, t);
                                            }}
                                            placeholder="Masalan: Karimov"
                                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Telefon raqam *</Text>
                                        <TextInput
                                            style={[styles.inputField, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border, color: homeColors.textPrimary }]}
                                            value={formatUzPhone(formData.phone)}
                                            onChangeText={(t) => {
                                                const formatted = formatUzPhone(t);
                                                const clean = cleanPhoneForDb(formatted).replace('+998', '');
                                                setFormData(prev => ({ ...prev, phone: clean }));
                                                triggerValidation('player', formData.teamName, clean, formData.firstName, formData.lastName);
                                            }}
                                            placeholder="+998 90 123 45 67"
                                            keyboardType="phone-pad"
                                            maxLength={17}
                                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                        />
                                    </View>

                                    {renderValidationBadge()}
                                </View>

                                {/* CONDITIONAL FIELDS (REVEALED ONLY IF VALIDATION PASSED) */}
                                {validationResult.isChecked && validationResult.isValid && (
                                    <>
                                        {/* FATHER NAME */}
                                        <View style={[styles.card, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}>
                                            <View style={styles.cardTitleRow}>
                                                <Ionicons name="person-outline" size={18} color={homeColors.textPrimary} style={{ marginRight: 8 }} />
                                                <Text style={[styles.cardTitle, { color: homeColors.textPrimary }]}>Qo'shimcha ma'lumotlar</Text>
                                            </View>

                                            <View style={styles.inputGroup}>
                                                <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Otasining ismi (ixtiyoriy)</Text>
                                                <TextInput
                                                    style={[styles.inputField, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border, color: homeColors.textPrimary }]}
                                                    value={formData.fatherName}
                                                    onChangeText={(t) => setFormData({ ...formData, fatherName: t })}
                                                    placeholder="Masalan: Bahodirovich"
                                                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                                />
                                            </View>
                                        </View>

                                        {/* PHOTO UPLOAD & BIRTH DATE */}
                                        <View style={[styles.card, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}>
                                            <View style={styles.cardTitleRow}>
                                                <Ionicons name="camera-outline" size={18} color={homeColors.textPrimary} style={{ marginRight: 8 }} />
                                                <Text style={[styles.cardTitle, { color: homeColors.textPrimary }]}>Rasm va tug'ilgan sana</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.photoUploadBox, { borderColor: homeColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}
                                                onPress={() => pickImage((uri) => setFormData({ ...formData, photo: uri }))}
                                            >
                                                {formData.photo ? (
                                                    <Image source={{ uri: formData.photo }} style={styles.uploadedPhoto} />
                                                ) : (
                                                    <View style={styles.photoPlaceholderInner}>
                                                        <Ionicons name="camera" size={32} color={homeColors.textSecondary} />
                                                        <Text style={[styles.photoUploadText, { color: homeColors.textSecondary }]}>Rasm yuklash (1x1 format)</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>

                                            <View style={styles.inputGroup}>
                                                <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Tug'ilgan sana (ixtiyoriy)</Text>
                                                <TextInput
                                                    style={[styles.inputField, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border, color: homeColors.textPrimary }]}
                                                    value={formData.birthDate}
                                                    onChangeText={(t) => setFormData({ ...formData, birthDate: t })}
                                                    placeholder="01.04.1990"
                                                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                                />
                                            </View>
                                        </View>

                                        {/* POSITION & NUMBER */}
                                        <View style={[styles.card, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}>
                                            <View style={styles.cardTitleRow}>
                                                <Ionicons name="football-outline" size={18} color={homeColors.textPrimary} style={{ marginRight: 8 }} />
                                                <Text style={[styles.cardTitle, { color: homeColors.textPrimary }]}>Amplua va raqam</Text>
                                            </View>

                                            <Text style={[styles.subTitle, { color: homeColors.textSecondary }]}>Amplua (ixtiyoriy)</Text>
                                            <View style={styles.posGrid}>
                                                {PLAYER_POSITIONS.map((pos) => {
                                                    const isSelected = formData.position === pos.id;
                                                    return (
                                                        <TouchableOpacity
                                                            key={pos.id}
                                                            style={[
                                                                styles.posBtn,
                                                                { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border },
                                                                isSelected && { backgroundColor: isDark ? '#FFFFFF' : '#000000', borderColor: isDark ? '#FFFFFF' : '#000000' }
                                                            ]}
                                                            onPress={() => setFormData({ ...formData, position: pos.id })}
                                                        >
                                                            <Text style={[
                                                                styles.posBtnText,
                                                                { color: homeColors.textSecondary },
                                                                isSelected && { color: isDark ? '#000000' : '#FFFFFF', fontWeight: '800' }
                                                            ]}>
                                                                {pos.label}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>

                                            <Text style={[styles.subTitle, { color: homeColors.textSecondary, marginTop: 14 }]}>Aniq pozitsiya (ixtiyoriy)</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                                {DETAILED_POSITIONS.map((p) => {
                                                    const isSelected = formData.detailedPosition === p;
                                                    return (
                                                        <TouchableOpacity
                                                            key={p}
                                                            style={[
                                                                styles.detailPosPill,
                                                                { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border },
                                                                isSelected && { backgroundColor: isDark ? '#FFFFFF' : '#000000', borderColor: isDark ? '#FFFFFF' : '#000000' }
                                                            ]}
                                                            onPress={() => setFormData({ ...formData, detailedPosition: p })}
                                                        >
                                                            <Text style={[
                                                                styles.detailPosPillText,
                                                                { color: homeColors.textSecondary },
                                                                isSelected && { color: isDark ? '#000000' : '#FFFFFF', fontWeight: '800' }
                                                            ]}>
                                                                {p}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </ScrollView>

                                            <View style={styles.inputGroup}>
                                                <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>O'yinchi raqami (ixtiyoriy)</Text>
                                                <TextInput
                                                    style={[
                                                        styles.inputField,
                                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border, color: homeColors.textPrimary },
                                                        numberCheckResult.isChecked && numberCheckResult.isDuplicate && { borderColor: '#EF4444', borderWidth: 1.5 }
                                                    ]}
                                                    value={formData.number}
                                                    onChangeText={handleNumberChange}
                                                    placeholder="Masalan: 10"
                                                    keyboardType="number-pad"
                                                    maxLength={3}
                                                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                                />
                                                {isCheckingNumber && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
                                                        <ActivityIndicator size="small" color={homeColors.textPrimary} />
                                                        <Text style={{ color: homeColors.textSecondary, fontSize: 12 }}>Raqam tekshirilmoqda...</Text>
                                                    </View>
                                                )}
                                                {!isCheckingNumber && numberCheckResult.isChecked && (
                                                    <View style={[
                                                        styles.numberBadgeBox,
                                                        numberCheckResult.isDuplicate ? styles.numberBadgeError : styles.numberBadgeSuccess
                                                    ]}>
                                                        <Ionicons
                                                            name={numberCheckResult.isDuplicate ? "alert-circle" : "checkmark-circle"}
                                                            size={16}
                                                            color={numberCheckResult.isDuplicate ? "#EF4444" : "#10B981"}
                                                            style={{ marginRight: 6 }}
                                                        />
                                                        <Text style={[
                                                            styles.numberBadgeText,
                                                            numberCheckResult.isDuplicate ? { color: '#EF4444' } : { color: '#10B981' }
                                                        ]}>
                                                            {numberCheckResult.message}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>

                                        {/* PASSPORT & COMMENT */}
                                        <View style={[styles.card, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}>
                                            <View style={styles.cardTitleRow}>
                                                <Ionicons name="card-outline" size={18} color={homeColors.textPrimary} style={{ marginRight: 8 }} />
                                                <Text style={[styles.cardTitle, { color: homeColors.textPrimary }]}>Pasport va izoh</Text>
                                            </View>

                                            <View style={styles.inputGroup}>
                                                <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Pasport seriya va raqami (ixtiyoriy)</Text>
                                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                                    <TextInput
                                                        style={[styles.inputField, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border, color: homeColors.textPrimary, width: 70, textTransform: 'uppercase' }]}
                                                        value={formData.passportSeries}
                                                        onChangeText={(t) => setFormData({ ...formData, passportSeries: t.toUpperCase() })}
                                                        placeholder="AA"
                                                        maxLength={2}
                                                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                                    />
                                                    <TextInput
                                                        style={[styles.inputField, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border, color: homeColors.textPrimary, flex: 1 }]}
                                                        value={formData.passportNumber}
                                                        onChangeText={(t) => setFormData({ ...formData, passportNumber: t })}
                                                        placeholder="1234567"
                                                        keyboardType="number-pad"
                                                        maxLength={7}
                                                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                                    />
                                                </View>
                                            </View>

                                            {/* TEAM SELECT OR ENTER */}
                                            {!targetTeamId && teams.length > 0 && (
                                                <View style={styles.inputGroup}>
                                                    <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Jamoa tanlash (ixtiyoriy)</Text>
                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                        {teams.map((tm) => {
                                                            const isSelected = formData.selectedTeam === tm._id || formData.selectedTeam === tm.id;
                                                            return (
                                                                <TouchableOpacity
                                                                    key={tm._id || tm.id}
                                                                    style={[
                                                                        styles.detailPosPill,
                                                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border },
                                                                        isSelected && { backgroundColor: isDark ? '#FFFFFF' : '#000000', borderColor: isDark ? '#FFFFFF' : '#000000' }
                                                                    ]}
                                                                    onPress={() => setFormData({ ...formData, selectedTeam: tm._id || tm.id })}
                                                                >
                                                                    <Text style={[
                                                                        styles.detailPosPillText,
                                                                        { color: homeColors.textSecondary },
                                                                        isSelected && { color: isDark ? '#000000' : '#FFFFFF', fontWeight: '800' }
                                                                    ]}>{tm.name}</Text>
                                                                </TouchableOpacity>
                                                            );
                                                        })}
                                                    </ScrollView>
                                                </View>
                                            )}

                                            <View style={styles.inputGroup}>
                                                <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Izoh / Tajriba (ixtiyoriy)</Text>
                                                <TextInput
                                                    style={[styles.inputField, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border, color: homeColors.textPrimary, height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                                                    value={formData.comment}
                                                    onChangeText={(t) => setFormData({ ...formData, comment: t })}
                                                    placeholder="Qo'shimcha izoh yoki tajribangiz haqida yozing..."
                                                    multiline
                                                    numberOfLines={3}
                                                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                                />
                                            </View>
                                        </View>

                                        {/* ONE-DIRECTION SLIDE BUTTON */}
                                        <SlideButton
                                            loading={loading}
                                            status={submitStatus}
                                            title="Arizani yuborish uchun suring"
                                            helperText="Arizani yuborish uchun o'ngga suring yoki bosing"
                                            onSwipeSuccess={handleSubmit}
                                            onReset={() => setSubmitStatus('idle')}
                                        />
                                    </>
                                )}
                            </>
                        ) : (
                            /* MODE 2: JAMOA REGISTRATION FORM */
                            <>
                                {/* TEAM INITIAL DETAILS & CHECK */}
                                <View style={[styles.card, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}>
                                    <View style={styles.cardTitleRow}>
                                        <Ionicons name="shield-checkmark-outline" size={18} color={homeColors.textPrimary} style={{ marginRight: 8 }} />
                                        <Text style={[styles.cardTitle, { color: homeColors.textPrimary }]}>Jamoa tekshiruvi</Text>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Jamoa nomi *</Text>
                                        <TextInput
                                            style={[styles.inputField, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border, color: homeColors.textPrimary }]}
                                            value={formData.teamName}
                                            onChangeText={(t) => {
                                                setFormData({ ...formData, teamName: t });
                                                triggerValidation('team', t, formData.phone);
                                            }}
                                            placeholder="Masalan: Paxtakor FC"
                                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Sardor telefoni *</Text>
                                        <TextInput
                                            style={[styles.inputField, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border, color: homeColors.textPrimary }]}
                                            value={formatUzPhone(formData.phone)}
                                            onChangeText={(t) => {
                                                const formatted = formatUzPhone(t);
                                                const clean = cleanPhoneForDb(formatted).replace('+998', '');
                                                setFormData({ ...formData, phone: clean });
                                                triggerValidation('team', formData.teamName, clean);
                                            }}
                                            placeholder="+998 90 123 45 67"
                                            keyboardType="phone-pad"
                                            maxLength={17}
                                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                        />
                                    </View>

                                    {renderValidationBadge()}
                                </View>

                                {/* CONDITIONAL TEAM FIELDS (REVEALED ONLY IF VALIDATION PASSED) */}
                                {validationResult.isChecked && validationResult.isValid && (
                                    <>
                                        <View style={[styles.card, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}>
                                            <View style={styles.cardTitleRow}>
                                                <Ionicons name="image-outline" size={18} color={homeColors.textPrimary} style={{ marginRight: 8 }} />
                                                <Text style={[styles.cardTitle, { color: homeColors.textPrimary }]}>Jamoa logotipi va mas'ul shaxs</Text>
                                            </View>
                                            
                                            <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Jamoa logotipi (1x1 format)</Text>
                                            <TouchableOpacity
                                                style={[styles.photoUploadBox, { borderColor: homeColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}
                                                onPress={() => pickImage((uri) => setFormData({ ...formData, teamLogo: uri }))}
                                            >
                                                {formData.teamLogo ? (
                                                    <Image source={{ uri: formData.teamLogo }} style={styles.uploadedPhoto} />
                                                ) : (
                                                    <View style={styles.photoPlaceholderInner}>
                                                        <Ionicons name="shield" size={32} color={homeColors.textSecondary} />
                                                        <Text style={[styles.photoUploadText, { color: homeColors.textSecondary }]}>Logotip yuklash</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>

                                            <View style={[styles.inputGroup, { marginTop: 14 }]}>
                                                <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Mas'ul shaxs ismi *</Text>
                                                <TextInput
                                                    style={[styles.inputField, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border, color: homeColors.textPrimary }]}
                                                    value={formData.staffName}
                                                    onChangeText={(t) => setFormData({ ...formData, staffName: t })}
                                                    placeholder="Ism sharifingizni kiriting"
                                                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                                />
                                            </View>

                                            <Text style={[styles.subTitle, { color: homeColors.textSecondary }]}>Rolingiz</Text>
                                            <View style={styles.posGrid}>
                                                {TEAM_ROLES.map((r) => {
                                                    const isSelected = formData.staffRole === r.id;
                                                    return (
                                                        <TouchableOpacity
                                                            key={r.id}
                                                            style={[
                                                                styles.posBtn,
                                                                { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border },
                                                                isSelected && { backgroundColor: isDark ? '#FFFFFF' : '#000000', borderColor: isDark ? '#FFFFFF' : '#000000' }
                                                            ]}
                                                            onPress={() => setFormData({ ...formData, staffRole: r.id })}
                                                        >
                                                            <Text style={[
                                                                styles.posBtnText,
                                                                { color: homeColors.textSecondary },
                                                                isSelected && { color: isDark ? '#000000' : '#FFFFFF', fontWeight: '800' }
                                                            ]}>
                                                                {r.label}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        </View>

                                        {/* SQUAD PLAYERS LIST SECTION */}
                                        <View style={[styles.card, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                <View style={styles.cardTitleRow}>
                                                    <Ionicons name="people-outline" size={18} color={homeColors.textPrimary} style={{ marginRight: 8 }} />
                                                    <Text style={[styles.cardTitle, { color: homeColors.textPrimary }]}>O'yinchilar ro'yxati</Text>
                                                </View>
                                                <View style={[styles.countBadge, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}>
                                                    <Text style={[styles.countBadgeText, { color: isDark ? '#000000' : '#FFFFFF' }]}>{squadPlayers.length} ta</Text>
                                                </View>
                                            </View>

                                            {/* Added Squad Player Cards */}
                                            {squadPlayers.map((player) => (
                                                <View key={player.id} style={[styles.squadPlayerCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border }]}>
                                                    <View style={[styles.squadAvatar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                                        {player.photo ? (
                                                            <Image source={{ uri: player.photo }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                                                        ) : (
                                                            <Ionicons name="person" size={20} color={homeColors.textPrimary} />
                                                        )}
                                                    </View>
                                                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                                                        <Text style={[styles.squadPlayerName, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                                            {player.firstName} {player.lastName} {player.fatherName}
                                                        </Text>
                                                        <Text style={[styles.squadPlayerMeta, { color: homeColors.textSecondary }]}>
                                                            {player.position} {player.number ? `• #${player.number}` : ''}
                                                        </Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        style={styles.removeSquadBtn}
                                                        onPress={() => removeSquadPlayer(player.id)}
                                                    >
                                                        <Ionicons name="close" size={18} color="#EF4444" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}

                                            <TouchableOpacity
                                                style={[styles.addSquadBtn, { borderColor: homeColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}
                                                onPress={() => setIsPlayerModalOpen(true)}
                                            >
                                                <Ionicons name="person-add" size={18} color={homeColors.textPrimary} style={{ marginRight: 8 }} />
                                                <Text style={[styles.addSquadBtnText, { color: homeColors.textPrimary }]}>Yangi o'yinchi qo'shish</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* ONE-DIRECTION SLIDE BUTTON */}
                                        <SlideButton
                                            loading={loading}
                                            status={submitStatus}
                                            title="Arizani yuborish uchun suring"
                                            helperText="Arizani yuborish uchun o'ngga suring yoki bosing"
                                            onSwipeSuccess={handleSubmit}
                                            onReset={() => setSubmitStatus('idle')}
                                        />
                                    </>
                                )}
                            </>
                        )}

                        <View style={{ height: 60 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* ADD SQUAD PLAYER MODAL */}
            <Modal
                visible={isPlayerModalOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsPlayerModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}>
                        <View style={{ padding: 20 }}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: homeColors.textPrimary }]}>O'yinchi qo'shish</Text>
                                <TouchableOpacity onPress={() => setIsPlayerModalOpen(false)}>
                                    <Ionicons name="close" size={24} color={homeColors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
                                {/* Player Photo */}
                                <TouchableOpacity
                                    style={[styles.photoUploadBoxSmall, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: homeColors.border }]}
                                    onPress={() => pickImage((uri) => setModalPlayerData({ ...modalPlayerData, photo: uri }))}
                                >
                                    {modalPlayerData.photo ? (
                                        <Image source={{ uri: modalPlayerData.photo }} style={{ width: 70, height: 70, borderRadius: 35 }} />
                                    ) : (
                                        <View style={{ alignItems: 'center' }}>
                                            <Ionicons name="camera" size={24} color={homeColors.textSecondary} />
                                            <Text style={{ color: homeColors.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 2 }}>Rasm</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Ism *</Text>
                                    <TextInput
                                        style={[styles.inputField, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border, color: homeColors.textPrimary }]}
                                        value={modalPlayerData.firstName}
                                        onChangeText={(t) => setModalPlayerData({ ...modalPlayerData, firstName: t })}
                                        placeholder="Masalan: Alisher"
                                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Familiya *</Text>
                                    <TextInput
                                        style={[styles.inputField, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border, color: homeColors.textPrimary }]}
                                        value={modalPlayerData.lastName}
                                        onChangeText={(t) => setModalPlayerData({ ...modalPlayerData, lastName: t })}
                                        placeholder="Masalan: Karimov"
                                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Otasining ismi (ixtiyoriy)</Text>
                                    <TextInput
                                        style={[styles.inputField, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border, color: homeColors.textPrimary }]}
                                        value={modalPlayerData.fatherName}
                                        onChangeText={(t) => setModalPlayerData({ ...modalPlayerData, fatherName: t })}
                                        placeholder="Masalan: Bahodirovich"
                                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Tug'ilgan sana</Text>
                                    <TextInput
                                        style={[styles.inputField, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border, color: homeColors.textPrimary }]}
                                        value={modalPlayerData.birthDate}
                                        onChangeText={(t) => setModalPlayerData({ ...modalPlayerData, birthDate: t })}
                                        placeholder="01.04.1990"
                                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                    />
                                </View>

                                <Text style={[styles.subTitle, { color: homeColors.textSecondary }]}>Amplua</Text>
                                <View style={styles.posGrid}>
                                    {PLAYER_POSITIONS.map((pos) => (
                                        <TouchableOpacity
                                            key={pos.id}
                                            style={[
                                                styles.posBtn,
                                                { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border },
                                                modalPlayerData.position === pos.id && { backgroundColor: isDark ? '#FFFFFF' : '#000000', borderColor: isDark ? '#FFFFFF' : '#000000' }
                                            ]}
                                            onPress={() => setModalPlayerData({ ...modalPlayerData, position: pos.id })}
                                        >
                                            <Text style={[
                                                styles.posBtnText,
                                                { color: homeColors.textSecondary },
                                                modalPlayerData.position === pos.id && { color: isDark ? '#000000' : '#FFFFFF', fontWeight: '800' }
                                            ]}>
                                                {pos.id}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>O'yinchi raqami (ixtiyoriy)</Text>
                                    <TextInput
                                        style={[styles.inputField, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border, color: homeColors.textPrimary }]}
                                        value={modalPlayerData.number}
                                        onChangeText={(t) => setModalPlayerData({ ...modalPlayerData, number: t })}
                                        placeholder="20"
                                        keyboardType="number-pad"
                                        maxLength={3}
                                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: homeColors.textSecondary }]}>Telefon raqami (ixtiyoriy)</Text>
                                    <TextInput
                                        style={[styles.inputField, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: homeColors.border, color: homeColors.textPrimary }]}
                                        value={formatUzPhone(modalPlayerData.phone)}
                                        onChangeText={(t) => {
                                            const formatted = formatUzPhone(t);
                                            const clean = cleanPhoneForDb(formatted).replace('+998', '');
                                            setModalPlayerData({ ...modalPlayerData, phone: clean });
                                        }}
                                        placeholder="+998 90 123 45 67"
                                        keyboardType="phone-pad"
                                        maxLength={17}
                                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                    />
                                </View>
                            </ScrollView>

                            <TouchableOpacity
                                style={[styles.saveModalBtn, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}
                                onPress={handleAddSquadPlayer}
                            >
                                <Text style={[styles.saveModalBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>Qo'shish</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* CUSTOM STATUS NOTICE MODAL */}
            <Modal
                transparent
                visible={statusModal.visible}
                animationType="fade"
                onRequestClose={() => {
                    setStatusModal(prev => ({ ...prev, visible: false }));
                    if (statusModal.onClose) statusModal.onClose();
                }}
            >
                <View style={styles.modalBackdrop}>
                    <View style={[
                        styles.noticeModalCard,
                        { backgroundColor: homeColors.surface, borderColor: homeColors.border },
                        statusModal.type === 'success' && { borderColor: 'rgba(16, 185, 129, 0.4)' },
                        statusModal.type === 'error' && { borderColor: 'rgba(239, 68, 68, 0.4)' }
                    ]}>
                        <TouchableOpacity
                            style={styles.noticeCloseBtn}
                            onPress={() => {
                                setStatusModal(prev => ({ ...prev, visible: false }));
                                if (statusModal.onClose) statusModal.onClose();
                            }}
                        >
                            <Ionicons name="close" size={18} color={homeColors.textSecondary} />
                        </TouchableOpacity>

                        <View style={styles.noticeHeaderRow}>
                            <View style={[
                                styles.noticeIconBox,
                                statusModal.type === 'success' && { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
                                statusModal.type === 'error' && { backgroundColor: 'rgba(239, 68, 68, 0.15)' }
                            ]}>
                                <Ionicons
                                    name={statusModal.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                                    size={24}
                                    color={statusModal.type === 'success' ? '#10B981' : '#EF4444'}
                                />
                            </View>
                            <Text style={[styles.noticeTitleText, { color: homeColors.textPrimary }]}>{statusModal.title}</Text>
                        </View>

                        <Text style={[styles.noticeBodyText, { color: homeColors.textSecondary }]}>{statusModal.message}</Text>

                        <TouchableOpacity
                            style={[
                                styles.noticeActionBtn,
                                statusModal.type === 'success' && { backgroundColor: '#0088cc', width: '100%', borderRadius: 14, height: 46, flexDirection: 'row' },
                                statusModal.type === 'error' && { backgroundColor: '#EF4444' }
                            ]}
                            activeOpacity={0.8}
                            onPress={() => {
                                setStatusModal(prev => ({ ...prev, visible: false }));
                                if (statusModal.onClose) statusModal.onClose();
                            }}
                        >
                            {statusModal.type === 'success' ? (
                                <>
                                    <Ionicons name="paper-plane" size={16} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Botga o'tish</Text>
                                </>
                            ) : (
                                <Ionicons name="checkmark" size={18} color="#FFF" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    headerTitle: { fontSize: 17, fontWeight: '800' },
    scrollContent: { padding: 16 },
    typeSelectorWrapper: {
        flexDirection: 'row',
        borderRadius: 14,
        padding: 4,
        marginBottom: 14,
        borderWidth: 1,
    },
    typeOption: {
        flex: 1,
        flexDirection: 'row',
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    typeOptionText: { fontSize: 13, fontWeight: '700' },

    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: { fontSize: 15, fontWeight: '700' },
    subTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8 },

    leagueSelectTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    leagueTriggerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    triggerLogoWrapper: {
        width: 34,
        height: 34,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        padding: 2,
    },
    triggerLeagueLogo: {
        width: '100%',
        height: '100%',
    },
    triggerLeagueTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    triggerLeagueSubTitle: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 1,
    },

    leagueDropdownContainer: {
        borderRadius: 14,
        borderWidth: 1,
    },
    leagueOptionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    leagueOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    optionLogoWrapper: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
    },
    optionLeagueLogo: {
        width: '100%',
        height: '100%',
    },
    optionLeagueTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    optionLeagueSubTitle: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 1,
    },

    photoUploadBox: {
        height: 100,
        borderRadius: 14,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        marginBottom: 12,
    },
    uploadedPhoto: { width: '100%', height: '100%', borderRadius: 14 },
    photoPlaceholderInner: { alignItems: 'center' },
    photoUploadText: { fontSize: 12, fontWeight: '600', marginTop: 4 },

    inputGroup: { marginBottom: 12 },
    inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
    inputField: {
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 46,
        fontSize: 14,
        fontWeight: '600',
        borderWidth: 1,
    },

    validatingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginTop: 10,
        borderWidth: 1,
    },
    validatingText: {
        fontSize: 12,
        fontWeight: '600',
    },
    validationErrorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    validationErrorText: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },
    validationSuccessBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    validationSuccessText: {
        color: '#10B981',
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },
    numberBadgeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginTop: 6,
        borderWidth: 1,
    },
    numberBadgeError: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    numberBadgeSuccess: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    numberBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },

    posGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    posBtn: {
        flex: 1,
        minWidth: '45%',
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
    },
    posBtnText: { fontSize: 12, fontWeight: '600' },

    detailPosPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 6,
        borderWidth: 1,
    },
    detailPosPillText: { fontSize: 12, fontWeight: '600' },

    countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    countBadgeText: { fontWeight: '800', fontSize: 11 },

    squadPlayerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        padding: 10,
        marginBottom: 8,
        borderWidth: 1,
    },
    squadAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    squadPlayerName: { fontSize: 14, fontWeight: '700' },
    squadPlayerMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
    removeSquadBtn: { padding: 6 },

    addSquadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderStyle: 'dashed',
        marginTop: 6,
    },
    addSquadBtnText: { fontWeight: '700', fontSize: 13 },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 1,
        borderBottomWidth: 0,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: { fontSize: 16, fontWeight: '700' },
    photoUploadBoxSmall: {
        height: 70,
        width: 70,
        borderRadius: 35,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    saveModalBtn: {
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 14,
    },
    saveModalBtnText: { fontSize: 14, fontWeight: '700' },

    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    noticeModalCard: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    noticeCloseBtn: {
        position: 'absolute',
        top: 14,
        right: 14,
        padding: 4,
    },
    noticeHeaderRow: {
        alignItems: 'center',
        marginBottom: 12,
    },
    noticeIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    noticeTitleText: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
    noticeBodyText: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 18 },
    noticeActionBtn: {
        height: 44,
        paddingHorizontal: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

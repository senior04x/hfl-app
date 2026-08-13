import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Linking,
    Dimensions,
    Image,
    Animated,
    PanResponder,
    SafeAreaView,
    StatusBar,
    Modal,
    TextInput,
    Alert,
    Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { Picker } from '@react-native-picker/picker';
import { apiService, clearApiCache } from '../services/apiService';
import { supabase } from '../services/supabase';
import { BlurView } from 'expo-blur';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import SmartImage from '../components/SmartImage';
import VideoBackground from '../components/VideoBackground';
import { useAuthStore } from '../store/useAuthStore';
import PlayerProfileSkeleton from '../components/PlayerProfileSkeleton';
import { SlideButton } from '../components/SlideButton';
import ReplayVideoCard from '../components/ReplayVideoCard';

const { width } = Dimensions.get('window');

const getPositionFullUz = (pos: string) => {
    const map: any = {
        'GK': 'Darvozabon',
        'LB': 'Chap qanot himoyachisi',
        'CB': 'Markaziy himoyachi',
        'RB': "O'ng qanot himoyachisi",
        'CDM': 'Tayanch yarim himoyachisi',
        'CM': 'Markaziy yarim himoyachisi',
        'CAM': 'Hujumkor yarim himoyachisi',
        'LW': 'Chap qanot hujumchisi',
        'RW': "O'ng qanot hujumchisi",
        'ST': 'Markaziy hujumchi',
        'CF': 'Ikkinchi hujumchi',
        'LM': 'Chap qanot yarim himoyachisi',
        'RM': "O'ng qanot yarim himoyachisi",
        'LWB': 'Chap qanot qanot himoyachisi',
        'RWB': "O'ng qanot qanot himoyachisi",
    };
    return map[pos?.toUpperCase()] || pos || 'O\'YINCHI';
};

// Universal Player Metadata Extractor
const extractPlayerData = (data: any) => {
    if (!data) return null;
    let citizenship = data.citizenship || '';
    let height = data.height || '';
    let weight = data.weight || '';
    let instaUser = data.instagram_username || '';
    let instaUrl = data.instagram_url || '';

    if (data.comment && typeof data.comment === 'string') {
        const metaMatch = data.comment.match(/\[METADATA:({[^\]]+})\]/);
        if (metaMatch?.[1]) {
            try {
                const obj = JSON.parse(metaMatch[1]);
                if (obj.citizenship && !citizenship) citizenship = obj.citizenship;
                if (obj.height && !height) height = obj.height;
                if (obj.weight && !weight) weight = obj.weight;
            } catch (e) {}
        }

        const instaMatch = data.comment.match(/\[INSTAGRAM:(https?:\/\/[^\]]+)\]/);
        if (instaMatch?.[1]) {
            instaUrl = instaMatch[1];
            const uMatch = instaUrl.match(/instagram\.com\/([^/]+)/);
            if (uMatch?.[1]) instaUser = uMatch[1];
        }
    }

    return {
        ...data,
        citizenship,
        height,
        weight,
        fatherName: data.fatherName || data.father_name || '',
        instagram_username: instaUser,
        instagram_url: instaUrl
    };
};

const calculateAgeFromBirthDate = (birthStr?: string, defaultAge?: any) => {
    if (!birthStr) return defaultAge ? `${defaultAge} yosh` : '—';
    const str = String(birthStr).trim();
    let day: number | null = null;
    let month: number | null = null;
    let year: number | null = null;

    if (str.includes('.')) {
        const parts = str.split('.');
        if (parts.length >= 3) {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            year = parseInt(parts[2], 10);
        }
    } else if (str.includes('-')) {
        const parts = str.split('-');
        if (parts.length >= 3) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            day = parseInt(parts[2], 10);
        }
    } else if (/^\d{8}$/.test(str)) {
        day = parseInt(str.substring(0, 2), 10);
        month = parseInt(str.substring(2, 4), 10);
        year = parseInt(str.substring(4, 8), 10);
    } else {
        const yrMatch = str.match(/\b(19\d{2}|20\d{2})\b/);
        if (yrMatch) {
            year = parseInt(yrMatch[1], 10);
            month = 1;
            day = 1;
        }
    }

    if (!year || isNaN(year) || year < 1920 || year > 2026) {
        return defaultAge ? `${defaultAge} yosh` : '—';
    }

    const today = new Date('2026-07-27');
    let age = today.getFullYear() - year;
    if (month && day && !isNaN(month) && !isNaN(day)) {
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();
        if (currentMonth < month || (currentMonth === month && currentDay < day)) {
            age--;
        }
    }

    return age > 0 ? `${age} yosh` : (defaultAge ? `${defaultAge} yosh` : '—');
};

const MyStatsScreen = ({ navigation }: any) => {
    const user = useAuthStore((state) => state.user);
    const [loading, setLoading] = useState(true);
    const [player, setPlayer] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('profil');
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const [matches, setMatches] = useState<any[]>([]);
    const [matchesLoading, setMatchesLoading] = useState(false);
    const [playerReplays, setPlayerReplays] = useState<any[]>([]);
    const [replaysLoading, setReplaysLoading] = useState(false);
    
    // Instagram state
    const [showInstagramModal, setShowInstagramModal] = useState(false);
    const [instagramInput, setInstagramInput] = useState('');
    const [savingInstagram, setSavingInstagram] = useState(false);
    const [instagramUsername, setInstagramUsername] = useState('');
    const [openingInstagram, setOpeningInstagram] = useState(false);

    const handleOpenInstagram = async (url: string) => {
        if (!url || openingInstagram) return;
        try {
            setOpeningInstagram(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Xatolik', 'Instagram havolasini ochib bo\'lmadi');
            }
        } catch (error) {
            console.error('Error opening instagram URL:', error);
        } finally {
            setTimeout(() => setOpeningInstagram(false), 1200);
        }
    };

    // Profile Update Request state
    const [showProfileUpdateModal, setShowProfileUpdateModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [submittingUpdate, setSubmittingUpdate] = useState(false);
    const [updateSubmitStatus, setUpdateSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [pickerLoading, setPickerLoading] = useState(false);

    // Export State & ViewShot Ref
    const [exportState, setExportState] = useState<'idle' | 'loading' | 'complete'>('idle');
    const [exportProgress, setExportProgress] = useState(0);
    const [showExportModal, setShowExportModal] = useState(false);
    const posterShotRef = useRef<any>(null);

    const handleExportPress = () => {
        if (exportState !== 'idle') return;
        setExportState('loading');
        setExportProgress(0);

        let current = 0;
        const timer = setInterval(() => {
            current += 10;
            setExportProgress(current);
            if (current >= 100) {
                clearInterval(timer);
                setExportState('complete');
                setShowExportModal(true);
                setTimeout(() => {
                    setExportState('idle');
                    setExportProgress(0);
                }, 3000);
            }
        }, 120);
    };

    const handleSharePoster = async () => {
        try {
            if (posterShotRef.current) {
                const uri = await captureRef(posterShotRef, {
                    format: 'png',
                    quality: 1.0,
                    result: 'tmpfile'
                });
                const isAvailable = await Sharing.isAvailableAsync();
                if (isAvailable) {
                    await Sharing.shareAsync(uri, {
                        mimeType: 'image/png',
                        dialogTitle: 'Matchday Player Card',
                        UTI: 'public.png'
                    });
                } else {
                    Alert.alert('Tayyor!', `Posteringiz saqlandi: ${uri}`);
                }
            } else {
                Alert.alert('Eslatma', 'Posterni rasmga olib bo\'lmadi. Qayta urinib ko\'ring.');
            }
        } catch (err: any) {
            console.error('Poster capture error:', err);
            Alert.alert('Xatolik', 'Posterni saqlashda xatolik yuz berdi');
        }
    };

    const passportNumberRef = useRef<TextInput>(null);

    const [updateForm, setUpdateForm] = useState({
        photoUrl: '',
        phone: '',
        firstName: '',
        lastName: '',
        fatherName: '',
        position: '',
        playerNumber: '',
        passportSeries: '',
        passportNumber: '',
        citizenship: '',
        height: '',
        weight: '',
        instagramUsername: '',
        birthDay: '15',
        birthMonth: '05',
        birthYear: '1998'
    });

    const slideAnim = useRef(new Animated.Value(0)).current;

    const tabs = ['profil', 'karyerasi', 'oyinlari'];
    const tabLabels: any = {
        profil: 'PROFIL',
        karyerasi: 'KARYERAM',
        oyinlari: "O'YINLARI"
    };

    const activeTabRef = useRef(activeTab);
    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    const nextTab = () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}

        const currentIndex = tabs.indexOf(activeTabRef.current);
        const nextIndex = (currentIndex + 1) % tabs.length;
        const nextTabName = tabs[nextIndex];
        
        Animated.timing(slideAnim, {
            toValue: -80,
            duration: 100,
            useNativeDriver: true,
        }).start(() => {
            setActiveTab(nextTabName);
            slideAnim.setValue(80);
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 7,
                tension: 45,
                useNativeDriver: true,
            }).start();
        });
    };

    const prevTab = () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}

        const currentIndex = tabs.indexOf(activeTabRef.current);
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        const prevTabName = tabs[prevIndex];
        
        Animated.timing(slideAnim, {
            toValue: 80,
            duration: 100,
            useNativeDriver: true,
        }).start(() => {
            setActiveTab(prevTabName);
            slideAnim.setValue(-80);
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 7,
                tension: 45,
                useNativeDriver: true,
            }).start();
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                const isStrictHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2.2 && Math.abs(gestureState.dx) > 12;
                return isStrictHorizontal;
            },
            onPanResponderGrant: () => {
                setScrollEnabled(false);
            },
            onPanResponderMove: (evt, gestureState) => {
                slideAnim.setValue(gestureState.dx / 2.2);
            },
            onPanResponderRelease: (evt, gestureState) => {
                setScrollEnabled(true);
                if (gestureState.dx < -45) {
                    nextTab();
                } else if (gestureState.dx > 45) {
                    prevTab();
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        friction: 7,
                        tension: 50,
                        useNativeDriver: true,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                setScrollEnabled(true);
                Animated.spring(slideAnim, {
                    toValue: 0,
                    friction: 7,
                    tension: 50,
                    useNativeDriver: true,
                }).start();
            }
        })
    ).current;

    useEffect(() => {
        if (user && user.id && user.role === 'player') {
            fetchPlayer();
        } else {
            setLoading(false);
        }
    }, [user]);

    // Player Transfers History state
    const [playerTransfers, setPlayerTransfers] = useState<any[]>([]);

    const fetchPlayer = async () => {
        try {
            setLoading(true);
            const [data, transfersData] = await Promise.all([
                apiService.getPlayerById(user.id),
                apiService.getPlayerTransfers(user.id).catch(() => [])
            ]);
            if (data) {
                const parsed = extractPlayerData(data);
                setPlayer(parsed);
                if (parsed.instagram_username) {
                    setInstagramUsername(parsed.instagram_username);
                    setInstagramInput(parsed.instagram_username);
                }
                if (activeTab === 'oyinlari') fetchPlayerMatches();
            }
            if (transfersData) {
                setPlayerTransfers(transfersData);
            }
        } catch (error) {
            console.error('Error fetching my stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlayerMatches = async () => {
        if (!user?.id) return;
        try {
            setMatchesLoading(true);
            const data = await apiService.getPlayerMatches(user.id);
            setMatches(data || []);
        } catch (error) {
            console.error('Error fetching player matches:', error);
        } finally {
            setMatchesLoading(false);
        }
    };

    useEffect(() => {
        const fetchPlayerReplays = async () => {
            const pId = player?.id || player?._id || user?.id;
            if (!pId) return;
            setReplaysLoading(true);
            try {
                // Find all application IDs associated with this player
                const playerPhone = player?.phone || user?.phone;
                let targetPlayerIds = [pId];
                if (playerPhone) {
                    const cleanPhone = String(playerPhone).replace(/\D/g, '').slice(-9);
                    const { data: siblings } = await supabase
                        .from('applications')
                        .select('id')
                        .ilike('phone', `%${cleanPhone}%`);
                    if (siblings && siblings.length > 0) {
                        targetPlayerIds = [...new Set([pId, ...siblings.map(s => s.id)])];
                    }
                }

                const { data: events, error } = await supabase
                    .from('match_events')
                    .select('*, match:match_id(*, home_team:home_team_id(id, name, logo_url), away_team:away_team_id(id, name, logo_url)), player:player_id(*)')
                    .in('player_id', targetPlayerIds)
                    .order('created_at', { ascending: false });

                if (events && events.length > 0) {
                    const validReplays = events.filter((e: any) =>
                        Boolean(e.replay_video_url || e.video_url || e.replay_url || e.video)
                    );
                    setPlayerReplays(validReplays);
                } else {
                    setPlayerReplays([]);
                }
            } catch (e) {
                console.warn('Error fetching player replays:', e);
            } finally {
                setReplaysLoading(false);
            }
        };

        fetchPlayerReplays();
    }, [player?.id, player?._id, user?.id, player?.phone]);

    // Save Instagram Username & URL Permanently in DB
    const handleSaveInstagram = async () => {
        if (!instagramInput.trim()) return;
        setSavingInstagram(true);
        try {
            const username = instagramInput.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9._]/g, '');
            const fullUrl = `https://www.instagram.com/${username}/`;

            const currentComment = player?.comment || '';
            const cleanComment = currentComment.replace(/\[INSTAGRAM:[^\]]+\]/g, '').trim();
            const updatedComment = `${cleanComment} [INSTAGRAM:${fullUrl}]`.trim();

            const targetId = player?.id || player?._id || user?.id;

            if (targetId) {
                await supabase
                    .from('applications')
                    .update({ comment: updatedComment })
                    .eq('id', targetId);
            }
            
            if (user?.phone) {
                await supabase
                    .from('applications')
                    .update({ comment: updatedComment })
                    .eq('phone', user.phone);
            }

            clearApiCache();

            setInstagramUsername(username);
            setPlayer((prev: any) => ({
                ...prev,
                instagram_username: username,
                instagram_url: fullUrl,
                comment: updatedComment
            }));
            setShowInstagramModal(false);
            Alert.alert('Muvaffaqiyatli', 'Instagram profili saqlandi');
        } catch (err: any) {
            console.error('Error saving instagram:', err);
            Alert.alert('Xatolik', 'Instagram profili saqlashda xatolik yuz berdi');
        } finally {
            setSavingInstagram(false);
        }
    };

    // Open Profile Update Modal
    const handleOpenUpdateModal = () => {
        const bDate = player?.birth_date || player?.birthDate || '1998-05-15';
        let day = '15', month = '05', year = '1998';

        if (String(bDate).includes('.')) {
            const p = String(bDate).split('.');
            day = p[0] || '15';
            month = p[1] || '05';
            year = p[2] || '1998';
        } else if (String(bDate).includes('-')) {
            const p = String(bDate).split('-');
            year = p[0] || '1998';
            month = p[1] || '05';
            day = p[2] || '15';
        } else if (/^\d{8}$/.test(String(bDate))) {
            day = String(bDate).substring(0, 2);
            month = String(bDate).substring(2, 4);
            year = String(bDate).substring(4, 8);
        }

        setUpdateForm({
            photoUrl: player?.photo || player?.avatar || '',
            phone: player?.phone || '',
            firstName: player?.firstName || player?.first_name || '',
            lastName: player?.lastName || player?.last_name || '',
            fatherName: player?.fatherName || player?.father_name || '',
            position: player?.position || '',
            playerNumber: String(player?.number || player?.player_number || ''),
            passportSeries: player?.passport_series || player?.passportSeries || '',
            passportNumber: player?.passport_number || player?.passportNumber || '',
            citizenship: player?.citizenship || '',
            height: String(player?.height || ''),
            weight: String(player?.weight || ''),
            instagramUsername: player?.instagram_username || instagramUsername || '',
            birthDay: day.padStart(2, '0'),
            birthMonth: month.padStart(2, '0'),
            birthYear: year
        });
        setShowProfileUpdateModal(true);
    };

    const handlePickImage = async () => {
        try {
            setPickerLoading(true);
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert('Ruxsat kerak', 'Rasmni tanlash uchun galereyaga ruxsat bering');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets[0]?.uri) {
                const localUri = result.assets[0].uri;
                
                // 1. Immediately set localUri preview so user sees chosen photo right away!
                setUpdateForm(prev => ({ ...prev, photoUrl: localUri }));

                try {
                    const uploadRes = await apiService.uploadPhoto(localUri);
                    if (uploadRes && uploadRes.url && uploadRes.url.startsWith('http')) {
                        setUpdateForm(prev => ({ ...prev, photoUrl: uploadRes.url }));
                    }
                } catch (upErr) {
                    console.warn('Photo upload failed, keeping local uri preview:', upErr);
                }
            }
        } catch (err: any) {
            console.error('Error picking image:', err);
            Alert.alert('Xatolik', 'Rasmni tanlashda xatolik yuz berdi');
        } finally {
            setPickerLoading(false);
        }
    };

    // Submit Profile Update Ticket to Admin
    const handleSubmitProfileUpdate = async () => {
        setSubmittingUpdate(true);
        setUpdateSubmitStatus('loading');
        try {
            const formattedBirthDate = `${updateForm.birthDay}.${updateForm.birthMonth}.${updateForm.birthYear}`;
            const targetOrgId = player?.organization_id || player?.org_id || player?.teams?.organization_id || 1;
            const targetTeamId = player?.team_id || player?.teams?.id || null;
            const targetLeague = player?.league || player?.teams?.league || '';
            const targetPlayerId = player?.id || user?.id;

            // Ensure photo is uploaded to Supabase Storage if it is a local file URI
            let finalPhotoUrl = updateForm.photoUrl || player?.photo || player?.avatar || null;
            if (finalPhotoUrl && (finalPhotoUrl.startsWith('file:') || finalPhotoUrl.startsWith('content:') || finalPhotoUrl.startsWith('ph:') || finalPhotoUrl.startsWith('blob:'))) {
                const uRes: any = await apiService.uploadPhoto(finalPhotoUrl);
                if (uRes && uRes.url && uRes.url.startsWith('http')) {
                    finalPhotoUrl = uRes.url;
                } else {
                    // Fallback to existing valid HTTP photo if upload failed
                    const existingPhoto = player?.photo || player?.avatar || '';
                    finalPhotoUrl = existingPhoto.startsWith('http') ? existingPhoto : null;
                }
            }

            const pSeries = (updateForm.passportSeries || '').toUpperCase().trim();
            const pNumber = (updateForm.passportNumber || '').trim();
            const cleanInsta = (updateForm.instagramUsername || '').trim().replace(/^@/, '');
            const instaUrl = cleanInsta ? `https://www.instagram.com/${cleanInsta}/` : '';

            const pData = extractPlayerData(player) || {};
            const payload = {
                playerId: targetPlayerId,
                oldData: {
                    firstName: player?.firstName || player?.first_name || '',
                    lastName: player?.lastName || player?.last_name || '',
                    fatherName: pData.fatherName || player?.father_name || '',
                    phone: player?.phone || '',
                    position: player?.position || '',
                    playerNumber: player?.number || player?.player_number || '',
                    photoUrl: player?.photo || player?.avatar || '',
                    passportSeries: player?.passport_series || player?.passportSeries || '',
                    passportNumber: player?.passport_number || player?.passportNumber || '',
                    citizenship: pData.citizenship || player?.citizenship || '',
                    height: String(pData.height || player?.height || ''),
                    weight: String(pData.weight || player?.weight || ''),
                    instagramUsername: pData.instagram_username || player?.instagram_username || instagramUsername || '',
                    birthDate: player?.birth_date || player?.birthDate || ''
                },
                newData: {
                    ...updateForm,
                    photoUrl: finalPhotoUrl,
                    instagramUsername: cleanInsta,
                    instagramUrl: instaUrl,
                    birthDate: formattedBirthDate,
                    passportSeries: pSeries,
                    passportNumber: pNumber
                }
            };

            let commentPayload = '[PROFILE_UPDATE]' + JSON.stringify({ oldData: payload.oldData, newData: payload.newData, playerId: targetPlayerId });
            if (targetLeague) {
                commentPayload += ` [LEAGUE:${targetLeague}]`;
            }
            if (instaUrl) {
                commentPayload += ` [INSTAGRAM:${instaUrl}]`;
            }

            let { error } = await supabase
                .from('applications')
                .insert([{
                    organization_id: targetOrgId,
                    team_id: targetTeamId,
                    first_name: updateForm.firstName || player?.first_name || 'Futbolchi',
                    last_name: updateForm.lastName || player?.last_name || '',
                    father_name: updateForm.fatherName || player?.father_name || '',
                    phone: updateForm.phone || player?.phone || '',
                    position: updateForm.position || player?.position || 'O\'YINCHI',
                    player_number: updateForm.playerNumber ? Number(updateForm.playerNumber) : (player?.player_number || 0),
                    passport_series: pSeries,
                    passport_number: pNumber,
                    photo_url: finalPhotoUrl,
                    birth_date: formattedBirthDate,
                    comment: commentPayload,
                    status: 'pending'
                }]);

            if (error && (error.message.includes('valid_status') || error.code === '23514')) {
                const retryRes = await supabase
                    .from('applications')
                    .insert([{
                        organization_id: targetOrgId,
                        team_id: targetTeamId,
                        first_name: updateForm.firstName || player?.first_name || 'Futbolchi',
                        last_name: updateForm.lastName || player?.last_name || '',
                        father_name: updateForm.fatherName || player?.father_name || '',
                        phone: updateForm.phone || player?.phone || '',
                        position: updateForm.position || player?.position || 'O\'YINCHI',
                        player_number: updateForm.playerNumber ? Number(updateForm.playerNumber) : (player?.player_number || 0),
                        passport_series: pSeries,
                        passport_number: pNumber,
                        photo_url: finalPhotoUrl,
                        birth_date: formattedBirthDate,
                        comment: commentPayload,
                        status: 'PENDING'
                    }]);
                error = retryRes.error;
            }

            if (error) {
                setUpdateSubmitStatus('error');
                console.error('Supabase profile update insert error:', error);
                Alert.alert('Xatolik yuz berdi', error.message);
                return;
            }

            // Trigger Admin Push Notification
            try {
                const { API_BASE_URL } = require('../constants/ApiConfig');
                const fullName = `${updateForm.firstName || player?.first_name || ''} ${updateForm.lastName || player?.last_name || ''}`.trim() || 'Futbolchi';
                fetch(`${API_BASE_URL}/api/notifications/notify-admin-profile-update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        playerName: fullName,
                        playerId: targetPlayerId,
                        phone: updateForm.phone || player?.phone,
                        organizationId: targetOrgId || 1,
                    }),
                }).catch(() => {});
            } catch (e) {}

            setUpdateSubmitStatus('success');
            setShowProfileUpdateModal(false);
            setShowSuccessModal(true);
        } catch (err: any) {
            setUpdateSubmitStatus('error');
            console.error('Error submitting profile update:', err);
            Alert.alert('Xatolik', err.message || 'Arizani yuborib bo\'lmadi');
        } finally {
            setSubmittingUpdate(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#050811' }}>
                <VideoBackground
                    source={require('../assets/images/welcomeScreenVideo1.mp4')}
                    overlayOpacity={0.85}
                    style={StyleSheet.absoluteFill}
                />
                <PlayerProfileSkeleton />
            </View>
        );
    }

    if (!user || user.role !== 'player' || !player) {
        return (
            <SafeAreaView style={styles.emptyContainer}>
                <StatusBar barStyle="light-content" />
                <View style={styles.emptyContent}>
                    <Ionicons name="person-circle-outline" size={80} color="rgba(255,255,255,0.2)" />
                    <Text style={styles.emptyTitle}>PROFIL MAVJUD EMAS</Text>
                    <Text style={styles.emptySub}>
                        Ushbu bo'lim faqat futbolchi sifatida ro'yxatdan o'tgan foydalanuvchilar uchun amal qiladi.
                    </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Welcome')} style={styles.loginBtn}>
                        <Text style={styles.loginBtnText}>TIZIMGA KIRISH</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const stats = player.stats || {
        goals: player.goals || 0,
        assists: player.assists || 0,
        matchesPlayed: player.matchesPlayed || 0,
        yellowCards: player.yellowCards || 0,
        redCards: player.redCards || 0,
        rating: player.rating || 0
    };

    const instagramUrl = instagramUsername ? `https://www.instagram.com/${instagramUsername}/` : null;
    const computedAge = calculateAgeFromBirthDate(player.birth_date || player.birthDate, player.age);

    const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
    const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const years = Array.from({ length: 65 }, (_, i) => String(2025 - i));

    const renderProfil = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.statsGrid}>
                <StatBox label="GOLLAR" value={stats.goals} icon="football" color={Colors.primary} />
                <StatBox label="ASSISTLAR" value={stats.assists} icon="shoe-prints" color="#3b82f6" />
                <StatBox label="O'YINLAR" value={stats.matchesPlayed} icon="calendar" color="#FFF" />
                <StatBox label="REYTING" value={stats.rating || player.rating || 0} icon="trending-up" color="#FACC15" />
            </View>

            <View style={styles.physicalInfoBox}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.cardContent}>
                    <View style={styles.statItem}>
                        <View style={styles.statIconBox}><Ionicons name="calendar-outline" size={18} color={Colors.primary} /></View>
                        <View>
                            <Text style={styles.statLabelSmall}>YOSHI</Text>
                            <Text style={styles.statValueSmall}>{computedAge}</Text>
                        </View>
                    </View>
                    <View style={styles.statItem}>
                        <View style={styles.statIconBox}><Ionicons name="resize-outline" size={18} color={Colors.primary} /></View>
                        <View>
                            <Text style={styles.statLabelSmall}>BO'YI</Text>
                            <Text style={styles.statValueSmall}>{player?.height ? `${player.height} SM` : '—'}</Text>
                        </View>
                    </View>
                    <View style={styles.statItem}>
                        <View style={styles.statIconBox}><Ionicons name="fitness-outline" size={18} color={Colors.primary} /></View>
                        <View>
                            <Text style={styles.statLabelSmall}>VAZNI</Text>
                            <Text style={styles.statValueSmall}>{player?.weight ? `${player.weight} KG` : '—'}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.infoSection}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="person-circle" size={20} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>SHAXSIY <Text style={styles.sectionTitleHighlight}>MA'LUMOTLAR</Text></Text>
                </View>
                <View style={styles.infoList}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <InfoRow label="OTASINING ISMI" value={player.fatherName || player.father_name || '---'} icon="person" />
                    <InfoRow label="MILLATI" value={player.citizenship || '---'} icon="planet" />
                    <InfoRow label="POZITSIYA" value={player.positionUz || player.position || '---'} icon="shield" />
                    <InfoRow label="TELEFON (raqamingiz faqat sizga ko'rinadi)" value={player.phone || '---'} icon="call" />
                </View>
            </View>

            <View style={{ marginBottom: 35 }} />
        </ScrollView>
    );

    const formatTransferDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const day = String(d.getDate()).padStart(2, '0');
            const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
            const monthName = months[d.getMonth()];
            const year = d.getFullYear();
            return `${day}-${monthName}, ${year}`;
        } catch (e) {
            return dateStr.slice(0, 10);
        }
    };

    const renderCareer = () => {
        const approvedTransfers = playerTransfers.filter((t: any) => t.status === 'approved');
        const currentTeamName = player?.teams?.name || (approvedTransfers[0]?.new_team_name) || player?.team_name || 'Jamoa';
        const currentTeamLogo = player?.teams?.logo_url || player?.teams?.logo || player?.team_logo || (approvedTransfers[0]?.new_team_logo);

        return (
            <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                    <Ionicons name="time-outline" size={20} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>KARYERA <Text style={styles.sectionTitleHighlight}>TARIXI</Text></Text>
                </View>

                <View style={styles.careerTimelineContainer}>
                    {/* 1. HOZIRGI JAMOASI (CURRENT ACTIVE TEAM) */}
                    <View style={[styles.teamCareerWrapper, styles.teamCareerCurrent]}>
                        <View style={styles.teamMainRow}>
                            <View style={[styles.teamIconBox, { borderColor: '#00FF66', borderWidth: 1.5, width: 36, height: 36, borderRadius: 10 }]}>
                                {currentTeamLogo ? (
                                    <Image source={{ uri: currentTeamLogo }} style={{ width: 26, height: 26 }} contentFit="contain" />
                                ) : (
                                    <Ionicons name="shield" size={18} color="#00FF66" />
                                )}
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={[styles.teamNameCareer, { color: '#00FF66', fontSize: 14 }]} numberOfLines={1}>
                                        {(currentTeamName || 'AMALDAGI JAMOA').toUpperCase()}
                                    </Text>
                                    <View style={styles.currentTeamBadge}>
                                        <View style={styles.pulsingDot} />
                                        <Text style={styles.currentTeamBadgeText}>HOZIRGI JAMOA</Text>
                                    </View>
                                </View>
                                <Text style={styles.careerDateSub}>Amaldagi jamoasi • Hozirga qadar</Text>
                            </View>
                        </View>
                    </View>

                    {/* 2. TRANSFER BO'LGAN AVVALGI JAMOALARI (PAST TEAMS WITH EXACT TRANSFER DATE) */}
                    {approvedTransfers.map((tr: any, idx: number) => {
                        const trDate = formatTransferDate(tr.created_at);
                        const oldLogo = tr.old_team_logo;
                        const oldName = tr.old_team_name || 'Eski jamoasi';

                        return (
                            <View key={tr.id || idx} style={[styles.teamCareerWrapper, { borderLeftWidth: 3, borderLeftColor: 'rgba(255,255,255,0.25)', marginTop: 8 }]}>
                                <View style={styles.teamMainRow}>
                                    <View style={[styles.teamIconBox, { width: 34, height: 34, borderRadius: 10 }]}>
                                        {oldLogo ? (
                                            <Image source={{ uri: oldLogo }} style={{ width: 24, height: 24 }} contentFit="contain" />
                                        ) : (
                                            <Ionicons name="shield-outline" size={16} color="rgba(255,255,255,0.6)" />
                                        )}
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Text style={styles.teamNameCareer} numberOfLines={1}>
                                                {oldName.toUpperCase()}
                                            </Text>
                                            <View style={styles.transferredBadge}>
                                                <Ionicons name="arrow-forward" size={10} color="#94A3B8" />
                                                <Text style={styles.transferredBadgeText}>ESKI JAMOA</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.careerDateSub}>
                                            🗓️ Transfer sanasi: {trDate}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Player's Personal 20s Goal Replay Clips Feed */}
                <View style={{ marginTop: 24, marginBottom: 20 }}>
                    <View style={[styles.sectionHeader, { marginBottom: 12 }]}>
                        <Ionicons name="videocam" size={20} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>SHAXSIY <Text style={styles.sectionTitleHighlight}>GOL QAYTARIQLARI (REPLAYS)</Text></Text>
                    </View>

                    {replaysLoading ? (
                        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 15 }} />
                    ) : playerReplays.length > 0 ? (
                        playerReplays.map((ev: any, idx: number) => {
                            const m = ev.match || {};
                            const isHome = ev.team_id === m.home_team_id;
                            const homeName = m.home_team?.name || m.home_team_name || 'Uy Jamoasi';
                            const awayName = m.away_team?.name || m.away_team_name || 'Mehmon Jamoasi';
                            const currentTeamName = isHome ? homeName : awayName;
                            const currentTeamLogo = isHome ? (m.home_team?.logo_url || m.home_team_logo) : (m.away_team?.logo_url || m.away_team_logo);
                            const scorerName = ev.player ? `${ev.player.first_name || ''} ${ev.player.last_name || ''}`.trim() : `${player?.first_name || ''} ${player?.last_name || ''}`.trim();
                            const scorerPhoto = ev.player?.photo_url || player?.photo_url || player?.photo || null;
                            const vUrl = ev.replay_video_url || ev.video_url || ev.replay_url || ev.video;

                            return (
                                <ReplayVideoCard
                                    key={ev.id || idx}
                                    videoUrl={vUrl}
                                    minute={ev.minute}
                                    teamName={currentTeamName}
                                    teamLogo={currentTeamLogo}
                                    scorerName={scorerName}
                                    scorerPhoto={scorerPhoto}
                                    eventType={ev.event_type || 'goal'}
                                />
                            );
                        })
                    ) : (
                        <View style={styles.emptyCareer}>
                            <Ionicons name="videocam-outline" size={32} color="rgba(255,255,255,0.2)" />
                            <Text style={[styles.emptyCareerText, { marginTop: 6 }]}>Shaxsiy gol qaytariqlari hali mavjud emas</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        );
    };

    const renderMatches = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                <Ionicons name="football-outline" size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>O'TGAN <Text style={styles.sectionTitleHighlight}>O'YINLAR</Text></Text>
            </View>

            {matchesLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
            ) : matches.length > 0 ? (
                matches.map((match: any) => (
                    <MatchCard key={match.id || match._id} match={match} />
                ))
            ) : (
                <View style={styles.emptyCareer}>
                    <Text style={styles.emptyCareerText}>O'yinlar tarixi mavjud emas</Text>
                </View>
            )}
        </ScrollView>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                overlayOpacity={0.8}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView 
                scrollEnabled={scrollEnabled}
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
            >
                <View style={styles.heroSection}>
                    {/* AMATORA BRAND HEADER (SIDE-BY-SIDE WITH LOGO) */}
                    <View style={styles.brandHeaderWrapper}>
                        <Image
                            source={require('../assets/logo.png')}
                            style={{ width: 18, height: 18, marginRight: 6 }}
                            resizeMode="contain"
                        />
                        <Text style={styles.brandText}>AMATORA</Text>
                    </View>

                    {/* ⚽ PARALLEL TOP ROW: BACK BUTTON ALIGNED TO TOP EDGE PARALLEL WITH PLAYER PHOTO */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', marginTop: 30, marginBottom: 20 }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonBtn}>
                            <Ionicons name="arrow-back" size={22} color="#FFF" />
                        </TouchableOpacity>

                        {/* PLAYER PHOTO CREST (BIGGER 1X1 SQUARE CARD) */}
                        <View style={{ position: 'relative' }}>
                            <View style={{
                                width: 118,
                                height: 118,
                                borderRadius: 22,
                                borderWidth: 1.5,
                                borderColor: 'rgba(0, 255, 135, 0.7)',
                                padding: 2,
                                backgroundColor: '#0A1224',
                                overflow: 'hidden',
                                shadowColor: '#00FF87',
                                shadowRadius: 16,
                                shadowOpacity: 0.35,
                                elevation: 8
                            }}>
                                <SmartImage
                                    uri={player.photo || player.avatar}
                                    style={{ width: '100%', height: '100%', borderRadius: 18 }}
                                    contentFit="cover"
                                    fallbackIcon="person"
                                />
                            </View>

                            {/* UNIQUE TILTED FOOTBALL CREST SHIRT NUMBER BADGE */}
                            <View style={{
                                position: 'absolute',
                                bottom: -4,
                                right: -4,
                                backgroundColor: '#00FF87',
                                borderWidth: 2,
                                borderColor: '#050A14',
                                paddingHorizontal: 9,
                                paddingVertical: 2.5,
                                borderRadius: 10,
                                transform: [{ rotate: '-8deg' }],
                                shadowColor: '#00FF87',
                                shadowRadius: 10,
                                shadowOpacity: 0.6,
                                elevation: 6
                            }}>
                                <Text style={{ color: '#050A14', fontWeight: '900', fontSize: 11, fontStyle: 'italic', letterSpacing: 0.5 }}>
                                    #{player.number || player.player_number || '0'}
                                </Text>
                            </View>
                        </View>

                        {/* PENCIL EDIT BUTTON PARALLEL TO BACK BUTTON & PLAYER PHOTO */}
                        <TouchableOpacity onPress={handleOpenUpdateModal} style={styles.backButtonBtn}>
                            <Ionicons name="create-outline" size={20} color="#00FF87" />
                        </TouchableOpacity>
                    </View>

                    {/* PLAYER DETAILS CENTERED BELOW */}
                    <View style={{ alignItems: 'center', marginBottom: 8 }}>

                        {/* PLAYER FULL NAME (FIRST NAME NEON GREEN, LAST NAME WHITE) */}
                        <Text style={{
                            fontWeight: '900',
                            fontSize: 22,
                            letterSpacing: 0.5,
                            textAlign: 'center',
                            textTransform: 'uppercase'
                        }}>
                            <Text style={{ color: '#00FF87' }}>{(player.firstName || player.first_name || '').toUpperCase()}</Text>{' '}
                            <Text style={{ color: '#FFFFFF' }}>{(player.lastName || player.last_name || '').toUpperCase()}</Text>
                        </Text>

                        {/* CENTERED BADGES ROW: TEAM LOGO + POSITION & RATING */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                            {/* POSITION BADGE WITH TEAM LOGO */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: 'rgba(255, 255, 255, 0.07)',
                                borderWidth: 1,
                                borderColor: 'rgba(255, 255, 255, 0.14)',
                                paddingHorizontal: 12,
                                paddingVertical: 5,
                                borderRadius: 20
                            }}>
                                {(player?.teams?.logo_url || player?.teams?.logo || player?.team_logo || player?.teamLogo) ? (
                                    <Image
                                        source={{ uri: player?.teams?.logo_url || player?.teams?.logo || player?.team_logo || player?.teamLogo }}
                                        style={{ width: 16, height: 16, borderRadius: 8 }}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <Ionicons name="shield-sharp" size={14} color="#00FF87" />
                                )}
                                <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: '800', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
                                    {getPositionFullUz(player?.positionUz || player?.position)}
                                </Text>
                            </View>

                            {/* RATING BADGE (GOLD WITH TRENDING-UP ICON) */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                backgroundColor: 'rgba(255, 215, 0, 0.15)',
                                borderWidth: 1,
                                borderColor: 'rgba(255, 215, 0, 0.4)',
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                borderRadius: 20
                            }}>
                                <Ionicons name="trending-up" size={13} color="#FFD700" />
                                <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 }}>
                                    {player?.rating !== undefined && player?.rating !== null && player?.rating !== 0 ? player.rating : (stats?.rating || 0)}
                                </Text>
                            </View>
                        </View>

                        {/* INSTAGRAM LINK BADGE */}
                        {instagramUrl ? (
                            <TouchableOpacity
                                onPress={() => handleOpenInstagram(instagramUrl)}
                                disabled={openingInstagram}
                                activeOpacity={0.7}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    backgroundColor: 'rgba(225, 48, 108, 0.14)',
                                    borderColor: 'rgba(225, 48, 108, 0.4)',
                                    borderWidth: 1,
                                    paddingHorizontal: 12,
                                    height: 26,
                                    borderRadius: 13,
                                    marginTop: 10
                                }}
                            >
                                {openingInstagram ? (
                                    <ActivityIndicator size="small" color="#E1306C" style={{ transform: [{ scale: 0.65 }], width: 14, height: 14 }} />
                                ) : (
                                    <FontAwesome5 name="instagram" size={12} color="#E1306C" />
                                )}
                                <Text style={{ color: '#E1306C', fontSize: 11, fontWeight: '800', lineHeight: 14 }}>
                                    {openingInstagram ? 'OCHILMOQDA...' : `@${instagramUsername}`}
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>

                {/* Slider-Style Tab Switcher */}
                <View style={styles.switcherWrapper}>
                    <View style={styles.carouselContainer}>
                        <View style={styles.animatedCardWrapper}>
                            <Animated.View style={[styles.miniTabCard, { transform: [{ translateX: slideAnim }] }]}>
                                <View style={styles.miniTabInner}>
                                    <View style={styles.miniTabIconBox}>
                                        <Ionicons 
                                            name={
                                                activeTab === 'profil' ? 'person' : 
                                                activeTab === 'karyerasi' ? 'trophy' : 'football'
                                            } 
                                            size={20} 
                                            color={Colors.primary} 
                                        />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.miniTabType}>BO'LIM</Text>
                                        <Text style={styles.miniTabName}>{tabLabels[activeTab]}</Text>
                                    </View>
                                </View>
                            </Animated.View>
                        </View>
                    </View>

                    <TouchableOpacity onPress={nextTab} style={styles.navArrowBtnLarge}>
                        <Ionicons name="chevron-forward" size={32} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.mainContent} {...panResponder.panHandlers}>
                    <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
                        {activeTab === 'profil' && renderProfil()}
                        {activeTab === 'karyerasi' && renderCareer()}
                        {activeTab === 'oyinlari' && renderMatches()}
                    </Animated.View>
                </View>
            </ScrollView>

            {/* ⚽ MINIMALIST ULTIMATE FOOTBALL PLAYER POSTER MODAL */}
            <Modal
                visible={showExportModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowExportModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={{ width: '90%', maxHeight: '85%', backgroundColor: '#050A14', borderRadius: 32, borderWidth: 1.5, borderColor: 'rgba(0, 255, 135, 0.3)', overflow: 'hidden', shadowColor: '#00FF87', shadowRadius: 30, shadowOpacity: 0.3, elevation: 20 }}>
                        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
                        
                        <ViewShot ref={posterShotRef} options={{ format: 'png', quality: 1.0 }} style={{ flex: 1, backgroundColor: '#050A14' }}>
                            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 28, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
                                {/* Minimalist Top Header with Original Logo */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.08)', paddingBottom: 16, marginBottom: 24 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Image
                                            source={require('../assets/logo.png')}
                                            style={{ width: 24, height: 24 }}
                                            resizeMode="contain"
                                        />
                                        <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 15, letterSpacing: 2 }}>AMATORA</Text>
                                    </View>
                                    <View style={{ backgroundColor: 'rgba(0, 255, 135, 0.12)', borderWidth: 1, borderColor: 'rgba(0, 255, 135, 0.3)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
                                        <Text style={{ color: '#00FF87', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>SEASON 2026</Text>
                                    </View>
                                </View>

                                {/* Minimalist Player Photo Crest & Rating */}
                                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                    <View style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#00FF87', padding: 4, backgroundColor: '#0A1224', shadowColor: '#00FF87', shadowRadius: 20, shadowOpacity: 0.4 }}>
                                        <Image
                                            source={{ uri: player?.photo || player?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80' }}
                                            style={{ width: '100%', height: '100%', borderRadius: 54 }}
                                            resizeMode="cover"
                                        />
                                    </View>
                                    
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFD700', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, marginTop: -14, shadowColor: '#FFD700', shadowRadius: 10, shadowOpacity: 0.6 }}>
                                        <Ionicons name="trending-up" size={14} color="#050A14" />
                                        <Text style={{ color: '#050A14', fontWeight: '900', fontSize: 13, letterSpacing: 1 }}>
                                            {player?.rating !== undefined && player?.rating !== null && player?.rating !== 0 ? player.rating : (stats?.rating || 0)} RATING
                                        </Text>
                                    </View>

                                    <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 22, marginTop: 14, letterSpacing: 0.5, textAlign: 'center' }}>
                                        {(player?.firstName || player?.first_name || 'FUTBOLCHI').toUpperCase()} {(player?.lastName || player?.last_name || '').toUpperCase()}
                                    </Text>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginTop: 8 }}>
                                        {(player?.teams?.logo_url || player?.teams?.logo || player?.team_logo || player?.teamLogo) ? (
                                            <Image
                                                source={{ uri: player?.teams?.logo_url || player?.teams?.logo || player?.team_logo || player?.teamLogo }}
                                                style={{ width: 16, height: 16, borderRadius: 8 }}
                                                resizeMode="contain"
                                            />
                                        ) : (
                                            <Ionicons name="shield-outline" size={14} color="#00FF87" />
                                        )}
                                        <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: '700', fontSize: 11, letterSpacing: 1 }}>
                                            {getPositionFullUz(player?.positionUz || player?.position)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Minimalist Grid Stats */}
                                <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 10 }}>
                                    <View style={{ flex: 1, minWidth: '45%', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', padding: 16, borderRadius: 20 }}>
                                        <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>GOLLAR</Text>
                                        <Text style={{ color: '#00FF87', fontSize: 28, fontWeight: '900', marginTop: 4 }}>{stats.goals}</Text>
                                    </View>

                                    <View style={{ flex: 1, minWidth: '45%', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', padding: 16, borderRadius: 20 }}>
                                        <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>ASSISTLAR</Text>
                                        <Text style={{ color: '#3B82F6', fontSize: 28, fontWeight: '900', marginTop: 4 }}>{stats.assists}</Text>
                                    </View>

                                    <View style={{ flex: 1, minWidth: '45%', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', padding: 16, borderRadius: 20 }}>
                                        <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>O'YINLAR</Text>
                                        <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 4 }}>{stats.matchesPlayed}</Text>
                                    </View>

                                    <View style={{ flex: 1, minWidth: '45%', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', padding: 16, borderRadius: 20 }}>
                                        <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>SARIQ / QIZIL</Text>
                                        <Text style={{ color: '#FACC15', fontSize: 28, fontWeight: '900', marginTop: 4 }}>{stats.yellowCards} / {stats.redCards}</Text>
                                    </View>
                                </View>

                                <Text style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 10, fontWeight: '600', marginTop: 14, letterSpacing: 1 }}>
                                    AMATORA LEAGUE • OFFICIAL MATCHDAY CARD
                                </Text>
                            </ScrollView>
                        </ViewShot>

                        {/* Minimalist Action Buttons */}
                        <View style={{ flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)' }}>
                            <TouchableOpacity
                                onPress={() => setShowExportModal(false)}
                                style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.06)', paddingVertical: 15, borderRadius: 18, alignItems: 'center' }}
                            >
                                <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontWeight: '800', fontSize: 13 }}>YOPISH</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleSharePoster}
                                style={{ flex: 1.5, backgroundColor: '#00FF87', paddingVertical: 15, borderRadius: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                            >
                                <Ionicons name="share-social" size={18} color="#050A14" />
                                <Text style={{ color: '#050A14', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }}>STORY'GA ULASHISH</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* INSTAGRAM MODAL */}
            <Modal
                visible={showInstagramModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowInstagramModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContentSmall}>
                        <View style={{ alignItems: 'center', marginBottom: 15 }}>
                            <View style={{ width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(225, 48, 108, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                                <FontAwesome5 name="instagram" size={26} color="#E1306C" />
                            </View>
                            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900' }}>Instagram Username</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                                Instagram akkauntingiz username'ini kiriting. (Masalan: omankulofff)
                            </Text>
                        </View>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="omankulofff"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={instagramInput}
                            onChangeText={setInstagramInput}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                            <TouchableOpacity
                                onPress={() => setShowInstagramModal(false)}
                                style={[styles.modalBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '800' }}>BEKOR QILISH</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleSaveInstagram}
                                disabled={savingInstagram}
                                style={[styles.modalBtn, { backgroundColor: Colors.primary }]}
                            >
                                <Text style={{ color: '#000', fontWeight: '900' }}>
                                    {savingInstagram ? 'SAQLANMOQDA...' : 'SAQLASH'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* PROFILE UPDATE MODAL */}
            <Modal
                visible={showProfileUpdateModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowProfileUpdateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={{ paddingVertical: 40 }} showsVerticalScrollIndicator={false}>
                        <View style={styles.modalContentLarge}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <Text style={styles.modalTitleLarge}>MA'LUMOTLARNI TAHRIRLASH</Text>
                                <TouchableOpacity onPress={() => setShowProfileUpdateModal(false)} style={{ padding: 4 }}>
                                    <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.6)" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.modalSubLarge}>
                                O'zgartirmoqchi bo'lgan ma'lumotlaringizni kiriting va tashkilotchiga yuboring.
                            </Text>

                            <View style={{ alignItems: 'center', marginVertical: 15 }}>
                                <TouchableOpacity onPress={handlePickImage} disabled={pickerLoading} style={{ position: 'relative', width: 100, height: 100, borderRadius: 20 }}>
                                    <SmartImage
                                        uri={updateForm.photoUrl || player?.photo}
                                        style={{ width: 100, height: 100, borderRadius: 20, borderWidth: 2, borderColor: Colors.primary }}
                                        contentFit="cover"
                                    />
                                    <View style={{ position: 'absolute', bottom: -4, right: -4, backgroundColor: Colors.primary, padding: 6, borderRadius: 10, zIndex: 5 }}>
                                        <Ionicons name="camera" size={16} color="#000" />
                                    </View>
                                    {pickerLoading && (
                                        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', borderRadius: 20, zIndex: 10 }}>
                                            <ActivityIndicator size="small" color={Colors.primary} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>ISM</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={updateForm.firstName}
                                    onChangeText={(text) => setUpdateForm(prev => ({ ...prev, firstName: text }))}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>FAMILIYA</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={updateForm.lastName}
                                    onChangeText={(text) => setUpdateForm(prev => ({ ...prev, lastName: text }))}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>OTASINING ISMI</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={updateForm.fatherName}
                                    onChangeText={(text) => setUpdateForm(prev => ({ ...prev, fatherName: text }))}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>TELEFON RAQAM</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={updateForm.phone}
                                    onChangeText={(text) => setUpdateForm(prev => ({ ...prev, phone: text }))}
                                    keyboardType="phone-pad"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>PASPORT SERIYA VA RAQAM</Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TextInput
                                        style={[styles.modalInput, { width: 70, textAlign: 'center', textTransform: 'uppercase' }]}
                                        value={updateForm.passportSeries}
                                        maxLength={2}
                                        onChangeText={(text) => {
                                            const cleaned = text.toUpperCase();
                                            setUpdateForm(prev => ({ ...prev, passportSeries: cleaned }));
                                            if (cleaned.length === 2) {
                                                passportNumberRef.current?.focus();
                                            }
                                        }}
                                        placeholder="AA"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                    />
                                    <TextInput
                                        ref={passportNumberRef}
                                        style={[styles.modalInput, { flex: 1 }]}
                                        value={updateForm.passportNumber}
                                        keyboardType="numeric"
                                        maxLength={7}
                                        onChangeText={(text) => setUpdateForm(prev => ({ ...prev, passportNumber: text }))}
                                        placeholder="1234567"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>TUG'ILGAN SANA (KUN / OY / YIL)</Text>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden', height: 114, justifyContent: 'center' }}>
                                        <Picker
                                            selectedValue={updateForm.birthDay}
                                            onValueChange={(val) => setUpdateForm(prev => ({ ...prev, birthDay: val }))}
                                            style={{ color: '#FFF', height: 114 }}
                                            itemStyle={{ height: 114, color: '#FFF' }}
                                            dropdownIconColor="#FFF"
                                        >
                                            {days.map(d => <Picker.Item key={d} label={d} value={d} color={Platform.OS === 'ios' ? '#FFF' : '#000'} />)}
                                        </Picker>
                                    </View>

                                    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden', height: 114, justifyContent: 'center' }}>
                                        <Picker
                                            selectedValue={updateForm.birthMonth}
                                            onValueChange={(val) => setUpdateForm(prev => ({ ...prev, birthMonth: val }))}
                                            style={{ color: '#FFF', height: 114 }}
                                            itemStyle={{ height: 114, color: '#FFF' }}
                                            dropdownIconColor="#FFF"
                                        >
                                            {months.map(m => <Picker.Item key={m} label={m} value={m} color={Platform.OS === 'ios' ? '#FFF' : '#000'} />)}
                                        </Picker>
                                    </View>

                                    <View style={{ flex: 1.2, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden', height: 114, justifyContent: 'center' }}>
                                        <Picker
                                            selectedValue={updateForm.birthYear}
                                            onValueChange={(val) => setUpdateForm(prev => ({ ...prev, birthYear: val }))}
                                            style={{ color: '#FFF', height: 114 }}
                                            itemStyle={{ height: 114, color: '#FFF' }}
                                            dropdownIconColor="#FFF"
                                        >
                                            {years.map(y => <Picker.Item key={y} label={y} value={y} color={Platform.OS === 'ios' ? '#FFF' : '#000'} />)}
                                        </Picker>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>POZITSIYA</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={updateForm.position}
                                    onChangeText={(text) => setUpdateForm(prev => ({ ...prev, position: text }))}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>RAQAM</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={updateForm.playerNumber}
                                    onChangeText={(text) => setUpdateForm(prev => ({ ...prev, playerNumber: text }))}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>MILLATI</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={updateForm.citizenship}
                                    onChangeText={(text) => setUpdateForm(prev => ({ ...prev, citizenship: text }))}
                                    placeholder="O'zbekiston"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>BO'YI (SM)</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={updateForm.height}
                                    onChangeText={(text) => setUpdateForm(prev => ({ ...prev, height: text }))}
                                    keyboardType="numeric"
                                    placeholder="178"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>VAZNI (KG)</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={updateForm.weight}
                                    onChangeText={(text) => setUpdateForm(prev => ({ ...prev, weight: text }))}
                                    keyboardType="numeric"
                                    placeholder="72"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>INSTAGRAM USERNAME</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(225, 48, 108, 0.4)' }}>
                                    <FontAwesome5 name="instagram" size={18} color="#E1306C" style={{ marginRight: 8 }} />
                                    <TextInput
                                        style={[styles.modalInput, { flex: 1, backgroundColor: 'transparent', borderWidth: 0 }]}
                                        value={updateForm.instagramUsername}
                                        onChangeText={(text) => setUpdateForm(prev => ({ ...prev, instagramUsername: text.replace(/^@/, '') }))}
                                        placeholder="username (masalan: ronaldo)"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>

                            {/* ONE-DIRECTION SLIDE BUTTON */}
                            <SlideButton
                                loading={submittingUpdate}
                                status={updateSubmitStatus}
                                title="Yuborish uchun suring"
                                helperText="Arizani yuborish uchun o'ngga suring yoki bosing"
                                onSwipeSuccess={handleSubmitProfileUpdate}
                                onReset={() => setUpdateSubmitStatus('idle')}
                            />
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* SUCCESS CONFIRMATION MODAL */}
            <Modal
                visible={showSuccessModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={styles.successModalOverlay}>
                    <View style={styles.successModalCard}>
                        <View style={styles.successIconBadge}>
                            <Ionicons name="checkmark-circle" size={42} color="#00FF66" />
                        </View>

                        <View style={styles.successTitleRow}>
                            <Text style={styles.successModalTitle}>Ariza Yuborildi</Text>
                        </View>

                        <Text style={styles.successModalSub}>
                            Ma'lumotlaringizni tahrirlash so'rovi tashkilotchiga yuborildi. Tekshiruvdan so'ng profilingiz yangilanadi.
                        </Text>

                        <TouchableOpacity
                            style={styles.successModalBtn}
                            onPress={() => setShowSuccessModal(false)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.successModalBtnText}>RAHMAT</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const StatBox = ({ label, value, icon, color }: any) => (
    <View style={styles.statBox}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
            {icon === 'shoe-prints' ? (
                <FontAwesome5 name="shoe-prints" size={16} color={color} />
            ) : (
                <Ionicons name={icon} size={20} color={color} />
            )}
        </View>
        <Text style={styles.statLabelSmall}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
    </View>
);

const InfoRow = ({ label, value, icon }: any) => (
    <View style={styles.infoRow}>
        <View style={styles.infoIconBox}>
            <Ionicons name={icon} size={16} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    </View>
);

const MatchCard = ({ match }: any) => (
    <View style={styles.matchCard}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.matchTop}>
            <Text style={styles.matchLeague}>{match.leagueName || 'Amatora Turniri'}</Text>
            <Text style={styles.matchDate}>{new Date(match.date || match.match_date || Date.now()).toLocaleDateString('uz-UZ')}</Text>
        </View>
        <View style={styles.matchTeams}>
            <View style={styles.teamInfo}>
                <SmartImage uri={match.homeTeam?.logo || match.homeTeamLogo} style={styles.matchTeamLogo} contentFit="contain" />
                <Text style={styles.matchTeamName} numberOfLines={1}>{match.homeTeam?.name || match.homeTeamName}</Text>
            </View>
            <View style={styles.matchScore}>
                <Text style={styles.scoreText}>{match.score?.home ?? match.home_score ?? 0}:{match.score?.away ?? match.away_score ?? 0}</Text>
            </View>
            <View style={styles.teamInfo}>
                <SmartImage uri={match.awayTeam?.logo || match.awayTeamLogo} style={styles.matchTeamLogo} contentFit="contain" />
                <Text style={styles.matchTeamName} numberOfLines={1}>{match.awayTeam?.name || match.awayTeamName}</Text>
            </View>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050811',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    emptyContainer: {
        flex: 1,
        backgroundColor: '#050811',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContent: {
        padding: 30,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFF',
        marginTop: 15,
    },
    emptySub: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 18,
    },
    loginBtn: {
        marginTop: 20,
        backgroundColor: Colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },
    loginBtnText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 13,
    },
    heroSection: {
        paddingTop: Platform.OS === 'ios' ? 12 : (StatusBar.currentHeight ? StatusBar.currentHeight + 5 : 20),
        paddingHorizontal: 20,
        paddingBottom: 15,
    },
    brandHeaderWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 2,
        marginBottom: 8,
    },
    brandText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 2,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    navHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    backButtonBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        zIndex: 10,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
    },
    photoContainer: {
        position: 'relative',
    },
    mainPhotoWrapper: {
        width: 115,
        height: 115,
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    profilePhoto: {
        width: '100%',
        height: '100%',
    },
    numberOverlay: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: Colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 10,
        transform: [{ rotate: '12deg' }],
    },
    numberText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 13,
    },
    nameContainer: {
        flex: 1,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    statusBadge: {
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        borderColor: 'rgba(0, 255, 102, 0.2)',
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
    },
    statusText: {
        color: Colors.primary,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    ratingBadge: {
        backgroundColor: 'rgba(250, 204, 21, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
    },
    ratingText: {
        color: '#FACC15',
        fontSize: 11,
        fontWeight: '900',
    },
    firstName: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFF',
        lineHeight: 26,
    },
    lastName: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.primary,
        lineHeight: 26,
    },
    switcherWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginVertical: 10,
    },
    carouselContainer: {
        flex: 1,
    },
    animatedCardWrapper: {
        overflow: 'hidden',
    },
    miniTabCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 14,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    miniTabInner: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniTabIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    miniTabType: {
        fontSize: 9,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 1,
    },
    miniTabName: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    navArrowBtnLarge: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.2)',
    },
    mainContent: {
        paddingHorizontal: 20,
    },
    tabContent: {
        flex: 1,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 15,
    },
    statBox: {
        width: (width - 50) / 2,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 16,
        padding: 14,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    statIconContainer: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    statLabelSmall: {
        fontSize: 10,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    statValue: {
        fontSize: 22,
        fontWeight: '900',
        color: '#FFF',
        marginTop: 2,
        textAlign: 'center',
    },
    physicalInfoBox: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        marginBottom: 15,
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 14,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(0,255,102,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValueSmall: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFF',
    },
    infoSection: {
        marginTop: 5,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    sectionTitleHighlight: {
        color: Colors.primary,
    },
    infoList: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        padding: 12,
        gap: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoIconBox: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFF',
    },
    yearBlock: {
        marginBottom: 15,
    },
    yearHeaderBadge: {
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        marginBottom: 8,
    },
    yearHeaderText: {
        color: Colors.primary,
        fontWeight: '900',
        fontSize: 12,
    },
    teamCareerWrapper: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    teamCareerCurrent: {
        backgroundColor: 'rgba(0, 255, 102, 0.05)',
        borderColor: 'rgba(0, 255, 102, 0.35)',
        borderLeftWidth: 4,
        borderLeftColor: '#00FF66',
    },
    currentTeamBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 102, 0.15)',
        borderColor: 'rgba(0, 255, 102, 0.4)',
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 5,
    },
    currentTeamBadgeText: {
        color: '#00FF66',
        fontSize: 9.5,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    pulsingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00FF66',
    },
    transferredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 4,
    },
    transferredBadgeText: {
        color: '#94A3B8',
        fontSize: 9.5,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    careerDateSub: {
        color: '#94A3B8',
        fontSize: 11.5,
        fontWeight: '600',
        marginTop: 4,
    },
    teamMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    teamIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    teamNameCareer: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 13,
    },
    emptyCareer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyCareerText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
    },
    careerTimelineContainer: {
        marginVertical: 10,
    },
    teamMiniLogo: {
        width: 18,
        height: 18,
        borderRadius: 4,
    },
    matchCard: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        padding: 12,
        marginBottom: 10,
    },
    matchTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    matchLeague: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.primary,
    },
    matchDate: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
    },
    matchTeams: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    teamInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    matchTeamLogo: {
        width: 20,
        height: 20,
    },
    matchTeamName: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },
    matchScore: {
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
        marginHorizontal: 10,
    },
    scoreText: {
        color: Colors.primary,
        fontWeight: '900',
        fontSize: 13,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContentSmall: {
        width: '100%',
        backgroundColor: '#0c101c',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalContentLarge: {
        width: width - 40,
        backgroundColor: '#0c101c',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalTitleLarge: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFF',
        textAlign: 'center',
    },
    modalSubLarge: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 15,
    },
    modalInput: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    inputGroup: {
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    successModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    successModalCard: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#0d1117',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.3)',
        shadowColor: '#00FF66',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 12,
    },
    successIconBadge: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: 'rgba(0, 255, 102, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    successTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    successModalTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    successModalSub: {
        color: 'rgba(255, 255, 255, 0.65)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 24,
    },
    successModalBtn: {
        width: '100%',
        height: 48,
        borderRadius: 14,
        backgroundColor: '#00FF66',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#00FF66',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    },
    successModalBtnText: {
        color: '#0b0e17',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
});

export default MyStatsScreen;

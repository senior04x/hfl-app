import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import SmartImage from './SmartImage';
import { apiService, supabase } from '../services/apiService';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { getLocalizedPosition } from '../utils/localizationUtils';
import Colors from '../constants/Colors';

const { width, height } = Dimensions.get('window');

interface EditTeamModalProps {
    visible: boolean;
    teamId: string | number;
    onClose: () => void;
    onSaved?: () => void;
}

export default function EditTeamModal({
    visible,
    teamId,
    onClose,
    onSaved,
}: EditTeamModalProps) {
    const { t } = useTranslation();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);

    const [activeTab, setActiveTab] = useState<'team' | 'players'>('team');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    // Toast state
    const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const toastAnim = useRef(new Animated.Value(-80)).current;
    const toastOpacity = useRef(new Animated.Value(0)).current;
    const toastTimerRef = useRef<any>(null);

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToastMessage({ text, type });
        toastAnim.setValue(-80);
        toastOpacity.setValue(0);

        try {
            if (type === 'success') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
            }
        } catch (e) {}

        Animated.parallel([
            Animated.spring(toastAnim, {
                toValue: 16,
                useNativeDriver: true,
                tension: 85,
                friction: 9,
            }),
            Animated.timing(toastOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();

        toastTimerRef.current = setTimeout(() => {
            Animated.parallel([
                Animated.timing(toastAnim, {
                    toValue: -80,
                    duration: 220,
                    useNativeDriver: true,
                }),
                Animated.timing(toastOpacity, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setToastMessage(null);
            });
        }, 2500);
    };

    // Team form state
    const [teamName, setTeamName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [captainName, setCaptainName] = useState('');
    const [captainPhone, setCaptainPhone] = useState('');
    const [coachName, setCoachName] = useState('');
    const [coachPhone, setCoachPhone] = useState('');
    const [presidentName, setPresidentName] = useState('');
    const [presidentPhone, setPresidentPhone] = useState('');

    // Players state
    const [players, setPlayers] = useState<any[]>([]);
    const [playerSearch, setPlayerSearch] = useState('');
    const [editingPlayerId, setEditingPlayerId] = useState<string | number | null>(null);
    const [uploadingPlayerId, setUploadingPlayerId] = useState<string | number | null>(null);

    // Initial load
    useEffect(() => {
        if (visible && teamId) {
            loadTeamAndPlayers();
        }
    }, [visible, teamId]);

    const loadTeamAndPlayers = async () => {
        try {
            setLoading(true);
            const [tRes, pRes] = await Promise.all([
                supabase.from('teams').select('*').eq('id', teamId).single(),
                supabase.from('applications').select('*').eq('team_id', teamId).eq('status', 'approved'),
            ]);

            if (tRes.data) {
                const tData = tRes.data;
                setTeamName(tData.name || '');
                setLogoUrl(tData.logo_url || '');
                setCaptainName(tData.captain_name || '');
                setCaptainPhone(tData.captain_phone || '');
                setCoachName(tData.coach_name || '');
                setCoachPhone(tData.coach_phone || '');
                setPresidentName(tData.president_name || '');
                setPresidentPhone(tData.president_phone || '');
            }

            if (pRes.data) {
                const activeTeamPlayers = (pRes.data || []).filter((p: any) => {
                    const st = String(p.status || '').toLowerCase().trim();
                    const isArchived = p.is_archived === true || st === 'archived' || st === 'arxivlangan';
                    return !isArchived && st === 'approved';
                }).map((p: any) => ({
                    ...p,
                    id: p.id,
                    firstName: p.first_name || '',
                    lastName: p.last_name || '',
                    photo: p.photo_url || '',
                    photo_url: p.photo_url || '',
                    position: p.position || 'PLAYER',
                    number: p.player_number || '',
                    phone: p.phone || '',
                }));
                setPlayers(activeTeamPlayers);
            }
        } catch (error) {
            console.error('Error loading team data for edit:', error);
            showToast(t('teams.load_error', 'Jamoa ma\'lumotlarini yuklab bo\'lmadi.'), 'error');
        } finally {
            setLoading(false);
        }
    };

    // Pick and upload team logo
    const handlePickLogo = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                showToast(t('teams.photo_permission_error', 'Galereyadan rasm tanlash uchun ruxsat berishingiz kerak.'), 'error');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.85,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const localUri = result.assets[0].uri;
                setUploadingLogo(true);
                try {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (e) {}

                const uploadRes = await apiService.uploadPhoto(localUri);
                if (uploadRes && uploadRes.url) {
                    setLogoUrl(uploadRes.url);
                    showToast(t('teams.photo_updated_success', 'Rasm muvaffaqiyatli yuklandi.'), 'success');
                } else {
                    showToast(t('teams.photo_upload_error', 'Rasmni yuklashda xatolik yuz berdi.'), 'error');
                }
            }
        } catch (error) {
            console.error('Logo upload error:', error);
            showToast(t('teams.photo_upload_error', 'Rasm tanlashda xatolik.'), 'error');
        } finally {
            setUploadingLogo(false);
        }
    };

    // Save Team Info
    const handleSaveTeam = async () => {
        try {
            setSaving(true);
            const updates = {
                logo_url: logoUrl,
                captain_phone: captainPhone.trim(),
                coach_phone: coachPhone.trim(),
                president_phone: presidentPhone.trim(),
                captain_name: captainName.trim(),
                coach_name: coachName.trim(),
                president_name: presidentName.trim(),
            };

            const { error } = await supabase
                .from('teams')
                .update(updates)
                .eq('id', teamId);

            if (error) throw error;

            showToast(t('teams.team_updated_success', 'Jamoa ma\'lumotlari yangilandi.'), 'success');

            if (onSaved) onSaved();
            setTimeout(() => {
                onClose();
            }, 900);
        } catch (error: any) {
            console.error('Save team error:', error);
            showToast(error?.message || t('teams.save_error', 'Ma\'lumotlarni saqlashda xatolik.'), 'error');
        } finally {
            setSaving(false);
        }
    };

    // Pick and upload player photo
    const handlePickPlayerPhoto = async (playerId: string | number) => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                showToast(t('teams.photo_permission_error', 'Galereyadan rasm tanlash uchun ruxsat kerak.'), 'error');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.85,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const localUri = result.assets[0].uri;
                setUploadingPlayerId(playerId);
                try {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (e) {}

                const uploadRes = await apiService.uploadPhoto(localUri);
                if (uploadRes && uploadRes.url) {
                    const newPhotoUrl = uploadRes.url;
                    setPlayers(prev =>
                        prev.map(p => (String(p.id || p._id) === String(playerId) ? { ...p, photo: newPhotoUrl, photo_url: newPhotoUrl } : p))
                    );

                    let queryId = playerId;
                    if (typeof playerId === 'string' && !isNaN(Number(playerId))) {
                        queryId = Number(playerId);
                    }

                    await supabase
                        .from('applications')
                        .update({ photo_url: newPhotoUrl, photo: newPhotoUrl })
                        .eq('id', queryId);

                    showToast(t('teams.photo_updated_success', 'Rasm muvaffaqiyatli yuklandi.'), 'success');
                }
            }
        } catch (error) {
            console.error('Player photo upload error:', error);
            showToast(t('teams.photo_upload_error', 'O\'yinchi rasmini yuklashda xatolik.'), 'error');
        } finally {
            setUploadingPlayerId(null);
        }
    };

    // Save individual player phone
    const handleSavePlayerPhone = async (player: any, newPhone: string) => {
        const pId = player.id || player._id;
        try {
            setSaving(true);
            let queryId = pId;
            if (typeof pId === 'string' && !isNaN(Number(pId))) {
                queryId = Number(pId);
            }

            const { error } = await supabase
                .from('applications')
                .update({ phone: newPhone.trim() })
                .eq('id', queryId);

            if (error) throw error;

            setPlayers(prev =>
                prev.map(p => (String(p.id || p._id) === String(pId) ? { ...p, phone: newPhone.trim() } : p))
            );
            setEditingPlayerId(null);

            showToast(t('teams.phone_saved_success', 'Telefon raqam saqlandi.'), 'success');
        } catch (error: any) {
            console.error('Save player phone error:', error);
            showToast(error?.message || t('teams.phone_save_error', 'Telefon raqamni saqlashda xatolik.'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const filteredPlayers = useMemo(() => {
        if (!playerSearch.trim()) return players;
        const q = playerSearch.toLowerCase().trim();
        return players.filter(p => {
            const name = `${p.firstName || p.first_name || ''} ${p.lastName || p.last_name || ''}`.toLowerCase();
            const phone = String(p.phone || '');
            const num = String(p.number || p.player_number || '');
            return name.includes(q) || phone.includes(q) || num.includes(q);
        });
    }, [players, playerSearch]);

    const cardSurface = {
        backgroundColor: homeColors.surface,
        borderColor: homeColors.border,
        borderWidth: 1,
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.modalOverlay}
            >
                <View style={[styles.modalCard, { backgroundColor: homeColors.background, borderColor: homeColors.border }]}>
                    {/* FLOATING IN-MODAL TOAST NOTIFICATION */}
                    {toastMessage && (
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.toastContainer,
                                {
                                    transform: [{ translateY: toastAnim }],
                                    opacity: toastOpacity,
                                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                    borderColor: toastMessage.type === 'success' ? '#10B981' : '#EF4444',
                                }
                            ]}
                        >
                            <View
                                style={[
                                    styles.toastIconBadge,
                                    { backgroundColor: toastMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }
                                ]}
                            >
                                <Ionicons
                                    name={toastMessage.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                                    size={18}
                                    color={toastMessage.type === 'success' ? '#10B981' : '#EF4444'}
                                />
                            </View>
                            <Text style={[styles.toastText, { color: homeColors.textPrimary }]} numberOfLines={2}>
                                {toastMessage.text}
                            </Text>
                        </Animated.View>
                    )}

                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: homeColors.border }]}>
                        <View>
                            <Text style={[styles.headerTitle, { color: homeColors.textPrimary }]}>
                                {t('profile.edit_team_info', 'Jamoa ma\'lumotlarini tahrirlash')}
                            </Text>
                            <Text style={[styles.headerSubtitle, { color: homeColors.textSecondary }]}>
                                {teamName || t('teams.team', 'Jamoa')}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={[styles.closeBtn, { backgroundColor: homeColors.surface }]}
                        >
                            <Ionicons name="close" size={20} color={homeColors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {/* Segmented Tabs */}
                    <View style={[styles.tabBar, { backgroundColor: isDark ? '#141414' : '#F1F5F9' }]}>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                setActiveTab('team');
                            }}
                            style={[
                                styles.tabBtn,
                                activeTab === 'team' && [styles.activeTabBtn, { backgroundColor: homeColors.background }]
                            ]}
                        >
                            <Ionicons
                                name="shield-outline"
                                size={16}
                                color={activeTab === 'team' ? homeColors.textPrimary : homeColors.textSecondary}
                            />
                            <Text
                                style={[
                                    styles.tabBtnText,
                                    { color: activeTab === 'team' ? homeColors.textPrimary : homeColors.textSecondary },
                                    activeTab === 'team' && { fontWeight: '800' }
                                ]}
                            >
                                {t('teams.team', 'Jamoa')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                setActiveTab('players');
                            }}
                            style={[
                                styles.tabBtn,
                                activeTab === 'players' && [styles.activeTabBtn, { backgroundColor: homeColors.background }]
                            ]}
                        >
                            <Ionicons
                                name="people-outline"
                                size={16}
                                color={activeTab === 'players' ? homeColors.textPrimary : homeColors.textSecondary}
                            />
                            <Text
                                style={[
                                    styles.tabBtnText,
                                    { color: activeTab === 'players' ? homeColors.textPrimary : homeColors.textSecondary },
                                    activeTab === 'players' && { fontWeight: '800' }
                                ]}
                            >
                                {t('teams.squad', 'Tarkib')} ({players.length})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={homeColors.accent} />
                        </View>
                    ) : (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollBody}
                        >
                            {activeTab === 'team' ? (
                                <View style={{ gap: 16 }}>
                                    <View style={[styles.sectionCard, cardSurface]}>
                                        <Text style={[styles.sectionLabel, { color: homeColors.textSecondary }]}>
                                            {t('teams.team_logo', 'Jamoa logotipi')}
                                        </Text>
                                        <View style={styles.logoRow}>
                                            <View style={styles.logoContainer}>
                                                <SmartImage
                                                    uri={logoUrl}
                                                    style={styles.logoImage}
                                                    contentFit="cover"
                                                    fallbackIcon="shield-outline"
                                                />
                                                {uploadingLogo && (
                                                    <View style={styles.uploadingOverlay}>
                                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                                    </View>
                                                )}
                                            </View>
                                            <View style={{ flex: 1, gap: 6 }}>
                                                <TouchableOpacity
                                                    onPress={handlePickLogo}
                                                    disabled={uploadingLogo}
                                                    style={[styles.uploadLogoBtn, { backgroundColor: homeColors.accent }]}
                                                >
                                                    <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
                                                    <Text style={styles.uploadLogoText}>
                                                        {uploadingLogo ? t('common.loading', 'Yuklanmoqda...') : t('profile.change_photo', 'Logoni almashtirish')}
                                                    </Text>
                                                </TouchableOpacity>
                                                <Text style={[styles.hintText, { color: homeColors.textSecondary }]}>
                                                    {t('teams.image_format_hint', 'PNG, JPG yoki WEBP formatda')}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={[styles.sectionCard, cardSurface]}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={[styles.sectionLabel, { color: homeColors.textSecondary }]}>
                                                {t('teams.team_name', 'Jamoa nomi')}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Ionicons name="lock-closed" size={12} color={homeColors.textSecondary} />
                                                <Text style={[styles.lockHint, { color: homeColors.textSecondary }]}>
                                                    {t('teams.protected_field', 'Himoyalangan')}
                                                </Text>
                                            </View>
                                        </View>
                                        <TextInput
                                            value={teamName}
                                            editable={false}
                                            style={[
                                                styles.input,
                                                {
                                                    backgroundColor: isDark ? '#1E293B40' : '#F1F5F9',
                                                    color: homeColors.textPrimary,
                                                    borderColor: homeColors.border,
                                                    opacity: 0.8
                                                }
                                            ]}
                                        />
                                    </View>

                                    <View style={[styles.sectionCard, cardSurface]}>
                                        <Text style={[styles.sectionLabel, { color: homeColors.textSecondary, marginBottom: 8 }]}>
                                            {t('teams.leadership_contacts', 'Rahbariyat va aloqa')}
                                        </Text>

                                        <View style={styles.fieldGroup}>
                                            <Text style={[styles.fieldLabel, { color: homeColors.textPrimary }]}>
                                                {t('teams.captain', 'Sardor')}
                                            </Text>
                                            <TextInput
                                                value={captainName}
                                                onChangeText={setCaptainName}
                                                placeholder={t('teams.captain_name_placeholder', 'Sardor F.I.SH.')}
                                                placeholderTextColor={homeColors.textSecondary}
                                                style={[styles.input, { backgroundColor: isDark ? '#141414' : '#FFFFFF', color: homeColors.textPrimary, borderColor: homeColors.border }]}
                                            />
                                            <TextInput
                                                value={captainPhone}
                                                onChangeText={setCaptainPhone}
                                                placeholder="+998 90 123 45 67"
                                                keyboardType="phone-pad"
                                                placeholderTextColor={homeColors.textSecondary}
                                                style={[styles.input, { backgroundColor: isDark ? '#141414' : '#FFFFFF', color: homeColors.textPrimary, borderColor: homeColors.border, marginTop: 4 }]}
                                            />
                                        </View>

                                        <View style={[styles.fieldGroup, { marginTop: 12 }]}>
                                            <Text style={[styles.fieldLabel, { color: homeColors.textPrimary }]}>
                                                {t('teams.coach', 'Murabbiy')}
                                            </Text>
                                            <TextInput
                                                value={coachName}
                                                onChangeText={setCoachName}
                                                placeholder={t('teams.coach_name_placeholder', 'Murabbiy F.I.SH.')}
                                                placeholderTextColor={homeColors.textSecondary}
                                                style={[styles.input, { backgroundColor: isDark ? '#141414' : '#FFFFFF', color: homeColors.textPrimary, borderColor: homeColors.border }]}
                                            />
                                            <TextInput
                                                value={coachPhone}
                                                onChangeText={setCoachPhone}
                                                placeholder="+998 90 123 45 67"
                                                keyboardType="phone-pad"
                                                placeholderTextColor={homeColors.textSecondary}
                                                style={[styles.input, { backgroundColor: isDark ? '#141414' : '#FFFFFF', color: homeColors.textPrimary, borderColor: homeColors.border, marginTop: 4 }]}
                                            />
                                        </View>

                                        <View style={[styles.fieldGroup, { marginTop: 12 }]}>
                                            <Text style={[styles.fieldLabel, { color: homeColors.textPrimary }]}>
                                                {t('teams.president', 'Prezident / Rahbar')}
                                            </Text>
                                            <TextInput
                                                value={presidentName}
                                                onChangeText={setPresidentName}
                                                placeholder={t('teams.president_name_placeholder', 'Rahbar F.I.SH.')}
                                                placeholderTextColor={homeColors.textSecondary}
                                                style={[styles.input, { backgroundColor: isDark ? '#141414' : '#FFFFFF', color: homeColors.textPrimary, borderColor: homeColors.border }]}
                                            />
                                            <TextInput
                                                value={presidentPhone}
                                                onChangeText={setPresidentPhone}
                                                placeholder="+998 90 123 45 67"
                                                keyboardType="phone-pad"
                                                placeholderTextColor={homeColors.textSecondary}
                                                style={[styles.input, { backgroundColor: isDark ? '#141414' : '#FFFFFF', color: homeColors.textPrimary, borderColor: homeColors.border, marginTop: 4 }]}
                                            />
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        onPress={handleSaveTeam}
                                        disabled={saving}
                                        style={[styles.mainSaveBtn, { backgroundColor: homeColors.accent }]}
                                    >
                                        {saving ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <>
                                                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                                                <Text style={styles.mainSaveBtnText}>
                                                    {t('common.save', 'Saqlash')}
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={{ gap: 12 }}>
                                    <View style={[styles.searchBox, cardSurface]}>
                                        <Ionicons name="search" size={18} color={homeColors.textSecondary} />
                                        <TextInput
                                            value={playerSearch}
                                            onChangeText={setPlayerSearch}
                                            placeholder={t('teams.search_player_placeholder', 'O\'yinchini qidirish...')}
                                            placeholderTextColor={homeColors.textSecondary}
                                            style={[styles.searchInput, { color: homeColors.textPrimary }]}
                                        />
                                        {playerSearch.length > 0 && (
                                            <TouchableOpacity onPress={() => setPlayerSearch('')}>
                                                <Ionicons name="close-circle" size={18} color={homeColors.textSecondary} />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {filteredPlayers.length === 0 ? (
                                        <View style={{ padding: 24, alignItems: 'center' }}>
                                            <Text style={{ color: homeColors.textSecondary }}>
                                                {t('teams.no_players', 'O\'yinchilar topilmadi')}
                                            </Text>
                                        </View>
                                    ) : (
                                        filteredPlayers.map((player) => {
                                            const pId = player.id || player._id;
                                            const isEditingThis = editingPlayerId === pId;
                                            const isUploadingThis = uploadingPlayerId === pId;

                                            return (
                                                <PlayerEditCard
                                                    key={pId}
                                                    player={player}
                                                    isEditing={isEditingThis}
                                                    isUploading={isUploadingThis}
                                                    homeColors={homeColors}
                                                    isDark={isDark}
                                                    t={t}
                                                    onPickPhoto={() => handlePickPlayerPhoto(pId)}
                                                    onToggleEdit={() => setEditingPlayerId(isEditingThis ? null : pId)}
                                                    onSavePhone={(newPhone) => handleSavePlayerPhone(player, newPhone)}
                                                />
                                            );
                                        })
                                    )}
                                </View>
                            )}
                        </ScrollView>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

function PlayerEditCard({
    player,
    isEditing,
    isUploading,
    homeColors,
    isDark,
    t,
    onPickPhoto,
    onToggleEdit,
    onSavePhone,
}: {
    player: any;
    isEditing: boolean;
    isUploading: boolean;
    homeColors: any;
    isDark: boolean;
    t: any;
    onPickPhoto: () => void;
    onToggleEdit: () => void;
    onSavePhone: (phone: string) => void;
}) {
    const [phoneText, setPhoneText] = useState(player.phone || player.phoneNumber || '');

    const fullName = `${player.firstName || player.first_name || ''} ${player.lastName || player.last_name || ''}`.trim() || t('teams.player_fallback', 'O\'yinchi');
    const localizedPos = getLocalizedPosition(player.position, t);

    return (
        <View style={[styles.playerCard, { backgroundColor: homeColors.surface, borderColor: homeColors.border, borderWidth: 1 }]}>
            <View style={styles.playerCardHeader}>
                <TouchableOpacity
                    onPress={onPickPhoto}
                    disabled={isUploading}
                    style={styles.playerAvatarContainer}
                >
                    <SmartImage
                        uri={player.photo || player.photo_url || player.avatar}
                        style={styles.playerAvatar}
                        contentFit="cover"
                        fallbackIcon="person"
                    />
                    <View style={[styles.cameraBadge, { backgroundColor: homeColors.accent }]}>
                        {isUploading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" style={{ transform: [{ scale: 0.6 }] }} />
                        ) : (
                            <Ionicons name="camera" size={11} color="#FFFFFF" />
                        )}
                    </View>
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.playerNameText, { color: homeColors.textPrimary }]} numberOfLines={1}>
                            {fullName}
                        </Text>
                        <View style={[styles.numBadge, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                            <Text style={[styles.numBadgeText, { color: homeColors.accent }]}>
                                #{player.number || player.player_number || '—'}
                            </Text>
                        </View>
                    </View>

                    <Text style={[styles.playerPositionText, { color: homeColors.textSecondary }]}>
                        {localizedPos}
                    </Text>

                    <Text style={[styles.playerCurrentPhone, { color: homeColors.textSecondary }]}>
                        📞 {player.phone || t('teams.no_phone_entered', 'Telefon kiritilmagan')}
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={onToggleEdit}
                    style={[styles.editPhoneBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                >
                    <Ionicons
                        name={isEditing ? "chevron-up" : "create-outline"}
                        size={16}
                        color={homeColors.textPrimary}
                    />
                </TouchableOpacity>
            </View>

            {isEditing && (
                <View style={[styles.phoneEditRow, { borderTopColor: homeColors.border }]}>
                    <TextInput
                        value={phoneText}
                        onChangeText={setPhoneText}
                        placeholder="+998 90 123 45 67"
                        keyboardType="phone-pad"
                        placeholderTextColor={homeColors.textSecondary}
                        style={[
                            styles.phoneInput,
                            { backgroundColor: isDark ? '#141414' : '#FFFFFF', color: homeColors.textPrimary, borderColor: homeColors.border }
                        ]}
                    />
                    <TouchableOpacity
                        onPress={() => onSavePhone(phoneText)}
                        style={[styles.savePhoneBtn, { backgroundColor: homeColors.accent }]}
                    >
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        <Text style={styles.savePhoneBtnText}>{t('common.save', 'Saqlash')}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        maxHeight: height * 0.88,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
    },
    toastContainer: {
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        zIndex: 9999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1.5,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 10,
    },
    toastIconBadge: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toastText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '800',
    },
    headerSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        padding: 4,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: 8,
    },
    activeTabBtn: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
    loadingContainer: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollBody: {
        padding: 16,
        paddingBottom: 40,
    },
    sectionCard: {
        borderRadius: 16,
        padding: 16,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    logoContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#1E293B',
        position: 'relative',
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    uploadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadLogoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    uploadLogoText: {
        color: '#FFFFFF',
        fontSize: 12.5,
        fontWeight: '700',
    },
    hintText: {
        fontSize: 11,
    },
    lockHint: {
        fontSize: 10,
        fontWeight: '600',
    },
    fieldGroup: {
        gap: 4,
    },
    fieldLabel: {
        fontSize: 12.5,
        fontWeight: '700',
    },
    input: {
        height: 42,
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 13.5,
        borderWidth: 1,
    },
    mainSaveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 48,
        borderRadius: 14,
        marginTop: 8,
    },
    mainSaveBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 42,
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
    },
    playerCard: {
        borderRadius: 14,
        padding: 12,
        overflow: 'hidden',
    },
    playerCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    playerAvatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        position: 'relative',
    },
    playerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 12,
    },
    cameraBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    playerNameText: {
        fontSize: 13.5,
        fontWeight: '700',
        maxWidth: width * 0.48,
    },
    numBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
    },
    numBadgeText: {
        fontSize: 11,
        fontWeight: '800',
    },
    playerPositionText: {
        fontSize: 11.5,
        marginTop: 1,
    },
    playerCurrentPhone: {
        fontSize: 11,
        marginTop: 2,
    },
    editPhoneBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    phoneEditRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
    },
    phoneInput: {
        flex: 1,
        height: 38,
        borderRadius: 8,
        paddingHorizontal: 10,
        fontSize: 13,
        borderWidth: 1,
    },
    savePhoneBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        height: 38,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    savePhoneBtnText: {
        color: '#FFFFFF',
        fontSize: 12.5,
        fontWeight: '700',
    },
});

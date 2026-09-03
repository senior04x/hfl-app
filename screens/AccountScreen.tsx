import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    Platform,
    ActivityIndicator,
    Modal,
    TextInput,
    Linking,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useAuthStore } from '../store/useAuthStore';
import SmartImage from '../components/SmartImage';
import { apiService, supabase } from '../services/apiService';
import { useTranslation } from 'react-i18next';
import LanguageSelectModal from '../components/LanguageSelectModal';
import { SUPPORTED_LANGUAGES } from '../store/useLanguageStore';
import { getLocalizedPosition } from '../utils/localizationUtils';

import { useFocusEffect } from '@react-navigation/native';
import { useJuniorStore } from '../store/useJuniorStore';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import OrganizationSelectModal from '../components/OrganizationSelectModal';
import AppNavbar from '../components/AppNavbar';
import EditTeamModal from '../components/EditTeamModal';
import RegistrationClosedModal from '../components/RegistrationClosedModal';
import { useNavBarScroll } from '../context/NavBarScrollContext';

export default function AccountScreen({ navigation }: any) {
    const { isGuest, user, logout, unreadCount, isChatMuted } = useAuthStore();
    const { isJuniorMode, setJuniorMode, verifyPin } = useJuniorStore();
    const { selectedOrganizationId, setSelectedOrganizationId, organizations } = useOrganizationStore();
    const { theme, toggleTheme, isDark, colors } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const { handleScroll: handleNavBarScroll } = useNavBarScroll();
    const { t, i18n } = useTranslation();

    const [showPinModal, setShowPinModal] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [showOrgSelectModal, setShowOrgSelectModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showEditTeamModal, setShowEditTeamModal] = useState(false);
    const [showRegClosedModal, setShowRegClosedModal] = useState(false);
    const [closedOrgInfo, setClosedOrgInfo] = useState<{ name: string; contact_phone: string } | null>(null);
    const [isCheckingReg, setIsCheckingReg] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [targetJuniorState, setTargetJuniorState] = useState<boolean>(false);

    const [detailedData, setDetailedData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [transferWindowOpen, setTransferWindowOpen] = useState(false);
    const currentTeamId = user?.teamId || user?.team_id || (user?.role === 'manager' ? (user?.id || user?._id) : null);

    const [storyPickerVisible, setStoryPickerVisible] = useState(false);
    const [ownActiveReplayIds, setOwnActiveReplayIds] = useState<any[]>([]);

    const [userTransfers, setUserTransfers] = useState<any[]>([]);
    const [userProfileApps, setUserProfileApps] = useState<any[]>([]);
    const [appsLoading, setAppsLoading] = useState(false);

    const handleApplyToLeaguePress = () => {
        setShowOrgSelectModal(true);
    };

    const handleSelectOrganizationForApply = async (org: any) => {
        setShowOrgSelectModal(false);
        const rawSlug = org.slug || org.name || org.title || org.id || 'hfl';
        const cleanSlug = String(rawSlug).toLowerCase().trim().replace(/\s+/g, '-');
        const targetUrl = `https://amatora.uz/${cleanSlug}`;

        try {
            await Linking.openURL(targetUrl);
        } catch (err) {
            Alert.alert(t('common.error', 'Xato'), `${t('common.cannot_open_link', 'Havola ochib bo\'lmadi')}: ${targetUrl}`);
        }
    };

    useEffect(() => {
        if (!isGuest) {
            if (user?.id) {
                loadDetailedData();
                loadUserApplications();
            }
            checkTransferWindow();
        }
    }, [isGuest, user?.id, selectedOrganizationId]);

    useFocusEffect(
        React.useCallback(() => {
            if (!isGuest) {
                checkTransferWindow();
            }
        }, [isGuest, selectedOrganizationId])
    );

    const loadOwnActiveReplayIds = async () => {
        if (!currentTeamId) return;
        try {
            const list = await apiService.getTeamStoryReplays(String(currentTeamId));
            setOwnActiveReplayIds((list || []).map((row: any) => row.match_event_id));
        } catch (e) {
            console.warn('Error loading own active story replays:', e);
        }
    };

    useEffect(() => {
        if (!isGuest && currentTeamId) {
            loadOwnActiveReplayIds();
        }
    }, [isGuest, currentTeamId]);

    const handleStoryPickerAdded = () => {
        loadOwnActiveReplayIds();
    };

    const loadUserApplications = async () => {
        try {
            setAppsLoading(true);
            const targetPlayerId = user?.id || user?._id;
            if (targetPlayerId) {
                const transfers = await apiService.getPlayerTransfers(targetPlayerId);
                setUserTransfers(transfers || []);
            }

            const userPhone = user?.phone || user?.phoneNumber || user?.phone_number || user?.tel;
            if (userPhone) {
                const apps = await apiService.getApplicationsByPhone(userPhone);
                setUserProfileApps(apps || []);
            }
        } catch (err) {
            console.error('Error loading applications in AccountScreen:', err);
        } finally {
            setAppsLoading(false);
        }
    };

    const checkTransferWindow = async () => {
        try {
            const orgId = selectedOrganizationId || user?.organizationId || user?.organization_id || 1;
            const open = await apiService.getTransferWindowStatus(orgId);
            setTransferWindowOpen(open);
        } catch (err) {
            console.error('Error checking transfer window:', err);
        }
    };

    const loadDetailedData = async () => {
        try {
            setLoading(true);
            const targetPlayerId = user?.id || user?._id;

            if (targetPlayerId) {
                const fullPlayerData = await apiService.getPlayerById(targetPlayerId);
                if (fullPlayerData) {
                    setDetailedData(fullPlayerData);
                }
            }
        } catch (error) {
            console.error('Error loading detailed account data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Grouped Setting Row inside a unified Card
    const SettingRow = ({
        icon,
        title,
        value,
        onPress,
        type = 'chevron',
        badgeCount,
        isMuted,
        isLast = false,
        iconColor,
        textColor,
        isLoading = false,
    }: any) => (
        <TouchableOpacity
            style={[
                styles.settingRow,
                {
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                }
            ]}
            onPress={onPress}
            disabled={isLoading || type === 'switch'}
            activeOpacity={0.7}
        >
            <View style={styles.settingLeft}>
                <View
                    style={[
                        styles.iconCircle,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        }
                    ]}
                >
                    <Ionicons name={icon} size={18} color={iconColor || homeColors.accent} />
                </View>
                <Text
                    style={[
                        styles.settingTitle,
                        { color: textColor || homeColors.textPrimary }
                    ]}
                >
                    {title}
                </Text>
            </View>

            {type === 'switch' ? (
                <Switch
                    value={value}
                    onValueChange={onPress}
                    trackColor={{ false: isDark ? '#333333' : '#E0E0E0', true: homeColors.accent }}
                    thumbColor={'#FFFFFF'}
                />
            ) : (
                <View style={styles.settingRight}>
                    {isLoading ? (
                        <ActivityIndicator size="small" color={homeColors.accent} style={{ marginRight: 2 }} />
                    ) : (
                        <>
                            {badgeCount > 0 && (
                                <View
                                    style={[
                                        styles.rightBadge,
                                        { backgroundColor: isMuted ? homeColors.textSecondary : Colors.danger }
                                    ]}
                                >
                                    <Text style={styles.rightBadgeText}>{badgeCount}</Text>
                                </View>
                            )}
                            {value ? (
                                <Text
                                    style={[
                                        styles.settingValue,
                                        { color: homeColors.textSecondary }
                                    ]}
                                >
                                    {value}
                                </Text>
                            ) : null}
                            <Ionicons name="chevron-forward" size={16} color={homeColors.textSecondary} style={{ opacity: 0.5 }} />
                        </>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );

    // Profile Display Info Calculation
    const profileImage = !isGuest ? (
        detailedData?.photoUrl || detailedData?.photo_url || detailedData?.photo ||
        detailedData?.logoUrl || detailedData?.logo_url || detailedData?.logo ||
        user?.photoUrl || user?.photo_url || user?.photo ||
        user?.logoUrl || user?.logo_url || user?.logo ||
        user?.avatar || user?.team_logo || user?.teamLogo
    ) : null;

    const isPlayer = user?.role === 'player';
    const isManager = user?.role === 'manager';

    let displayName = t('profile.user', 'Foydalanuvchi');
    if (isGuest) {
        displayName = t('auth.guest', 'Mehmon');
    } else if (isPlayer) {
        const fName = (detailedData?.firstName || user?.firstName || detailedData?.name || user?.name || '').trim();
        const lName = (detailedData?.lastName || user?.lastName || '').trim();
        displayName = fName ? `${fName} ${lName}`.trim() : t('profile.player', "O'yinchi");
    } else if (isManager) {
        const rawName = (detailedData?.name || detailedData?.team_name || user?.teamName || user?.name || detailedData?.firstName || user?.firstName || 'Jamoa').trim();
        displayName = rawName || t('profile.team', 'Jamoa');
    }
    displayName = displayName.replace(/\(sardor\)/gi, '').replace(/\(menejer\)/gi, '').trim();

    let displaySubtitle = 'AMATORA LEAGUE';
    if (isGuest) {
        displaySubtitle = t('auth.guest_mode', 'Mehmon rejimi');
    } else if (isPlayer) {
        displaySubtitle = getLocalizedPosition(detailedData?.position || user?.position, t);
    } else if (isManager) {
        displaySubtitle = (detailedData?.league || user?.league || t('profile.captain', 'Sardor'));
    }

    const currentLangItem = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language);
    const totalAppsCount = userTransfers.length + userProfileApps.length;

    const handleProfileCardPress = () => {
        if (isPlayer) {
            navigation.navigate('MyStats', { playerId: user?._id || user?.id, player: user });
        } else if (currentTeamId) {
            navigation.navigate('MyTeam', { teamId: currentTeamId });
        }
    };

    const isProfileCardClickable = isPlayer || !!currentTeamId;

    const handleAddPlayerPress = async () => {
        if (isCheckingReg) return;
        try {
            setIsCheckingReg(true);
            let orgId = user?.organization_id || user?.organizationId || selectedOrganizationId || detailedData?.organization_id || detailedData?.organizationId;

            // If orgId not found yet but currentTeamId exists, fetch team's organization_id
            if (!orgId && currentTeamId) {
                const { data: teamData } = await supabase
                    .from('teams')
                    .select('organization_id')
                    .eq('id', currentTeamId)
                    .maybeSingle();
                if (teamData?.organization_id) {
                    orgId = teamData.organization_id;
                }
            }

            let query = supabase.from('organizations').select('id, name, contact_phone, is_registration_open');
            if (orgId) {
                query = query.eq('id', orgId);
            } else {
                query = query.limit(1);
            }

            const { data: orgData } = await query.maybeSingle();

            if (orgData && orgData.is_registration_open === false) {
                setClosedOrgInfo({
                    name: orgData.name || '',
                    contact_phone: orgData.contact_phone || '',
                });
                setShowRegClosedModal(true);
                return;
            }

            navigation.navigate('JoinApplication', { initialType: 'player', teamId: currentTeamId });
        } catch (error) {
            console.error('Error checking organization registration:', error);
            navigation.navigate('JoinApplication', { initialType: 'player', teamId: currentTeamId });
        } finally {
            setIsCheckingReg(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: homeColors.background }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Universal App Navbar */}
                <AppNavbar
                    title={t('profile.title', 'PROFIL')}
                    subtitle="AMATORA"
                    rightElement={
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Notifications')}
                            style={[
                                styles.navNotificationBtn,
                                {
                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F2F2F4',
                                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : homeColors.border,
                                }
                            ]}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="notifications-outline" size={19} color={homeColors.textPrimary} />
                        </TouchableOpacity>
                    }
                />

                <ScrollView
                    style={styles.container}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    onScroll={(e) => handleNavBarScroll('account', e)}
                    scrollEventThrottle={16}
                >
                    {/* Modern Profile Hero Card */}
                    <View style={styles.profileSection}>
                        <TouchableOpacity
                            style={[
                                styles.profileCard,
                                {
                                    backgroundColor: isDark ? homeColors.background : '#FFFFFF',
                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : homeColors.border,
                                }
                            ]}
                            activeOpacity={isProfileCardClickable ? 0.75 : 1}
                            onPress={isProfileCardClickable ? handleProfileCardPress : undefined}
                            disabled={!isProfileCardClickable}
                        >
                            <View style={styles.profileCardHeader}>
                                {/* Avatar */}
                                <View
                                    style={[
                                        styles.avatarWrapper,
                                        {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F0F0F2',
                                            borderColor: isDark ? 'rgba(255,255,255,0.12)' : homeColors.border,
                                        }
                                    ]}
                                >
                                    {profileImage ? (
                                        <SmartImage 
                                            uri={profileImage}
                                            style={styles.avatarImage}
                                            fallbackIcon={user?.role === 'manager' ? 'shield' : 'person'}
                                            contentFit="cover"
                                        />
                                    ) : (
                                        <Ionicons 
                                            name={user?.role === 'manager' ? 'shield-outline' : 'person-outline'} 
                                            size={42} 
                                            color={homeColors.accent} 
                                        />
                                    )}
                                </View>

                                {/* User Details */}
                                <View style={styles.profileInfoColumn}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text
                                            style={[styles.userNameText, { color: homeColors.textPrimary }]}
                                            numberOfLines={1}
                                        >
                                            {displayName}
                                        </Text>
                                        {!isGuest && (
                                            <Ionicons name="checkmark-circle" size={16} color={homeColors.accent} />
                                        )}
                                    </View>

                                    <View style={styles.badgeRow}>
                                        <View
                                            style={[
                                                styles.rolePill,
                                                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }
                                            ]}
                                        >
                                            <Text style={[styles.rolePillText, { color: homeColors.accent }]}>
                                                {displaySubtitle.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>

                                    {user?.phone ? (
                                        <Text style={[styles.phoneText, { color: homeColors.textSecondary }]}>
                                            {user.phone}
                                        </Text>
                                    ) : null}
                                </View>

                                {/* Right Arrow Navigation Icon */}
                                {isProfileCardClickable && (
                                    <View style={styles.profileCardChevron}>
                                        <Ionicons name="chevron-forward" size={18} color={homeColors.textSecondary} style={{ opacity: 0.6 }} />
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Guest Login Banner */}
                    {isGuest && (
                        <View style={styles.sectionContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.loginBannerCard,
                                    {
                                        backgroundColor: isDark ? homeColors.background : '#FFFFFF',
                                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : homeColors.border,
                                    }
                                ]}
                                onPress={() => logout()}
                                activeOpacity={0.8}
                            >
                                <View style={styles.loginBannerContent}>
                                    <View style={[styles.loginIconCircle, { backgroundColor: isDark ? 'rgba(0,255,102,0.12)' : 'rgba(0,200,80,0.1)' }]}>
                                        <Ionicons name="log-in-outline" size={24} color={homeColors.accent} />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 14 }}>
                                        <Text style={[styles.loginBannerTitle, { color: homeColors.textPrimary }]}>
                                            {t('profile.login_prompt', 'Tizimga kiring')}
                                        </Text>
                                        <Text style={[styles.loginBannerSubtitle, { color: homeColors.textSecondary }]}>
                                            {t('profile.login_sub', 'Jamoangiz va profilingizni boshqaring')}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={homeColors.accent} />
                                </View>
                            </TouchableOpacity>

                            {/* Guest Apply to League */}
                            <TouchableOpacity
                                style={[
                                    styles.applyCard,
                                    {
                                        backgroundColor: isDark ? homeColors.background : '#FFFFFF',
                                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : homeColors.border,
                                    }
                                ]}
                                onPress={handleApplyToLeaguePress}
                                activeOpacity={0.8}
                            >
                                <View style={styles.applyCardInner}>
                                    <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                        <Ionicons name="football-outline" size={20} color={homeColors.accent} />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 14 }}>
                                        <Text style={[styles.settingTitle, { color: homeColors.textPrimary }]}>
                                            {t('profile.apply_to_league', 'Ligaga ariza topshirish')}
                                        </Text>
                                        <Text style={[styles.settingSubtitle, { color: homeColors.textSecondary }]}>
                                            {t('profile.apply_sub', 'Tegishli tashkilot sayti orqali ariza bering')}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={homeColors.textSecondary} style={{ opacity: 0.5 }} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Management Section (Logged In Users) */}
                    {!isGuest && (
                        <View style={styles.sectionContainer}>
                            <Text style={[styles.sectionHeading, { color: homeColors.textSecondary }]}>
                                {t('profile.management', 'Boshqaruv').toUpperCase()}
                            </Text>

                            <View
                                style={[
                                    styles.groupedCard,
                                    {
                                        backgroundColor: isDark ? homeColors.background : '#FFFFFF',
                                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : homeColors.border,
                                    }
                                ]}
                            >
                                {isPlayer && (
                                    <>
                                        <SettingRow
                                            icon="shield-outline"
                                            title={t('profile.my_team', 'Mening jamoam')}
                                            onPress={() => {
                                                if (currentTeamId) {
                                                    navigation.navigate('MyTeam', { teamId: currentTeamId });
                                                } else {
                                                    Alert.alert(t('common.notice', 'Eslatma'), t('teams.no_team', 'Siz hali birorta jamoaga a\'zo emassiz'));
                                                }
                                            }}
                                        />
                                        <SettingRow
                                            icon="paper-plane-outline"
                                            title={t('profile.applications', 'Arizalar')}
                                            onPress={() => navigation.navigate('Applications')}
                                        />
                                        {transferWindowOpen && (
                                            <SettingRow
                                                icon="swap-horizontal-outline"
                                                title={t('profile.transfer_requests', 'Transfer so\'rovlari')}
                                                onPress={() => navigation.navigate('TransferRequest', { playerId: user?.id })}
                                            />
                                        )}
                                    </>
                                )}

                                {currentTeamId && (
                                    <>
                                        {(user?.role === 'manager' || user?.role === 'coach' || user?.role === 'trainer' || user?.role === 'captain' || user?.role === 'admin' || user?.role === 'team_admin') && (
                                            <>
                                                <SettingRow
                                                    icon="pencil-outline"
                                                    title={t('profile.edit_team_info', 'Jamoa ma\'lumotlarini tahrirlash')}
                                                    onPress={() => setShowEditTeamModal(true)}
                                                />
                                            </>
                                        )}
                                        <SettingRow
                                            icon="chatbubbles-outline"
                                            title={t('teams.team_chat', 'Jamoa chati')}
                                            onPress={() => navigation.navigate('TeamChat', { 
                                                teamId: currentTeamId, 
                                                userId: user?._id || user?.id, 
                                                userName: user?.firstName || user?.name || user?.first_name || 'Foydalanuvchi' 
                                            })}
                                            badgeCount={unreadCount}
                                            isMuted={isChatMuted}
                                        />
                                        {isPlayer ? (
                                            <SettingRow
                                                icon="grid-outline"
                                                title={t('teams.squad', 'Tarkib & Taktika')}
                                                onPress={() => navigation.navigate('FormationBoard', { teamId: currentTeamId, isReadOnly: true })}
                                                isLast={true}
                                            />
                                        ) : (
                                            <>
                                                <SettingRow
                                                    icon="grid-outline"
                                                    title={t('teams.edit_formation', 'Tarkibni tahrirlash')}
                                                    onPress={() => navigation.navigate('FormationBoard', { teamId: currentTeamId, isReadOnly: false })}
                                                />
                                                <SettingRow
                                                    icon="person-add-outline"
                                                    title={t('teams.add_player', 'O\'yinchi qo\'shish')}
                                                    onPress={handleAddPlayerPress}
                                                    isLoading={isCheckingReg}
                                                    isLast={true}
                                                />
                                            </>
                                        )}
                                    </>
                                )}
                            </View>
                        </View>
                    )}

                    {/* App Settings Section */}
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionHeading, { color: homeColors.textSecondary }]}>
                            {t('settings.title', 'Sozlamalar').toUpperCase()}
                        </Text>

                        <View
                            style={[
                                styles.groupedCard,
                                {
                                    backgroundColor: isDark ? homeColors.background : '#FFFFFF',
                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : homeColors.border,
                                }
                            ]}
                        >
                            {/* Unified System Settings (Theme & Language) */}
                            <SettingRow
                                icon="settings-outline"
                                title={t('settings.system_settings', 'Tizim sozlamalari')}
                                value={`${currentLangItem?.flag || '🇺🇿'} • ${theme === 'system' ? t('settings.system_auto', 'Avtomatik') : (theme === 'dark' ? t('settings.dark', 'Qorong\'u') : t('settings.light', 'Yorug\''))}`}
                                onPress={() => navigation.navigate('SystemSettings')}
                            />

                            {/* Security & Settings */}
                            <SettingRow
                                icon="shield-checkmark-outline"
                                title={t('settings.security_title', 'Xavfsizlik va hujjatlar')}
                                onPress={() => {
                                    const parent = navigation.getParent?.();
                                    if (parent) {
                                        parent.navigate('SecuritySettings');
                                    } else {
                                        (navigation as any).navigate('SecuritySettings');
                                    }
                                }}
                                isLast={isGuest}
                            />

                            {/* Logout Action Row (Inside card if logged in) */}
                            {!isGuest && (
                                <SettingRow
                                    icon="log-out-outline"
                                    title={t('common.logout', t('auth.logout', 'Chiqish'))}
                                    iconColor={Colors.danger}
                                    textColor={Colors.danger}
                                    onPress={() => setShowLogoutModal(true)}
                                    isLast={true}
                                />
                            )}
                        </View>
                    </View>

                    {/* App Version Tag */}
                    <View style={styles.versionContainer}>
                        <Text style={[styles.versionText, { color: homeColors.textSecondary }]}>
                            {`AMATORA • ${t('common.version', 'VERSIYA').toUpperCase()} 2.1.1`}
                        </Text>
                    </View>
                </ScrollView>

                {/* Language Select Modal */}
                <LanguageSelectModal
                    visible={showLanguageModal}
                    onClose={() => setShowLanguageModal(false)}
                />

                {/* Organization Selection Modal for League Application */}
                <OrganizationSelectModal
                    visible={showOrgSelectModal}
                    isApplyMode={true}
                    onClose={() => setShowOrgSelectModal(false)}
                    onSelect={handleSelectOrganizationForApply}
                />

                {/* Team & Players Edit Modal */}
                {currentTeamId && (
                    <EditTeamModal
                        visible={showEditTeamModal}
                        teamId={currentTeamId}
                        onClose={() => setShowEditTeamModal(false)}
                        onSaved={loadDetailedData}
                    />
                )}

                {/* Organization Registration Closed Modal */}
                <RegistrationClosedModal
                    visible={showRegClosedModal}
                    organizationName={closedOrgInfo?.name}
                    contactPhone={closedOrgInfo?.contact_phone}
                    onClose={() => setShowRegClosedModal(false)}
                />



                {/* Logout Confirmation Modal */}
                <Modal
                    visible={showLogoutModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowLogoutModal(false)}
                >
                    <TouchableOpacity
                        style={styles.logoutModalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowLogoutModal(false)}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={(e) => e.stopPropagation()}
                            style={[
                                styles.logoutModalCard,
                                {
                                    backgroundColor: isDark ? '#141414' : '#FFFFFF',
                                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : homeColors.border,
                                }
                            ]}
                        >
                            <View style={[styles.logoutIconBadge, { backgroundColor: isDark ? 'rgba(255,59,48,0.12)' : 'rgba(255,59,48,0.08)' }]}>
                                <Ionicons name="log-out-outline" size={28} color={Colors.danger} />
                            </View>

                            <Text style={[styles.logoutModalTitle, { color: homeColors.textPrimary }]}>
                                {t('auth.logout_confirm_title', 'Akkauntingizdan chiqmoqchimisiz?')}
                            </Text>

                            <TouchableOpacity
                                style={[styles.logoutConfirmBtn, { backgroundColor: Colors.danger }]}
                                onPress={() => {
                                    setShowLogoutModal(false);
                                    logout();
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.logoutConfirmBtnText}>
                                    {t('common.confirm', 'TASDIQLASH')}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.logoutCancelBtn}
                                onPress={() => setShowLogoutModal(false)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.logoutCancelBtnText, { color: homeColors.textSecondary }]}>
                                    {t('common.cancel', 'Bekor qilish')}
                                </Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>

                {/* PIN Verification Modal */}
                <Modal visible={showPinModal} transparent animationType="fade" onRequestClose={() => setShowPinModal(false)}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                        <View
                            style={{
                                width: '100%',
                                maxWidth: 340,
                                backgroundColor: isDark ? '#161B26' : '#FFFFFF',
                                borderRadius: 20,
                                padding: 24,
                                borderWidth: 1,
                                borderColor: homeColors.accent
                            }}
                        >
                            <View style={{ alignItems: 'center', marginBottom: 15 }}>
                                <Ionicons name="lock-closed-outline" size={36} color={homeColors.accent} />
                                <Text style={{ color: homeColors.textPrimary, fontSize: 17, fontWeight: '900', marginTop: 10 }}>PIN-KODNI KIRITING</Text>
                                <Text style={{ color: homeColors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 5 }}>
                                    {targetJuniorState ? "Junior Rejim (U-14) ga o'tish uchun 4 xonali PIN-kodni kiriting" : "Junior Rejimdan chiqish uchun PIN-kodni kiriting"}
                                </Text>
                            </View>

                            <TextInput
                                style={{
                                    backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : '#F2F2F4',
                                    color: homeColors.accent,
                                    fontSize: 24,
                                    fontWeight: '900',
                                    textAlign: 'center',
                                    padding: 12,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : homeColors.border,
                                    letterSpacing: 10,
                                    marginBottom: 20
                                }}
                                value={pinInput}
                                onChangeText={setPinInput}
                                keyboardType="number-pad"
                                maxLength={4}
                                secureTextEntry
                                placeholder="••••"
                                placeholderTextColor={homeColors.textSecondary}
                                autoFocus
                            />

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        paddingVertical: 12,
                                        borderRadius: 12,
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#ECECEE',
                                        alignItems: 'center'
                                    }}
                                    onPress={() => setShowPinModal(false)}
                                >
                                    <Text style={{ color: homeColors.textPrimary, fontWeight: 'bold' }}>BEKOR QILISH</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        paddingVertical: 12,
                                        borderRadius: 12,
                                        backgroundColor: homeColors.accent,
                                        alignItems: 'center'
                                    }}
                                    onPress={() => {
                                        if (verifyPin(pinInput)) {
                                            setJuniorMode(targetJuniorState);
                                            setShowPinModal(false);
                                            Alert.alert("Muvaffaqiyatli", targetJuniorState ? "Junior Rejim (U-14 Academy) faollashtirildi!" : "Standard Rejimga o'tildi.");
                                        } else {
                                            Alert.alert("Xato", "PIN-kod noto'g'ri. (Odatiy PIN: 1234)");
                                        }
                                    }}
                                >
                                    <Text style={{ color: '#000000', fontWeight: '900' }}>TASDIQLASH</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'transparent' },
    container: { flex: 1 },
    navNotificationBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileSection: {
        paddingHorizontal: 16,
        paddingTop: 8,
        marginBottom: 16,
    },
    profileCard: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    profileCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarWrapper: {
        width: 72,
        height: 72,
        borderRadius: 20,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    profileInfoColumn: {
        flex: 1,
        marginLeft: 14,
        justifyContent: 'center',
    },
    profileCardChevron: {
        marginLeft: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userNameText: {
        fontSize: 17,
        fontWeight: '900',
        letterSpacing: -0.2,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    rolePill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    rolePillText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    phoneText: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
    },
    sectionContainer: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    sectionHeading: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.6,
        marginBottom: 8,
        marginLeft: 4,
    },
    groupedCard: {
        borderRadius: 18,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 13,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    settingTitle: {
        fontSize: 13.5,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    settingSubtitle: {
        fontSize: 10.5,
        fontWeight: '500',
        marginTop: 2,
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    settingValue: {
        fontSize: 12,
        fontWeight: '600',
    },
    rightBadge: {
        borderRadius: 8,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    rightBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
    },
    loginBannerCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        marginBottom: 10,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    loginBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loginIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginBannerTitle: {
        fontSize: 14.5,
        fontWeight: '800',
    },
    loginBannerSubtitle: {
        fontSize: 11.5,
        fontWeight: '500',
        marginTop: 2,
    },
    applyCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 14,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 5,
        elevation: 1,
    },
    applyCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    versionContainer: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    versionText: {
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    logoutModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    logoutModalCard: {
        width: '100%',
        maxWidth: 320,
        borderRadius: 22,
        padding: 22,
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
        elevation: 10,
    },
    logoutIconBadge: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    logoutModalTitle: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.5,
        textAlign: 'center',
        marginBottom: 18,
    },
    logoutModalSubtitle: {
        fontSize: 12.5,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 18,
    },
    logoutConfirmBtn: {
        width: '100%',
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    logoutConfirmBtnText: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 12.5,
        letterSpacing: 0.5,
    },
    logoutCancelBtn: {
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutCancelBtnText: {
        fontSize: 12,
        fontWeight: '700',
    },
});

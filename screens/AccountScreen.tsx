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
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';
import AnimatedBackground from '../components/AnimatedBackground';
import backgroundImage from '../assets/images/backroud-image.png';
import { useAuthStore } from '../store/useAuthStore';
import SmartImage from '../components/SmartImage';
import { apiService } from '../services/apiService';
const getPositionFullUz = (pos: string) => {
    const map: any = {
        'GK': "Darvozabon",
        'LB': "Chap qanot himoyachisi",
        'CB': "Markaziy himoyachi",
        'RB': "O'ng qanot himoyachisi",
        'CDM': "Tayanch yarim himoyachisi",
        'CM': "Markaziy yarim himoyachisi",
        'CAM': "Hujumkor yarim himoyachisi",
        'LW': "Chap qanot hujumchisi",
        'RW': "O'ng qanot hujumchisi",
        'ST': "Markaziy hujumchi",
        'CF': "Ikkinchi hujumchi",
        'LM': "Chap qanot yarim himoyachisi",
        'RM': "O'ng qanot yarim himoyachisi",
        'LWB': "Chap qanot qanot himoyachisi",
        'RWB': "O'ng qanot qanot himoyachisi",
    };
    return map[pos?.toUpperCase()] || pos || 'O\'YINCHI';
};

import { useFocusEffect } from '@react-navigation/native';
import { useJuniorStore } from '../store/useJuniorStore';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { Modal, TextInput } from 'react-native';

export default function AccountScreen({ navigation }: any) {
    const { isGuest, user, logout, unreadCount, isChatMuted } = useAuthStore();
    const { isJuniorMode, setJuniorMode, verifyPin } = useJuniorStore();
    const { selectedOrganizationId, setSelectedOrganizationId, organizations } = useOrganizationStore();

    const [showPinModal, setShowPinModal] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [targetJuniorState, setTargetJuniorState] = useState<boolean>(false);

    const [detailedData, setDetailedData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [transferWindowOpen, setTransferWindowOpen] = useState(false);
    const currentTeamId = user?.teamId || user?.team_id || (user?.role === 'manager' ? (user?.id || user?._id) : null);

    // Applications Section State
    const [appTab, setAppTab] = useState<'transfers' | 'profile'>('transfers');
    const [userTransfers, setUserTransfers] = useState<any[]>([]);
    const [userProfileApps, setUserProfileApps] = useState<any[]>([]);
    const [appsLoading, setAppsLoading] = useState(false);

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

    const SettingItem = ({ icon, title, value, onPress, type = 'chevron', badgeCount, isMuted }: any) => (
        <TouchableOpacity
            style={styles.settingItem}
            onPress={onPress}
            disabled={type === 'switch'}
        >
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, width: '100%' }}>
                <View style={styles.settingLeft}>
                    <View style={styles.iconContainer}>
                        <Ionicons name={icon} size={20} color={Colors.primary} />
                    </View>
                    <Text style={styles.settingTitle}>{title.toUpperCase()}</Text>
                </View>
                {type === 'switch' ? (
                    <Switch
                        value={value}
                        onValueChange={onPress}
                        trackColor={{ false: '#3e3e3e', true: Colors.primary }}
                        thumbColor={value ? '#ffffff' : '#f4f3f4'}
                    />
                ) : (
                    <View style={styles.settingRight}>
                        {badgeCount > 0 && (
                            <View style={[
                                styles.rightBadge,
                                { backgroundColor: isMuted ? 'rgba(255,255,255,0.2)' : Colors.danger }
                            ]}>
                                <Text style={styles.rightBadgeText}>{badgeCount}</Text>
                            </View>
                        )}
                        <Text style={styles.settingValue}>{value?.toUpperCase()}</Text>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <AnimatedBackground overlayOpacity={0.7} backgroundImage={backgroundImage}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView 
                    style={styles.container} 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 110 }}
                >
                    {/* Profile Header */}
                    <View style={styles.profileHeader}>
                        {(() => {
                            const profileImage = !isGuest ? (
                                detailedData?.photoUrl || detailedData?.photo_url || detailedData?.photo ||
                                detailedData?.logoUrl || detailedData?.logo_url || detailedData?.logo ||
                                user?.photoUrl || user?.photo_url || user?.photo ||
                                user?.logoUrl || user?.logo_url || user?.logo ||
                                user?.avatar || user?.team_logo || user?.teamLogo
                            ) : null;

                            return (
                                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                                    <View style={styles.avatarContainer}>
                                        {profileImage ? (
                                            <SmartImage 
                                                uri={profileImage}
                                                style={{ width: '100%', height: '100%' }}
                                                fallbackIcon={user?.role === 'manager' ? 'shield' : 'person'}
                                                contentFit="cover"
                                            />
                                        ) : (
                                            <Ionicons name={user?.role === 'manager' ? 'shield-outline' : 'person-outline'} size={60} color={Colors.primary} />
                                        )}
                                    </View>
                                    {(() => {
                                        const isPlayer = user?.role === 'player';
                                        const isManager = user?.role === 'manager';

                                        let displayName = 'FOYDALANUVCHI';
                                        if (isGuest) {
                                            displayName = 'MEHMON';
                                        } else if (isPlayer) {
                                            const fName = (detailedData?.firstName || user?.firstName || detailedData?.name || user?.name || '').trim().split(' ')[0];
                                            displayName = fName || 'O\'YINCHI';
                                        } else if (isManager) {
                                            const rawName = (detailedData?.name || detailedData?.team_name || user?.teamName || user?.name || detailedData?.firstName || user?.firstName || 'JAMOA').trim().split(' ')[0];
                                            displayName = rawName || 'JAMOA';
                                        }
                                        displayName = displayName.replace(/\(sardor\)/gi, '').replace(/\(menejer\)/gi, '').trim();

                                        let displaySubtitle = 'AMATORA AZ\'OSI';
                                        if (isGuest) {
                                            displaySubtitle = 'MEHMON';
                                        } else if (isPlayer) {
                                            displaySubtitle = getPositionFullUz(detailedData?.position || user?.position || 'O\'YINCHI').toUpperCase();
                                        } else if (isManager) {
                                            displaySubtitle = (detailedData?.league || user?.league || 'SARDOR').toUpperCase();
                                        }

                                        return (
                                            <View style={styles.nameContainer}>
                                                <Text style={styles.userName}>
                                                    {displayName.toUpperCase()}
                                                </Text>
                                                <Text style={styles.userRoleText}>
                                                    {displaySubtitle}
                                                </Text>
                                            </View>
                                        );
                                    })()}
                                </View>
                            );
                        })()}
                    </View>

                    {/* Account Settings (Guest Only) */}
                    {isGuest && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>HISOB</Text>
                            <TouchableOpacity style={styles.loginBanner} onPress={() => logout()}>
                                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, width: '100%' }}>
                                    <View style={styles.bannerInfo}>
                                        <Ionicons name="log-in-outline" size={28} color={Colors.primary} />
                                        <View style={styles.bannerTextContainer}>
                                            <Text style={styles.bannerTitle}>TIZIMGA KIRING</Text>
                                            <Text style={styles.bannerSubtitle}>BARCHA IMKONIYATLAR UCHUN</Text>
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    {!isGuest && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>BOSHQARUV</Text>
                            {user?.role === 'player' && (
                                <>
                                    <SettingItem
                                        icon="stats-chart-outline"
                                        title="Mening statistika"
                                        onPress={() => navigation.navigate('MyStats', { playerId: user?.id })}
                                    />
                                    <SettingItem
                                        icon="paper-plane-outline"
                                        title="Mening arizalarim"
                                        value={userTransfers.length + userProfileApps.length > 0 ? `${userTransfers.length + userProfileApps.length} ta ariza` : ''}
                                        onPress={() => navigation.navigate('Applications')}
                                    />
                                    {transferWindowOpen && (
                                        <SettingItem
                                            icon="swap-horizontal-outline"
                                            title="Transfer so'rovi"
                                            onPress={() => navigation.navigate('TransferRequest', { playerId: user?.id })}
                                        />
                                    )}
                                </>
                            )}
                            {currentTeamId && (
                                <>
                                    <SettingItem
                                        icon="shield-outline"
                                        title="Mening jamoam"
                                        onPress={() => navigation.navigate('TeamProfile', { teamId: currentTeamId })}
                                    />
                                    <SettingItem
                                        icon="chatbubbles-outline"
                                        title="Jamoa chati"
                                        onPress={() => navigation.navigate('TeamChat', { 
                                            teamId: currentTeamId, 
                                            userId: user?._id || user?.id, 
                                            userName: user?.firstName || user?.name || user?.first_name || 'Foydalanuvchi' 
                                        })}
                                        badgeCount={unreadCount}
                                        isMuted={isChatMuted}
                                    />
                                    {user?.role === 'player' ? (
                                        <SettingItem
                                            icon="grid-outline"
                                            title="Jamoa sostavi"
                                            onPress={() => navigation.navigate('FormationBoard', { teamId: currentTeamId, isReadOnly: true })}
                                        />
                                    ) : (
                                        <>
                                            <SettingItem
                                                icon="grid-outline"
                                                title="Sostavni tahrirlash"
                                                onPress={() => navigation.navigate('FormationBoard', { teamId: currentTeamId, isReadOnly: false })}
                                            />
                                            <SettingItem
                                                icon="person-add-outline"
                                                title="O'yinchi qo'shish"
                                                onPress={() => navigation.navigate('JoinApplication', { initialType: 'player', teamId: currentTeamId })}
                                            />
                                        </>
                                    )}
                                </>
                            )}
                        </View>
                    )}

                    {isGuest && (
                        <View style={styles.section}>
                            <View style={styles.applyBanner}>
                                <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
                                <View style={{ padding: 25, alignItems: 'center' }}>
                                    <Text style={styles.applyTitle}>LIGAGA ARIZA TOPSHIRING</Text>
                                    <Text style={styles.applySubtitle}>O'Z JAMOANGIZ BILAN AMATORA DA QATNASHING!</Text>
                                    <TouchableOpacity
                                        style={styles.applyButton}
                                        onPress={() => (navigation as any).navigate('JoinApplication')}
                                    >
                                        <Text style={styles.applyButtonText}>ARIZA TOPSHIRISH</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}



                    {/* Settings & Security Navigation */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>SOZLAMALAR</Text>
                        <SettingItem
                            icon="settings-outline"
                            title="Sozlamalar va xavfsizlik"
                            onPress={() => {
                                const parent = navigation.getParent?.();
                                if (parent) {
                                    parent.navigate('SecuritySettings');
                                } else {
                                    (navigation as any).navigate('SecuritySettings');
                                }
                            }}
                        />
                    </View>

                    {/* App Version */}
                    <Text style={styles.versionText}>VERSIYA 2.1.1 • PRODUCTION CERTIFIED</Text>
                </ScrollView>

                {/* PIN Verification Modal */}
                <Modal visible={showPinModal} transparent animationType="fade" onRequestClose={() => setShowPinModal(false)}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                        <View style={{ width: '100%', maxWidth: 340, backgroundColor: '#161B26', borderRadius: 20, padding: 25, borderWidth: 1, borderColor: Colors.primary }}>
                            <View style={{ alignItems: 'center', marginBottom: 15 }}>
                                <Ionicons name="lock-closed-outline" size={36} color={Colors.primary} />
                                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 10 }}>PIN-KODNI KIRITING</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginTop: 5 }}>
                                    {targetJuniorState ? "Junior Rejim (U-14) ga o'tish uchun 4 xonali PIN-kodni kiriting" : "Junior Rejimdan chiqish uchun PIN-kodni kiriting"}
                                </Text>
                            </View>

                            <TextInput
                                style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: Colors.primary, fontSize: 24, fontWeight: '900', textAlign: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', letterSpacing: 10, marginBottom: 20 }}
                                value={pinInput}
                                onChangeText={setPinInput}
                                keyboardType="number-pad"
                                maxLength={4}
                                secureTextEntry
                                placeholder="••••"
                                placeholderTextColor="rgba(255,255,255,0.2)"
                                autoFocus
                            />

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <TouchableOpacity
                                    style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 8, alignItems: 'center' }}
                                    onPress={() => setShowPinModal(false)}
                                >
                                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>BEKOR QILISH</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.primary, marginLeft: 8, alignItems: 'center' }}
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
                                    <Text style={{ color: '#000', fontWeight: '900' }}>TASDIQLASH</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </AnimatedBackground>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'transparent' },
    container: { flex: 1 },
    profileHeader: { overflow: 'hidden' },
    avatarContainer: { width: 140, height: 140, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.15)', backgroundColor: 'rgba(255, 255, 255, 0.06)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden' },
    nameContainer: {
        alignItems: 'center',
        marginTop: 4,
    },
    userName: { 
        color: '#FFF', 
        fontSize: 26, 
        fontWeight: '900', 
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    userRoleText: { 
        color: 'rgba(255, 255, 255, 0.5)', 
        fontSize: 12, 
        fontWeight: '800', 
        letterSpacing: 1.5,
        marginTop: 4,
        textAlign: 'center',
    },
    section: { marginTop: 30, paddingHorizontal: 20 },
    sectionTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', marginBottom: 15, marginLeft: 5, letterSpacing: 1.5 },
    settingItem: { 
        borderRadius: 16, 
        marginBottom: 10, 
        overflow: 'hidden', 
        borderWidth: 1, 
        borderColor: 'rgba(255, 255, 255, 0.12)',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    settingLeft: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0, 255, 102, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    settingTitle: { color: '#FFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
    settingRight: { flexDirection: 'row', alignItems: 'center' },
    settingValue: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginRight: 8, fontWeight: 'bold' },
    loginBanner: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0, 255, 102, 0.3)' },
    bannerInfo: { flexDirection: 'row', alignItems: 'center' },
    bannerTextContainer: { marginLeft: 15 },
    bannerTitle: { color: Colors.primary, fontSize: 16, fontWeight: '900' },
    bannerSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 'bold', marginTop: 2 },
    applyBanner: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    applyTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 6, letterSpacing: 1 },
    applySubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginBottom: 20, fontWeight: 'bold' },
    applyButton: { backgroundColor: Colors.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 30 },
    applyButtonText: { color: '#000', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
    logoutButton: { marginTop: 20, padding: 20, alignItems: 'center' },
    logoutInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255, 59, 48, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 59, 48, 0.2)' },
    logoutText: { color: Colors.danger, fontSize: 15, fontWeight: '900', marginLeft: 10, letterSpacing: 1 },
    versionText: { color: 'rgba(255,255,255,0.2)', fontSize: 10, textAlign: 'center', marginTop: 10, fontWeight: 'bold', letterSpacing: 1 },
    rightBadge: {
        backgroundColor: Colors.danger,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        marginRight: 8,
    },
    rightBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '900',
    },
    appCardContainer: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        overflow: 'hidden',
        padding: 12,
    },
    segmentedTabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 12,
        padding: 4,
        marginBottom: 12,
    },
    segmentedTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    segmentedTabActive: {
        backgroundColor: Colors.primary,
    },
    segmentedTabText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    segmentedTabTextActive: {
        color: '#0b0e17',
        fontWeight: '900',
    },
    emptyAppContainer: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyAppText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 8,
    },
    appCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    appCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justify: 'space-between',
        marginBottom: 6,
    },
    appCardTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    appCardTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        flex: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
    },
    statusPending: {
        backgroundColor: 'rgba(255, 204, 0, 0.12)',
        borderColor: 'rgba(255, 204, 0, 0.4)',
    },
    statusApproved: {
        backgroundColor: 'rgba(0, 255, 102, 0.12)',
        borderColor: 'rgba(0, 255, 102, 0.4)',
    },
    statusRejected: {
        backgroundColor: 'rgba(255, 59, 48, 0.12)',
        borderColor: 'rgba(255, 59, 48, 0.4)',
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    appCardReason: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        marginBottom: 8,
        lineHeight: 16,
    },
    appCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        paddingTop: 6,
        marginTop: 2,
    },
    appCardDate: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
        fontWeight: '500',
    },
    logoutModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    logoutModalCard: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.25)',
        backgroundColor: 'rgba(20, 15, 25, 0.92)',
    },
    logoutIconBadge: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 59, 48, 0.12)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 59, 48, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    logoutModalTitle: {
        fontSize: 17,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 1,
        textAlign: 'center',
        marginBottom: 8,
    },
    logoutModalSubtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.65)',
        textAlign: 'center',
        marginBottom: 20,
    },
    logoutConfirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.danger,
        width: '100%',
        height: 48,
        borderRadius: 14,
        marginBottom: 8,
        shadowColor: Colors.danger,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    logoutConfirmBtnText: {
        color: '#FFF',
        fontWeight: '900',
        fontSize: 13,
        letterSpacing: 1,
    },
    logoutCancelBtn: {
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutCancelBtnText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '700',
        fontSize: 13,
    },
});

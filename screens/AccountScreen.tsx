import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    Platform
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
    const currentTeamId = user?.teamId || user?.team_id || (user?.role === 'manager' ? (user?.id || user?._id) : null);

    useEffect(() => {
        if (!isGuest && user?.id) {
            loadDetailedData();
        }
    }, [isGuest, user?.id]);

    const loadDetailedData = async () => {
        try {
            setLoading(true);
            const targetTeamId = currentTeamId;
            if (user.role === 'player') {
                const data = await apiService.getPlayerById(user.id);
                if (data) setDetailedData(data);
            } else if (user.role === 'manager' && targetTeamId) {
                const data = await apiService.getTeamById(targetTeamId);
                if (data) setDetailedData(data);
            }
        } catch (error) {
            console.error('Error loading detailed account data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'CHIQISH',
            'HAQIQATAN HAM HISOBDAN CHIQMOQCHIMISIZ?',
            [
                { text: 'BEKOR QILISH', style: 'cancel' },
                { text: 'CHIQISH', onPress: () => logout(), style: 'destructive' },
            ]
        );
    };

    const SettingItem = ({ icon, title, value, onPress, type = 'chevron', badgeCount, isMuted }: any) => (
        <TouchableOpacity
            style={styles.settingItem}
            onPress={onPress}
            disabled={type === 'switch'}
        >
            <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
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
                    contentContainerStyle={{ paddingBottom: 100 }}
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
                                            const fName = detailedData?.firstName || user?.firstName || detailedData?.name || user?.name || '';
                                            const lName = detailedData?.lastName || user?.lastName || '';
                                            displayName = `${fName} ${lName}`.trim() || 'O\'YINCHI';
                                        } else if (isManager) {
                                            const rawName = detailedData?.name || detailedData?.team_name || user?.teamName || user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'JAMOA');
                                            displayName = rawName || 'JAMOA';
                                        }
                                        displayName = displayName.replace(/\(sardor\)/gi, '').replace(/\(menejer\)/gi, '').trim();

                                        let displaySubtitle = 'AMATORA AZ\'OSI';
                                        if (isGuest) {
                                            displaySubtitle = 'CHEKLANGAN IMKONIYAT';
                                        } else if (isPlayer) {
                                            displaySubtitle = getPositionFullUz(detailedData?.position || user?.position || 'O\'YINCHI').toUpperCase();
                                        } else if (isManager) {
                                            displaySubtitle = (detailedData?.league || user?.league || 'JAMOA SARDORI').toUpperCase();
                                        }

                                        return (
                                            <>
                                                <Text style={styles.userName}>
                                                    {displayName.toUpperCase()}
                                                </Text>
                                                <View style={styles.roleBadge}>
                                                    <Text style={styles.userRole}>
                                                        {displaySubtitle}
                                                    </Text>
                                                </View>
                                            </>
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
                                        icon="swap-horizontal-outline"
                                        title="Transfer so'rovi"
                                        onPress={() => navigation.navigate('TransferRequest', { playerId: user?.id })}
                                    />
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
                                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
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

                    {/* Organization & Junior Mode Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>TASHKILOT & REJIMLAR</Text>
                        
                        <SettingItem
                            icon="school-outline"
                            title="Junior Rejim (U-14)"
                            type="switch"
                            value={isJuniorMode}
                            onPress={(val: boolean) => {
                                setTargetJuniorState(val);
                                setPinInput('');
                                setShowPinModal(true);
                            }}
                        />

                        <SettingItem
                            icon="business-outline"
                            title="Tashkilot"
                            value={organizations.find(o => o.id === selectedOrganizationId)?.name || 'Havas Liga'}
                            onPress={() => {
                                const nextOrgId = selectedOrganizationId === 1 ? 2 : 1;
                                setSelectedOrganizationId(nextOrgId);
                                Alert.alert("Tashkilot Almashtirildi", `Hozirgi tashkilot: ${organizations.find(o => o.id === nextOrgId)?.name}`);
                            }}
                        />
                    </View>

                    {/* Logout */}
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <View style={styles.logoutInner}>
                            <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
                            <Text style={styles.logoutText}>CHIQISH</Text>
                        </View>
                    </TouchableOpacity>

                    {/* App Version */}
                    <Text style={styles.versionText}>VERSIYA 2.1.1 • UPDATE VERIFIED</Text>
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
    avatarContainer: { width: 140, height: 140, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.15)', backgroundColor: 'rgba(255, 255, 255, 0.06)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
    userName: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: 1 },
    roleBadge: { backgroundColor: 'transparent', marginTop: 10 },
    userRole: { color: Colors.primary, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    section: { marginTop: 30, paddingHorizontal: 20 },
    sectionTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', marginBottom: 15, marginLeft: 5, letterSpacing: 1.5 },
    settingItem: { borderRadius: 16, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
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
});

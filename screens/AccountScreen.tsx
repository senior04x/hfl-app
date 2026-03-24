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
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';
import VideoBackground from '../components/VideoBackground';
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

export default function AccountScreen({ navigation }: any) {
    const { isGuest, user, logout, unreadCount, isChatMuted } = useAuthStore();
    const [detailedData, setDetailedData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isGuest && user?.id) {
            loadDetailedData();
        }
    }, [isGuest, user?.id]);

    const loadDetailedData = async () => {
        try {
            setLoading(true);
            if (user.role === 'player') {
                const data = await apiService.getPlayerById(user.id);
                if (data) setDetailedData(data);
            } else if (user.role === 'manager' && user.teamId) {
                const data = await apiService.getTeamById(user.teamId);
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
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                overlayOpacity={0.7}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView 
                    style={styles.container} 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    {/* Profile Header */}
                    <View style={styles.profileHeader}>
                        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                            <View style={styles.avatarContainer}>
                                {!isGuest && (user?.photo || user?.logo || user?.avatar) ? (
                                    <SmartImage 
                                        uri={user.photo || user.logo || user.avatar}
                                        style={{ width: 200, height: 200, borderRadius: 25 }}
                                        fallbackIcon={user.role === 'manager' ? 'people' : 'person'}
                                    />
                                ) : (
                                    <Ionicons name="person" size={60} color={Colors.primary} />
                                )}
                            </View>
                            <Text style={styles.userName}>
                                {isGuest ? 'MEHMON' : 
                                 (detailedData?.lastName ? `${detailedData.firstName} ${detailedData.lastName}` : 
                                  user?.name || user?.firstName || 'FOYDALANUVCHI').toUpperCase()}
                            </Text>
                            <View style={styles.roleBadge}>
                                <Text style={styles.userRole}>
                                    {isGuest ? 'CHEKLANGAN IMKONIYAT' : 
                                     user?.role === 'manager' ? 'TREYNER' : 
                                     user?.role === 'player' ? getPositionFullUz(detailedData?.position || user?.position).toUpperCase() : "AMATORA AZ'OSI"}
                                </Text>
                            </View>
                        </View>
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
                            {(user?.role === 'player' || user?.role === 'manager' || user?.role === 'coach' || user?.role === 'team_admin') && user?.teamId && (
                                <>
                                    <SettingItem
                                        icon="shield-outline"
                                        title="Mening jamoam"
                                        onPress={() => navigation.navigate('TeamProfile', { teamId: user?.teamId })}
                                    />
                                    <SettingItem
                                        icon="chatbubbles-outline"
                                        title="Jamoa chati"
                                        onPress={() => navigation.navigate('TeamChat', { 
                                            teamId: user?.teamId, 
                                            userId: user?._id || user?.id, 
                                            userName: user?.firstName || user?.name || 'Foydalanuvchi' 
                                        })}
                                        badgeCount={unreadCount}
                                        isMuted={isChatMuted}
                                    />
                                    {(user?.role === 'manager' || user?.role === 'coach' || user?.role === 'team_admin') && (
                                        <SettingItem
                                            icon="grid-outline"
                                            title="Sostavni tahrirlash"
                                            onPress={() => navigation.navigate('FormationBoard', { teamId: user?.teamId })}
                                        />
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
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'transparent' },
    container: { flex: 1 },
    profileHeader: { overflow: 'hidden' },
    avatarContainer: { width: 200, height: 200, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 25, overflow: 'hidden' },
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

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useAuthStore } from '../store/useAuthStore';

export default function AccountScreen({ navigation }: any) {
    const { isGuest, user, logout } = useAuthStore();
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [language, setLanguage] = useState('uz');

    const handleLogout = () => {
        Alert.alert(
            'Chiqish',
            'Haqiqatan ham hisobdan chiqmoqchimisiz?',
            [
                { text: 'Bekor qilish', style: 'cancel' },
                { text: 'Chiqish', onPress: () => logout(), style: 'destructive' },
            ]
        );
    };

    const SettingItem = ({ icon, title, value, onPress, type = 'chevron' }: any) => (
        <TouchableOpacity
            style={styles.settingItem}
            onPress={onPress}
            disabled={type === 'switch'}
        >
            <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={22} color={Colors.primary} />
                </View>
                <Text style={styles.settingTitle}>{title}</Text>
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
                    <Text style={styles.settingValue}>{value}</Text>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <Ionicons name="person" size={60} color={Colors.text} />
                    </View>
                    <Text style={styles.userName}>{isGuest ? 'Mehmon' : 'Futbolchi'}</Text>
                    <Text style={styles.userRole}>{isGuest ? 'Cheklangan imkoniyat' : "Amatora A'zosi"}</Text>
                </View>

                {/* Account Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Hisob</Text>
                    {isGuest ? (
                        <TouchableOpacity style={styles.loginBanner} onPress={() => logout()}>
                            <View style={styles.bannerInfo}>
                                <Ionicons name="log-in-outline" size={24} color={Colors.primary} />
                                <View style={styles.bannerTextContainer}>
                                    <Text style={styles.bannerTitle}>Tizimga kiring</Text>
                                    <Text style={styles.bannerSubtitle}>Barcha imkoniyatlardan foydalanish uchun</Text>
                                </View>
                            </View>
                            <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                    ) : (
                        <SettingItem
                            icon="person-outline"
                            title="Profilni tahrirlash"
                            onPress={() => { }}
                        />
                    )}
                    <SettingItem
                        icon="shield-checkmark-outline"
                        title="Xavfsizlik"
                        onPress={() => { }}
                    />
                </View>

                {/* Role-Specific Features */}
                {!isGuest && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Jamoa va O'yinchi</Text>

                        {/* Player Only Features */}
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

                        {/* Coach/Team Manager Features */}
                        {(user?.role === 'coach' || user?.role === 'team_admin') && (
                            <>
                                <SettingItem
                                    icon="grid-outline"
                                    title="Sostav (Tactic)"
                                    onPress={() => navigation.navigate('FormationBoard', { teamId: user?.teamId })}
                                />
                                <SettingItem
                                    icon="chatbubbles-outline"
                                    title="Jamoa chati"
                                    onPress={() => navigation.navigate('TeamChat', { teamId: user?.teamId, userId: user?.id, userName: user?.name })}
                                />
                            </>
                        )}

                        {/* General League/Admin placeholders if needed */}
                        {user?.role === 'league' && (
                            <Text style={{ color: Colors.textMuted, padding: 12, fontSize: 14 }}>
                                Liga boshqaruvi saytimiz orqali amalga oshiriladi.
                            </Text>
                        )}
                    </View>
                )}

                {/* App Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ilova sozlamalari</Text>
                    <SettingItem
                        icon="moon-outline"
                        title="Tungi rejim"
                        type="switch"
                        value={isDarkMode}
                        onPress={() => setIsDarkMode(!isDarkMode)}
                    />
                    <SettingItem
                        icon="language-outline"
                        title="Til"
                        value={language === 'uz' ? 'O\'zbekcha' : 'Russian'}
                        onPress={() => Alert.alert('Tilni tanlang', 'Hozircha faqat O\'zbek tili mavjud')}
                    />
                    <SettingItem
                        icon="notifications-outline"
                        title="Bildirishnomalar"
                        onPress={() => { }}
                    />
                </View>

                {/* Application Section - Only for Guests */}
                {isGuest && (
                    <View style={styles.section}>
                        <View style={styles.applyBanner}>
                            <Text style={styles.applyTitle}>Ligaga ariza topshiring</Text>
                            <Text style={styles.applySubtitle}>O'z jamoangiz bilan Amatora da qatnashing!</Text>
                            <TouchableOpacity
                                style={styles.applyButton}
                                onPress={() => (navigation as any).navigate('JoinApplication')}
                            >
                                <Text style={styles.applyButtonText}>Ariza topshirish</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
                    <Text style={styles.logoutText}>Chiqish</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    profileHeader: {
        alignItems: 'center',
        paddingVertical: 30,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    userName: {
        color: Colors.text,
        fontSize: 22,
        fontWeight: 'bold',
    },
    userRole: {
        color: Colors.textMuted,
        fontSize: 14,
        marginTop: 5,
    },
    section: {
        marginTop: 25,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        color: Colors.textMuted,
        fontSize: 13,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 10,
        marginLeft: 5,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        padding: 15,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingTitle: {
        color: Colors.text,
        fontSize: 16,
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingValue: {
        color: Colors.textMuted,
        fontSize: 14,
        marginRight: 8,
    },
    loginBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0, 255, 102, 0.05)',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    bannerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bannerTextContainer: {
        marginLeft: 12,
    },
    bannerTitle: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    bannerSubtitle: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    applyBanner: {
        backgroundColor: Colors.surface,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.primary,
        alignItems: 'center',
    },
    applyTitle: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    applySubtitle: {
        color: Colors.textMuted,
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 15,
    },
    applyButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 25,
        paddingVertical: 10,
        borderRadius: 25,
    },
    applyButtonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 14,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        padding: 15,
    },
    logoutText: {
        color: Colors.danger,
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
});

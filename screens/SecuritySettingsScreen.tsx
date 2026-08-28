import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    ActivityIndicator,
    Alert,
    Dimensions,
    StatusBar,
    Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import { useAuthStore } from '../store/useAuthStore';
import { apiService, clearApiCache } from '../services/apiService';
import VideoBackground from '../components/VideoBackground';
import { useTranslation } from 'react-i18next';
import { getLocalizedErrorMessage } from '../utils/errorParser';

const { width } = Dimensions.get('window');

interface SettingRowProps {
    icon: any;
    title: string;
    subtitle?: string;
    onPress: () => void;
    destructive?: boolean;
    isLast?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
    icon,
    title,
    subtitle,
    onPress,
    destructive = false,
    isLast = false
}) => (
    <TouchableOpacity
        style={[styles.settingRow, isLast && styles.settingRowLast]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.iconBox, destructive && styles.iconBoxDestructive]}>
            <Ionicons
                name={icon}
                size={20}
                color={destructive ? Colors.danger : Colors.primary}
            />
        </View>
        <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, destructive && styles.settingTitleDestructive]}>
                {title}
            </Text>
            {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        <Ionicons
            name="chevron-forward"
            size={18}
            color={destructive ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.3)'}
        />
    </TouchableOpacity>
);

export default function SecuritySettingsScreen({ navigation }: any) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { user, isGuest, logout } = useAuthStore();

    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirmLogout = async () => {
        try {
            setShowLogoutModal(false);
            clearApiCache();
            await logout();
            navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
            });
        } catch (error) {
            console.error('Logout error:', error);
            logout();
        }
    };

    const handleConfirmDelete = async () => {
        try {
            setIsDeleting(true);
            const targetId = user?._id || user?.id;
            const targetPhone = user?.phone || user?.phoneNumber || user?.phone_number;

            const res = await apiService.deleteAccount(targetId, targetPhone);
            setIsDeleting(false);
            setShowDeleteModal(false);

            if (res && res.success) {
                Alert.alert(
                    t('settings.account_deleted'),
                    t('settings.account_deleted_sub'),
                    [
                        {
                            text: "OK",
                            onPress: async () => {
                                clearApiCache();
                                await logout();
                                navigation.reset({
                                    index: 0,
                                    routes: [{ name: 'Welcome' }],
                                });
                            }
                        }
                    ]
                );
            } else {
                Alert.alert(t('common.error'), getLocalizedErrorMessage(res?.error));
            }
        } catch (error: any) {
            setIsDeleting(false);
            setShowDeleteModal(false);
            Alert.alert(t('common.error'), getLocalizedErrorMessage(error));
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <VideoBackground
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                overlayOpacity={0.85}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 20) }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('settings.security_title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollContent}
                contentContainerStyle={{ paddingBottom: 60 }}
                showsVerticalScrollIndicator={false}
            >
                {/* SECTION 1: Legal & Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>{t('settings.legal_docs')}</Text>
                    <View style={styles.cardContainer}>
                        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                        <SettingRow
                            icon="shield-checkmark-outline"
                            title={t('settings.privacy_policy')}
                            subtitle={t('settings.privacy_policy_sub')}
                            onPress={() => setShowPrivacyModal(true)}
                        />
                        <SettingRow
                            icon="document-text-outline"
                            title={t('settings.terms_of_use')}
                            subtitle={t('settings.terms_of_use_sub')}
                            onPress={() => setShowTermsModal(true)}
                            isLast={true}
                        />
                    </View>
                </View>

                {/* SECTION 2: Account Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>{t('settings.account_management')}</Text>
                    <View style={styles.cardContainer}>
                        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                        <SettingRow
                            icon="log-out-outline"
                            title={t('auth.logout')}
                            subtitle={isGuest ? t('auth.logout_guest') : t('auth.logout_current')}
                            onPress={() => setShowLogoutModal(true)}
                            isLast={isGuest}
                        />
                        {!isGuest && (
                            <SettingRow
                                icon="trash-outline"
                                title={t('settings.delete_account')}
                                subtitle={t('settings.delete_account_sub')}
                                onPress={() => setShowDeleteModal(true)}
                                destructive={true}
                                isLast={true}
                            />
                        )}
                    </View>
                </View>

                {/* Certified Badge */}
                <View style={styles.badgeContainer}>
                    <View style={styles.badgeRow}>
                        <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                        <Text style={styles.badgeText}>AMATORA PRODUCTION SECURITY CERTIFIED</Text>
                    </View>
                    <Text style={styles.versionText}>Versiya 2.1.1 (Build Release Candidate)</Text>
                </View>
            </ScrollView>

            {/* Logout Confirmation Modal */}
            <Modal
                visible={showLogoutModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowLogoutModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconBox}>
                            <Ionicons name="log-out-outline" size={32} color={Colors.primary} />
                        </View>
                        <Text style={styles.modalTitle}>{t('auth.logout_confirm_title')}</Text>
                        <Text style={styles.modalSubtitle}>
                            {t('auth.logout_confirm_sub')}
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowLogoutModal(false)}
                            >
                                <Text style={styles.modalCancelText}>{t('common.cancel').toUpperCase()}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalPrimaryBtn}
                                onPress={handleConfirmLogout}
                            >
                                <Text style={styles.modalPrimaryText}>{t('auth.logout').toUpperCase()}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete Account 2-Step Confirmation Modal */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={() => !isDeleting && setShowDeleteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { borderColor: 'rgba(239, 68, 68, 0.4)' }]}>
                        <View style={[styles.modalIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                            <Ionicons name="trash-outline" size={32} color={Colors.danger} />
                        </View>
                        <Text style={[styles.modalTitle, { color: Colors.danger }]}>{t('settings.delete_account').toUpperCase()}</Text>
                        <Text style={styles.modalSubtitle}>
                            {t('settings.delete_account_modal_warning')}
                        </Text>

                        {isDeleting ? (
                            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={Colors.danger} />
                                <Text style={[styles.modalSubtitle, { marginTop: 10 }]}>{t('settings.deleting_data')}</Text>
                            </View>
                        ) : (
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setShowDeleteModal(false)}
                                >
                                    <Text style={styles.modalCancelText}>{t('common.cancel').toUpperCase()}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalPrimaryBtn, { backgroundColor: Colors.danger }]}
                                    onPress={handleConfirmDelete}
                                >
                                    <Text style={[styles.modalPrimaryText, { color: '#FFF' }]}>{t('common.delete').toUpperCase()}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Privacy Policy Modal */}
            <Modal
                visible={showPrivacyModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowPrivacyModal(false)}
            >
                <View style={styles.docModalOverlay}>
                    <View style={styles.docModalContainer}>
                        <View style={styles.docModalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Ionicons name="shield-checkmark" size={22} color={Colors.primary} />
                                <Text style={styles.docModalTitle}>{t('settings.privacy_policy')}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowPrivacyModal(false)}
                                style={styles.docCloseBtn}
                            >
                                <Ionicons name="close" size={22} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.docModalBody} showsVerticalScrollIndicator={false}>
                            <Text style={styles.docSectionTitle}>{t('settings.privacy_sec1_title')}</Text>
                            <Text style={styles.docText}>
                                {t('settings.privacy_sec1_text')}
                            </Text>

                            <Text style={styles.docSectionTitle}>{t('settings.privacy_sec2_title')}</Text>
                            <Text style={styles.docText}>
                                {t('settings.privacy_sec2_text')}
                            </Text>

                            <Text style={styles.docSectionTitle}>{t('settings.privacy_sec3_title')}</Text>
                            <Text style={styles.docText}>
                                {t('settings.privacy_sec3_text')}
                            </Text>

                            <Text style={styles.docSectionTitle}>{t('settings.privacy_sec4_title')}</Text>
                            <Text style={styles.docText}>
                                {t('settings.privacy_sec4_text')}
                            </Text>

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Terms of Service Modal */}
            <Modal
                visible={showTermsModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowTermsModal(false)}
            >
                <View style={styles.docModalOverlay}>
                    <View style={styles.docModalContainer}>
                        <View style={styles.docModalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Ionicons name="document-text" size={22} color={Colors.primary} />
                                <Text style={styles.docModalTitle}>{t('settings.terms_of_use')}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowTermsModal(false)}
                                style={styles.docCloseBtn}
                            >
                                <Ionicons name="close" size={22} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.docModalBody} showsVerticalScrollIndicator={false}>
                            <Text style={styles.docSectionTitle}>{t('settings.terms_sec1_title')}</Text>
                            <Text style={styles.docText}>
                                {t('settings.terms_sec1_text')}
                            </Text>

                            <Text style={styles.docSectionTitle}>{t('settings.terms_sec2_title')}</Text>
                            <Text style={styles.docText}>
                                {t('settings.terms_sec2_text')}
                            </Text>

                            <Text style={styles.docSectionTitle}>{t('settings.terms_sec3_title')}</Text>
                            <Text style={styles.docText}>
                                {t('settings.terms_sec3_text')}
                            </Text>

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050811',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 20,
    },
    section: {
        marginBottom: 26,
    },
    sectionHeader: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 10,
        marginLeft: 4,
    },
    cardContainer: {
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    settingRowLast: {
        borderBottomWidth: 0,
    },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 255, 135, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    iconBoxDestructive: {
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    settingTitleDestructive: {
        color: Colors.danger,
    },
    settingSubtitle: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        marginTop: 2,
    },
    badgeContainer: {
        alignItems: 'center',
        marginTop: 10,
        paddingVertical: 14,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0, 255, 135, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 135, 0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: {
        color: Colors.primary,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    versionText: {
        color: 'rgba(255, 255, 255, 0.35)',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#111726',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        alignItems: 'center',
    },
    modalIconBox: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0, 255, 135, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    modalSubtitle: {
        color: 'rgba(255, 255, 255, 0.65)',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 20,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    modalPrimaryBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 14,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalPrimaryText: {
        color: '#000000',
        fontSize: 13,
        fontWeight: '900',
    },
    docModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'flex-end',
    },
    docModalContainer: {
        backgroundColor: '#111726',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        height: '80%',
        padding: 24,
        borderTopWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    docModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    docModalTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
    },
    docCloseBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    docModalBody: {
        marginTop: 16,
    },
    docSectionTitle: {
        color: Colors.primary,
        fontSize: 15,
        fontWeight: '800',
        marginTop: 14,
        marginBottom: 6,
    },
    docText: {
        color: 'rgba(255, 255, 255, 0.75)',
        fontSize: 13,
        lineHeight: 20,
    },
});

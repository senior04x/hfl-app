import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { formatUzPhone } from '../utils/stringUtils';

const { width } = Dimensions.get('window');

interface RegistrationClosedModalProps {
    visible: boolean;
    contactPhone?: string | null;
    organizationName?: string | null;
    onClose: () => void;
}

export default function RegistrationClosedModal({
    visible,
    contactPhone,
    organizationName,
    onClose,
}: RegistrationClosedModalProps) {
    const { t } = useTranslation();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);

    const handleCall = () => {
        if (!contactPhone) return;
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            const cleaned = contactPhone.replace(/\s+/g, '');
            Linking.openURL(`tel:${cleaned}`);
        } catch (e) {}
    };

    const handleClose = () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        } catch (e) {}
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={handleClose}
            >
                <TouchableOpacity
                    style={[
                        styles.card,
                        {
                            backgroundColor: isDark ? '#141414' : '#FFFFFF',
                            borderColor: isDark ? '#262626' : '#E2E8F0',
                        }
                    ]}
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Header Icon */}
                    <View style={styles.iconContainer}>
                        <View style={styles.iconRing}>
                            <Ionicons name="lock-closed" size={32} color="#EF4444" />
                        </View>
                    </View>

                    {/* Organization Name (if available) */}
                    {organizationName ? (
                        <Text style={[styles.orgNameText, { color: homeColors.textSecondary }]} numberOfLines={1}>
                            {organizationName}
                        </Text>
                    ) : null}

                    {/* 3-Language Notice Cards */}
                    <View style={styles.noticesContainer}>
                        {/* Uzbek */}
                        <View style={[styles.langItem, { backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC', borderColor: isDark ? '#2C2C2E' : '#E2E8F0' }]}>
                            <View style={styles.langHeader}>
                                <Text style={styles.flag}>🇺🇿</Text>
                                <Text style={[styles.langLabel, { color: homeColors.textPrimary }]}>O'zbekcha</Text>
                            </View>
                            <Text style={[styles.noticeText, { color: homeColors.textSecondary }]}>
                                Tashkilotingiz ro'yxatdan o'tishni yopgan. Tashkilotingiz bilan bog'laning.
                            </Text>
                        </View>

                        {/* Russian */}
                        <View style={[styles.langItem, { backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC', borderColor: isDark ? '#2C2C2E' : '#E2E8F0' }]}>
                            <View style={styles.langHeader}>
                                <Text style={styles.flag}>🇷🇺</Text>
                                <Text style={[styles.langLabel, { color: homeColors.textPrimary }]}>Русский</Text>
                            </View>
                            <Text style={[styles.noticeText, { color: homeColors.textSecondary }]}>
                                Ваша организация закрыла регистрацию. Свяжитесь с вашей организацией.
                            </Text>
                        </View>

                        {/* English */}
                        <View style={[styles.langItem, { backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC', borderColor: isDark ? '#2C2C2E' : '#E2E8F0' }]}>
                            <View style={styles.langHeader}>
                                <Text style={styles.flag}>🇬🇧</Text>
                                <Text style={[styles.langLabel, { color: homeColors.textPrimary }]}>English</Text>
                            </View>
                            <Text style={[styles.noticeText, { color: homeColors.textSecondary }]}>
                                Your organization has closed registration. Please contact your organization.
                            </Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsContainer}>
                        {contactPhone ? (
                            <TouchableOpacity
                                onPress={handleCall}
                                style={[styles.callBtn, { backgroundColor: homeColors.accent }]}
                            >
                                <Ionicons name="call" size={18} color="#FFFFFF" />
                                <Text style={styles.callBtnText}>
                                    {formatUzPhone(contactPhone) || contactPhone}
                                </Text>
                            </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                            onPress={handleClose}
                            style={[
                                styles.closeBtn,
                                {
                                    backgroundColor: isDark ? '#262626' : '#F1F5F9',
                                    borderColor: isDark ? '#333333' : '#E2E8F0',
                                }
                            ]}
                        >
                            <Text style={[styles.closeBtnText, { color: homeColors.textPrimary }]}>
                                {t('common.close', 'Yopish')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        borderWidth: 1,
        padding: 22,
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 15,
    },
    iconContainer: {
        marginBottom: 12,
    },
    iconRing: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(239, 68, 68, 0.25)',
    },
    orgNameText: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    noticesContainer: {
        width: '100%',
        gap: 10,
        marginBottom: 20,
    },
    langItem: {
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    langHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    flag: {
        fontSize: 14,
    },
    langLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    noticeText: {
        fontSize: 12.5,
        lineHeight: 18,
        fontWeight: '500',
    },
    actionsContainer: {
        width: '100%',
        gap: 10,
    },
    callBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 48,
        borderRadius: 14,
    },
    callBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    closeBtn: {
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    closeBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
});

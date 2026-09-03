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
                            <Ionicons name="lock-closed" size={30} color="#EF4444" />
                        </View>
                    </View>

                    {/* Modal Title */}
                    <Text style={[styles.titleText, { color: homeColors.textPrimary }]}>
                        {t('teams.registration_closed_title', 'Ro\'yxatdan o\'tish yopilgan')}
                    </Text>

                    {/* Organization Name Badge */}
                    {organizationName ? (
                        <View style={[styles.orgBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }]}>
                            <Ionicons name="business-outline" size={13} color={homeColors.accent} />
                            <Text style={[styles.orgNameText, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                {organizationName}
                            </Text>
                        </View>
                    ) : null}

                    {/* Localized Warning Description */}
                    <View style={[styles.descCard, { backgroundColor: isDark ? '#1A1A1A' : '#F8FAFC', borderColor: isDark ? '#262626' : '#E2E8F0' }]}>
                        <Text style={[styles.descText, { color: homeColors.textSecondary }]}>
                            {t('teams.registration_closed_desc', 'Tashkilotingiz ro\'yxatdan o\'tishni yopgan. Tashkilotingiz bilan bog\'laning.')}
                        </Text>
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
        marginBottom: 10,
    },
    iconRing: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(239, 68, 68, 0.25)',
    },
    titleText: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
        textAlign: 'center',
        marginBottom: 8,
    },
    orgBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 14,
    },
    orgNameText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    descCard: {
        width: '100%',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 20,
    },
    descText: {
        fontSize: 13.5,
        lineHeight: 20,
        fontWeight: '500',
        textAlign: 'center',
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

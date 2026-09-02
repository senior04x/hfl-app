import React, { useState, useRef } from 'react';
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
    PanResponder,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors from '../constants/Colors';
import { useAuthStore } from '../store/useAuthStore';
import { apiService, clearApiCache } from '../services/apiService';
import { getLocalizedErrorMessage } from '../utils/errorParser';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import AppNavbar from '../components/AppNavbar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SettingRowProps {
    icon: any;
    title: string;
    subtitle?: string;
    onPress: () => void;
    destructive?: boolean;
    isLast?: boolean;
    isDark: boolean;
    homeColors: any;
}

const SettingRow: React.FC<SettingRowProps> = ({
    icon,
    title,
    subtitle,
    onPress,
    destructive = false,
    isLast = false,
    isDark,
    homeColors,
}) => (
    <TouchableOpacity
        style={[
            styles.settingRow,
            !isLast && {
                borderBottomWidth: 1,
                borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
            }
        ]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View
            style={[
                styles.iconCircle,
                {
                    backgroundColor: destructive
                        ? (isDark ? 'rgba(255, 59, 48, 0.12)' : 'rgba(255, 59, 48, 0.08)')
                        : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'),
                }
            ]}
        >
            <Ionicons
                name={icon}
                size={18}
                color={destructive ? Colors.danger : homeColors.accent}
            />
        </View>

        <View style={styles.settingContent}>
            <Text
                style={[
                    styles.settingTitle,
                    { color: destructive ? Colors.danger : homeColors.textPrimary }
                ]}
            >
                {title}
            </Text>
            {subtitle && (
                <Text
                    style={[
                        styles.settingSubtitle,
                        { color: destructive ? 'rgba(255, 59, 48, 0.7)' : homeColors.textSecondary }
                    ]}
                >
                    {subtitle}
                </Text>
            )}
        </View>

        <Ionicons
            name="chevron-forward"
            size={16}
            color={destructive ? Colors.danger : homeColors.textSecondary}
            style={{ opacity: 0.5 }}
        />
    </TouchableOpacity>
);

export default function SecuritySettingsScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const { user, isGuest, logout } = useAuthStore();

    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // 1:1 Real-time interactive swipe-to-back animation
    const swipeBackAnim = useRef(new Animated.Value(0)).current;

    const swipeBackPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                return (
                    gestureState.dx > 15 &&
                    Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.4
                );
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dx > 0) {
                    swipeBackAnim.setValue(gestureState.dx);
                } else {
                    swipeBackAnim.setValue(0);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                const shouldExit =
                    gestureState.dx > SCREEN_WIDTH * 0.35 ||
                    (gestureState.dx > 60 && gestureState.vx > 0.6);
                if (shouldExit) {
                    Animated.timing(swipeBackAnim, {
                        toValue: SCREEN_WIDTH,
                        duration: 180,
                        useNativeDriver: true,
                    }).start(() => {
                        navigation.goBack();
                    });
                } else {
                    Animated.spring(swipeBackAnim, {
                        toValue: 0,
                        friction: 8,
                        tension: 45,
                        useNativeDriver: true,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(swipeBackAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 45,
                    useNativeDriver: true,
                }).start();
            },
            onPanResponderTerminationRequest: () => true,
        })
    ).current;

    const backdropOpacity = swipeBackAnim.interpolate({
        inputRange: [0, SCREEN_WIDTH * 0.8, SCREEN_WIDTH],
        outputRange: [isDark ? 0.6 : 0.25, 0.05, 0],
        extrapolate: 'clamp',
    });

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
                    t('settings.account_deleted', 'Hisob o\'chirildi'),
                    t('settings.account_deleted_sub', 'Sizning hisobingiz va barcha shaxsiy ma\'lumotlaringiz muvaffaqiyatli o\'chirildi.'),
                    [
                        {
                            text: 'OK',
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
                Alert.alert(t('common.error', 'Xato'), getLocalizedErrorMessage(res?.error));
            }
        } catch (error: any) {
            setIsDeleting(false);
            setShowDeleteModal(false);
            Alert.alert(t('common.error', 'Xato'), getLocalizedErrorMessage(error));
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

            {/* Fading Backdrop Overlay */}
            <Animated.View
                pointerEvents="none"
                style={[
                    StyleSheet.absoluteFillObject,
                    {
                        backgroundColor: '#000000',
                        opacity: backdropOpacity,
                    },
                ]}
            />

            <Animated.View
                style={{
                    flex: 1,
                    backgroundColor: homeColors.background,
                    transform: [{ translateX: swipeBackAnim }],
                    shadowColor: '#000000',
                    shadowOffset: { width: -4, height: 0 },
                    shadowOpacity: isDark ? 0.5 : 0.2,
                    shadowRadius: 10,
                    elevation: 10,
                }}
            >
                <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                    {/* App Navbar */}
                    <AppNavbar
                        title={t('settings.security_title', 'XAVFSIZLIK VA HUJJATLAR')}
                        subtitle="AMATORA"
                        onBackPress={() => navigation.goBack()}
                    />

                    <View style={{ flex: 1 }} {...swipeBackPanResponder.panHandlers}>
                        <ScrollView
                            style={styles.container}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60, paddingTop: 10 }}
                        >
                            {/* SECTION 1: Legal & Information */}
                            <Text style={[styles.sectionHeading, { color: homeColors.textSecondary }]}>
                                {t('settings.legal_docs', 'HUJJATLAR VA MA\'LUMOTLAR').toUpperCase()}
                            </Text>

                            <View
                                style={[
                                    styles.groupedCard,
                                    {
                                        backgroundColor: isDark ? homeColors.background : '#FFFFFF',
                                        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : homeColors.border,
                                    }
                                ]}
                            >
                                <SettingRow
                                    icon="shield-checkmark-outline"
                                    title={t('settings.privacy_policy', 'Maxfiylik siyosati')}
                                    subtitle={t('settings.privacy_policy_sub', 'Shaxsiy ma\'lumotlarni saqlash va himoya qilish')}
                                    onPress={() => setShowPrivacyModal(true)}
                                    isDark={isDark}
                                    homeColors={homeColors}
                                />
                                <SettingRow
                                    icon="document-text-outline"
                                    title={t('settings.terms_of_use', 'Foydalanish shartlari')}
                                    subtitle={t('settings.terms_of_use_sub', 'Liga reglamenti, qoidalar va Fair Play')}
                                    onPress={() => setShowTermsModal(true)}
                                    isLast={true}
                                    isDark={isDark}
                                    homeColors={homeColors}
                                />
                            </View>

                            {/* SECTION 2: Account Management (Delete Account) */}
                            {!isGuest && (
                                <>
                                    <Text style={[styles.sectionHeading, { color: homeColors.textSecondary, marginTop: 24 }]}>
                                        {t('settings.account_management', 'HISOB VA BOSHQARUV').toUpperCase()}
                                    </Text>

                                    <View
                                        style={[
                                            styles.groupedCard,
                                            {
                                                backgroundColor: isDark ? homeColors.background : '#FFFFFF',
                                                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : homeColors.border,
                                            }
                                        ]}
                                    >
                                        <SettingRow
                                            icon="trash-outline"
                                            title={t('settings.delete_account', 'Hisobni o\'chirish')}
                                            subtitle={t('settings.delete_account_sub', 'Barcha shaxsiy ma\'lumotlarni butunlay o\'chirish')}
                                            onPress={() => setShowDeleteModal(true)}
                                            destructive={true}
                                            isLast={true}
                                            isDark={isDark}
                                            homeColors={homeColors}
                                        />
                                    </View>
                                </>
                            )}

                            {/* Version Tag */}
                            <View style={styles.versionContainer}>
                                <Text style={[styles.versionText, { color: homeColors.textSecondary }]}>
                                    {`AMATORA • ${t('common.version', 'VERSIYA').toUpperCase()} 2.1.1`}
                                </Text>
                            </View>
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </Animated.View>

            {/* Delete Account 2-Step Confirmation Modal */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={() => !isDeleting && setShowDeleteModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => !isDeleting && setShowDeleteModal(false)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                        style={[
                            styles.modalCard,
                            {
                                backgroundColor: isDark ? '#141414' : '#FFFFFF',
                                borderColor: isDark ? 'rgba(255, 59, 48, 0.25)' : 'rgba(255, 59, 48, 0.2)',
                            }
                        ]}
                    >
                        <View style={[styles.modalIconBox, { backgroundColor: isDark ? 'rgba(255, 59, 48, 0.12)' : 'rgba(255, 59, 48, 0.08)' }]}>
                            <Ionicons name="trash-outline" size={28} color={Colors.danger} />
                        </View>

                        <Text style={[styles.modalTitle, { color: Colors.danger }]}>
                            {t('settings.delete_account', 'Hisobni o\'chirish').toUpperCase()}
                        </Text>
                        <Text style={[styles.modalSubtitle, { color: homeColors.textSecondary }]}>
                            {t('settings.delete_account_modal_warning', 'Ushbu amalni ortga qaytarib bo\'lmaydi! Profilingiz, o\'yinchi statistikangiz, arizalaringiz va barcha shaxsiy ma\'lumotlaringiz butunlay o\'chiriladi.')}
                        </Text>

                        {isDeleting ? (
                            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={Colors.danger} />
                                <Text style={[styles.modalSubtitle, { marginTop: 10, color: homeColors.textSecondary }]}>
                                    {t('settings.deleting_data', 'Ma\'lumotlar o\'chirilmoqda...')}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalPrimaryBtn, { backgroundColor: Colors.danger }]}
                                    onPress={handleConfirmDelete}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.modalPrimaryText}>
                                        {t('common.delete', 'O\'chirish').toUpperCase()}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setShowDeleteModal(false)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.modalCancelText, { color: homeColors.textSecondary }]}>
                                        {t('common.cancel', 'Bekor qilish')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Privacy Policy Modal */}
            <Modal
                visible={showPrivacyModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowPrivacyModal(false)}
            >
                <View style={styles.docModalOverlay}>
                    <View
                        style={[
                            styles.docModalContainer,
                            {
                                backgroundColor: isDark ? '#121212' : '#FFFFFF',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : homeColors.border,
                            }
                        ]}
                    >
                        <View
                            style={[
                                styles.docModalHeader,
                                {
                                    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : homeColors.border,
                                }
                            ]}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                <Ionicons name="shield-checkmark" size={20} color={homeColors.accent} />
                                <Text style={[styles.docModalTitle, { color: homeColors.textPrimary }]}>
                                    {t('settings.privacy_policy', 'Maxfiylik siyosati')}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowPrivacyModal(false)}
                                style={[
                                    styles.docCloseBtn,
                                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F0F0F2' }
                                ]}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={18} color={homeColors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.docModalBody} showsVerticalScrollIndicator={false}>
                            <Text style={[styles.docSectionTitle, { color: homeColors.textPrimary }]}>
                                {t('settings.privacy_sec1_title', '1. To\'planadigan Ma\'lumotlar')}
                            </Text>
                            <Text style={[styles.docText, { color: homeColors.textSecondary }]}>
                                {t('settings.privacy_sec1_text', 'AMATORA ilovasi foydalanuvchilarning telefon raqami, ism-familiyasi, o\'yinchi fotosurati, amplua va jamoa tarkibi ma\'lumotlarini to\'playdi.')}
                            </Text>

                            <Text style={[styles.docSectionTitle, { color: homeColors.textPrimary }]}>
                                {t('settings.privacy_sec2_title', '2. Ma\'lumotlardan Foydalanish')}
                            </Text>
                            <Text style={[styles.docText, { color: homeColors.textSecondary }]}>
                                {t('settings.privacy_sec2_text', 'Ma\'lumotlar faqat futbol ligasi va turnirlarini tashkil etish, taqvim va jadvallarni yuritish, o\'yinchi profillarini shakllantirish hamda hisoblar bo\'yicha bildirishnomalar yuborish uchun ishlatiladi.')}
                            </Text>

                            <Text style={[styles.docSectionTitle, { color: homeColors.textPrimary }]}>
                                {t('settings.privacy_sec3_title', '3. Uchinchi Shaxslar')}
                            </Text>
                            <Text style={[styles.docText, { color: homeColors.textSecondary }]}>
                                {t('settings.privacy_sec3_text', 'Shaxsiy ma\'lumotlar hech qanday uchinchi shaxslarga tijoriy yoki reklama maqsadlarida sotilmaydi va tarqatilmaydi.')}
                            </Text>

                            <Text style={[styles.docSectionTitle, { color: homeColors.textPrimary }]}>
                                {t('settings.privacy_sec4_title', '4. Hisobni O\'chirish Huquqi')}
                            </Text>
                            <Text style={[styles.docText, { color: homeColors.textSecondary }]}>
                                {t('settings.privacy_sec4_text', 'Foydalanuvchi istalgan vaqtda o\'z hisobini va unga tegishli barcha ma\'lumotlarni sozlamalar bo\'limidagi \'Hisobni o\'chirish\' tugmasi orqali to\'liq o\'chirib tashlashi mumkin.')}
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
                    <View
                        style={[
                            styles.docModalContainer,
                            {
                                backgroundColor: isDark ? '#121212' : '#FFFFFF',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : homeColors.border,
                            }
                        ]}
                    >
                        <View
                            style={[
                                styles.docModalHeader,
                                {
                                    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : homeColors.border,
                                }
                            ]}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                <Ionicons name="document-text" size={20} color={homeColors.accent} />
                                <Text style={[styles.docModalTitle, { color: homeColors.textPrimary }]}>
                                    {t('settings.terms_of_use', 'Foydalanish shartlari')}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowTermsModal(false)}
                                style={[
                                    styles.docCloseBtn,
                                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F0F0F2' }
                                ]}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={18} color={homeColors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.docModalBody} showsVerticalScrollIndicator={false}>
                            <Text style={[styles.docSectionTitle, { color: homeColors.textPrimary }]}>
                                {t('settings.terms_sec1_title', '1. Ro\'yxatdan O\'tish va Arizalar')}
                            </Text>
                            <Text style={[styles.docText, { color: homeColors.textSecondary }]}>
                                {t('settings.terms_sec1_text', 'Foydalanuvchi ariza topshirishda haqiqiy va to\'g\'ri shaxsiy ma\'lumotlarni kiritish majburiyatini oladi. Bitta o\'yinchi bir vaqtning o\'zida liga qoidalariga zid ravishda bir nechta jamoada o\'ynay olmaydi.')}
                            </Text>

                            <Text style={[styles.docSectionTitle, { color: homeColors.textPrimary }]}>
                                {t('settings.terms_sec2_title', '2. Fair Play va Sport Odob-axloqi')}
                            </Text>
                            <Text style={[styles.docText, { color: homeColors.textSecondary }]}>
                                {t('settings.terms_sec2_text', 'Barcha futbolchilar, murabbiylar va jamoa a\'zolari hakamlar, raqiblar va tashkilotchilarga hurmat bilan munosabatda bo\'lishlari shart. Intizomsizlik diskvalifikatsiyaga sabab bo\'lishi mumkin.')}
                            </Text>

                            <Text style={[styles.docSectionTitle, { color: homeColors.textPrimary }]}>
                                {t('settings.terms_sec3_title', '3. Mas\'uliyat Cheklovi')}
                            </Text>
                            <Text style={[styles.docText, { color: homeColors.textSecondary }]}>
                                {t('settings.terms_sec3_text', 'AMATORA platformasi o\'yinlar davomida yuz berishi mumkin bo\'lgan jismoniy jarohatlar yoki noqulayliklar uchun mas\'uliyatni o\'z zimmasiga olmaydi.')}
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
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    settingContent: {
        flex: 1,
        marginRight: 8,
    },
    settingTitle: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    settingSubtitle: {
        fontSize: 11.5,
        fontWeight: '500',
        marginTop: 2,
    },
    versionContainer: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    versionText: {
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 22,
        borderWidth: 1,
        alignItems: 'center',
    },
    modalIconBox: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.3,
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 13,
        lineHeight: 18,
        textAlign: 'center',
        marginBottom: 20,
    },
    modalActions: {
        width: '100%',
        gap: 10,
    },
    modalPrimaryBtn: {
        width: '100%',
        paddingVertical: 13,
        borderRadius: 14,
        alignItems: 'center',
    },
    modalPrimaryText: {
        color: '#FFFFFF',
        fontSize: 13.5,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    modalCancelBtn: {
        width: '100%',
        paddingVertical: 10,
        alignItems: 'center',
    },
    modalCancelText: {
        fontSize: 13,
        fontWeight: '600',
    },
    docModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'flex-end',
    },
    docModalContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        maxHeight: '85%',
        paddingTop: 16,
        paddingHorizontal: 20,
    },
    docModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 14,
        borderBottomWidth: 1,
    },
    docModalTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    docCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    docModalBody: {
        paddingTop: 16,
    },
    docSectionTitle: {
        fontSize: 13.5,
        fontWeight: '800',
        marginTop: 12,
        marginBottom: 6,
    },
    docText: {
        fontSize: 12.5,
        lineHeight: 18,
        marginBottom: 10,
    },
});

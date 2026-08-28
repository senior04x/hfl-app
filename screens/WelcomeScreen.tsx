import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    SafeAreaView,
    StatusBar,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Keyboard,
    Alert,
    ActivityIndicator,
    Modal,
    ImageBackground,
    Linking,
    ScrollView,
    AppState,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    interpolate,
    Easing
} from 'react-native-reanimated';
import AnimatedBackground from '../components/AnimatedBackground';
import backgroundImage from '../assets/images/backroud-image.png';
import { BlurView } from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';
import Colors from '../constants/Colors';
import { useAuthStore } from '../store/useAuthStore';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { apiService, clearApiCache, supabase } from '../services/apiService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Skeleton from '../components/Skeleton';
import { useTranslation } from 'react-i18next';
import LanguageSelectModal from '../components/LanguageSelectModal';
import { SUPPORTED_LANGUAGES } from '../store/useLanguageStore';

const { width } = Dimensions.get('window');

const ShimmerLogo = ({ visible }: { visible: boolean }) => {
    const shineProgress = useSharedValue(-1);
    const opacityValue = useSharedValue(1);
    const scaleValue = useSharedValue(1);

    useEffect(() => {
        shineProgress.value = withRepeat(
            withDelay(
                1000,
                withTiming(1, {
                    duration: 2000,
                    easing: Easing.bezier(0.4, 0, 0.2, 1),
                })
            ),
            -1,
            false
        );
    }, []);

    useEffect(() => {
        opacityValue.value = withTiming(visible ? 1 : 0, { duration: 150 });
        scaleValue.value = withTiming(visible ? 1 : 0.8, { duration: 150 });
    }, [visible]);

    const animatedShineStyle = useAnimatedStyle(() => {
        const translateX = interpolate(shineProgress.value, [-1, 1], [-100, 100]);
        return {
            transform: [{ translateX }, { rotate: '25deg' }],
        };
    });

    const animatedContainerStyle = useAnimatedStyle(() => {
        return {
            opacity: opacityValue.value,
            transform: [{ scale: scaleValue.value }],
        };
    });

    return (
        <Animated.View style={[styles.miniLogoBrandContainer, animatedContainerStyle]}>
            <View style={styles.miniLogoWrapper}>
                <MaskedView
                    style={styles.miniMaskedView}
                    maskElement={
                        <View style={styles.miniCenteredContent}>
                            <Image
                                source={require('../assets/logo.png')}
                                style={styles.miniLogo}
                                resizeMode="contain"
                            />
                        </View>
                    }
                >
                    <View style={styles.miniCenteredContent}>
                        <Image
                            source={require('../assets/logo.png')}
                            style={styles.miniLogo}
                            resizeMode="contain"
                        />
                        <Animated.View style={[styles.shimmerLine, animatedShineStyle, { width: 30, height: 200 }]} />
                    </View>
                </MaskedView>
            </View>
            <Text style={styles.miniBrandText}>AMATORA</Text>
        </Animated.View>
    );
};



export default function WelcomeScreen({ navigation }: any) {
    const { t, i18n } = useTranslation();
    const setAuth = useAuthStore((state) => state.setAuth);
    const setGuest = useAuthStore((state) => state.setGuest);
    
    // Login Auth States
    const [isLoginMode, setIsLoginMode] = useState(false);
    const [loginStep, setLoginStep] = useState<'phone' | 'otp'>('phone');
    const [phone, setPhone] = useState('');
    const [otpCode, setOtpCode] = useState('');

    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [deliveredVia, setDeliveredVia] = useState<'telegram' | 'bot_link'>('bot_link');
    
    // Account Selection Modal State
    const [accountOptions, setAccountOptions] = useState<any[]>([]);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showBotModal, setShowBotModal] = useState(false);
    const [showNotFoundModal, setShowNotFoundModal] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [notFoundMessage, setNotFoundMessage] = useState('');

    // Organization Selection Modal State
    const [showOrgModal, setShowOrgModal] = useState(false);
    const [organizationsList, setOrganizationsList] = useState<any[]>([]);
    const [loadingOrgs, setLoadingOrgs] = useState(true);
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);
    const timerRef = useRef<any>(null);
    const endTimeRef = useRef<number>(0);

    const updateTimer = () => {
        if (!endTimeRef.current) return;
        const diff = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
        setResendTimer(diff);
        if (diff <= 0 && timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const startTimer = () => {
        endTimeRef.current = Date.now() + 60 * 1000;
        setResendTimer(60);
        if (timerRef.current) clearInterval(timerRef.current);
        updateTimer();
        timerRef.current = setInterval(updateTimer, 1000);
    };

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => setKeyboardVisible(true)
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => setKeyboardVisible(false)
        );

        const appStateListener = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                updateTimer();
            }
        });

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
            appStateListener.remove();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const handleLoginPress = () => {
        setIsLoginMode(true);
        setLoginStep('phone');
        setPhone('');
        setOtpCode('');
    };

    const openTelegramDeepLink = async (targetPhone: string, codeToPass: string) => {
        const cleanDigits = targetPhone.replace(/\D/g, '').slice(-9);
        const startParam = codeToPass ? `login_${cleanDigits}_${codeToPass}` : `login_${cleanDigits}`;
        const nativeUrl = `tg://resolve?domain=amatora_bot&start=${startParam}`;
        const webUrl = `https://t.me/amatora_bot?start=${startParam}`;

        try {
            await Linking.openURL(nativeUrl);
        } catch (err) {
            await Linking.openURL(webUrl).catch(() => {});
        }
    };

    const performLogin = (acc: any, accountsList?: any[]) => {
        try {
            clearApiCache();
        } catch (e) {}
        const orgId = acc.organization_id || acc.organizationId || acc.team?.organization_id || acc.organizations?.id || 1;
        useOrganizationStore.getState().setSelectedOrganizationId(Number(orgId));
        
        const finalAccounts = (accountsList && accountsList.length > 0) 
            ? accountsList 
            : (accountOptions.length > 0 ? accountOptions : [acc]);
            
        setAuth({ ...acc, organizationId: Number(orgId), organization_id: Number(orgId) }, finalAccounts);
        setShowAccountModal(false);
        setShowBotModal(false);
    };

const formatPhoneInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 9);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
};

    const handleSendOTP = async () => {
        const cleanDigits = phone.replace(/\D/g, '');
        if (cleanDigits.length < 9) {
            Alert.alert('Xato', 'Iltimos, 9 xonali telefon raqamingizni kiriting.');
            return;
        }

        try {
            setLoading(true);
            const fullPhone = `+998${cleanDigits}`;
            
            const res = await apiService.requestOTP(fullPhone);

            if (res.success) {
                if (res.isAutoSentToTelegram) {
                    setLoginStep('otp');
                    startTimer();
                    Alert.alert('Tasdiqlash Kodi', '🔑 Tasdiqlash kodingiz Telegram xabarlaringizga yuborildi!');
                } else {
                    setShowBotModal(true);
                }
            } else {
                setNotFoundMessage(res.reason || 'Ushbu telefon raqamiga tegishli ariza yoki jamoa topilmadi.');
                setShowNotFoundModal(true);
            }
        } catch (error: any) {
            console.error('Phone login error:', error);
            Alert.alert('Xato', "Server bilan bog'lanishda xatolik yuz berdi.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoToBot = async () => {
        setShowBotModal(false);
        setLoginStep('otp');
        startTimer();
        try {
            const cleanDigits = phone.replace(/\D/g, '').slice(-9);
            const webUrl = `https://t.me/amatora_bot?start=login_${cleanDigits}`;
            const nativeUrl = `tg://resolve?domain=amatora_bot&start=login_${cleanDigits}`;
            await Linking.openURL(nativeUrl).catch(() => Linking.openURL(webUrl));
        } catch (e) {}
    };

    const handleSkipBotModal = () => {
        setShowBotModal(false);
        setLoginStep('otp');
        startTimer();
    };

    const handleVerifyOTP = async () => {
        if (otpCode.length < 4) {
            Alert.alert('Xato', 'Iltimos, 4 xonali tasdiqlash kodini kiriting.');
            return;
        }

        try {
            setLoading(true);
            const fullPhone = `+998${phone.replace(/\D/g, '')}`;
            const inputCode = otpCode.trim();

            // Backend API orqali OTP tekshirish
            const { AUTH_API } = require('../constants/ApiConfig');
            const verifyRes = await fetch(AUTH_API.VERIFY_OTP, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: fullPhone, code: inputCode }),
            });
            const verifyData = await verifyRes.json();

            if (verifyData.success) {
                const accList = verifyData.accounts || (verifyData.user ? [verifyData.user] : []);
                setAccountOptions(accList);
                useAuthStore.getState().setUserAccounts(accList);

                if (verifyData.multipleAccounts && verifyData.accounts) {
                    setShowAccountModal(true);
                } else if (verifyData.user) {
                    performLogin(verifyData.user, accList);
                }
            } else {
                Alert.alert('Xato', verifyData.reason || "Tasdiqlash kodi noto'g'ri yoki muddati o'tgan.");
            }
        } catch (error: any) {
            console.error('Verify OTP error:', error);
            Alert.alert('Xato', 'Kodni tekshirishda xatolik yuz berdi.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenBot = () => {
        openTelegramDeepLink(phone, '');
    };

    const ORG_CACHE_KEY = 'cached_organizations_list_v1';

    const fetchOrganizations = async () => {
        try {
            const cachedData = await AsyncStorage.getItem(ORG_CACHE_KEY);
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setOrganizationsList(parsed);
                    setLoadingOrgs(false);
                }
            } else {
                setLoadingOrgs(true);
            }

            const { data, error } = await supabase
                .from('organizations')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (data && data.length > 0) {
                setOrganizationsList(data);
                await AsyncStorage.setItem(ORG_CACHE_KEY, JSON.stringify(data));
            } else if (!cachedData) {
                const fallback = [{ id: 1, name: 'HFL SPORT TASHKILOTI', slug: 'hfl', logo_url: '' }];
                setOrganizationsList(fallback);
            }
        } catch (e) {
            console.error('Error fetching organizations:', e);
        } finally {
            setLoadingOrgs(false);
        }
    };

    const handleRegisterPress = () => {
        setShowOrgModal(true);
        fetchOrganizations();
    };

    const handleSelectOrganization = async (org: any) => {
        const rawSlug = org.slug || org.name || org.title || org.id || 'hfl';
        const cleanSlug = String(rawSlug).toLowerCase().trim().replace(/\s+/g, '-');
        const targetUrl = `https://amatora.uz/${cleanSlug}`;

        try {
            await Linking.openURL(targetUrl);
        } catch (err) {
            Alert.alert('Xato', `Havola ochib bo'lmadi: ${targetUrl}`);
        }
    };

    const handleGuestLogin = () => {
        setGuest(true);
    };

    return (
        <AnimatedBackground overlayOpacity={0.6} backgroundImage={backgroundImage}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={styles.container}>
                {/* Top Header Controls: Left (Language) & Right (Guest Mode) */}
                <View style={{ 
                    position: 'absolute', 
                    top: Platform.OS === 'ios' ? 54 : 24, 
                    left: 20, 
                    right: 20, 
                    zIndex: 100,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    {/* Language Switcher Pill on the LEFT */}
                    <TouchableOpacity
                        onPress={() => setShowLanguageModal(true)}
                        activeOpacity={0.7}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: 'rgba(20, 25, 35, 0.85)',
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.15)',
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 20,
                            gap: 6
                        }}
                    >
                        <Text style={{ fontSize: 14 }}>{SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)?.flag || '🇺🇿'}</Text>
                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>{(SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)?.label || "O'zbekcha")}</Text>
                        <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>

                    {/* Guest Login Pill on the RIGHT */}
                    <TouchableOpacity
                        onPress={handleGuestLogin}
                        activeOpacity={0.7}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: 'rgba(0, 223, 130, 0.15)',
                            borderWidth: 1,
                            borderColor: 'rgba(0, 223, 130, 0.35)',
                            paddingHorizontal: 13,
                            paddingVertical: 7,
                            borderRadius: 20,
                            gap: 6
                        }}
                    >
                        <Ionicons name="person-outline" size={14} color="#00FF9D" />
                        <Text style={{ color: '#00FF9D', fontSize: 12, fontWeight: '800' }}>{t('auth.guest_mode', "Mehmon bo'lib kirish")}</Text>
                        <Ionicons name="arrow-forward" size={12} color="#00FF9D" />
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <View style={styles.mainContent}>
                        {isLoginMode && (
                            <View style={styles.loginCard}>
                                <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
                                <View style={{ padding: 24 }}>
                                    {loginStep === 'phone' ? (
                                        <>
                                            <Text style={styles.cardTitle}>{t('auth.login_title')}</Text>
                                            <Text style={styles.cardSubTitle}>
                                                {t('auth.login_subtitle')}
                                            </Text>

                                            <View style={styles.inputWrapper}>
                                                <Text style={styles.inputLabel}>{t('auth.phone_label')}</Text>
                                                <View style={styles.inputContainer}>
                                                    <Text style={styles.phonePrefix}>+998</Text>
                                                    <TextInput
                                                        style={styles.phoneInput}
                                                        placeholder={t('auth.phone_placeholder')}
                                                        placeholderTextColor={Colors.textMuted}
                                                        keyboardType="number-pad"
                                                        value={phone}
                                                        onChangeText={(t) => setPhone(formatPhoneInput(t))}
                                                        maxLength={12}
                                                    />
                                                </View>
                                            </View>

                                            <View style={styles.actionButtons}>
                                                <TouchableOpacity
                                                    style={styles.backButton}
                                                    onPress={() => setIsLoginMode(false)}
                                                >
                                                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[
                                                        styles.confirmButton,
                                                        (phone.replace(/\D/g, '').length < 9 || loading) && styles.confirmButtonDisabled
                                                    ]}
                                                    onPress={handleSendOTP}
                                                    disabled={phone.replace(/\D/g, '').length < 9 || loading}
                                                >
                                                    {loading ? (
                                                        <ActivityIndicator color="#000" />
                                                    ) : (
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <Text style={styles.confirmButtonText}>{t('auth.login')}</Text>
                                                            <Ionicons name="arrow-forward" size={16} color="#000" style={{ marginLeft: 6 }} />
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.cardSubTitle}>
                                                {t('auth.otp_sent_to')}
                                            </Text>

                                            <View style={styles.inputWrapper}>
                                                <View style={styles.inputContainer}>
                                                    <TextInput
                                                        style={[styles.phoneInput, { textAlign: 'center', letterSpacing: 8, fontSize: 20, fontWeight: '900' }]}
                                                        placeholder="0000"
                                                        placeholderTextColor={Colors.textMuted}
                                                        keyboardType="number-pad"
                                                        value={otpCode}
                                                        onChangeText={setOtpCode}
                                                        maxLength={4}
                                                        autoFocus
                                                    />
                                                </View>
                                            </View>

                                            {resendTimer > 0 ? (
                                                <Text style={styles.timerText}>{t('auth.resend_timer', { seconds: resendTimer })}</Text>
                                            ) : (
                                                <TouchableOpacity onPress={handleSendOTP} style={{ marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Ionicons name="refresh" size={16} color="#00FF87" style={{ marginRight: 6 }} />
                                                    <Text style={styles.resendBtnText}>{t('auth.resend_code')}</Text>
                                                </TouchableOpacity>
                                            )}

                                            <View style={styles.actionButtons}>
                                                <TouchableOpacity
                                                    style={styles.backButton}
                                                    onPress={() => setLoginStep('phone')}
                                                >
                                                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[
                                                        styles.confirmButton,
                                                        (otpCode.length < 4 || loading) && styles.confirmButtonDisabled
                                                    ]}
                                                    onPress={handleVerifyOTP}
                                                    disabled={otpCode.length < 4 || loading}
                                                >
                                                    {loading ? (
                                                        <ActivityIndicator color="#000" />
                                                    ) : (
                                                        <Text style={styles.confirmButtonText}>{t('auth.login')}</Text>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={styles.footer}>
                        {!isLoginMode && (
                            <>
                                <ShimmerLogo visible={!isKeyboardVisible} />
                                
                                <TouchableOpacity
                                    style={styles.mainButton}
                                    onPress={handleLoginPress}
                                >
                                    <Text style={styles.mainButtonText}>{t('auth.login')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.guestButton}
                                    onPress={handleRegisterPress}
                                >
                                    <Text style={styles.guestButtonText}>{t('auth.register')}</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* Account Selection Modal */}
            <Modal
                visible={showAccountModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowAccountModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.accountModalCard}>
                        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={{ padding: 20 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                <Ionicons name="people" size={24} color={Colors.primary} style={{ marginRight: 8 }} />
                                <Text style={styles.accountModalTitle}>{t('auth.select_account')}</Text>
                            </View>
                            <Text style={styles.accountModalSubtitle}>
                                {t('auth.select_account_sub')}
                            </Text>

                            <ScrollView style={{ maxHeight: 280, marginVertical: 14 }}>
                                {accountOptions.map((acc, index) => (
                                    <TouchableOpacity
                                        key={acc.id || acc._id || index}
                                        style={styles.accountOptionCard}
                                        activeOpacity={0.8}
                                        onPress={() => performLogin(acc)}
                                    >
                                        <View style={styles.accountOptionIcon}>
                                            {acc.photo ? (
                                                <Image
                                                    source={{ uri: acc.photo }}
                                                    style={{ width: 44, height: 44, borderRadius: 22 }}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <Ionicons
                                                    name={acc.role === 'manager' ? 'shield-half' : 'football'}
                                                    size={24}
                                                    color={Colors.primary}
                                                />
                                            )}
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12, justifyContent: 'center' }}>
                                            <Text style={styles.accountOptionName}>{acc.name}</Text>
                                            {!!acc.subTitle && <Text style={styles.accountOptionSubtitle}>{acc.subTitle}</Text>}
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <TouchableOpacity
                                style={styles.cancelModalBtn}
                                onPress={() => setShowAccountModal(false)}
                            >
                                <Text style={styles.cancelModalBtnText}>{t('common.cancel').toUpperCase()}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Language Selection Modal */}
            <LanguageSelectModal
                visible={showLanguageModal}
                onClose={() => setShowLanguageModal(false)}
            />

            {/* Organization Selection Modal */}
            <Modal
                visible={showOrgModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowOrgModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.glassModalCard}>
                        <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={{ padding: 20 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="business" size={24} color={Colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={styles.accountModalTitle}>{t('auth.select_org_title')}</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowOrgModal(false)} style={{ padding: 4 }}>
                                    <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.accountModalSubtitle}>
                                {t('auth.select_org_sub')}
                            </Text>

                            <ScrollView style={{ maxHeight: 320, marginVertical: 14 }} showsVerticalScrollIndicator={false}>
                                {loadingOrgs && organizationsList.length === 0 ? (
                                    <>
                                        {[1, 2, 3].map((_, i) => (
                                            <View key={i} style={styles.glassOrgCard}>
                                                <Skeleton width={44} height={44} borderRadius={22} style={{ marginRight: 12 }} />
                                                <View style={{ flex: 1, gap: 6 }}>
                                                    <Skeleton width="70%" height={16} borderRadius={6} />
                                                    <Skeleton width={110} height={12} borderRadius={4} />
                                                </View>
                                                <Skeleton width={20} height={20} borderRadius={10} />
                                            </View>
                                        ))}
                                    </>
                                ) : organizationsList.length === 0 ? (
                                    <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                                        <Ionicons name="information-circle-outline" size={32} color="rgba(255,255,255,0.4)" />
                                        <Text style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8, fontSize: 13 }}>
                                            {t('auth.no_orgs')}
                                        </Text>
                                    </View>
                                ) : (
                                    organizationsList.map((org, index) => {
                                        const orgName = org.name || org.title || 'HFL Tashkiloti';
                                        const orgLogo = org.logo_url || org.logo || org.photo_url;
                                        const orgSlug = org.slug || String(orgName).toLowerCase().replace(/\s+/g, '-');

                                        return (
                                            <TouchableOpacity
                                                key={org.id || org._id || index}
                                                style={styles.glassOrgCard}
                                                activeOpacity={0.75}
                                                onPress={() => handleSelectOrganization(org)}
                                            >
                                                <View style={styles.accountOptionIcon}>
                                                    {orgLogo ? (
                                                        <Image
                                                            source={{ uri: orgLogo }}
                                                            style={{ width: 44, height: 44, borderRadius: 22 }}
                                                            resizeMode="cover"
                                                        />
                                                    ) : (
                                                        <Ionicons name="business" size={24} color={Colors.primary} />
                                                    )}
                                                </View>
                                                <View style={{ flex: 1, marginLeft: 12, justifyContent: 'center' }}>
                                                    <Text style={styles.accountOptionName}>{orgName.toUpperCase()}</Text>
                                                    <Text style={styles.accountOptionSubtitle}>amatora.uz/{orgSlug}</Text>
                                                </View>
                                                <Ionicons name="globe-outline" size={20} color={Colors.primary} />
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </ScrollView>

                            <TouchableOpacity
                                style={styles.glassCancelBtn}
                                onPress={() => setShowOrgModal(false)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.cancelModalBtnText}>{t('common.close').toUpperCase()}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Telegram Bot Modal */}
            <Modal
                visible={showBotModal}
                transparent
                animationType="fade"
                onRequestClose={handleSkipBotModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.botModalCard}>
                        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={{ padding: 24, alignItems: 'center' }}>
                            <View style={styles.botIconBadge}>
                                <Ionicons name="paper-plane" size={30} color="#00FF87" />
                            </View>

                            <Text style={styles.botModalTitle}>{t('auth.bot_modal_title')}</Text>

                            <Text style={styles.botModalSubtitle}>
                                <Text style={{ color: '#00FF87', fontWeight: '900' }}>+998 {phone}</Text> raqamingizga 4 xonali tasdiqlash kodini olish uchun Telegram botimizga o'ting.
                            </Text>

                            <View style={styles.botModalNoticeBox}>
                                <Ionicons name="information-circle-outline" size={18} color="#FFD700" style={{ marginRight: 8 }} />
                                <Text style={styles.botModalNoticeText}>
                                    Botda <Text style={{ fontWeight: 'bold', color: '#FFF' }}>"📱 Telefon raqamni yuborish"</Text> tugmasini bosing.
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={styles.botPrimaryBtn}
                                activeOpacity={0.8}
                                onPress={handleGoToBot}
                            >
                                <Ionicons name="paper-plane-outline" size={20} color="#050A14" style={{ marginRight: 8 }} />
                                <Text style={styles.botPrimaryBtnText}>BOTGA O'TISH</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.botSecondaryBtn}
                                activeOpacity={0.7}
                                onPress={handleSkipBotModal}
                            >
                                <Text style={styles.botSecondaryBtnText}>Kodni kiritish</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Phone Not Found Modal */}
            <Modal
                visible={showNotFoundModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowNotFoundModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.notFoundModalCard}>
                        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={{ padding: 24, alignItems: 'center' }}>
                            <View style={styles.notFoundIconBadge}>
                                <Ionicons name="alert-circle-outline" size={32} color="#FFD700" />
                            </View>

                            <Text style={styles.notFoundModalTitle}>{t('auth.application_not_found')}</Text>

                            <Text style={styles.notFoundModalSubtitle}>
                                <Text style={{ color: '#00FF87', fontWeight: '900' }}>+998 {phone}</Text> {t('errors.PHONE_NOT_FOUND')}
                            </Text>

                            <View style={styles.notFoundNoticeBox}>
                                <Ionicons name="information-circle-outline" size={18} color="#FFD700" style={{ marginRight: 8 }} />
                                <Text style={styles.notFoundNoticeText}>
                                    {t('auth.apply_first_notice')}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={styles.notFoundPrimaryBtn}
                                activeOpacity={0.8}
                                onPress={() => {
                                    setShowNotFoundModal(false);
                                    navigation.navigate('JoinApplication');
                                }}
                            >
                                <Ionicons name="document-text-outline" size={18} color="#050A14" style={{ marginRight: 8 }} />
                                <Text style={styles.notFoundPrimaryBtnText}>{t('applications.submit_app')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.notFoundSecondaryBtn}
                                activeOpacity={0.7}
                                onPress={() => setShowNotFoundModal(false)}
                            >
                                <Text style={styles.notFoundSecondaryBtnText}>{t('common.close')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </AnimatedBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mainContent: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    loginCard: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        backgroundColor: 'rgba(10, 15, 30, 0.6)',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 1,
    },
    cardSubTitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '600',
        marginTop: 4,
        marginBottom: 14,
    },
    telegramBotBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 136, 204, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(0, 136, 204, 0.4)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        marginBottom: 14,
    },
    telegramBotBadgeText: {
        color: '#0088cc',
        fontSize: 12,
        fontWeight: '800',
    },
    inputWrapper: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.primary,
        letterSpacing: 1,
        marginBottom: 6,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        height: 52,
        paddingHorizontal: 14,
    },
    phonePrefix: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        marginRight: 10,
    },
    phoneInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    timerText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 14,
    },
    resendBtnText: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: '800',
        textAlign: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    backButton: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    confirmButton: {
        flex: 1,
        height: 48,
        backgroundColor: Colors.primary,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButtonDisabled: {
        opacity: 0.5,
    },
    confirmButtonText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 1,
    },
    footer: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    miniLogoBrandContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    miniLogoWrapper: {
        width: 30,
        height: 30,
        marginRight: 8,
    },
    miniMaskedView: {
        width: 30,
        height: 30,
    },
    miniCenteredContent: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniLogo: {
        width: 30,
        height: 30,
    },
    shimmerLine: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    miniBrandText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 2,
    },
    mainButton: {
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: Colors.primary,
        paddingHorizontal: 20,
        borderRadius: 18,
        marginBottom: 12,
    },

    // Glassmorphism Modal Styles
    glassModalCard: {
        width: width * 0.9,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.18)',
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
    },
    glassOrgCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        marginBottom: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    glassCancelBtn: {
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        marginTop: 8,
    },
    mainButtonText: {
        color: Colors.primary,
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 1.5,
        textAlign: 'center',
    },
    guestButton: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    guestButtonText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    accountModalCard: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        backgroundColor: '#121212',
    },
    accountModalTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 1,
    },
    accountModalSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: 4,
        lineHeight: 18,
    },
    accountOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        padding: 14,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    accountOptionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.3)',
        overflow: 'hidden',
    },
    accountOptionName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFF',
    },
    accountOptionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
        marginTop: 2,
    },
    accountOptionSubtitle: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.5)',
        marginTop: 2,
    },
    cancelModalBtn: {
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
    },
    cancelModalBtnText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 13,
        letterSpacing: 1,
    },
    botModalCard: {
        width: width - 48,
        maxWidth: 380,
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        backgroundColor: 'rgba(15, 20, 32, 0.92)',
    },
    botIconBadge: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(0, 255, 135, 0.12)',
        borderWidth: 1.5,
        borderColor: 'rgba(0, 255, 135, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    botModalTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 1,
        textAlign: 'center',
        marginBottom: 10,
    },
    botModalSubtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    botModalNoticeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 215, 0, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        width: '100%',
        marginBottom: 20,
    },
    botModalNoticeText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.85)',
        flex: 1,
    },
    botPrimaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00FF87',
        width: '100%',
        height: 50,
        borderRadius: 16,
        marginBottom: 10,
        shadowColor: '#00FF87',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    botPrimaryBtnText: {
        color: '#050A14',
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 1,
    },
    botSecondaryBtn: {
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    botSecondaryBtnText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '700',
        fontSize: 13,
    },
    notFoundModalCard: {
        width: width - 48,
        maxWidth: 380,
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.25)',
        backgroundColor: 'rgba(15, 20, 32, 0.94)',
    },
    notFoundIconBadge: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 215, 0, 0.12)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 215, 0, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    notFoundModalTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 1,
        textAlign: 'center',
        marginBottom: 10,
    },
    notFoundModalSubtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.75)',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    notFoundNoticeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 215, 0, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        width: '100%',
        marginBottom: 20,
    },
    notFoundNoticeText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.85)',
        flex: 1,
    },
    notFoundPrimaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00FF87',
        width: '100%',
        height: 50,
        borderRadius: 16,
        marginBottom: 10,
        shadowColor: '#00FF87',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    notFoundPrimaryBtnText: {
        color: '#050A14',
        fontWeight: '900',
        fontSize: 13,
        letterSpacing: 1,
    },
    notFoundSecondaryBtn: {
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notFoundSecondaryBtnText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '700',
        fontSize: 13,
    },
});

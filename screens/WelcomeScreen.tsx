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
import { apiService } from '../services/apiService';
import { eskizService } from '../services/eskizService';
import { Ionicons } from '@expo/vector-icons';

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
    const setAuth = useAuthStore((state) => state.setAuth);
    const setGuest = useAuthStore((state) => state.setGuest);
    
    // Login Auth States
    const [isLoginMode, setIsLoginMode] = useState(false);
    const [loginStep, setLoginStep] = useState<'phone' | 'otp'>('phone');
    const [phone, setPhone] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [serverOtpCode, setServerOtpCode] = useState('');
    const [deliveredVia, setDeliveredVia] = useState<'telegram' | 'bot_link'>('bot_link');
    
    // Account Selection Modal State
    const [accountOptions, setAccountOptions] = useState<any[]>([]);
    const [showAccountModal, setShowAccountModal] = useState(false);

    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);
    const timerRef = useRef<any>(null);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => setKeyboardVisible(true)
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => setKeyboardVisible(false)
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startTimer = () => {
        setResendTimer(60);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setResendTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleLoginPress = () => {
        setIsLoginMode(true);
        setLoginStep('phone');
        setPhone('');
        setOtpCode('');
    };

    const openTelegramDeepLink = async (targetPhone: string, codeToPass: string) => {
        const cleanDigits = targetPhone.replace(/\D/g, '').slice(-9);
        const startParam = codeToPass ? `login_${cleanDigits}_${codeToPass}` : `login_${cleanDigits}`;
        const nativeUrl = `tg://resolve?domain=havasmedialiga_bot&start=${startParam}`;
        const webUrl = `https://t.me/havasmedialiga_bot?start=${startParam}`;

        try {
            const canOpen = await Linking.canOpenURL(nativeUrl).catch(() => false);
            if (canOpen) {
                await Linking.openURL(nativeUrl);
            } else {
                await Linking.openURL(webUrl);
            }
        } catch (err) {
            console.warn('Linking error, falling back to webUrl:', err);
            await Linking.openURL(webUrl).catch(() => {});
        }
    };

    const handleSendOTP = async () => {
        if (phone.length < 9) {
            Alert.alert('Xato', 'Iltimos, 9 xonali telefon raqamingizni kiriting.');
            return;
        }

        try {
            setLoading(true);
            const fullPhone = `+998${phone.replace(/\D/g, '')}`;
            
            // Check if account exists in database
            const res = await apiService.findAccountsByPhone(fullPhone);

            if (res.success && res.accounts && res.accounts.length > 0) {
                if (res.accounts.length > 1) {
                    setAccountOptions(res.accounts);
                    setShowAccountModal(true);
                } else if (res.user) {
                    setAuth(res.user);
                }
            } else {
                Alert.alert('Eslatma', res.reason || "Ushbu telefon raqamiga ariza topilmadi. Iltimos, avval ariza topshiring!");
            }
        } catch (error: any) {
            console.error('Phone login error:', error);
            Alert.alert('Xato', 'Server bilan bog\'lanishda xatolik yuz berdi.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (otpCode.length < 6) {
            Alert.alert('Xato', 'Iltimos, 6 xonali tasdiqlash kodini to\'liq kiriting.');
            return;
        }

        try {
            setLoading(true);
            const inputCode = otpCode.trim();

            if (inputCode === serverOtpCode) {
                // OTP code matches!
                if (accountOptions.length > 1) {
                    setShowAccountModal(true);
                } else if (accountOptions.length === 1) {
                    setAuth(accountOptions[0]);
                } else {
                    const fullPhone = `+998${phone.replace(/\D/g, '')}`;
                    const res = await apiService.findAccountsByPhone(fullPhone);
                    if (res.user) setAuth(res.user);
                }
            } else {
                Alert.alert('Xato', "Tasdiqlash kodi noto'g'ri. Iltimos, qayta kiring.");
            }
        } catch (error: any) {
            console.error('Verify OTP error:', error);
            Alert.alert('Xato', 'Kodni tekshirishda xatolik yuz berdi.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenBot = () => {
        openTelegramDeepLink(phone, serverOtpCode);
    };

    return (
        <AnimatedBackground overlayOpacity={0.6} backgroundImage={backgroundImage}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={styles.container}>
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
                                            <Text style={styles.cardTitle}>TIZIMGA KIRISH</Text>
                                            <Text style={styles.cardSubTitle}>
                                                Jamoa sardori yoki futbolchi telefon raqamingizni kiriting
                                            </Text>

                                            <View style={styles.inputWrapper}>
                                                <Text style={styles.inputLabel}>TEL RAQAMINGIZ</Text>
                                                <View style={styles.inputContainer}>
                                                    <Text style={styles.phonePrefix}>+998</Text>
                                                    <TextInput
                                                        style={styles.phoneInput}
                                                        placeholder="90 123 45 67"
                                                        placeholderTextColor={Colors.textMuted}
                                                        keyboardType="number-pad"
                                                        value={phone}
                                                        onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
                                                        maxLength={9}
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
                                                        (phone.length < 9 || loading) && styles.confirmButtonDisabled
                                                    ]}
                                                    onPress={handleSendOTP}
                                                    disabled={phone.length < 9 || loading}
                                                >
                                                    {loading ? (
                                                        <ActivityIndicator color="#000" />
                                                    ) : (
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <Text style={styles.confirmButtonText}>KIRISH</Text>
                                                            <Ionicons name="arrow-forward" size={16} color="#000" style={{ marginLeft: 6 }} />
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.cardSubTitle}>
                                                +998 {phone} raqamingizga SMS xabarnoma orqali 6 xonali tasdiqlash kodi yuborildi.
                                            </Text>

                                            <View style={styles.inputWrapper}>
                                                <View style={styles.inputContainer}>
                                                    <TextInput
                                                        style={[styles.phoneInput, { textAlign: 'center', letterSpacing: 8, fontSize: 20, fontWeight: '900' }]}
                                                        placeholder="000000"
                                                        placeholderTextColor={Colors.textMuted}
                                                        keyboardType="number-pad"
                                                        value={otpCode}
                                                        onChangeText={setOtpCode}
                                                        maxLength={6}
                                                        autoFocus
                                                    />
                                                </View>
                                            </View>

                                            {resendTimer > 0 ? (
                                                <Text style={styles.timerText}>Qayta kod yuborish: {resendTimer}s</Text>
                                            ) : (
                                                <TouchableOpacity onPress={handleSendOTP} style={{ marginBottom: 14 }}>
                                                    <Text style={styles.resendBtnText}>🔄 Kodni qayta yuborish</Text>
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
                                                        (otpCode.length < 6 || loading) && styles.confirmButtonDisabled
                                                    ]}
                                                    onPress={handleVerifyOTP}
                                                    disabled={otpCode.length < 6 || loading}
                                                >
                                                    {loading ? (
                                                        <ActivityIndicator color="#000" />
                                                    ) : (
                                                        <Text style={styles.confirmButtonText}>KIRISH</Text>
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
                                    <Text style={styles.mainButtonText}>KIRISH</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.guestButton}
                                    onPress={() => setGuest(true)}
                                >
                                    <Text style={styles.guestButtonText}>MEHMON SIFATIDA DAVOM ETISH</Text>
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
                                <Text style={styles.accountModalTitle}>AKKOUNTNI TANLANG</Text>
                            </View>
                            <Text style={styles.accountModalSubtitle}>
                                Ushbu telefon raqamiga bir nechta profil bog'langan. Qaysi profil sifatida kirmoqchisiz?
                            </Text>

                            <ScrollView style={{ maxHeight: 280, marginVertical: 14 }}>
                                {accountOptions.map((acc, index) => (
                                    <TouchableOpacity
                                        key={acc.id || acc._id || index}
                                        style={styles.accountOptionCard}
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            setShowAccountModal(false);
                                            setAuth(acc);
                                        }}
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
                                <Text style={styles.cancelModalBtnText}>BEKOR QILISH</Text>
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
});

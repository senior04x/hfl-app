import React, { useState, useEffect } from 'react';
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
    ActivityIndicator
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
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';
import Colors from '../constants/Colors';
import { useAuthStore } from '../store/useAuthStore';
import { apiService } from '../services/apiService';
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
    const [isLoginMode, setIsLoginMode] = useState(false);
    const [selectedRole, setSelectedRole] = useState<'player' | 'manager' | null>(null);
    const [phone, setPhone] = useState('');
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [loading, setLoading] = useState(false);

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
        };
    }, []);

    const handleLoginPress = () => {
        setIsLoginMode(true);
    };

    const handleRoleSelect = (roleId: 'player' | 'manager') => {
        setSelectedRole(roleId);
    };

    const handleConfirm = async () => {
        if (!selectedRole || phone.length < 9) {
            Alert.alert('Xato', 'Iltimos, rol va telefon raqamini to\'liq kiriting.');
            return;
        }

        try {
            setLoading(true);
            const response = await apiService.simpleLogin(phone);

            if (response.success) {
                setAuth(response.user);
            } else {
                Alert.alert('Xato', response.reason || 'Kirishda xatolik yuz berdi.');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            const message = error.response?.data?.reason || 'Server bilan bog\'lanishda xatolik yuz berdi.';
            Alert.alert('Xato', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Video
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                isMuted
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
            
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <View style={styles.mainContent}>
                        {isLoginMode && (
                            <View style={styles.loginCard}>
                                <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
                                <View style={{ padding: 24 }}>
                                    <Text style={styles.cardTitle}>KIM SIFATIDA KIRYAPSIZ?</Text>

                                    <View style={styles.roleSelectionContainer}>
                                        <TouchableOpacity
                                            style={[
                                                styles.roleButton,
                                                selectedRole === 'player' && styles.roleButtonActive
                                            ]}
                                            onPress={() => handleRoleSelect('player')}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.roleIconBox, selectedRole === 'player' && styles.roleIconBoxActive]}>
                                                <Ionicons name="football" size={24} color={selectedRole === 'player' ? '#000' : Colors.primary} />
                                            </View>
                                            <Text style={[styles.roleLabel, selectedRole === 'player' && styles.roleLabelActive]}>O'YINCHI</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[
                                                styles.roleButton,
                                                selectedRole === 'manager' && styles.roleButtonActive
                                            ]}
                                            onPress={() => handleRoleSelect('manager')}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.roleIconBox, selectedRole === 'manager' && styles.roleIconBoxActive]}>
                                                <Ionicons name="people" size={24} color={selectedRole === 'manager' ? '#000' : Colors.primary} />
                                            </View>
                                            <Text style={[styles.roleLabel, selectedRole === 'manager' && styles.roleLabelActive]}>JAMOA</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.inputWrapper}>
                                        <Text style={styles.inputLabel}>TEL RAQAMINGIZ</Text>
                                        <View style={styles.inputContainer}>
                                            <Text style={styles.phonePrefix}>+998</Text>
                                            <TextInput
                                                style={styles.phoneInput}
                                                placeholder="00 000 00 00"
                                                placeholderTextColor={Colors.textMuted}
                                                keyboardType="phone-pad"
                                                value={phone}
                                                onChangeText={setPhone}
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
                                                (!selectedRole || phone.length < 9 || loading) && styles.confirmButtonDisabled
                                            ]}
                                            onPress={handleConfirm}
                                            disabled={!selectedRole || phone.length < 9 || loading}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="#000" />
                                            ) : (
                                                <Text style={styles.confirmButtonText}>DAVOM ETISH</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
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
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.mainButtonText}>KIRISH</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.guestButton}
                                    onPress={() => setGuest(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.guestButtonText}>MEHMON BO'LIB KIRISH</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    mainContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    miniLogoBrandContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    miniLogoWrapper: {
        width: 60,
        height: 60,
        marginRight: 10,
    },
    miniMaskedView: {
        width: 60,
        height: 60,
    },
    miniCenteredContent: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniLogo: {
        width: 50,
        height: 50,
    },
    miniBrandText: {
        color: Colors.text,
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 4,
    },
    shimmerLine: {
        position: 'absolute',
        top: -50,
        left: 0,
        width: 30,
        height: 200,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
    },
    mainButton: {
        backgroundColor: 'rgba(0, 255, 102, 0.05)',
        height: 54,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    mainButtonText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 2,
    },
    guestButton: {
        marginTop: 12,
        alignItems: 'center',
        paddingVertical: 8,
    },
    guestButtonText: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    loginCard: {
        borderRadius: 32,
        padding: 24,
        width: width - 40,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    cardTitle: {
        color: Colors.text,
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 2,
        textAlign: 'center',
        marginBottom: 24,
        opacity: 0.9,
    },
    roleSelectionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 12,
    },
    roleButton: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    roleButtonActive: {
        backgroundColor: 'rgba(0, 255, 102, 0.15)',
        borderColor: Colors.primary,
    },
    roleIconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    roleIconBoxActive: {
        backgroundColor: Colors.primary,
    },
    roleLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
    roleLabelActive: {
        color: Colors.primary,
    },
    inputWrapper: {
        marginBottom: 24,
    },
    inputLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    phonePrefix: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
        marginRight: 8,
    },
    phoneInput: {
        flex: 1,
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
        height: '100%',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    confirmButton: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '900',
    },
    confirmButtonDisabled: {
        opacity: 0.3,
    },
});

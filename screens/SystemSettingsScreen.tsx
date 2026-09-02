import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    StatusBar,
    PanResponder,
    Animated,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AppNavbar from '../components/AppNavbar';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { SUPPORTED_LANGUAGES, useLanguageStore } from '../store/useLanguageStore';
import Colors from '../constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SystemSettingsScreen({ navigation }: any) {
    const { t, i18n } = useTranslation();
    const { theme, isDark, setTheme } = useThemeStore();
    const { setLanguage } = useLanguageStore();
    const homeColors = getHomeScreenColors(isDark);

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

    const handleSelectLanguage = async (code: string) => {
        try {
            await i18n.changeLanguage(code);
            setLanguage(code);
        } catch (e) {
            console.error('Error switching language:', e);
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
                        title={t('settings.system_settings', 'TIZIM SOZLAMALARI')}
                        subtitle="AMATORA"
                        onBackPress={() => navigation.goBack()}
                    />

                    <View style={{ flex: 1 }} {...swipeBackPanResponder.panHandlers}>
                        <ScrollView
                            style={styles.container}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60, paddingTop: 10 }}
                        >
                            {/* Section 1: Mavzu & Ko'rinish (Theme & Appearance) */}
                            <Text style={[styles.sectionHeading, { color: homeColors.textSecondary }]}>
                                {t('settings.appearance', "MAVZU VA KO'RINISH").toUpperCase()}
                            </Text>

                            <View
                                style={[
                                    styles.groupedCard,
                                    {
                                        backgroundColor: isDark ? homeColors.background : '#FFFFFF',
                                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : homeColors.border,
                                    }
                                ]}
                            >
                                {/* 1. System Auto Option */}
                                <TouchableOpacity
                                    style={[
                                        styles.optionRow,
                                        {
                                            borderBottomWidth: 1,
                                            borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                        }
                                    ]}
                                    onPress={() => setTheme('system')}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.optionLeft}>
                                        <View
                                            style={[
                                                styles.iconCircle,
                                                {
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                                }
                                            ]}
                                        >
                                            <Ionicons
                                                name="phone-portrait-outline"
                                                size={18}
                                                color={theme === 'system' ? homeColors.accent : homeColors.textSecondary}
                                            />
                                        </View>
                                        <View style={{ flex: 1, paddingRight: 8 }}>
                                            <Text
                                                style={[
                                                    styles.optionTitle,
                                                    { color: homeColors.textPrimary },
                                                    theme === 'system' && { fontWeight: '800' }
                                                ]}
                                            >
                                                {t('settings.system_mode', 'Qurilma mavzusi (Avtomatik)')}
                                            </Text>
                                            <Text style={[styles.optionSubtitle, { color: homeColors.textSecondary }]}>
                                                {t('settings.system_mode_sub', 'Qurilma tizim sozlamalariga qarab moslashadi')}
                                            </Text>
                                        </View>
                                    </View>

                                    {theme === 'system' && (
                                        <Ionicons name="checkmark-sharp" size={20} color={homeColors.accent} />
                                    )}
                                </TouchableOpacity>

                                {/* 2. Dark Mode Option */}
                                <TouchableOpacity
                                    style={[
                                        styles.optionRow,
                                        {
                                            borderBottomWidth: 1,
                                            borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                        }
                                    ]}
                                    onPress={() => setTheme('dark')}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.optionLeft}>
                                        <View
                                            style={[
                                                styles.iconCircle,
                                                {
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                                }
                                            ]}
                                        >
                                            <Ionicons
                                                name="moon"
                                                size={18}
                                                color={theme === 'dark' ? homeColors.accent : homeColors.textSecondary}
                                            />
                                        </View>
                                        <View style={{ flex: 1, paddingRight: 8 }}>
                                            <Text
                                                style={[
                                                    styles.optionTitle,
                                                    { color: homeColors.textPrimary },
                                                    theme === 'dark' && { fontWeight: '800' }
                                                ]}
                                            >
                                                {t('settings.dark_mode', "Qorong'u rejim")}
                                            </Text>
                                            <Text style={[styles.optionSubtitle, { color: homeColors.textSecondary }]}>
                                                OLED qora fon va yuqori kontrast
                                            </Text>
                                        </View>
                                    </View>

                                    {theme === 'dark' && (
                                        <Ionicons name="checkmark-sharp" size={20} color={homeColors.accent} />
                                    )}
                                </TouchableOpacity>

                                {/* 3. Light Mode Option */}
                                <TouchableOpacity
                                    style={styles.optionRow}
                                    onPress={() => setTheme('light')}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.optionLeft}>
                                        <View
                                            style={[
                                                styles.iconCircle,
                                                {
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                                }
                                            ]}
                                        >
                                            <Ionicons
                                                name="sunny"
                                                size={18}
                                                color={theme === 'light' ? homeColors.accent : homeColors.textSecondary}
                                            />
                                        </View>
                                        <View style={{ flex: 1, paddingRight: 8 }}>
                                            <Text
                                                style={[
                                                    styles.optionTitle,
                                                    { color: homeColors.textPrimary },
                                                    theme === 'light' && { fontWeight: '800' }
                                                ]}
                                            >
                                                {t('settings.light_mode', "Yorug' rejim")}
                                            </Text>
                                            <Text style={[styles.optionSubtitle, { color: homeColors.textSecondary }]}>
                                                Klassik oq fon va yorqin ranglar
                                            </Text>
                                        </View>
                                    </View>

                                    {theme === 'light' && (
                                        <Ionicons name="checkmark-sharp" size={20} color={homeColors.accent} />
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Section 2: Tilni tanlash (Language Selection) */}
                            <Text style={[styles.sectionHeading, { color: homeColors.textSecondary, marginTop: 24 }]}>
                                {t('settings.language', 'ILOVA TILI').toUpperCase()}
                            </Text>

                            <View
                                style={[
                                    styles.groupedCard,
                                    {
                                        backgroundColor: isDark ? homeColors.background : '#FFFFFF',
                                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : homeColors.border,
                                    }
                                ]}
                            >
                                {SUPPORTED_LANGUAGES.map((lang, index) => {
                                    const isSelected = i18n.language === lang.code;
                                    const isLast = index === SUPPORTED_LANGUAGES.length - 1;

                                    return (
                                        <TouchableOpacity
                                            key={lang.code}
                                            style={[
                                                styles.optionRow,
                                                {
                                                    borderBottomWidth: isLast ? 0 : 1,
                                                    borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                                }
                                            ]}
                                            onPress={() => handleSelectLanguage(lang.code)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.optionLeft}>
                                                <Text style={styles.flagEmoji}>{lang.flag}</Text>
                                                <View style={{ marginLeft: 12 }}>
                                                    <Text
                                                        style={[
                                                            styles.optionTitle,
                                                            { color: homeColors.textPrimary },
                                                            isSelected && { fontWeight: '800' }
                                                        ]}
                                                    >
                                                        {lang.label}
                                                    </Text>
                                                    <Text style={[styles.optionSubtitle, { color: homeColors.textSecondary }]}>
                                                        {lang.code === 'uz' ? "O'zbek tili (Lotin)" : lang.code === 'ru' ? 'Русский язык' : 'English language'}
                                                    </Text>
                                                </View>
                                            </View>

                                            {isSelected && (
                                                <Ionicons name="checkmark-sharp" size={20} color={homeColors.accent} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Section 3: Qo'shimcha (Security shortcut) */}
                            <Text style={[styles.sectionHeading, { color: homeColors.textSecondary, marginTop: 24 }]}>
                                {t('settings.security_title', 'XAVFSIZLIK VA HUJJATLAR').toUpperCase()}
                            </Text>

                            <View
                                style={[
                                    styles.groupedCard,
                                    {
                                        backgroundColor: isDark ? homeColors.background : '#FFFFFF',
                                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : homeColors.border,
                                    }
                                ]}
                            >
                                <TouchableOpacity
                                    style={styles.optionRow}
                                    onPress={() => navigation.navigate('SecuritySettings')}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.optionLeft}>
                                        <View
                                            style={[
                                                styles.iconCircle,
                                                {
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                                }
                                            ]}
                                        >
                                            <Ionicons name="shield-checkmark-outline" size={18} color={homeColors.accent} />
                                        </View>
                                        <View>
                                            <Text style={[styles.optionTitle, { color: homeColors.textPrimary }]}>
                                                {t('settings.security_title', 'Xavfsizlik va hujjatlar')}
                                            </Text>
                                            <Text style={[styles.optionSubtitle, { color: homeColors.textSecondary }]}>
                                                {t('settings.security_sub', 'Maxfiylik siyosati, foydalanish shartlari va hisob sozlamalari')}
                                            </Text>
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={homeColors.textSecondary} style={{ opacity: 0.5 }} />
                                </TouchableOpacity>
                            </View>

                            {/* Version Info */}
                            <View style={styles.versionBox}>
                                <Text style={[styles.versionText, { color: homeColors.textSecondary }]}>
                                    {`AMATORA • ${t('common.version', 'VERSIYA').toUpperCase()} 2.1.1`}
                                </Text>
                            </View>
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </Animated.View>
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
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    flagEmoji: {
        fontSize: 22,
        marginRight: 2,
    },
    optionTitle: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    optionSubtitle: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    versionBox: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    versionText: {
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});

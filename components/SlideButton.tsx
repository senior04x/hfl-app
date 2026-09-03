import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
    Extrapolate,
    runOnJS,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

const TRACK_WIDTH = 300;
const TRACK_HEIGHT = 58;
const HANDLE_SIZE = 48;
const TRACK_PADDING = 5;
const MAX_DRAG = TRACK_WIDTH - HANDLE_SIZE - TRACK_PADDING * 2; // 242

const springConfig = {
    stiffness: 420,
    damping: 36,
    mass: 0.8,
};

export type SlideButtonStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SlideButtonProps {
    title?: string;
    loadingTitle?: string;
    successTitle?: string;
    errorTitle?: string;
    helperText?: string;
    onSwipeSuccess: () => void | Promise<void>;
    disabled?: boolean;
    loading?: boolean;
    status?: SlideButtonStatus;
    onReset?: () => void;
}

export const SlideButton: React.FC<SlideButtonProps> = ({
    title,
    loadingTitle,
    successTitle,
    errorTitle,
    helperText,
    onSwipeSuccess,
    disabled = false,
    loading = false,
    status = 'idle',
    onReset,
}) => {
    const { t } = useTranslation();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);

    const effectiveTitle = title || t('common.slide_to_send', 'Arizani yuborish uchun suring');
    const effectiveLoadingTitle = loadingTitle || t('common.loading', 'Yuborilmoqda...');
    const effectiveSuccessTitle = successTitle || t('common.success', 'Muvaffaqiyatli!');
    const effectiveErrorTitle = errorTitle || t('common.error', 'Xatolik yuz berdi');
    const effectiveHelperText = helperText || t('common.slide_hint', 'Arizani yuborish uchun suring yoki bosing');

    const [completed, setCompleted] = useState<boolean>(false);

    const translateX = useSharedValue(0);
    const startX = useSharedValue(0);
    const isDragging = useSharedValue(false);
    const trackWidthAnim = useSharedValue(TRACK_WIDTH);

    const triggerHaptics = (type: 'light' | 'medium' | 'success' | 'error') => {
        try {
            if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch (e) {}
    };

    const handleCompleteJS = () => {
        setCompleted(true);
        triggerHaptics('success');
        onSwipeSuccess();
    };

    const resetJS = () => {
        setCompleted(false);
        onReset?.();
    };

    const reset = () => {
        translateX.value = withSpring(0, springConfig);
        trackWidthAnim.value = withSpring(TRACK_WIDTH, springConfig);
        resetJS();
    };

    const triggerSwipeAction = () => {
        if (disabled || completed || loading) return;
        translateX.value = withSpring(MAX_DRAG, springConfig, (finished) => {
            if (finished) {
                trackWidthAnim.value = withSpring(165, springConfig);
                runOnJS(handleCompleteJS)();
            }
        });
    };

    // Gesture Handler Definition
    const panGesture = Gesture.Pan()
        .activeOffsetX([-3, 3])
        .failOffsetY([-30, 30])
        .shouldCancelWhenOutside(false)
        .onBegin(() => {
            if (disabled || completed || loading) return;
            startX.value = translateX.value;
            isDragging.value = true;
            runOnJS(triggerHaptics)('light');
        })
        .onUpdate((event) => {
            if (disabled || completed || loading) return;
            const newX = startX.value + event.translationX;
            translateX.value = Math.max(0, Math.min(newX, MAX_DRAG));
        })
        .onEnd(() => {
            if (disabled || completed || loading) return;
            isDragging.value = false;

            if (translateX.value >= MAX_DRAG * 0.4) {
                translateX.value = withSpring(MAX_DRAG, springConfig, (finished) => {
                    if (finished) {
                        trackWidthAnim.value = withSpring(165, springConfig);
                        runOnJS(handleCompleteJS)();
                    }
                });
            } else {
                translateX.value = withSpring(0, springConfig);
            }
        })
        .onFinalize(() => {
            isDragging.value = false;
        });

    useEffect(() => {
        if (status === 'idle' && (completed || translateX.value > 0) && !loading) {
            reset();
        } else if (status === 'error') {
            triggerHaptics('error');
            const timer = setTimeout(() => {
                reset();
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [status, loading]);

    // Reanimated Styles
    const trackStyle = useAnimatedStyle(() => ({
        width: trackWidthAnim.value,
    }));

    const progressStyle = useAnimatedStyle(() => {
        const width = interpolate(
            translateX.value,
            [0, MAX_DRAG],
            [HANDLE_SIZE, TRACK_WIDTH - TRACK_PADDING * 2],
            Extrapolate.CLAMP
        );
        const opacity = interpolate(
            translateX.value,
            [0, MAX_DRAG],
            [0.2, 0.8],
            Extrapolate.CLAMP
        );
        return {
            width,
            opacity,
        };
    });

    const labelStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            translateX.value,
            [0, MAX_DRAG * 0.6],
            [1, 0],
            Extrapolate.CLAMP
        );
        const labelX = interpolate(
            translateX.value,
            [0, MAX_DRAG],
            [0, 20],
            Extrapolate.CLAMP
        );
        return {
            opacity,
            transform: [{ translateX: labelX }],
        };
    });

    const handleStyle = useAnimatedStyle(() => {
        const scale = isDragging.value ? withSpring(1.05, springConfig) : withSpring(1, springConfig);
        return {
            transform: [
                { translateX: translateX.value },
                { scale },
            ],
        };
    });

    const currentStatusText =
        status === 'loading'
            ? effectiveLoadingTitle
            : status === 'success'
                ? effectiveSuccessTitle
                : status === 'error'
                    ? effectiveErrorTitle
                    : '';

    return (
        <View style={styles.wrapper}>
            <Animated.View
                style={[
                    styles.track,
                    {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                        borderColor: homeColors.border,
                    },
                    disabled && styles.trackDisabled,
                    completed && styles.trackCompleted,
                    trackStyle,
                ]}
            >
                {!completed && (
                    <>
                        <Animated.View style={[styles.progress, progressStyle]}>
                            <LinearGradient
                                colors={isDark ? ['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.05)'] : ['rgba(0, 0, 0, 0.15)', 'rgba(0, 0, 0, 0.03)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>

                        <Animated.View style={[styles.labelWrapper, labelStyle]}>
                            <TouchableOpacity
                                style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
                                onPress={triggerSwipeAction}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.labelText, { color: isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.75)' }]} numberOfLines={1}>
                                    {effectiveTitle}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>

                        <GestureDetector gesture={panGesture}>
                            <Animated.View style={[styles.handle, handleStyle]}>
                                <TouchableOpacity
                                    style={[
                                        styles.handleInnerContainer,
                                        {
                                            backgroundColor: isDark ? '#FFFFFF' : '#000000',
                                            borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
                                        }
                                    ]}
                                    onPress={triggerSwipeAction}
                                    activeOpacity={0.9}
                                >
                                    <View style={styles.iconCenterWrapper} pointerEvents="none">
                                        <Feather
                                            name="arrow-right"
                                            size={20}
                                            color={isDark ? '#000000' : '#FFFFFF'}
                                        />
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        </GestureDetector>
                    </>
                )}

                {completed && (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={reset}
                        style={styles.statusTouch}
                    >
                        <LinearGradient
                            colors={
                                status === 'success'
                                    ? ['#10B981', '#059669']
                                    : status === 'error'
                                        ? ['#EF4444', '#DC2626']
                                        : isDark ? ['#333333', '#222222'] : ['#E5E7EB', '#D1D5DB']
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.statusGradient}
                        >
                            <View style={styles.statusIconWrapper}>
                                {status === 'loading' && <ActivityIndicator color={isDark ? '#FFFFFF' : '#000000'} size="small" />}
                                {status === 'success' && <Feather name="check" size={20} color="#FFFFFF" />}
                                {status === 'error' && <Feather name="x" size={20} color="#FFFFFF" />}
                            </View>
                            <Text style={[
                                styles.statusText,
                                { color: (status === 'success' || status === 'error') ? '#FFFFFF' : (isDark ? '#FFFFFF' : '#000000') }
                            ]}>
                                {currentStatusText}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </Animated.View>

            {!completed && !disabled && (
                <Text style={[styles.helperText, { color: homeColors.textSecondary }]}>{effectiveHelperText}</Text>
            )}
        </View>
    );
};

export default SlideButton;

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        marginVertical: 16,
    },
    track: {
        height: TRACK_HEIGHT,
        borderRadius: 999,
        borderWidth: 1,
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    trackDisabled: {
        opacity: 0.5,
    },
    trackCompleted: {
        borderColor: 'transparent',
    },
    progress: {
        position: 'absolute',
        top: TRACK_PADDING,
        bottom: TRACK_PADDING,
        left: TRACK_PADDING,
        borderRadius: 999,
        overflow: 'hidden',
    },
    labelWrapper: {
        position: 'absolute',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 38,
    },
    labelText: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    handle: {
        position: 'absolute',
        top: TRACK_PADDING,
        left: TRACK_PADDING,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        borderRadius: HANDLE_SIZE / 2,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 6,
    },
    handleInnerContainer: {
        width: '100%',
        height: '100%',
        borderRadius: HANDLE_SIZE / 2,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCenterWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusTouch: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        borderRadius: 999,
        overflow: 'hidden',
    },
    statusGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        paddingHorizontal: 12,
    },
    statusIconWrapper: {
        marginRight: 6,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusText: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.1,
    },
    helperText: {
        marginTop: 10,
        fontSize: 11.5,
        fontWeight: '500',
    },
});

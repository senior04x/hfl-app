import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
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

const TRACK_WIDTH = 300;
const TRACK_HEIGHT = 64;
const HANDLE_SIZE = 54;
const TRACK_PADDING = 5;
const MAX_DRAG = TRACK_WIDTH - HANDLE_SIZE - TRACK_PADDING * 2; // 236

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

function SendIcon() {
    return <Feather name="send" size={20} color="#0b0e17" style={{ marginLeft: 1 }} />;
}

import { useTranslation } from 'react-i18next';

function CheckIcon() {
    return <Feather name="check" size={22} color="#0b0e17" />;
}

function ErrorIcon() {
    return <Feather name="x" size={22} color="#FFFFFF" />;
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
    const effectiveTitle = title || t('common.slide_to_send');
    const effectiveLoadingTitle = loadingTitle || t('common.loading');
    const effectiveSuccessTitle = successTitle || t('common.success');
    const effectiveErrorTitle = errorTitle || t('common.error');
    const effectiveHelperText = helperText || t('common.slide_hint');

    const [completed, setCompleted] = useState<boolean>(false);

    const translateX = useSharedValue(0);
    const startX = useSharedValue(0);
    const isDragging = useSharedValue(false);
    const trackWidthAnim = useSharedValue(TRACK_WIDTH);

    const triggerHaptics = (type: 'light' | 'medium' | 'success') => {
        try {
            if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

            if (translateX.value >= MAX_DRAG * 0.42) {
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
        if (status === 'idle' && completed && !loading) {
            reset();
        }
    }, [status]);

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
            [0.35, 1],
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
            [0, MAX_DRAG * 0.65],
            [1, 0],
            Extrapolate.CLAMP
        );
        const labelX = interpolate(
            translateX.value,
            [0, MAX_DRAG],
            [0, 24],
            Extrapolate.CLAMP
        );
        return {
            opacity,
            transform: [{ translateX: labelX }],
        };
    });

    const handleStyle = useAnimatedStyle(() => {
        const scale = isDragging.value ? withSpring(1.07, springConfig) : withSpring(1, springConfig);
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
                    disabled && styles.trackDisabled,
                    completed && styles.trackCompleted,
                    trackStyle,
                ]}
            >
                {!completed && (
                    <>
                        <Animated.View style={[styles.progress, progressStyle]}>
                            <LinearGradient
                                colors={['rgba(0, 255, 102, 0.6)', 'rgba(0, 204, 82, 0.3)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>

                        <Animated.View style={[styles.label, labelStyle]}>
                            <TouchableOpacity
                                style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
                                onPress={triggerSwipeAction}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.label} numberOfLines={1}>
                                    {effectiveTitle}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>

                        <GestureDetector gesture={panGesture}>
                            <Animated.View style={[styles.handle, handleStyle]}>
                                <TouchableOpacity
                                    style={styles.handleInnerContainer}
                                    onPress={triggerSwipeAction}
                                    activeOpacity={0.9}
                                >
                                    <LinearGradient
                                        colors={['#00FF66', '#00CC52', '#008833']}
                                        locations={[0, 0.65, 1]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <View style={styles.handleShine} pointerEvents="none" />
                                    <View style={styles.iconCenterWrapper} pointerEvents="none">
                                        <SendIcon />
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        </GestureDetector>
                    </>
                )}

                {completed && (
                    <TouchableOpacity
                        activeOpacity={status === 'success' || status === 'error' ? 0.8 : 1}
                        onPress={status === 'success' || status === 'error' ? reset : undefined}
                        style={styles.statusTouch}
                    >
                        <LinearGradient
                            colors={
                                status === 'success'
                                    ? ['#00FF66', '#00AA44']
                                    : status === 'error'
                                        ? ['#FF3B30', '#CC0000']
                                        : ['#00FF66', '#00AA44']
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.statusGradient}
                        >
                            <View style={styles.statusIconWrapper}>
                                {status === 'loading' && <ActivityIndicator color="#0b0e17" size="small" />}
                                {status === 'success' && <CheckIcon />}
                                {status === 'error' && <ErrorIcon />}
                            </View>
                            <Text style={[styles.statusText, status === 'error' && { color: '#FFFFFF' }]}>
                                {currentStatusText}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </Animated.View>

            {!completed && !disabled && (
                <Text style={styles.helperText}>{effectiveHelperText}</Text>
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
        backgroundColor: 'rgba(0, 255, 102, 0.065)',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.2)',
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
    label: {
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        paddingLeft: 42,
        color: 'rgba(255, 255, 255, 0.75)',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    handle: {
        position: 'absolute',
        top: TRACK_PADDING,
        left: TRACK_PADDING,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        borderRadius: HANDLE_SIZE / 2,
        shadowColor: '#00FF66',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
    },
    handleInnerContainer: {
        width: '100%',
        height: '100%',
        borderRadius: HANDLE_SIZE / 2,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        position: 'relative',
        overflow: 'hidden',
    },
    handleShine: {
        position: 'absolute',
        top: -8,
        left: -4,
        width: 44,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
        transform: [{ rotate: '-20deg' }],
    },
    iconCenterWrapper: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
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
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
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
        color: '#0b0e17',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.1,
    },
    helperText: {
        marginTop: 12,
        color: 'rgba(255, 255, 255, 0.35)',
        fontSize: 11,
        fontWeight: '500',
    },
});

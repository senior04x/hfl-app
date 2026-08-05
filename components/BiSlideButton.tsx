import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
const TRACK_HEIGHT = 58;
const HANDLE_SIZE = 48;
const TRACK_PADDING = 5;

// Center position calculations:
const CENTER_X = (TRACK_WIDTH - HANDLE_SIZE) / 2; // 126
const MAX_DRAG_SIDE = CENTER_X - TRACK_PADDING; // 121px max left or right

const springConfig = {
    stiffness: 420,
    damping: 36,
    mass: 0.8,
};

interface BiSlideButtonProps {
    submitTitle?: string;
    cancelTitle?: string;
    loadingTitle?: string;
    successTitle?: string;
    errorTitle?: string;
    helperText?: string;
    onSwipeSubmit: () => void | Promise<void>;
    onSwipeCancel: () => void | Promise<void>;
    disabled?: boolean;
    loading?: boolean;
    status?: 'idle' | 'loading' | 'success' | 'error';
    onReset?: () => void;
}

export const BiSlideButton: React.FC<BiSlideButtonProps> = ({
    submitTitle = "YUBORISH",
    cancelTitle = "BEKOR QILISH",
    loadingTitle = "Yuborilmoqda...",
    successTitle = "Yuborildi",
    errorTitle = "Xatolik",
    helperText = "",
    onSwipeSubmit,
    onSwipeCancel,
    disabled = false,
    loading = false,
    status = 'idle',
    onReset,
}) => {
    const [completedAction, setCompletedAction] = useState<'submit' | 'cancel' | null>(null);

    const translateX = useSharedValue(0); // 0 is CENTER
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

    const handleCompleteSubmitJS = () => {
        setCompletedAction('submit');
        triggerHaptics('success');
        onSwipeSubmit();
    };

    const handleCompleteCancelJS = () => {
        setCompletedAction('cancel');
        triggerHaptics('medium');
        onSwipeCancel();
    };

    const resetJS = () => {
        setCompletedAction(null);
        onReset?.();
    };

    const reset = () => {
        translateX.value = withSpring(0, springConfig);
        trackWidthAnim.value = withSpring(TRACK_WIDTH, springConfig);
        resetJS();
    };

    // Pan Gesture Definition (CENTER to Left/Right)
    const panGesture = Gesture.Pan()
        .activeOffsetX([-5, 5])
        .failOffsetY([-20, 20])
        .onBegin(() => {
            if (disabled || completedAction || loading) return;
            startX.value = translateX.value;
            isDragging.value = true;
            runOnJS(triggerHaptics)('light');
        })
        .onUpdate((event) => {
            if (disabled || completedAction || loading) return;
            const newX = startX.value + event.translationX;
            translateX.value = Math.max(-MAX_DRAG_SIDE, Math.min(newX, MAX_DRAG_SIDE));
        })
        .onEnd(() => {
            if (disabled || completedAction || loading) return;
            isDragging.value = false;

            if (translateX.value >= MAX_DRAG_SIDE * 0.78) {
                // Submit Right
                translateX.value = withSpring(MAX_DRAG_SIDE, springConfig, (finished) => {
                    if (finished) {
                        trackWidthAnim.value = withSpring(165, springConfig);
                        runOnJS(handleCompleteSubmitJS)();
                    }
                });
            } else if (translateX.value <= -MAX_DRAG_SIDE * 0.78) {
                // Cancel Left
                translateX.value = withSpring(-MAX_DRAG_SIDE, springConfig, (finished) => {
                    if (finished) {
                        runOnJS(handleCompleteCancelJS)();
                    }
                });
            } else {
                // Return to CENTER
                translateX.value = withSpring(0, springConfig);
            }
        })
        .onFinalize(() => {
            isDragging.value = false;
        });

    useEffect(() => {
        if (status === 'idle' && completedAction && !loading) {
            reset();
        }
    }, [status]);

    // Reanimated Styles
    const trackStyle = useAnimatedStyle(() => ({
        width: trackWidthAnim.value,
    }));

    // Right Fill (Submit)
    const rightProgressStyle = useAnimatedStyle(() => {
        const width = Math.max(0, translateX.value);
        const opacity = interpolate(translateX.value, [0, MAX_DRAG_SIDE], [0, 1], Extrapolate.CLAMP);
        return {
            left: CENTER_X + HANDLE_SIZE / 2,
            width,
            opacity,
        };
    });

    // Left Fill (Cancel)
    const leftProgressStyle = useAnimatedStyle(() => {
        const width = Math.max(0, -translateX.value);
        const opacity = interpolate(-translateX.value, [0, MAX_DRAG_SIDE], [0, 1], Extrapolate.CLAMP);
        return {
            right: CENTER_X + HANDLE_SIZE / 2,
            width,
            opacity,
        };
    });

    const leftLabelStyle = useAnimatedStyle(() => {
        const opacity = interpolate(translateX.value, [-MAX_DRAG_SIDE * 0.6, 0, MAX_DRAG_SIDE * 0.2], [1, 0.6, 0], Extrapolate.CLAMP);
        return { opacity };
    });

    const rightLabelStyle = useAnimatedStyle(() => {
        const opacity = interpolate(translateX.value, [-MAX_DRAG_SIDE * 0.2, 0, MAX_DRAG_SIDE * 0.6], [0, 0.6, 1], Extrapolate.CLAMP);
        return { opacity };
    });

    const handleStyle = useAnimatedStyle(() => {
        const scale = isDragging.value ? withSpring(1.08, springConfig) : withSpring(1, springConfig);
        return {
            transform: [
                { translateX: CENTER_X + translateX.value },
                { scale },
            ],
        };
    });

    return (
        <View style={styles.wrapper}>
            <Animated.View
                style={[
                    styles.track,
                    disabled && styles.trackDisabled,
                    completedAction && styles.trackCompleted,
                    trackStyle,
                ]}
            >
                {!completedAction && (
                    <>
                        {/* Right Progress Fill (Neon Green) */}
                        <Animated.View style={[styles.progressRight, rightProgressStyle]}>
                            <LinearGradient
                                colors={['rgba(0, 255, 102, 0.6)', 'rgba(0, 204, 82, 0.3)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>

                        {/* Left Progress Fill (Red) */}
                        <Animated.View style={[styles.progressLeft, leftProgressStyle]}>
                            <LinearGradient
                                colors={['rgba(255, 59, 48, 0.6)', 'rgba(204, 0, 0, 0.3)']}
                                start={{ x: 1, y: 0 }}
                                end={{ x: 0, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>

                        {/* Left Label (Close / Cancel) */}
                        <Animated.View style={[styles.leftLabelContainer, leftLabelStyle]} pointerEvents="none">
                            <Ionicons name="close" size={18} color="#FF3B30" style={{ marginRight: 4 }} />
                            <Text style={styles.leftLabelText} numberOfLines={1}>{cancelTitle}</Text>
                        </Animated.View>

                        {/* Right Label (Submit / Send) */}
                        <Animated.View style={[styles.rightLabelContainer, rightLabelStyle]} pointerEvents="none">
                            <Text style={styles.rightLabelText} numberOfLines={1}>{submitTitle}</Text>
                            <Ionicons name="arrow-forward" size={14} color="#00FF66" style={{ marginLeft: 4 }} />
                        </Animated.View>

                        {/* Center Handle */}
                        <GestureDetector gesture={panGesture}>
                            <Animated.View style={[styles.handle, handleStyle]}>
                                <View style={styles.handleInnerContainer}>
                                    <LinearGradient
                                        colors={['#00FF66', '#00CC52', '#008833']}
                                        locations={[0, 0.65, 1]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <View style={styles.handleShine} pointerEvents="none" />
                                    <View style={styles.iconCenterWrapper} pointerEvents="none">
                                        <Ionicons name="swap-horizontal" size={22} color="#0b0e17" />
                                    </View>
                                </View>
                            </Animated.View>
                        </GestureDetector>
                    </>
                )}

                {completedAction === 'submit' && (
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
                                {status === 'success' && <Ionicons name="checkmark-circle" size={20} color="#0b0e17" />}
                                {status === 'error' && <Ionicons name="alert-circle" size={20} color="#FFFFFF" />}
                            </View>
                            <Text style={[styles.statusText, status === 'error' && { color: '#FFFFFF' }]}>
                                {status === 'loading' ? loadingTitle : status === 'success' ? successTitle : errorTitle}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </Animated.View>

            {!!helperText && !completedAction && !disabled && (
                <Text style={styles.helperText}>{helperText}</Text>
            )}
        </View>
    );
};

export default BiSlideButton;

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        marginVertical: 12,
    },
    track: {
        height: TRACK_HEIGHT,
        borderRadius: 999,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
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
    progressRight: {
        position: 'absolute',
        top: TRACK_PADDING,
        bottom: TRACK_PADDING,
        borderRadius: 999,
        overflow: 'hidden',
    },
    progressLeft: {
        position: 'absolute',
        top: TRACK_PADDING,
        bottom: TRACK_PADDING,
        borderRadius: 999,
        overflow: 'hidden',
    },
    leftLabelContainer: {
        position: 'absolute',
        left: 14,
        flexDirection: 'row',
        alignItems: 'center',
    },
    leftLabelText: {
        color: '#FF3B30',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    rightLabelContainer: {
        position: 'absolute',
        right: 14,
        flexDirection: 'row',
        alignItems: 'center',
    },
    rightLabelText: {
        color: '#00FF66',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    handle: {
        position: 'absolute',
        top: TRACK_PADDING,
        left: 0,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        borderRadius: HANDLE_SIZE / 2,
        shadowColor: '#00FF66',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
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
        top: -6,
        left: -4,
        width: 38,
        height: 24,
        borderRadius: 12,
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
        width: 22,
        height: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusText: {
        color: '#0b0e17',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    helperText: {
        marginTop: 6,
        color: 'rgba(255, 255, 255, 0.35)',
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'center',
    },
});

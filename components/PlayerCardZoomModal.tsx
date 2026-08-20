import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    StatusBar,
    Platform,
    Alert,
    Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useTranslation } from 'react-i18next';
import SmartBlurView from './SmartBlurView';
import FifaPlayerCard from './FifaPlayerCard';
import FifaCardBack from './FifaCardBack';
import Colors from '../constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PlayerCardZoomModalProps {
    visible: boolean;
    onClose: () => void;
    player: any;
}

export default function PlayerCardZoomModal({
    visible,
    onClose,
    player,
}: PlayerCardZoomModalProps) {
    const { t } = useTranslation();
    const cardShotRef = useRef<any>(null);
    const [sharing, setSharing] = useState(false);

    // 100% Android Safe 3D Two-Sided Horizontal Flip Animation
    const flipAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Haptics.selectionAsync().catch(() => {});
            flipAnim.setValue(0);
            opacityAnim.setValue(0);

            Animated.parallel([
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: true,
                }),
                Animated.timing(flipAnim, {
                    toValue: 1,
                    duration: 1250,
                    easing: Easing.bezier(0.2, 0.8, 0.2, 1),
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const handleClose = () => {
        Haptics.selectionAsync().catch(() => {});
        Animated.parallel([
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 650,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(flipAnim, {
                toValue: 0,
                duration: 650,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const handleShareCard = async () => {
        if (sharing) return;
        setSharing(true);
        Haptics.selectionAsync().catch(() => {});
        try {
            if (cardShotRef.current) {
                const uri = await captureRef(cardShotRef, {
                    format: 'png',
                    quality: 1.0,
                    result: 'tmpfile',
                });
                const isAvailable = await Sharing.isAvailableAsync();
                if (isAvailable) {
                    await Sharing.shareAsync(uri, {
                        mimeType: 'image/png',
                        dialogTitle: `${player?.firstName || player?.name || 'O\'yinchi'} Kartasi`,
                        UTI: 'public.png',
                    });
                } else {
                    Alert.alert('Tayyor!', `Rasm saqlandi: ${uri}`);
                }
            }
        } catch (error) {
            console.error('Error sharing card:', error);
            Alert.alert('Xatolik', 'Kartani ulashishda xatolik yuz berdi');
        } finally {
            setSharing(false);
        }
    };

    // High-performance 3D Horizontal Flip & Pop Animation for Android & iOS
    const zoomScale = flipAnim.interpolate({
        inputRange: [0, 0.6, 0.85, 1],
        outputRange: [0.35, 0.92, 1.05, 1],
    });

    // Dynamic tilt during rotation
    const rotateZ = flipAnim.interpolate({
        inputRange: [0, 0.3, 0.7, 1],
        outputRange: ['-10deg', '6deg', '-3deg', '0deg'],
    });

    // 3D Rotation Y-Axis: Back face starts at 0deg and flips away; Front face starts at 180deg and lands at 0deg
    const backRotateY = flipAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: ['0deg', '90deg', '180deg'],
    });

    const frontRotateY = flipAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: ['180deg', '90deg', '0deg'],
    });

    // Opacity switching at midpoint (0.5) so cards swap faces cleanly
    const backOpacity = flipAnim.interpolate({
        inputRange: [0, 0.49, 0.5, 1],
        outputRange: [1, 1, 0, 0],
    });

    const frontOpacity = flipAnim.interpolate({
        inputRange: [0, 0.49, 0.5, 1],
        outputRange: [0, 0, 1, 1],
    });

    if (!visible || !player) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <View style={styles.modalOverlay}>
                {/* Frosted Dark Blur Background */}
                <SmartBlurView intensity={70} tint="dark" style={StyleSheet.absoluteFillObject} />

                {/* Header Controls */}
                <View style={styles.headerBar}>
                    <View style={styles.headerTitleBox}>
                        <Ionicons name="sparkles" size={16} color={Colors.primary} />
                        <Text style={styles.headerTitle}>
                            {t('stats.player_card_title', 'O\'YINCHI KARTASI')}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={handleClose}
                        style={styles.closeBtn}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="close" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* 3D Two-Sided Horizontal Flip Container with Perspective */}
                <View style={styles.cardCenterWrapper}>
                    {/* BACK FACE (Gold Amatora Shield) */}
                    <Animated.View
                        style={[
                            styles.cardLayer,
                            styles.backCardLayer,
                            {
                                opacity: backOpacity,
                                transform: [
                                    { perspective: 1000 },
                                    { scale: zoomScale },
                                    { rotateY: backRotateY },
                                    { rotateZ: rotateZ },
                                ],
                            },
                        ]}
                    >
                        <FifaCardBack size="lg" />
                    </Animated.View>

                    {/* FRONT FACE (Main Player Card) */}
                    <Animated.View
                        style={[
                            styles.cardLayer,
                            {
                                opacity: frontOpacity,
                                transform: [
                                    { perspective: 1000 },
                                    { scale: zoomScale },
                                    { rotateY: frontRotateY },
                                    { rotateZ: rotateZ },
                                ],
                            },
                        ]}
                    >
                        <View ref={cardShotRef} collapsable={false} style={{ alignItems: 'center' }}>
                            <FifaPlayerCard
                                player={player}
                                size="lg"
                                interactive3D={true}
                                showPlayStyles={true}
                            />
                        </View>
                    </Animated.View>
                </View>

                {/* Bottom Actions Bar */}
                <View style={styles.bottomActions}>
                    <TouchableOpacity
                        onPress={handleShareCard}
                        disabled={sharing}
                        activeOpacity={0.85}
                        style={styles.shareBtn}
                    >
                        <LinearGradient
                            colors={['#00DF82', '#00A862']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.shareGradient}
                        >
                            <Ionicons name="share-social-outline" size={18} color="#050A14" />
                            <Text style={styles.shareBtnText}>
                                {sharing ? t('common.loading') : t('stats.share_story', 'STORIES / RASM QILIB ULASHISH')}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(2, 6, 14, 0.85)',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Platform.OS === 'ios' ? 52 : 36,
        paddingHorizontal: 20,
    },
    headerBar: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    headerTitleBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    closeBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 255, 255, 0.14)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.18)',
    },
    cardCenterWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        position: 'relative',
    },
    cardLayer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    backCardLayer: {
        position: 'absolute',
        top: 0,
        zIndex: 1,
    },
    bottomActions: {
        width: '100%',
        alignItems: 'center',
    },
    shareBtn: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#00DF82',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    shareGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    shareBtnText: {
        color: '#050A14',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
});

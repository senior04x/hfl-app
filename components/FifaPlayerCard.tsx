import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    PanResponder,
    Dimensions,
    TouchableOpacity,
    Platform,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Accelerometer } from 'expo-sensors';
import { useTranslation } from 'react-i18next';
import SmartImage from './SmartImage';
import {
    calculateFifaAttributes,
    getCardRarity,
    getLocalizedStatLabel,
    getCardPosition,
    CARD_THEMES,
    CardRarity,
    FifaAttributes,
} from '../utils/playerCardUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FifaPlayerCardProps {
    player: any;
    rarity?: CardRarity;
    size?: 'sm' | 'md' | 'lg';
    interactive3D?: boolean;
    showPlayStyles?: boolean;
    showAttributes?: boolean;
    onPress?: () => void;
}

export default function FifaPlayerCard({
    player,
    rarity: customRarity,
    size = 'md',
    interactive3D = false,
    showPlayStyles = false,
    showAttributes = true,
    onPress,
}: FifaPlayerCardProps) {
    const { i18n } = useTranslation();
    const currentLang = i18n.language || 'uz';

    const rarity: CardRarity = customRarity || getCardRarity(player);
    const theme = CARD_THEMES[rarity] || CARD_THEMES.gold;
    const attrs: FifaAttributes = calculateFifaAttributes(player);
    const cardPosition = getCardPosition(player?.position || player?.positionUz, currentLang);

    const goalsCount = player?.stats?.goals ?? player?.goals ?? 0;
    const assistsCount = player?.stats?.assists ?? player?.assists ?? 0;
    const matchesCount = player?.stats?.matchesPlayed ?? player?.stats?.matches ?? player?.matchesPlayed ?? 0;

    // Optimized Card Aspect Ratio
    const cardWidth = size === 'sm' ? 175 : size === 'lg' ? Math.min(SCREEN_WIDTH - 48, 330) : 260;
    const cardHeight = showAttributes ? cardWidth * 1.25 : cardWidth * 1.04;
    const scaleFactor = cardWidth / 260;

    // 3D Parallax & Tilt animations
    const tiltX = useRef(new Animated.Value(0)).current;
    const tiltY = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const isTouchingRef = useRef(false);

    // Accelerometer Subscription for Real Device Tilt Motion (Gyroscope Parallax)
    useEffect(() => {
        if (!interactive3D) return;

        Accelerometer.setUpdateInterval(40);
        const subscription = Accelerometer.addListener(({ x, y }) => {
            if (isTouchingRef.current) return;

            // Map device tilt (-1 to 1) to gentle degrees (-12° to 12°)
            const maxSensorTilt = 12;
            const targetTiltY = Math.max(-maxSensorTilt, Math.min(maxSensorTilt, x * 14));
            const targetTiltX = Math.max(-maxSensorTilt, Math.min(maxSensorTilt, (y + 0.6) * 14));

            Animated.spring(tiltX, {
                toValue: targetTiltX,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();

            Animated.spring(tiltY, {
                toValue: targetTiltY,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        });

        return () => {
            try {
                subscription.remove();
            } catch (e) {}
        };
    }, [interactive3D]);

    // 3D Gesture Pan Responder (Touch swipe & drag)
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => interactive3D,
            onMoveShouldSetPanResponder: () => interactive3D,
            onPanResponderGrant: () => {
                isTouchingRef.current = true;
                Haptics.selectionAsync().catch(() => {});
                Animated.spring(scaleAnim, {
                    toValue: 1.04,
                    friction: 6,
                    tension: 50,
                    useNativeDriver: true,
                }).start();
            },
            onPanResponderMove: (_, gestureState) => {
                const maxTilt = 14; // Gentle degrees for safe 3D
                const rotateYValue = (gestureState.dx / (cardWidth / 2)) * maxTilt;
                const rotateXValue = -(gestureState.dy / (cardHeight / 2)) * maxTilt;

                tiltX.setValue(Math.max(-maxTilt, Math.min(maxTilt, rotateXValue)));
                tiltY.setValue(Math.max(-maxTilt, Math.min(maxTilt, rotateYValue)));
            },
            onPanResponderRelease: () => {
                isTouchingRef.current = false;
                Animated.parallel([
                    Animated.spring(tiltX, {
                        toValue: 0,
                        friction: 7,
                        tension: 40,
                        useNativeDriver: true,
                    }),
                    Animated.spring(tiltY, {
                        toValue: 0,
                        friction: 7,
                        tension: 40,
                        useNativeDriver: true,
                    }),
                    Animated.spring(scaleAnim, {
                        toValue: 1,
                        friction: 7,
                        tension: 40,
                        useNativeDriver: true,
                    }),
                ]).start();
            },
        })
    ).current;

    // Interpolations for 3D perspective transform
    const rotateX = tiltX.interpolate({
        inputRange: [-14, 14],
        outputRange: ['-14deg', '14deg'],
    });

    const rotateY = tiltY.interpolate({
        inputRange: [-14, 14],
        outputRange: ['-14deg', '14deg'],
    });

    const rawFirstName = player?.firstName || player?.first_name || '';
    const rawLastName = player?.lastName || player?.last_name || '';
    const playerName = (rawFirstName && rawLastName)
        ? `${rawFirstName} ${rawLastName}`
        : player?.name || player?.fullName || rawFirstName || 'O\'YINCHI';

    const avatarUri = player?.avatar || player?.photo || player?.photo_url || player?.image_url;
    const teamLogo = player?.teams?.logo_url || player?.teams?.logo || player?.team_logo || player?.teamLogo;

    const rawRating = player?.rating !== undefined && player?.rating !== null && Number(player?.rating) !== 0
        ? Number(player.rating)
        : (player?.stats?.rating ? Number(player.stats.rating) : 0);
    const displayRating = attrs.ovr === 0 ? "0" : (rawRating > 0 ? rawRating.toFixed(1) : (attrs.ovr >= 50 ? (attrs.ovr / 10).toFixed(1) : (attrs.ovr || 0).toFixed(1)));

    return (
        <Animated.View
            {...(interactive3D ? panResponder.panHandlers : {})}
            style={[
                styles.container,
                {
                    width: cardWidth,
                    height: cardHeight,
                    shadowColor: theme.shadowColor,
                    transform: interactive3D ? [
                        { perspective: 2000 },
                        { rotateX },
                        { rotateY },
                        { scale: scaleAnim },
                    ] : [],
                },
            ]}
        >
            <TouchableOpacity
                activeOpacity={0.92}
                onPress={onPress}
                disabled={!onPress}
                style={styles.cardInner}
            >
                {/* 3D Chamfered Outer Border Gradient */}
                <LinearGradient
                    colors={theme.borderGradient as [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.borderLayer}
                >
                    {/* Card Body Background */}
                    <LinearGradient
                        colors={theme.cardBg as [string, string, ...string[]]}
                        start={{ x: 0.1, y: 0 }}
                        end={{ x: 0.9, y: 1 }}
                        style={[
                            styles.bodyLayer,
                            {
                                paddingHorizontal: 12 * scaleFactor,
                                paddingTop: 10 * scaleFactor,
                                paddingBottom: 6 * scaleFactor,
                            },
                        ]}
                    >
                        {/* Background Geometric Facets */}
                        <View style={styles.geometricPattern}>
                            <View style={[styles.geoLine, { borderColor: theme.accentGlow }]} />
                            <View style={[styles.geoLine2, { borderColor: theme.accentGlow }]} />
                            <View style={[styles.geoCircle, { borderColor: theme.accentGlow }]} />
                        </View>

                        {/* Top Hero Row (Left Stats Column + Right Photo Cutout) */}
                        <View style={[styles.topHeroRow, { marginTop: 1 * scaleFactor }]}>
                            {/* Left Column (OVR, Full Position, Circular Club Badge) */}
                            <View style={[styles.topLeftColumn, { width: 76 * scaleFactor }]}>
                                <Text
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    style={[
                                        styles.ovrText,
                                        {
                                            fontSize: 30 * scaleFactor,
                                            lineHeight: Math.round(38 * scaleFactor),
                                            color: theme.ratingColor,
                                            textShadowColor: theme.accentGlow,
                                        },
                                    ]}
                                >
                                    {displayRating}
                                </Text>

                                {/* Full Localized Position Pill */}
                                <View style={[styles.posBadge, { borderColor: theme.accentGlow, paddingHorizontal: 4 * scaleFactor, paddingVertical: 1.5 * scaleFactor }]}>
                                    <Text
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        style={[
                                            styles.posText,
                                            {
                                                fontSize: Math.min(8.5 * scaleFactor, 9.5),
                                                color: theme.textGold,
                                            },
                                        ]}
                                    >
                                        {cardPosition}
                                    </Text>
                                </View>

                                {/* Divider Line */}
                                <View style={[styles.miniDivider, { backgroundColor: theme.accentGlow, width: 22 * scaleFactor }]} />

                                {/* PERFECT CIRCULAR Club Crest Badge */}
                                <View
                                    style={[
                                        styles.clubBadgeCircle,
                                        {
                                            width: 28 * scaleFactor,
                                            height: 28 * scaleFactor,
                                            borderRadius: 14 * scaleFactor,
                                            borderColor: theme.accentGlow,
                                        },
                                    ]}
                                >
                                    {teamLogo ? (
                                        <Image
                                            source={{ uri: teamLogo }}
                                            style={[
                                                styles.clubLogoImg,
                                                {
                                                    width: 24 * scaleFactor,
                                                    height: 24 * scaleFactor,
                                                    borderRadius: 12 * scaleFactor,
                                                },
                                            ]}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <Ionicons name="shield-outline" size={14 * scaleFactor} color={theme.textGold} />
                                    )}
                                </View>
                            </View>

                            {/* Player Photo Cutout with Ambient Glow */}
                            <View style={styles.photoContainer}>
                                <View
                                    style={[
                                        styles.photoGlow,
                                        {
                                            backgroundColor: theme.accentGlow,
                                            width: 120 * scaleFactor,
                                            height: 120 * scaleFactor,
                                        },
                                    ]}
                                />
                                {avatarUri ? (
                                    <SmartImage
                                        uri={avatarUri}
                                        style={[
                                            styles.playerPhoto,
                                            {
                                                width: 148 * scaleFactor,
                                                height: 148 * scaleFactor,
                                            },
                                        ]}
                                        contentFit="contain"
                                    />
                                ) : (
                                    <View
                                        style={[
                                            styles.playerPhotoPlaceholder,
                                            {
                                                width: 136 * scaleFactor,
                                                height: 136 * scaleFactor,
                                            },
                                        ]}
                                    >
                                        <FontAwesome5 name="user-alt" size={54 * scaleFactor} color="rgba(255,255,255,0.3)" />
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Bottom Container: Player Name Plaque + Real Football Stats + Amatora Seal */}
                        <View style={[styles.bottomInfoSection, { marginTop: 1 * scaleFactor }]}>
                            {/* Player Name Plaque */}
                            <View style={styles.namePlateWrapper}>
                                <LinearGradient
                                    colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.0)']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.namePlateGradient}
                                >
                                    <Text
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                        style={[
                                            styles.playerNameText,
                                            {
                                                fontSize: Math.min(14 * scaleFactor, 15.5),
                                                color: theme.textPrimary,
                                            },
                                        ]}
                                    >
                                        {playerName.toUpperCase()}
                                    </Text>
                                </LinearGradient>
                            </View>

                            {/* Real Football Stats (GOL, ASIST, O'YIN) */}
                            {showAttributes && (
                                <View style={{ width: '100%', marginTop: 1 * scaleFactor }}>
                                    <View style={[styles.separatorContainer, { marginVertical: 1.5 * scaleFactor }]}>
                                        <View style={[styles.separatorLine, { backgroundColor: theme.accentGlow }]} />
                                        <View style={[styles.separatorDiamond, { backgroundColor: theme.textGold }]} />
                                        <View style={[styles.separatorLine, { backgroundColor: theme.accentGlow }]} />
                                    </View>

                                    <View style={[styles.statsRowThree, { paddingHorizontal: 12 * scaleFactor, marginTop: 0 }]}>
                                        <View style={styles.statColItem}>
                                            <Text style={[styles.statNumBig, { fontSize: 15 * scaleFactor, color: theme.textGold }]}>
                                                {goalsCount}
                                            </Text>
                                            <Text style={[styles.statLabelSmall, { fontSize: 8.5 * scaleFactor, color: theme.textPrimary }]}>
                                                GOL
                                            </Text>
                                        </View>

                                        <View style={[styles.statsVerticalDivider, { height: 20 * scaleFactor, backgroundColor: 'rgba(255,255,255,0.2)' }]} />

                                        <View style={styles.statColItem}>
                                            <Text style={[styles.statNumBig, { fontSize: 15 * scaleFactor, color: theme.textGold }]}>
                                                {assistsCount}
                                            </Text>
                                            <Text style={[styles.statLabelSmall, { fontSize: 8.5 * scaleFactor, color: theme.textPrimary }]}>
                                                ASIST
                                            </Text>
                                        </View>

                                        <View style={[styles.statsVerticalDivider, { height: 20 * scaleFactor, backgroundColor: 'rgba(255,255,255,0.2)' }]} />

                                        <View style={styles.statColItem}>
                                            <Text style={[styles.statNumBig, { fontSize: 15 * scaleFactor, color: theme.textGold }]}>
                                                {matchesCount}
                                            </Text>
                                            <Text style={[styles.statLabelSmall, { fontSize: 8.5 * scaleFactor, color: theme.textPrimary }]}>
                                                O'YIN
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Subtle Amatora Footer Seal */}
                                    <View style={[styles.cardFooterBrand, { marginTop: 2 * scaleFactor }]}>
                                        <Image
                                            source={require('../assets/logo.png')}
                                            style={{ width: 8.5 * scaleFactor, height: 8.5 * scaleFactor, opacity: 0.5, marginRight: 4 * scaleFactor }}
                                            resizeMode="contain"
                                        />
                                        <Text style={[styles.footerBrandText, { fontSize: 7 * scaleFactor, color: theme.textGold }]}>
                                            AMATORA
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </LinearGradient>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.38,
        shadowRadius: 16,
        backfaceVisibility: 'visible',
    },
    cardInner: {
        width: '100%',
        height: '100%',
        backfaceVisibility: 'visible',
    },
    borderLayer: {
        width: '100%',
        height: '100%',
        padding: 3.5,
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    bodyLayer: {
        width: '100%',
        height: '100%',
        borderTopLeftRadius: 33,
        borderTopRightRadius: 33,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        overflow: 'hidden',
        position: 'relative',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    geometricPattern: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.12,
    },
    geoLine: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 200,
        height: 200,
        borderWidth: 1,
        transform: [{ rotate: '45deg' }],
    },
    geoLine2: {
        position: 'absolute',
        bottom: 20,
        left: -40,
        width: 180,
        height: 180,
        borderWidth: 1,
        transform: [{ rotate: '30deg' }],
    },
    geoCircle: {
        position: 'absolute',
        top: 60,
        left: 40,
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 0.8,
    },
    topHeroRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    topLeftColumn: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
    },
    ovrText: {
        fontWeight: '900',
        letterSpacing: -0.5,
        includeFontPadding: false,
        paddingTop: 2,
    },
    posBadge: {
        borderRadius: 6,
        borderWidth: 0.8,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    posText: {
        fontWeight: '900',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    miniDivider: {
        height: 1.5,
        borderRadius: 1,
        marginVertical: 2,
        opacity: 0.6,
    },
    clubBadgeCircle: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        backgroundColor: 'rgba(0,0,0,0.5)',
        overflow: 'hidden',
    },
    clubLogoImg: {
        overflow: 'hidden',
    },
    photoContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
    },
    photoGlow: {
        position: 'absolute',
        borderRadius: 60,
        opacity: 0.18,
    },
    playerPhoto: {
        borderRadius: 16,
    },
    playerPhotoPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    namePlateWrapper: {
        width: '100%',
        alignItems: 'center',
        zIndex: 10,
    },
    namePlateGradient: {
        width: '94%',
        paddingVertical: 3.5,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
    },
    playerNameText: {
        fontWeight: '900',
        letterSpacing: 0.8,
        textAlign: 'center',
    },
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    separatorLine: {
        flex: 1,
        height: 1,
        opacity: 0.4,
    },
    separatorDiamond: {
        width: 4,
        height: 4,
        transform: [{ rotate: '45deg' }],
        marginHorizontal: 6,
    },
    statsRowThree: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 10,
    },
    bottomInfoSection: {
        width: '100%',
        alignItems: 'center',
        zIndex: 10,
    },
    statColItem: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 44,
    },
    statNumBig: {
        fontWeight: '900',
        includeFontPadding: false,
    },
    statsVerticalDivider: {
        width: 1,
        marginHorizontal: 4,
    },
    statRow: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    statLine: {
        textAlign: 'center',
        includeFontPadding: false,
    },
    statNum: {
        fontWeight: '900',
        includeFontPadding: false,
    },
    statLabel: {
        fontWeight: '800',
        color: '#CBD5E1',
        letterSpacing: 0.5,
        includeFontPadding: false,
    },
    cardFooterBrand: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.5,
        zIndex: 10,
        paddingBottom: 2,
    },
    footerBrandText: {
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    sealContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    sealBadge: {
        borderRadius: 4,
        borderWidth: 0.6,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sealText: {
        fontWeight: '900',
        letterSpacing: 1.5,
    },
});

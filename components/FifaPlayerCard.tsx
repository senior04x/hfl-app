import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    PanResponder,
    Dimensions,
    TouchableOpacity,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import SmartImage from './SmartImage';
import {
    CardRarity,
    CARD_THEMES,
    getCardRarity,
    calculateFifaAttributes,
    FifaAttributes,
    PlayStyle,
    getCardPosition,
    getLocalizedFootballStatLabel,
    getRarityTierLevel,
} from '../utils/playerCardUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FifaPlayerCardProps {
    isLoading?: boolean;
    player: any;
    teamLogo?: string;
    rarity?: CardRarity;
    size?: 'sm' | 'md' | 'lg';
    interactive3D?: boolean;
    showPlayStyles?: boolean;
    showAttributes?: boolean;
    onPress?: () => void;
}

// =============================================================================
// MATEMATIK MAKET (LAYOUT) TIZIMI
// -----------------------------------------------------------------------------
function computeCardLayout(cardW: number, showAttrs: boolean) {
    const sf = cardW / 260;

    const outerRadiusTop = Math.round(18 * sf);
    const outerRadiusBottom = Math.round(18 * sf);
    const borderPad = Math.max(2, Math.round(3 * sf));
    const innerRadiusTop = Math.max(0, outerRadiusTop - borderPad);
    const innerRadiusBottom = Math.max(0, outerRadiusBottom - borderPad);

    const bodyPadH = Math.round(10 * sf);
    const bodyPadTop = Math.round(12 * sf);
    const bodyPadBottom = Math.round(10 * sf);

    const heroRowH = Math.round(130 * sf);
    const leftColW = Math.round(62 * sf);
    const leftColGap = Math.round(3 * sf);
    const photoW = cardW - (borderPad * 2) - (bodyPadH * 2) - leftColW;

    const ovrFont = Math.round(30 * sf);
    const ovrLineH = Math.round(32 * sf);
    const posFont = Math.round(8 * sf);
    const posLineH = Math.round(10 * sf);
    const posBorder = Math.max(1, Math.round(1 * sf));
    const posPadV = Math.max(1, Math.round(1.5 * sf));
    const dividerH = Math.max(1, Math.round(1 * sf));
    const clubBadgeD = Math.round(34 * sf);

    const gapHeroToName = Math.round(4 * sf);
    const namePadV = Math.max(2, Math.round(3 * sf));
    const nameFont = Math.round(13 * sf);
    const nameLineH = Math.round(15 * sf);

    const gapNameToSep = Math.round(3 * sf);
    const sepH = Math.round(6 * sf);
    const gapSepToStats = Math.round(3 * sf);

    const statNumFont = Math.round(15 * sf);
    const statNumLineH = Math.round(17 * sf);
    const statLabelFont = Math.round(8.5 * sf);
    const statLabelLineH = Math.round(10 * sf);
    const gapStatNumToLabel = Math.max(1, Math.round(1 * sf));
    const statColItemH = statNumLineH + gapStatNumToLabel + statLabelLineH;

    const gapStatsToFooter = Math.round(4 * sf);
    const footerH = Math.round(11 * sf);
    const footerLogo = Math.round(9 * sf);
    const footerFont = Math.round(7.5 * sf);

    const namePlateH = nameLineH + (namePadV * 2);

    let bottomInfoH = namePlateH;
    if (showAttrs) {
        bottomInfoH += gapNameToSep + sepH + gapSepToStats + statColItemH + gapStatsToFooter + footerH;
    }

    const cardHeight = (borderPad * 2) + bodyPadTop + heroRowH + gapHeroToName + bottomInfoH + bodyPadBottom;

    return {
        sf,
        cardHeight,
        outerRadiusTop,
        outerRadiusBottom,
        borderPad,
        innerRadiusTop,
        innerRadiusBottom,
        bodyPadH,
        bodyPadTop,
        bodyPadBottom,
        heroRowH,
        leftColW,
        leftColGap,
        photoW,
        ovrFont,
        ovrLineH,
        posFont,
        posLineH,
        posBorder,
        posPadV,
        dividerH,
        clubBadgeD,
        gapHeroToName,
        namePadV,
        nameFont,
        nameLineH,
        gapNameToSep,
        sepH,
        gapSepToStats,
        statNumFont,
        statNumLineH,
        statLabelFont,
        statLabelLineH,
        gapStatNumToLabel,
        statColItemH,
        gapStatsToFooter,
        footerH,
        footerLogo,
        footerFont,
    };
}

/**
 * FifaCardSkeleton — Exact dimensions & chamfered shape with pulse animation
 */
export function FifaCardSkeleton({
    size = 'md',
    showAttributes = true,
}: {
    size?: 'sm' | 'md' | 'lg';
    showAttributes?: boolean;
}) {
    const cardWidth = size === 'sm' ? 175 : size === 'lg' ? Math.min(SCREEN_WIDTH - 48, 330) : 260;
    const L = computeCardLayout(cardWidth, showAttributes);
    const scaleFactor = L.sf;

    const pulseAnim = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.85,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.4,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    return (
        <View
            style={[
                styles.container,
                {
                    width: cardWidth,
                    height: L.cardHeight,
                    shadowColor: '#000000',
                    shadowOpacity: 0.2,
                },
            ]}
        >
            <View style={styles.cardInner}>
                <View
                    style={[
                        styles.borderLayer,
                        {
                            padding: L.borderPad,
                            borderRadius: L.outerRadiusTop,
                            backgroundColor: 'rgba(255,255,255,0.12)',
                        },
                    ]}
                >
                    <Animated.View
                        style={[
                            styles.bodyLayer,
                            {
                                borderRadius: L.innerRadiusTop,
                                paddingHorizontal: L.bodyPadH,
                                paddingTop: L.bodyPadTop,
                                paddingBottom: L.bodyPadBottom,
                                backgroundColor: 'rgba(20,20,25,0.92)',
                                opacity: pulseAnim,
                            },
                        ]}
                    >
                        {/* Top Hero Row */}
                        <View style={[styles.topHeroRow, { height: L.heroRowH }]}>
                            <View style={[styles.topLeftColumn, { width: L.leftColW, gap: L.leftColGap, alignItems: 'center' }]}>
                                <View style={{ width: L.leftColW * 0.75, height: L.ovrLineH, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 6 }} />
                                <View style={{ width: L.leftColW * 0.85, height: 14 * scaleFactor, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 4 }} />
                                <View style={{ width: L.clubBadgeD, height: L.clubBadgeD, borderRadius: L.clubBadgeD / 2, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 4 }} />
                            </View>

                            <View style={[styles.photoContainer, { width: L.photoW, height: L.heroRowH }]}>
                                <View
                                    style={{
                                        width: L.photoW * 0.85,
                                        height: L.heroRowH * 0.88,
                                        borderRadius: 16 * scaleFactor,
                                        backgroundColor: 'rgba(255,255,255,0.12)',
                                    }}
                                />
                            </View>
                        </View>

                        {/* Bottom Container */}
                        <View style={[styles.bottomInfoSection, { marginTop: L.gapHeroToName }]}>
                            <View style={{ width: '80%', height: L.nameLineH + 4, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 6 }} />

                            {showAttributes && (
                                <View style={{ width: '100%', alignItems: 'center' }}>
                                    <View style={[styles.separatorContainer, { height: L.sepH, marginTop: L.gapNameToSep }]}>
                                        <View style={[styles.separatorLine, { backgroundColor: 'rgba(255,255,255,0.15)', height: 1 }]} />
                                    </View>

                                    <View style={[styles.statsRowThree, { paddingHorizontal: L.bodyPadH, marginTop: L.gapSepToStats }]}>
                                        <View style={[styles.statColItem, { gap: 4 }]}>
                                            <View style={{ width: 22 * scaleFactor, height: 16 * scaleFactor, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 4 }} />
                                            <View style={{ width: 28 * scaleFactor, height: 9 * scaleFactor, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3 }} />
                                        </View>
                                        <View style={{ width: 1, height: L.statNumLineH, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                                        <View style={[styles.statColItem, { gap: 4 }]}>
                                            <View style={{ width: 22 * scaleFactor, height: 16 * scaleFactor, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 4 }} />
                                            <View style={{ width: 28 * scaleFactor, height: 9 * scaleFactor, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3 }} />
                                        </View>
                                        <View style={{ width: 1, height: L.statNumLineH, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                                        <View style={[styles.statColItem, { gap: 4 }]}>
                                            <View style={{ width: 22 * scaleFactor, height: 16 * scaleFactor, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 4 }} />
                                            <View style={{ width: 28 * scaleFactor, height: 9 * scaleFactor, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3 }} />
                                        </View>
                                    </View>

                                    <View style={{ width: 60 * scaleFactor, height: 8 * scaleFactor, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: L.gapStatsToFooter }} />
                                </View>
                            )}
                        </View>
                    </Animated.View>
                </View>
            </View>
        </View>
    );
}

export default function FifaPlayerCard({
    isLoading = false,
    player,
    teamLogo: customTeamLogo,
    rarity: customRarity,
    size = 'md',
    interactive3D = false,
    showPlayStyles = false,
    showAttributes = true,
    onPress,
}: FifaPlayerCardProps) {
    if (isLoading || !player) {
        return <FifaCardSkeleton size={size} showAttributes={showAttributes} />;
    }

    const { i18n } = useTranslation();
    const currentLang = i18n.language || 'uz';

    const rarity: CardRarity = customRarity || getCardRarity(player);
    const theme = CARD_THEMES[rarity] || CARD_THEMES.gold;
    const attrs: FifaAttributes = calculateFifaAttributes(player);
    const cardPosition = getCardPosition(player?.position || player?.positionUz, currentLang);
    const labelGoals = getLocalizedFootballStatLabel('goals', currentLang);
    const labelAssists = getLocalizedFootballStatLabel('assists', currentLang);
    const labelMatches = getLocalizedFootballStatLabel('matches', currentLang);

    // Reyting balandligiga qarab "qimmatbaho" darajasi (0 = past, 6 = eng yuqori)
    const tierLevel = getRarityTierLevel(rarity);

    const goalsCount = player?.stats?.goals ?? player?.goals ?? 0;
    const assistsCount = player?.stats?.assists ?? player?.assists ?? 0;
    const matchesCount = player?.stats?.matchesPlayed ?? player?.stats?.matches ?? player?.matchesPlayed ?? 0;

    const cardWidth = size === 'sm' ? 175 : size === 'lg' ? Math.min(SCREEN_WIDTH - 48, 330) : 260;
    const L = computeCardLayout(cardWidth, showAttributes);
    const cardHeight = L.cardHeight;
    const scaleFactor = L.sf;

    // 3D Parallax & Tilt animations
    const tiltX = useRef(new Animated.Value(0)).current;
    const tiltY = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const isTouchingRef = useRef(false);

    useEffect(() => {
        if (!interactive3D) return;

        Accelerometer.setUpdateInterval(40);
        const subscription = Accelerometer.addListener(({ x, y }) => {
            if (isTouchingRef.current) return;
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

        return () => subscription.remove();
    }, [interactive3D]);

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
                const maxTilt = 14;
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
                        friction: 6,
                        tension: 50,
                        useNativeDriver: true,
                    }),
                    Animated.spring(tiltY, {
                        toValue: 0,
                        friction: 6,
                        tension: 50,
                        useNativeDriver: true,
                    }),
                    Animated.spring(scaleAnim, {
                        toValue: 1,
                        friction: 6,
                        tension: 50,
                        useNativeDriver: true,
                    }),
                ]).start();
            },
        })
    ).current;

    const rotateX = tiltX.interpolate({
        inputRange: [-30, 30],
        outputRange: ['-30deg', '30deg'],
    });

    const rotateY = tiltY.interpolate({
        inputRange: [-30, 30],
        outputRange: ['-30deg', '30deg'],
    });

    const playerName = player?.name || player?.full_name || (player?.first_name ? `${player.first_name} ${player.last_name || ''}` : 'AMATORA');
    const cleanName = playerName.trim().toUpperCase();
    const isVeryLong = cleanName.length > 20;
    const isLong = cleanName.length > 14;
    const dynamicNameFont = isVeryLong
        ? L.nameFont * 0.72
        : isLong
        ? L.nameFont * 0.84
        : L.nameFont;
    const dynamicNameLineH = isVeryLong
        ? L.nameLineH * 0.82
        : isLong
        ? L.nameLineH * 0.9
        : L.nameLineH;

    const avatarUri = player?.avatar || player?.photo || player?.photo_url || player?.image_url;
    const teamLogo = customTeamLogo ||
        player?.team_logo ||
        player?.teamLogo ||
        player?.teams?.logo_url ||
        player?.teams?.logo ||
        player?.team?.logo_url ||
        player?.team?.logo ||
        player?.team_logo_url ||
        player?.teamLogoUrl;

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
                    shadowOpacity: 0.26 + tierLevel * 0.045,
                    shadowRadius: 10 + tierLevel * 3.2,
                    elevation: 6 + tierLevel * 2,
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
                    style={[
                        styles.borderLayer,
                        {
                            padding: L.borderPad,
                            borderTopLeftRadius: L.outerRadiusTop,
                            borderTopRightRadius: L.outerRadiusTop,
                            borderBottomLeftRadius: L.outerRadiusBottom,
                            borderBottomRightRadius: L.outerRadiusBottom,
                        },
                    ]}
                >
                    {/* Card Body Background */}
                    <LinearGradient
                        colors={theme.cardBg as [string, string, ...string[]]}
                        start={{ x: 0.1, y: 0 }}
                        end={{ x: 0.9, y: 1 }}
                        style={[
                            styles.bodyLayer,
                            {
                                borderTopLeftRadius: L.innerRadiusTop,
                                borderTopRightRadius: L.innerRadiusTop,
                                borderBottomLeftRadius: L.innerRadiusBottom,
                                borderBottomRightRadius: L.innerRadiusBottom,
                                paddingHorizontal: L.bodyPadH,
                                paddingTop: L.bodyPadTop,
                                paddingBottom: L.bodyPadBottom,
                            },
                        ]}
                    >
                        {/* Background Geometric Facets */}
                        <View style={styles.geometricPattern}>
                            <View style={[styles.geoLine, { borderColor: theme.accentGlow, width: 200 * scaleFactor, height: 200 * scaleFactor, top: -30 * scaleFactor, right: -30 * scaleFactor }]} />
                            <View style={[styles.geoLine2, { borderColor: theme.accentGlow, width: 180 * scaleFactor, height: 180 * scaleFactor, bottom: 20 * scaleFactor, left: -40 * scaleFactor }]} />
                            <View style={[styles.geoCircle, { borderColor: theme.accentGlow, width: 140 * scaleFactor, height: 140 * scaleFactor, borderRadius: 70 * scaleFactor, top: 60 * scaleFactor, left: 40 * scaleFactor }]} />
                        </View>

                        {/* Top Hero Row (Left Stats Column + Right Photo Cutout) */}
                        <View style={[styles.topHeroRow, { height: L.heroRowH }]}>
                            {/* Left Column (OVR, Full Position, Circular Club Badge) */}
                            <View style={[styles.topLeftColumn, { width: L.leftColW, gap: L.leftColGap }]}>
                                <Text
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    style={[
                                        styles.ovrText,
                                        {
                                            fontSize: L.ovrFont,
                                            lineHeight: L.ovrLineH,
                                            color: theme.ratingColor,
                                            textShadowColor: theme.accentGlow,
                                        },
                                    ]}
                                >
                                    {displayRating}
                                </Text>

                                {/* Full Localized Position Pill */}
                                <View style={[styles.posBadge, { borderColor: theme.accentGlow, borderWidth: L.posBorder, paddingVertical: L.posPadV }]}>
                                    <Text
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        style={[
                                            styles.posText,
                                            {
                                                fontSize: L.posFont,
                                                lineHeight: L.posLineH,
                                                color: theme.textGold,
                                            },
                                        ]}
                                    >
                                        {cardPosition}
                                    </Text>
                                </View>

                                {/* Divider Line */}
                                <View style={[styles.miniDivider, { backgroundColor: theme.accentGlow, height: L.dividerH, width: L.leftColW * 0.7 }]} />

                                {/* PERFECT CIRCULAR Club Crest Badge */}
                                <View
                                    style={[
                                        styles.clubBadgeCircle,
                                        {
                                            width: L.clubBadgeD,
                                            height: L.clubBadgeD,
                                            borderRadius: L.clubBadgeD / 2,
                                            borderColor: theme.accentGlow,
                                            borderWidth: Math.max(1, 1.5 * scaleFactor),
                                        },
                                    ]}
                                >
                                    {teamLogo ? (
                                        <SmartImage
                                            uri={teamLogo}
                                            style={{
                                                width: L.clubBadgeD - 4 * scaleFactor,
                                                height: L.clubBadgeD - 4 * scaleFactor,
                                                borderRadius: (L.clubBadgeD - 4 * scaleFactor) / 2,
                                            }}
                                            contentFit="contain"
                                            priority="high"
                                            fallbackIcon="shield-outline"
                                        />
                                    ) : (
                                        <Ionicons name="shield-outline" size={L.clubBadgeD * 0.5} color={theme.textGold} />
                                    )}
                                </View>
                            </View>

                            {/* Player Photo Cutout with Ambient Glow */}
                            <View style={[styles.photoContainer, { width: L.photoW, height: L.heroRowH }]}>
                                <View
                                    style={[
                                        styles.photoGlow,
                                        {
                                            backgroundColor: theme.accentGlow,
                                            width: L.heroRowH * 0.82,
                                            height: L.heroRowH * 0.82,
                                            borderRadius: L.heroRowH * 0.41,
                                        },
                                    ]}
                                />
                                {avatarUri ? (
                                    <SmartImage
                                        uri={avatarUri}
                                        style={[
                                            styles.playerPhoto,
                                            {
                                                width: '100%',
                                                height: '100%',
                                                borderRadius: 16 * scaleFactor,
                                            },
                                        ]}
                                        contentFit="contain"
                                    />
                                ) : (
                                    <View
                                        style={[
                                            styles.playerPhotoPlaceholder,
                                            {
                                                width: L.photoW * 0.86,
                                                height: L.heroRowH * 0.86,
                                            },
                                        ]}
                                    >
                                        <FontAwesome5 name="user-alt" size={L.heroRowH * 0.32} color="rgba(255,255,255,0.3)" />
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Bottom Container: Player Name Plaque + Real Football Stats + Amatora Seal */}
                        <View style={[styles.bottomInfoSection, { marginTop: L.gapHeroToName }]}>
                            {/* Player Name Plaque */}
                            <View style={styles.namePlateWrapper}>
                                <LinearGradient
                                    colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.0)']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.namePlateGradient, { paddingVertical: L.namePadV }]}
                                >
                                    <Text
                                        numberOfLines={2}
                                        adjustsFontSizeToFit={true}
                                        minimumFontScale={0.65}
                                        style={[
                                            styles.playerNameText,
                                            {
                                                fontSize: dynamicNameFont,
                                                lineHeight: dynamicNameLineH,
                                                color: theme.textPrimary,
                                                width: '100%',
                                            },
                                        ]}
                                    >
                                        {cleanName}
                                    </Text>
                                </LinearGradient>
                            </View>

                            {/* Real Football Stats (GOL, ASIST, O'YIN) */}
                            {showAttributes && (
                                <View style={{ width: '100%' }}>
                                    <View style={[styles.separatorContainer, { height: L.sepH, marginTop: L.gapNameToSep }]}>
                                        <View style={[styles.separatorLine, { backgroundColor: theme.accentGlow, height: Math.max(1, scaleFactor) }]} />
                                        <View style={[styles.separatorDiamond, { backgroundColor: theme.textGold, width: L.sepH * 0.55, height: L.sepH * 0.55, marginHorizontal: 6 * scaleFactor }]} />
                                        <View style={[styles.separatorLine, { backgroundColor: theme.accentGlow, height: Math.max(1, scaleFactor) }]} />
                                    </View>

                                    <View style={[styles.statsRowThree, { paddingHorizontal: L.bodyPadH, marginTop: L.gapSepToStats }]}>
                                        <View style={[styles.statColItem, { gap: L.gapStatNumToLabel }]}>
                                            <Text style={[styles.statNumBig, { fontSize: L.statNumFont, lineHeight: L.statNumLineH, color: theme.textGold }]}>
                                                {goalsCount}
                                            </Text>
                                            <Text style={[styles.statLabelSmall, { fontSize: L.statLabelFont, lineHeight: L.statLabelLineH, color: theme.textPrimary }]}>
                                                {labelGoals}
                                            </Text>
                                        </View>

                                        <View style={[styles.statsVerticalDivider, { height: L.statNumLineH, backgroundColor: 'rgba(255,255,255,0.2)', width: Math.max(1, scaleFactor) }]} />

                                        <View style={[styles.statColItem, { gap: L.gapStatNumToLabel }]}>
                                            <Text style={[styles.statNumBig, { fontSize: L.statNumFont, lineHeight: L.statNumLineH, color: theme.textGold }]}>
                                                {assistsCount}
                                            </Text>
                                            <Text style={[styles.statLabelSmall, { fontSize: L.statLabelFont, lineHeight: L.statLabelLineH, color: theme.textPrimary }]}>
                                                {labelAssists}
                                            </Text>
                                        </View>

                                        <View style={[styles.statsVerticalDivider, { height: L.statNumLineH, backgroundColor: 'rgba(255,255,255,0.2)', width: Math.max(1, scaleFactor) }]} />

                                        <View style={[styles.statColItem, { gap: L.gapStatNumToLabel }]}>
                                            <Text style={[styles.statNumBig, { fontSize: L.statNumFont, lineHeight: L.statNumLineH, color: theme.textGold }]}>
                                                {matchesCount}
                                            </Text>
                                            <Text style={[styles.statLabelSmall, { fontSize: L.statLabelFont, lineHeight: L.statLabelLineH, color: theme.textPrimary }]}>
                                                {labelMatches}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Subtle Amatora Footer Seal */}
                                    <View style={[styles.cardFooterBrand, { marginTop: L.gapStatsToFooter, height: L.footerH }]}>
                                        <Image
                                            source={require('../assets/logo.png')}
                                            style={{ width: L.footerLogo, height: L.footerLogo, opacity: 0.5, marginRight: 4 * scaleFactor }}
                                            resizeMode="contain"
                                        />
                                        <Text style={[styles.footerBrandText, { fontSize: L.footerFont, lineHeight: L.footerH, color: theme.textGold }]}>
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
    },
    bodyLayer: {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        alignItems: 'center',
    },
    geometricPattern: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.12,
    },
    geoLine: {
        position: 'absolute',
        borderWidth: 1,
        transform: [{ rotate: '45deg' }],
    },
    geoLine2: {
        position: 'absolute',
        borderWidth: 1,
        transform: [{ rotate: '30deg' }],
    },
    geoCircle: {
        position: 'absolute',
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
    },
    ovrText: {
        fontWeight: '900',
        letterSpacing: -0.5,
        includeFontPadding: false,
        textAlign: 'center',
    },
    posBadge: {
        borderRadius: 6,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingHorizontal: 4,
    },
    posText: {
        fontWeight: '900',
        letterSpacing: 0.5,
        textAlign: 'center',
        includeFontPadding: false,
    },
    miniDivider: {
        borderRadius: 1,
        opacity: 0.6,
    },
    clubBadgeCircle: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        overflow: 'hidden',
    },
    photoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
    },
    photoGlow: {
        position: 'absolute',
        opacity: 0.18,
    },
    playerPhoto: {},
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
        width: '98%',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        paddingHorizontal: 4,
    },
    playerNameText: {
        fontWeight: '900',
        letterSpacing: 0.4,
        textAlign: 'center',
        includeFontPadding: false,
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
        opacity: 0.4,
    },
    separatorDiamond: {
        transform: [{ rotate: '45deg' }],
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
    },
    statNumBig: {
        fontWeight: '900',
        includeFontPadding: false,
        textAlign: 'center',
    },
    statsVerticalDivider: {
        marginHorizontal: 4,
    },
    statLabelSmall: {
        fontWeight: '800',
        letterSpacing: 0.5,
        includeFontPadding: false,
        textAlign: 'center',
    },
    cardFooterBrand: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.5,
        zIndex: 10,
    },
    footerBrandText: {
        fontWeight: '900',
        letterSpacing: 1.5,
        includeFontPadding: false,
    },
});

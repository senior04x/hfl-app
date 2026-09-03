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

// =============================================================================
// MATEMATIK MAKET (LAYOUT) TIZIMI
// -----------------------------------------------------------------------------
// Kartaning balandligi endi "cardWidth * 1.18" kabi taxminiy (heuristik)
// ko'paytiruvchi EMAS — u pastdagi BASE konstantalarning ANIQ YIG'INDISI
// orqali hisoblanadi. Har bir bo'sh joy (gap), padding, matn balandligi
// (lineHeight) alohida belgilangan va bir marta shu yerda yig'iladi, so'ng
// kartaHeight xuddi shu yig'indidan olinadi — shuning uchun tarkib bilan
// konteyner o'lchami har doim BIR XIL manbadan kelib chiqadi: hech qachon
// ortiqcha bo'sh joy qolmaydi va hech qachon tarkib konteynerga sig'may
// qolib, "overflow:hidden" tomonidan kesib tashlanmaydi.
//
// Barcha qiymatlar REF_WIDTH=260 uchun asosiy (BASE) o'lchov — boshqa
// o'lchamlarda (`sm`/`lg`) hammasi BITTA scaleFactor bilan bir xilda
// kattalashadi/kichraytiriladi, ya'ni karta xuddi bir xil fotosuratning
// kattalashtirilgan nusxasidek ishlaydi — proporsiyalar hech qachon
// buzilmaydi.
// =============================================================================

const REF_WIDTH = 260;

const BASE = {
    // Tashqi metall ramka va korpus paddingi
    borderPad: 4,
    bodyPadH: 13,
    bodyPadTop: 14,
    bodyPadBottom: 10,

    // Yuqori qator: chap statistika ustuni + o'ng foto hudud
    leftColW: 76,
    heroRowH: 168,

    // Chap ustun ichki tarkibi (heroRowH ichida vertikal markazlashtiriladi)
    ovrFont: 32,
    ovrLineH: 36,
    posFont: 9.5,
    posLineH: 12,
    posPadV: 2,
    posBorder: 0.8,
    leftColGap: 4,
    dividerH: 2,
    clubBadgeD: 30,

    // Ism plitasi
    gapHeroToName: 6,
    namePadV: 5,
    nameFont: 14,
    nameLineH: 17,

    // Ajratuvchi chiziq
    gapNameToSep: 7,
    sepH: 8,

    // Statistika qatori (GOL / ASSIST / O'YIN)
    gapSepToStats: 7,
    statNumFont: 16,
    statNumLineH: 20,
    gapStatNumToLabel: 3,
    statLabelFont: 8.5,
    statLabelLineH: 11,

    // Pastki AMATORA muhri
    gapStatsToFooter: 7,
    footerH: 12,
    footerLogo: 10,
    footerFont: 7.5,

    // Burchak radiuslari
    outerRadiusTop: 36,
    outerRadiusBottom: 28,
    innerRadiusTop: 33,
    innerRadiusBottom: 25,
} as const;

function computeCardLayout(cardWidth: number, showAttributes: boolean) {
    const sf = cardWidth / REF_WIDTH;
    const s = (v: number) => v * sf;

    // Pastki blokning ANIQ balandligi — statistika ko'rsatilsa yoki
    // ko'rsatilmasa, ikkala holatda ham haqiqiy tarkibdan hisoblanadi.
    const bottomBlockBase = showAttributes
        ? BASE.gapHeroToName +
          (BASE.namePadV * 2 + BASE.nameLineH) +
          BASE.gapNameToSep +
          BASE.sepH +
          BASE.gapSepToStats +
          (BASE.statNumLineH + BASE.gapStatNumToLabel + BASE.statLabelLineH) +
          BASE.gapStatsToFooter +
          BASE.footerH
        : BASE.gapHeroToName + (BASE.namePadV * 2 + BASE.nameLineH);

    const totalBase =
        BASE.borderPad * 2 + BASE.bodyPadTop + BASE.bodyPadBottom + BASE.heroRowH + bottomBlockBase;

    const leftColW = s(BASE.leftColW);
    const heroRowH = s(BASE.heroRowH);
    const bodyPadH = s(BASE.bodyPadH);
    const borderPad = s(BASE.borderPad);

    return {
        sf,
        cardHeight: Math.round(s(totalBase)),

        borderPad,
        bodyPadH,
        bodyPadTop: s(BASE.bodyPadTop),
        bodyPadBottom: s(BASE.bodyPadBottom),

        leftColW,
        heroRowH,
        // Foto hudud kengligi — qolgan barcha joy shu yerga aniq (formula
        // bilan) beriladi, taxmin qilinmaydi: hech qachon sig'may qolmaydi.
        photoW: Math.max(0, cardWidth - borderPad * 2 - bodyPadH * 2 - leftColW),

        ovrFont: s(BASE.ovrFont),
        ovrLineH: s(BASE.ovrLineH),
        posFont: s(BASE.posFont),
        posLineH: s(BASE.posLineH),
        posPadV: s(BASE.posPadV),
        posBorder: Math.max(0.6, s(BASE.posBorder)),
        leftColGap: s(BASE.leftColGap),
        dividerH: Math.max(1, s(BASE.dividerH)),
        clubBadgeD: s(BASE.clubBadgeD),

        gapHeroToName: s(BASE.gapHeroToName),
        namePadV: s(BASE.namePadV),
        nameFont: s(BASE.nameFont),
        nameLineH: s(BASE.nameLineH),

        gapNameToSep: s(BASE.gapNameToSep),
        sepH: s(BASE.sepH),

        gapSepToStats: s(BASE.gapSepToStats),
        statNumFont: s(BASE.statNumFont),
        statNumLineH: s(BASE.statNumLineH),
        gapStatNumToLabel: s(BASE.gapStatNumToLabel),
        statLabelFont: s(BASE.statLabelFont),
        statLabelLineH: s(BASE.statLabelLineH),

        gapStatsToFooter: s(BASE.gapStatsToFooter),
        footerH: s(BASE.footerH),
        footerLogo: s(BASE.footerLogo),
        footerFont: s(BASE.footerFont),

        outerRadiusTop: s(BASE.outerRadiusTop),
        outerRadiusBottom: s(BASE.outerRadiusBottom),
        innerRadiusTop: s(BASE.innerRadiusTop),
        innerRadiusBottom: s(BASE.innerRadiusBottom),
    };
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

    // Karta kengligi (o'zgarmadi) + shu kenglikdan MATEMATIK yo'l bilan
    // olingan to'liq maket — balandlik shu maketning o'zidan keladi, shuning
    // uchun tarkib va konteyner o'lchami hech qachon bir-biridan ajralmaydi.
    const cardWidth = size === 'sm' ? 175 : size === 'lg' ? Math.min(SCREEN_WIDTH - 48, 330) : 260;
    const L = computeCardLayout(cardWidth, showAttributes);
    const cardHeight = L.cardHeight;
    const scaleFactor = L.sf;

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

                        {/* Top Hero Row (Left Stats Column + Right Photo Cutout) — ANIQ balandlik: L.heroRowH */}
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
                                        <Image
                                            source={{ uri: teamLogo }}
                                            style={{
                                                width: L.clubBadgeD - 4 * scaleFactor,
                                                height: L.clubBadgeD - 4 * scaleFactor,
                                                borderRadius: (L.clubBadgeD - 4 * scaleFactor) / 2,
                                            }}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <Ionicons name="shield-outline" size={L.clubBadgeD * 0.5} color={theme.textGold} />
                                    )}
                                </View>
                            </View>

                            {/* Player Photo Cutout with Ambient Glow — hudud L.photoW x L.heroRowH ga ANIQ mos */}
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
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                        style={[
                                            styles.playerNameText,
                                            {
                                                fontSize: L.nameFont,
                                                lineHeight: L.nameLineH,
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
                                                GOL
                                            </Text>
                                        </View>

                                        <View style={[styles.statsVerticalDivider, { height: L.statNumLineH, backgroundColor: 'rgba(255,255,255,0.2)', width: Math.max(1, scaleFactor) }]} />

                                        <View style={[styles.statColItem, { gap: L.gapStatNumToLabel }]}>
                                            <Text style={[styles.statNumBig, { fontSize: L.statNumFont, lineHeight: L.statNumLineH, color: theme.textGold }]}>
                                                {assistsCount}
                                            </Text>
                                            <Text style={[styles.statLabelSmall, { fontSize: L.statLabelFont, lineHeight: L.statLabelLineH, color: theme.textPrimary }]}>
                                                ASIST
                                            </Text>
                                        </View>

                                        <View style={[styles.statsVerticalDivider, { height: L.statNumLineH, backgroundColor: 'rgba(255,255,255,0.2)', width: Math.max(1, scaleFactor) }]} />

                                        <View style={[styles.statColItem, { gap: L.gapStatNumToLabel }]}>
                                            <Text style={[styles.statNumBig, { fontSize: L.statNumFont, lineHeight: L.statNumLineH, color: theme.textGold }]}>
                                                {matchesCount}
                                            </Text>
                                            <Text style={[styles.statLabelSmall, { fontSize: L.statLabelFont, lineHeight: L.statLabelLineH, color: theme.textPrimary }]}>
                                                O'YIN
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
        width: '94%',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
    },
    playerNameText: {
        fontWeight: '900',
        letterSpacing: 0.8,
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

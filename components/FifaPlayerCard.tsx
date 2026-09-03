import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Easing,
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
import { useThemeStore } from '../store/useThemeStore';
import SmartImage from './SmartImage';
import {
    calculateFifaAttributes,
    getCardRarity,
    getLocalizedStatLabel,
    getCardPosition,
    getLocalizedFootballStatLabel,
    getRarityTierLevel,
    CARD_THEMES,
    CardRarity,
    FifaAttributes,
} from '../utils/playerCardUtils';

// =============================================================================
// REYTINGGA QARAB "QIMMATBAHO" DARAJASI (PREMIUM ESCALATION)
// -----------------------------------------------------------------------------
// tierLevel 0 (unrated) dan 6 (icon) gacha oshgani sari: soya (shadow) chuqur-
// lashadi, foliya charaqlashi (foilOverlay) kuchayadi, eng yuqori 2 daraja
// uchun harakatlanuvchi yaltiroq chiziq (shimmer sweep) qo'shiladi va karta
// burchagida daraja nishoni (rarity badge) chiqadi. Bularning barchasi FAQAT
// dekorativ, absolute-positioned qatlamlar — yuqoridagi BASE/computeCardLayout
// matematik maketiga HECH QANDAY ta'sir qilmaydi.
// =============================================================================
const RARITY_BADGE_ICON: Record<number, string> = {
    1: 'ellipse-outline', // bronze
    2: 'medal-outline',   // silver
    3: 'medal',           // gold
    4: 'flash',           // amatora_elite
    5: 'sparkles',        // holographic
    6: 'diamond',         // icon
};

// =============================================================================
// DARAJAGA XOS "SHIDDATLI" FON UslUBLARI (referens rasm asosida)
// -----------------------------------------------------------------------------
// Bronza/Kumush/Tilla -> teatrdagidek YUQORIDAN TUSHUVCHI SPOTLIGHT nuri.
// Amatora Elite       -> OLMOS QIRRALARI (faceted crystal) yorug'lik chiziqlari.
// Holographic         -> harakatlanuvchi PRIZMA (radug'a) chizig'i.
// Icon (Mythic)        -> chuqur KOSMIK fon + yulduzli osmon + afsonaviy nur.
// Yulduzlar foizli (%) koordinatada — karta o'lchami qanday bo'lmasin avtomatik
// moslashadi, BASE matematik maketiga hech qanday ta'sir qilmaydi.
// =============================================================================
const STAR_POSITIONS: { left: string; top: string; size: number; opacity: number }[] = [
    { left: '10%', top: '8%', size: 2.2, opacity: 0.9 },
    { left: '24%', top: '18%', size: 1.3, opacity: 0.55 },
    { left: '36%', top: '6%', size: 1.8, opacity: 0.75 },
    { left: '50%', top: '14%', size: 1.1, opacity: 0.45 },
    { left: '7%', top: '28%', size: 1.6, opacity: 0.65 },
    { left: '19%', top: '40%', size: 1.0, opacity: 0.4 },
    { left: '31%', top: '50%', size: 2.0, opacity: 0.8 },
    { left: '6%', top: '58%', size: 1.2, opacity: 0.5 },
    { left: '42%', top: '63%', size: 1.4, opacity: 0.55 },
    { left: '16%', top: '74%', size: 1.1, opacity: 0.45 },
    { left: '29%', top: '84%', size: 1.7, opacity: 0.7 },
    { left: '4%', top: '90%', size: 1.2, opacity: 0.45 },
    { left: '38%', top: '92%', size: 1.5, opacity: 0.55 },
    { left: '47%', top: '35%', size: 1.0, opacity: 0.35 },
];

const CRYSTAL_FACETS: { rotate: string; top: string; left: string; weight: number }[] = [
    { rotate: '22deg', top: '4%', left: '-10%', weight: 1.4 },
    { rotate: '-16deg', top: '46%', left: '58%', weight: 1.1 },
    { rotate: '34deg', top: '72%', left: '-6%', weight: 1.2 },
];

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


export function FifaCardSkeleton({
    size = 'md',
    showAttributes = true,
}: {
    size?: 'sm' | 'md' | 'lg';
    showAttributes?: boolean;
}) {
    const isDark = useThemeStore((state) => state.isDark);
    const cardWidth = size === 'sm' ? 175 : size === 'lg' ? Math.min(SCREEN_WIDTH - 48, 330) : 260;
    const L = computeCardLayout(cardWidth, showAttributes);
    const scaleFactor = L.sf;

    const pulseAnim = useRef(new Animated.Value(0.35)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.8,
                    duration: 750,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.35,
                    duration: 750,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const blockBg = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.09)';
    const cardBgColors = isDark
        ? ['#111827', '#1E293B', '#0F172A', '#0B0F19']
        : ['#FFFFFF', '#F8FAFC', '#F1F5F9', '#E2E8F0'];
    const borderColors = isDark
        ? ['rgba(255, 255, 255, 0.22)', 'rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.05)']
        : ['rgba(0, 0, 0, 0.14)', 'rgba(0, 0, 0, 0.05)', 'rgba(0, 0, 0, 0.10)', 'rgba(0, 0, 0, 0.03)'];

    return (
        <View
            style={[
                styles.container,
                {
                    width: cardWidth,
                    height: L.cardHeight,
                    shadowColor: isDark ? '#000000' : '#64748B',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: isDark ? 0.35 : 0.12,
                    shadowRadius: 12,
                    elevation: 6,
                },
            ]}
        >
            <View style={styles.cardInner}>
                {/* 3D Chamfered Outer Border Gradient */}
                <LinearGradient
                    colors={borderColors as [string, string, ...string[]]}
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
                        colors={cardBgColors as [string, string, ...string[]]}
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
                        {/* Top Hero Row */}
                        <View style={[styles.topHeroRow, { height: L.heroRowH }]}>
                            {/* Left Column Placeholders */}
                            <View style={[styles.topLeftColumn, { width: L.leftColW, gap: L.leftColGap, alignItems: 'center' }]}>
                                {/* Rating placeholder */}
                                <Animated.View
                                    style={{
                                        width: L.leftColW * 0.85,
                                        height: L.ovrLineH * 0.88,
                                        borderRadius: 6 * scaleFactor,
                                        backgroundColor: blockBg,
                                        opacity: pulseAnim,
                                    }}
                                />
                                {/* Pos badge placeholder */}
                                <Animated.View
                                    style={{
                                        width: L.leftColW * 0.92,
                                        height: L.posFont * 1.4,
                                        borderRadius: 4 * scaleFactor,
                                        backgroundColor: blockBg,
                                        opacity: pulseAnim,
                                    }}
                                />
                                {/* Club badge placeholder */}
                                <Animated.View
                                    style={{
                                        width: L.clubBadgeD,
                                        height: L.clubBadgeD,
                                        borderRadius: L.clubBadgeD / 2,
                                        backgroundColor: blockBg,
                                        opacity: pulseAnim,
                                    }}
                                />
                            </View>

                            {/* Right Photo Cutout Placeholder */}
                            <View style={[styles.photoContainer, { width: L.photoW, height: L.heroRowH, alignItems: 'center', justifyContent: 'center' }]}>
                                <Animated.View
                                    style={{
                                        width: L.photoW * 0.88,
                                        height: L.heroRowH * 0.88,
                                        borderRadius: 16 * scaleFactor,
                                        backgroundColor: blockBg,
                                        opacity: pulseAnim,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <FontAwesome5
                                        name="user-alt"
                                        size={L.heroRowH * 0.28}
                                        color={isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.12)'}
                                    />
                                </Animated.View>
                            </View>
                        </View>

                        {/* Bottom Container: Player Name + Real Football Stats */}
                        <View style={[styles.bottomInfoSection, { marginTop: L.gapHeroToName }]}>
                            {/* Name Plaque Placeholder */}
                            <Animated.View
                                style={{
                                    width: '75%',
                                    height: L.nameLineH * 0.9,
                                    borderRadius: 6 * scaleFactor,
                                    backgroundColor: blockBg,
                                    opacity: pulseAnim,
                                }}
                            />

                            {/* Stats */}
                            {showAttributes && (
                                <View style={{ width: '100%', marginTop: L.gapNameToSep }}>
                                    <View style={[styles.separatorContainer, { height: L.sepH }]}>
                                        <View style={[styles.separatorLine, { backgroundColor: blockBg, height: Math.max(1, scaleFactor) }]} />
                                    </View>

                                    <View style={[styles.statsRowThree, { paddingHorizontal: L.bodyPadH, marginTop: L.gapSepToStats }]}>
                                        {[1, 2, 3].map((item, idx) => (
                                            <React.Fragment key={item}>
                                                <View style={[styles.statColItem, { gap: L.gapStatNumToLabel }]}>
                                                    <Animated.View
                                                        style={{
                                                            width: 28 * scaleFactor,
                                                            height: L.statNumLineH * 0.85,
                                                            borderRadius: 4 * scaleFactor,
                                                            backgroundColor: blockBg,
                                                            opacity: pulseAnim,
                                                        }}
                                                    />
                                                    <Animated.View
                                                        style={{
                                                            width: 24 * scaleFactor,
                                                            height: L.statLabelFont * 0.8,
                                                            borderRadius: 3 * scaleFactor,
                                                            backgroundColor: blockBg,
                                                            opacity: pulseAnim,
                                                        }}
                                                    />
                                                </View>
                                                {idx < 2 && (
                                                    <View
                                                        style={[
                                                            styles.statsVerticalDivider,
                                                            {
                                                                height: L.statNumLineH,
                                                                backgroundColor: blockBg,
                                                                width: Math.max(1, scaleFactor),
                                                            },
                                                        ]}
                                                    />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </View>

                                    {/* Footer Brand Placeholder */}
                                    <View style={[styles.cardFooterBrand, { marginTop: L.gapStatsToFooter, height: L.footerH }]}>
                                        <Animated.View
                                            style={{
                                                width: 50 * scaleFactor,
                                                height: L.footerH * 0.65,
                                                borderRadius: 3 * scaleFactor,
                                                backgroundColor: blockBg,
                                                opacity: pulseAnim,
                                            }}
                                        />
                                    </View>
                                </View>
                            )}
                        </View>
                    </LinearGradient>
                </LinearGradient>
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

    // Karta kengligi (o'zgarmadi) + shu kenglikdan MATEMATIK yo'l bilan
    // olingan to'liq maket — balandlik shu maketning o'zidan keladi, shuning
    // uchun tarkib va konteyner o'lchami hech qachon bir-biridan ajralmaydi.
    const cardWidth = size === 'sm' ? 175 : size === 'lg' ? Math.min(SCREEN_WIDTH - 48, 330) : 260;
    const L = computeCardLayout(cardWidth, showAttributes);
    const cardHeight = L.cardHeight;
    const scaleFactor = L.sf;

    // Daraja (rarity) asosida qaysi "shiddatli" fon uslubi ishlatilishi
    const backdropStyle: 'spotlight' | 'crystal' | 'prism' | 'cosmic' =
        rarity === 'icon' ? 'cosmic'
        : rarity === 'holographic' ? 'prism'
        : rarity === 'amatora_elite' ? 'crystal'
        : 'spotlight';
    const hasDramaShimmer = backdropStyle === 'prism' || backdropStyle === 'cosmic';

    // 3D Parallax & Tilt animations
    const tiltX = useRef(new Animated.Value(0)).current;
    const tiltY = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const isTouchingRef = useRef(false);

    // Prizma/Kosmik daraja uchun harakatlanuvchi nur chizig'i (faqat eng
    // yuqori 2 daraja — "shiddatli" taassurotni kuchaytiradi).
    const dramaShimmerAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!hasDramaShimmer) return;
        dramaShimmerAnim.setValue(0);
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(dramaShimmerAnim, {
                    toValue: 1,
                    duration: 2200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.delay(1400),
                Animated.timing(dramaShimmerAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => {
            try {
                loop.stop();
            } catch (e) {}
        };
    }, [hasDramaShimmer]);

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

    const cleanName = playerName.trim().toUpperCase();
    const nameLen = cleanName.length;
    const isVeryLong = nameLen > 20;
    const isLong = nameLen > 14;

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

    // Minimalist "glow mesh" foni uchun ikkinchi (aksent bilan bir juft
    // ishlaydigan) rang — borderGradient'ning o'rta bo'g'inidan olinadi,
    // shu bilan har bir tier o'zining ikki rangli, mos aurora fonini oladi.
    const secondaryGlow = (theme.borderGradient && theme.borderGradient.length > 2
        ? theme.borderGradient[Math.floor(theme.borderGradient.length / 2)]
        : theme.accentGlow) as string;
    const glassBorderColor = theme.isLightCard ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.10)';

    const dramaShimmerTranslate = dramaShimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-cardWidth * 1.1, cardWidth * 1.6],
    });

    return (
        <Animated.View
            {...(interactive3D ? panResponder.panHandlers : {})}
            style={[
                styles.container,
                {
                    width: cardWidth,
                    height: cardHeight,
                    shadowColor: theme.shadowColor,
                    // Reyting darajasi oshgan sari soya ham chuqurlashib,
                    // kartani "qimmatbaho"roq ko'rsatadi (0 -> past, 6 -> eng yuqori).
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
                                borderWidth: Math.max(0.5, scaleFactor * 0.7),
                                borderColor: glassBorderColor,
                            },
                        ]}
                    >
                        {/* SHIDDATLI, DARAJAGA XOS FON — referens rasmdan (Bronza→Kumush→
                            Tilla→Olmos→Brilliant→Mythic) ilhomlanib qurilgan. Har biri
                            FAQAT dekorativ, absolute-positioned qatlam — BASE matematik
                            maketiga hech qanday ta'sir qilmaydi. PAC/SHO/PAS/DRI/DEF/PHY
                            kabi 6ta atribut bo'limi ATAYLAB qo'shilmadi. */}

                        {backdropStyle === 'spotlight' && (
                            <View pointerEvents="none" style={styles.meshGlowLayer}>
                                {/* Ikkita keskin, o'tkir NUR TIG'I (light blade) — burchaklardan
                                    kesib o'tadi, dumaloq emas, keskin qirrali va "shiddatli". */}
                                <View
                                    style={[
                                        styles.spotlightBeam,
                                        {
                                            backgroundColor: theme.accentGlow,
                                            width: cardWidth * 0.42,
                                            height: cardHeight * 1.5,
                                            left: cardWidth * 0.06,
                                            top: -cardHeight * 0.62,
                                            opacity: theme.isLightCard ? 0.18 : 0.24,
                                            transform: [{ rotate: '-14deg' }],
                                        },
                                    ]}
                                />
                                <View
                                    style={[
                                        styles.spotlightBeam,
                                        {
                                            backgroundColor: theme.accentGlow,
                                            width: cardWidth * 0.34,
                                            height: cardHeight * 1.5,
                                            right: cardWidth * 0.02,
                                            top: -cardHeight * 0.62,
                                            opacity: theme.isLightCard ? 0.14 : 0.18,
                                            transform: [{ rotate: '16deg' }],
                                        },
                                    ]}
                                />
                                {/* O'tkir olmos-nishon — burchakda, dumaloq emas */}
                                <View
                                    style={[
                                        styles.diamondGlow,
                                        {
                                            backgroundColor: theme.accentGlow,
                                            width: L.heroRowH * 0.85,
                                            height: L.heroRowH * 0.85,
                                            top: -L.heroRowH * 0.5,
                                            left: (cardWidth - L.heroRowH * 0.85) / 2,
                                            opacity: theme.isLightCard ? 0.16 : 0.20,
                                        },
                                    ]}
                                />
                                {/* Pastki vinyetka — sahna kabi chuqurlik va drama beradi */}
                                <LinearGradient
                                    colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.34)']}
                                    start={{ x: 0.5, y: 0.42 }}
                                    end={{ x: 0.5, y: 1 }}
                                    style={StyleSheet.absoluteFillObject}
                                />
                                <View
                                    style={[
                                        styles.diamondGlow,
                                        {
                                            backgroundColor: secondaryGlow,
                                            width: L.heroRowH * 0.9,
                                            height: L.heroRowH * 0.9,
                                            bottom: -L.heroRowH * 0.55,
                                            left: -L.heroRowH * 0.35,
                                            opacity: 0.12,
                                        },
                                    ]}
                                />
                            </View>
                        )}

                        {backdropStyle === 'crystal' && (
                            <View pointerEvents="none" style={styles.meshGlowLayer}>
                                <View style={[styles.diamondGlow, { backgroundColor: theme.accentGlow, width: L.heroRowH * 1.15, height: L.heroRowH * 1.15, top: -L.heroRowH * 0.55, right: -L.heroRowH * 0.4, opacity: 0.26 }]} />
                                <View style={[styles.diamondGlow, { backgroundColor: '#FFFFFF', width: L.heroRowH * 0.55, height: L.heroRowH * 0.55, top: -L.heroRowH * 0.06, right: L.heroRowH * 0.12, opacity: 0.20 }]} />
                                {/* Olmos qirralari — nozik, keskin yorug'lik chiziqlari */}
                                {CRYSTAL_FACETS.map((shard, idx) => (
                                    <View
                                        key={idx}
                                        style={[
                                            styles.facetShard,
                                            { top: shard.top as any, left: shard.left as any, width: cardWidth * 0.9, transform: [{ rotate: shard.rotate }] },
                                        ]}
                                    >
                                        <LinearGradient
                                            colors={['rgba(255,255,255,0)', `rgba(255,255,255,${shard.weight * 0.22})`, 'rgba(255,255,255,0)']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={{ width: '100%', height: Math.max(1, scaleFactor * shard.weight) }}
                                        />
                                    </View>
                                ))}
                                <View style={[styles.diamondGlow, { backgroundColor: secondaryGlow, width: L.heroRowH * 0.9, height: L.heroRowH * 0.9, bottom: -L.heroRowH * 0.45, left: -L.heroRowH * 0.35, opacity: 0.16 }]} />
                            </View>
                        )}

                        {backdropStyle === 'prism' && (
                            <View pointerEvents="none" style={styles.meshGlowLayer}>
                                <View style={[styles.diamondGlow, { backgroundColor: theme.accentGlow, width: L.heroRowH * 1.15, height: L.heroRowH * 1.15, top: -L.heroRowH * 0.55, right: -L.heroRowH * 0.4, opacity: 0.20 }]} />
                                <View style={[styles.diamondGlow, { backgroundColor: secondaryGlow, width: L.heroRowH, height: L.heroRowH, bottom: -L.heroRowH * 0.5, left: -L.heroRowH * 0.38, opacity: 0.17 }]} />
                                {/* Harakatlanuvchi PRIZMA (radug'a) chizig'i — bir qarashda "vauv" */}
                                <Animated.View
                                    style={[
                                        styles.prismBand,
                                        {
                                            width: cardWidth * 0.5,
                                            height: cardHeight * 2.2,
                                            top: -cardHeight * 0.6,
                                            transform: [{ translateX: dramaShimmerTranslate }, { rotate: '22deg' }],
                                        },
                                    ]}
                                >
                                    <LinearGradient
                                        colors={['rgba(255,255,255,0)', 'rgba(240,171,252,0.5)', 'rgba(125,211,252,0.5)', 'rgba(253,224,71,0.4)', 'rgba(255,255,255,0)']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFillObject}
                                    />
                                </Animated.View>
                            </View>
                        )}

                        {backdropStyle === 'cosmic' && (
                            <View pointerEvents="none" style={styles.meshGlowLayer}>
                                <View style={[styles.diamondGlow, { backgroundColor: theme.accentGlow, width: L.heroRowH * 1.1, height: L.heroRowH * 1.1, top: -L.heroRowH * 0.5, right: -L.heroRowH * 0.35, opacity: 0.24 }]} />
                                <View style={[styles.diamondGlow, { backgroundColor: theme.textGold, width: L.heroRowH * 0.85, height: L.heroRowH * 0.85, bottom: -L.heroRowH * 0.4, left: -L.heroRowH * 0.3, opacity: 0.16 }]} />
                                {/* Yulduzli osmon — o'tkir sparkle (romb) shakllar, dumaloq nuqta EMAS */}
                                {STAR_POSITIONS.map((star, idx) => (
                                    <View
                                        key={idx}
                                        style={{
                                            position: 'absolute',
                                            left: star.left as any,
                                            top: star.top as any,
                                            width: Math.max(1.5, star.size * scaleFactor * 1.6),
                                            height: Math.max(1.5, star.size * scaleFactor * 1.6),
                                            backgroundColor: '#FFFFFF',
                                            opacity: star.opacity,
                                            transform: [{ rotate: '45deg' }],
                                        }}
                                    />
                                ))}
                                {/* Harakatlanuvchi afsonaviy (mythic) oltin nur chizig'i */}
                                <Animated.View
                                    style={[
                                        styles.prismBand,
                                        {
                                            width: cardWidth * 0.42,
                                            height: cardHeight * 2.2,
                                            top: -cardHeight * 0.6,
                                            transform: [{ translateX: dramaShimmerTranslate }, { rotate: '22deg' }],
                                        },
                                    ]}
                                >
                                    <LinearGradient
                                        colors={['rgba(255,255,255,0)', 'rgba(253,224,71,0.45)', 'rgba(255,255,255,0)']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFillObject}
                                    />
                                </Animated.View>
                            </View>
                        )}

                        {/* Yuqoridan pastga tushuvchi juda nozik shisha (glass) yorug'lik —
                            barcha darajalarda mavjud, bazaviy "premium" tuyg'usini beradi. */}
                        <LinearGradient
                            pointerEvents="none"
                            colors={theme.isLightCard
                                ? ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']
                                : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
                            start={{ x: 0.15, y: 0 }}
                            end={{ x: 0.85, y: 0.55 }}
                            style={StyleSheet.absoluteFillObject}
                        />

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
                                    colors={theme.isLightCard ? ['rgba(255,255,255,0.0)', 'rgba(0,0,0,0.06)', 'rgba(255,255,255,0.0)'] : ['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.0)']}
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
                                                GOL
                                            </Text>
                                        </View>

                                        <View style={[styles.statsVerticalDivider, { height: L.statNumLineH, backgroundColor: theme.isLightCard ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.2)', width: Math.max(1, scaleFactor) }]} />

                                        <View style={[styles.statColItem, { gap: L.gapStatNumToLabel }]}>
                                            <Text style={[styles.statNumBig, { fontSize: L.statNumFont, lineHeight: L.statNumLineH, color: theme.textGold }]}>
                                                {assistsCount}
                                            </Text>
                                            <Text style={[styles.statLabelSmall, { fontSize: L.statLabelFont, lineHeight: L.statLabelLineH, color: theme.textPrimary }]}>
                                                ASIST
                                            </Text>
                                        </View>

                                        <View style={[styles.statsVerticalDivider, { height: L.statNumLineH, backgroundColor: theme.isLightCard ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.2)', width: Math.max(1, scaleFactor) }]} />

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
    meshGlowLayer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    diamondGlow: {
        // Yumaloq "orb" o'rniga O'TKIR ROMB (45deg burilgan kvadrat) —
        // shiddatli, keskin qirrali fon effekti uchun. Kichik borderRadius
        // faqat uchlarning pichoq kabi o'tkirligini biroz yumshatadi.
        position: 'absolute',
        borderRadius: 6,
        transform: [{ rotate: '45deg' }],
    },
    spotlightBeam: {
        // O'tkir qirrali NUR TIG'I (light blade) — dumaloq pill emas.
        position: 'absolute',
    },
    facetShard: {
        position: 'absolute',
    },
    prismBand: {
        position: 'absolute',
        overflow: 'hidden',
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

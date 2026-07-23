import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Animated,
    Image,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import SmartImage from './SmartImage';
import Skeleton from './Skeleton';
import { formatShortTeamName } from '../utils/stringUtils';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.78;
const CARD_SPACING = 12;
const SIDE_PADDING = (screenWidth - CARD_WIDTH) / 2;

const LEAGUE_LOGOS: Record<string, any> = {
    'super': require('../assets/images/super-liga.png'),
    'pro': require('../assets/images/pro-liga.png'),
    '3liga': require('../assets/images/3-liga.png'),
    '7x7': require('../assets/images/7x7-liga.png'),
};

const LEAGUE_ACCENTS: Record<string, string> = {
    'super': '#EF4444',  // Vibrant League Red
    'pro': '#3B82F6',    // Vibrant League Blue
    '3liga': '#A855F7',  // Vibrant League Purple / Siyohrang
    '7x7': '#0EA5E9',    // Vibrant League Cyan / Sky Blue
};

interface TopPlayer {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string;
    teamName: string;
    teamLogo: string;
    goals: number;
    assists: number;
}

interface LeagueSlideItem {
    id: string;
    leagueName: string;
    theme: [string, string, string];
    topPlayer: TopPlayer | null;
    round: number;
}

interface ApiSliderProps {
    initialItems?: any[];
    externalLoading?: boolean;
}

const ApiSlider: React.FC<ApiSliderProps> = ({ initialItems, externalLoading }) => {
    const [items, setItems] = useState<LeagueSlideItem[]>([]);
    const [loading, setLoading] = useState(externalLoading !== undefined ? externalLoading : true);
    const scrollViewRef = useRef<ScrollView>(null);
    const scrollX = useRef(new Animated.Value(CARD_WIDTH + CARD_SPACING)).current;
    const [realIndex, setRealIndex] = useState(0);
    const isScrolling = useRef(false);
    const autoSlideTimer = useRef<any>(null);
    const currentIndexRef = useRef(1);

    const ITEM_SIZE = CARD_WIDTH + CARD_SPACING;

    // For infinite loop: [lastClone, ...real items, firstClone]
    const loopItems = items.length > 1
        ? [items[items.length - 1], ...items, items[0]]
        : items;

    useEffect(() => {
        if (initialItems && initialItems.length > 0) {
            setItems(initialItems);
            setLoading(false);
        } else {
            loadSliderItems();
        }
    }, [initialItems]);

    useEffect(() => {
        if (externalLoading !== undefined) {
            setLoading(externalLoading && items.length === 0);
        }
    }, [externalLoading, items.length]);

    const loadSliderItems = async () => {
        try {
            if (items.length === 0) setLoading(true);
            const data = await apiService.getSliderItems();
            if (data && Array.isArray(data) && data.length > 0) {
                setItems(data);
            }
        } catch (error) {
            console.error('Error loading top scorers slider items:', error);
        } finally {
            setLoading(false);
        }
    };

    // Listen to scrollX to track current slide index cleanly for dots
    useEffect(() => {
        const listener = scrollX.addListener(({ value }) => {
            const rawIdx = Math.round(value / ITEM_SIZE);
            currentIndexRef.current = rawIdx;
            if (items.length > 1) {
                const rIdx = (rawIdx - 1 + items.length) % items.length;
                setRealIndex(Math.max(0, rIdx));
            }
        });
        return () => scrollX.removeListener(listener);
    }, [items, ITEM_SIZE]);

    // Initially scroll to index 1 (first real item)
    useEffect(() => {
        if (items.length > 1) {
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({
                    x: 1 * ITEM_SIZE,
                    animated: false,
                });
                scrollX.setValue(1 * ITEM_SIZE);
            }, 50);
        }
    }, [items]);

    // Auto-slide logic
    useEffect(() => {
        if (items.length > 1) {
            autoSlideTimer.current = setInterval(() => {
                if (isScrolling.current) return;
                const nextIdx = currentIndexRef.current + 1;
                scrollViewRef.current?.scrollTo({
                    x: nextIdx * ITEM_SIZE,
                    animated: true,
                });
            }, 4500);
            return () => {
                if (autoSlideTimer.current) clearInterval(autoSlideTimer.current);
            };
        }
    }, [items, ITEM_SIZE]);

    // Check boundary jump on momentum scroll end
    const handleMomentumScrollEnd = (event: any) => {
        isScrolling.current = false;
        if (items.length <= 1) return;

        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const rawIdx = Math.round(contentOffsetX / ITEM_SIZE);
        const totalLoop = loopItems.length;

        if (rawIdx >= totalLoop - 1) {
            // Reached appended first clone -> jump instantly to real first (index 1)
            scrollViewRef.current?.scrollTo({
                x: 1 * ITEM_SIZE,
                animated: false,
            });
            scrollX.setValue(1 * ITEM_SIZE);
            currentIndexRef.current = 1;
        } else if (rawIdx <= 0) {
            // Reached prepended last clone -> jump instantly to real last
            const realLastIdx = items.length;
            scrollViewRef.current?.scrollTo({
                x: realLastIdx * ITEM_SIZE,
                animated: false,
            });
            scrollX.setValue(realLastIdx * ITEM_SIZE);
            currentIndexRef.current = realLastIdx;
        }
    };

    const handleScrollBegin = () => {
        isScrolling.current = true;
    };

    const handleScrollEndDrag = () => {
        isScrolling.current = false;
    };

    if (loading && items.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.skeletonCard}>
                    <LinearGradient
                        colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.skeletonHeader}>
                        <Skeleton width={100} height={24} borderRadius={8} />
                        <Skeleton width={60} height={22} borderRadius={10} />
                    </View>
                    <View style={styles.skeletonBody}>
                        <Skeleton width={82} height={100} borderRadius={14} />
                        <View style={{ flex: 1, marginLeft: 14 }}>
                            <Skeleton width={120} height={20} borderRadius={6} />
                            <View style={{ height: 6 }} />
                            <Skeleton width={80} height={14} borderRadius={6} />
                            <View style={{ height: 10 }} />
                            <Skeleton width={70} height={24} borderRadius={8} />
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    if (items.length === 0) return null;

    return (
        <View style={styles.container}>
            <Animated.ScrollView
                ref={scrollViewRef as any}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={ITEM_SIZE}
                decelerationRate="fast"
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: true }
                )}
                onScrollBeginDrag={handleScrollBegin}
                onScrollEndDrag={handleScrollEndDrag}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                scrollEventThrottle={16}
                contentContainerStyle={styles.scrollContent}
            >
                {loopItems.map((item, index) => {
                    const topPlayer = item.topPlayer;
                    const leagueAccent = LEAGUE_ACCENTS[item.id] || item.theme?.[1] || '#007AFF';

                    // Smooth GPU-accelerated 60fps interpolation for scale & opacity
                    const scale = scrollX.interpolate({
                        inputRange: [
                            (index - 1) * ITEM_SIZE,
                            index * ITEM_SIZE,
                            (index + 1) * ITEM_SIZE,
                        ],
                        outputRange: [0.93, 1, 0.93],
                        extrapolate: 'clamp',
                    });

                    const opacity = scrollX.interpolate({
                        inputRange: [
                            (index - 1) * ITEM_SIZE,
                            index * ITEM_SIZE,
                            (index + 1) * ITEM_SIZE,
                        ],
                        outputRange: [0.72, 1, 0.72],
                        extrapolate: 'clamp',
                    });

                    return (
                        <Animated.View
                            key={`loop-slide-${index}-${item.id || 'item'}`}
                            style={[
                                styles.card,
                                {
                                    marginRight: CARD_SPACING,
                                    transform: [{ scale }],
                                    opacity,
                                },
                            ]}
                        >
                            {/* Glassmorphism Blur Layer - Light blur */}
                            <BlurView intensity={8} tint="dark" style={StyleSheet.absoluteFill} />

                            {/* Translucent Glass Gradient Backdrop */}
                            <LinearGradient
                                colors={item.theme}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />

                            <View style={styles.cardContent}>
                                {/* Header: League Logo & Crown Badge */}
                                <View style={styles.badgeHeader}>
                                    {LEAGUE_LOGOS[item.id] ? (
                                        <Image
                                            source={LEAGUE_LOGOS[item.id]}
                                            style={styles.slideLeagueLogo}
                                            resizeMode="contain"
                                        />
                                    ) : (
                                        <Text style={styles.leagueTitle}>{item.leagueName.toUpperCase()}</Text>
                                    )}
                                    <View style={[styles.roundBadge, { backgroundColor: leagueAccent }]}>
                                        <Text style={styles.roundBadgeText}>{(item.round || 1)}-TUR</Text>
                                    </View>
                                </View>

                                {/* Body Content */}
                                <View style={styles.slideBody}>
                                    {topPlayer ? (
                                        <>
                                            {/* Player Photo Frame */}
                                            <View style={styles.playerCutoutContainer}>
                                                <View style={[styles.playerFramedCard, { borderColor: leagueAccent }]}>
                                                    <SmartImage
                                                        uri={topPlayer.photoUrl}
                                                        style={styles.playerFrameImg}
                                                        fallbackIcon="person"
                                                        fallbackIconSize={40}
                                                        contentFit="cover"
                                                    />
                                                </View>
                                            </View>

                                            {/* Player Info */}
                                            <View style={styles.slideInfo}>
                                                <View style={styles.playerNameContainer}>
                                                    <Text style={styles.playerFirstName} numberOfLines={1}>
                                                        {(topPlayer.firstName || '').toUpperCase()}
                                                    </Text>
                                                    {topPlayer.lastName ? (
                                                        <Text style={styles.playerLastName} numberOfLines={1}>
                                                            {topPlayer.lastName.toUpperCase()}
                                                        </Text>
                                                    ) : null}
                                                </View>

                                                <View style={styles.playerTeamStatWrapper}>
                                                    {/* Team Logo + Name */}
                                                    <View style={styles.playerTeamInfo}>
                                                        {topPlayer.teamLogo ? (
                                                            <Image
                                                                source={{ uri: topPlayer.teamLogo }}
                                                                style={styles.playerTeamLogo}
                                                            />
                                                        ) : (
                                                            <View style={[styles.playerTeamLogo, styles.playerTeamLogoFallback]}>
                                                                <Text style={styles.fallbackLogoText}>
                                                                    {topPlayer.teamName?.charAt(0) || 'T'}
                                                                </Text>
                                                            </View>
                                                        )}
                                                        <Text style={styles.teamNameText} numberOfLines={1}>
                                                            {formatShortTeamName(topPlayer.teamName, 14)}
                                                        </Text>
                                                    </View>

                                                    {/* Stats Badges Row */}
                                                    <View style={styles.playerStatsRow}>
                                                        <View style={[styles.goalsBadge, { backgroundColor: leagueAccent }]}>
                                                            <Ionicons name="football-outline" size={12} color="#FFFFFF" />
                                                            <Text style={styles.goalsBadgeText}>
                                                                {topPlayer.goals} gol
                                                            </Text>
                                                        </View>
                                                        {topPlayer.assists > 0 && (
                                                            <View style={styles.statBadge}>
                                                                <Text style={styles.statBadgeText}>
                                                                    {topPlayer.assists} assist
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                            </View>
                                        </>
                                    ) : (
                                        /* Question Fallback */
                                        <View style={styles.questionContainer}>
                                            <View style={styles.questionTextWrap}>
                                                <View style={[styles.questionBadge, { borderColor: leagueAccent }]}>
                                                    <Ionicons name="help-circle" size={14} color={leagueAccent} />
                                                    <Text style={[styles.questionBadgeText, { color: leagueAccent }]}>KIM BO'LADI?</Text>
                                                </View>
                                                <Text style={styles.questionTitle}>
                                                    {item.leagueName} {item.round}-tur to'purari kim bo'lishi mumkin?
                                                </Text>
                                            </View>
                                            <View style={styles.silhouetteContainer}>
                                                <View style={styles.silhouetteGlow} />
                                                <View style={[styles.silhouetteBox, { borderColor: leagueAccent }]}>
                                                    <Ionicons name="person" size={36} color="rgba(255,255,255,0.2)" />
                                                    <Text style={[styles.questionMarkOverlay, { color: leagueAccent, textShadowColor: leagueAccent }]}>?</Text>
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </Animated.View>
                    );
                })}
            </Animated.ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 14,
    },
    loadingContainer: {
        paddingHorizontal: SIDE_PADDING,
        paddingVertical: 14,
    },
    skeletonCard: {
        width: CARD_WIDTH,
        height: 190,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: 20,
        justifyContent: 'space-between',
    },
    skeletonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    skeletonBody: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginTop: 14,
    },
    scrollContent: {
        paddingHorizontal: SIDE_PADDING,
        paddingVertical: 10,
    },
    card: {
        width: CARD_WIDTH,
        aspectRatio: 2.1,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1.2,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        ...Platform.select({
            ios: {
                shadowColor: 'rgba(0, 0, 0, 0.3)',
                shadowOffset: { width: 0, height: 16 },
                shadowOpacity: 0.4,
                shadowRadius: 30,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    cardContent: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 14,
        justifyContent: 'space-between',
    },
    badgeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 2,
    },
    leagueTitle: {
        fontWeight: '800',
        fontSize: 15,
        color: 'rgba(255,255,255,0.95)',
        letterSpacing: 1.5,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    slideLeagueLogo: {
        height: 22,
        maxWidth: 95,
    },
    roundBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        ...Platform.select({
            ios: {
                shadowColor: 'rgba(0, 0, 0, 0.25)',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
            },
            android: { elevation: 2 },
        }),
    },
    roundBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.8,
    },
    slideBody: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    playerCutoutContainer: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    playerFramedCard: {
        width: 88,
        height: 105,
        borderRadius: 18,
        borderWidth: 2.5,
        borderColor: 'rgba(255, 230, 0, 0.85)',
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        overflow: 'hidden',
    },
    playerFrameImg: {
        width: '100%',
        height: '100%',
    },
    slideInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    playerNameContainer: {
        marginBottom: 6,
    },
    playerFirstName: {
        fontFamily: 'Outfit',
        fontSize: 16,
        fontWeight: '900',
        color: '#FFFFFF',
        textTransform: 'uppercase',
        lineHeight: 19,
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
    },
    playerLastName: {
        fontFamily: 'Outfit',
        fontSize: 13,
        fontWeight: '400',
        color: 'rgba(255, 255, 255, 0.85)',
        textTransform: 'uppercase',
        lineHeight: 16,
        letterSpacing: 0.5,
    },
    playerTeamStatWrapper: {
        gap: 8,
    },
    playerTeamInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    playerTeamLogo: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    playerTeamLogoFallback: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    fallbackLogoText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    teamNameText: {
        fontSize: 14,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.95)',
    },
    playerStatsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    goalsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        gap: 4,
        ...Platform.select({
            ios: {
                shadowColor: 'rgba(0, 0, 0, 0.25)',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
            },
            android: { elevation: 2 },
        }),
    },
    goalsBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    statBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    statBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    // Question Fallback Slide
    questionContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    questionTextWrap: {
        flex: 1,
        paddingRight: 14,
    },
    questionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    questionBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFE600',
        letterSpacing: 0.5,
    },
    questionTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
        lineHeight: 20,
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    silhouetteContainer: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    silhouetteGlow: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    silhouetteBox: {
        width: 75,
        height: 95,
        borderRadius: 18,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'rgba(255, 230, 0, 0.7)',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: 'rgba(0, 0, 0, 0.2)',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 15,
            },
            android: { elevation: 4 },
        }),
    },
    questionMarkOverlay: {
        position: 'absolute',
        fontSize: 40,
        fontWeight: '800',
        color: '#FFE600',
        textShadowColor: 'rgba(255, 230, 0, 0.8)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
    },
    // Pagination
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 14,
        gap: 8,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    activeDot: {
        width: 28,
        borderRadius: 10,
        backgroundColor: '#FFE600',
        ...Platform.select({
            ios: {
                shadowColor: 'rgba(255,230,0,0.8)',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 10,
            },
        }),
    },
});

export default ApiSlider;

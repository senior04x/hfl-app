import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Share,
    StatusBar,
    Image,
    Animated,
    PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiService, supabase } from '../services/apiService';
import { News } from '../types';
import SmartImage from '../components/SmartImage';
import { useTranslation } from 'react-i18next';
import { getLocalizedNewsField, getLocalizedNewsCategory } from '../utils/localizationUtils';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function NewsDetailScreen({ route, navigation }: any) {
    const { t, i18n } = useTranslation();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);

    const { newsId, news: initialNews } = route.params || {};
    const [news, setNews] = useState<News | null>(initialNews || null);
    const [isLoading, setIsLoading] = useState(!initialNews);
    const [orgInfo, setOrgInfo] = useState<{ name?: string; logo_url?: string } | null>(null);

    // ─── 1:1 Real-time interactive swipe-to-back animation ─────────────────────
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

    useEffect(() => {
        if (!initialNews && newsId) {
            fetchNewsDetail();
        }
    }, [newsId]);

    useEffect(() => {
        const fetchOrgInfo = async () => {
            try {
                const dbClient = supabase;
                const targetOrgId = (news as any)?.organization_id || (news as any)?.org_id;

                if (targetOrgId) {
                    const { data } = await dbClient
                        .from('organizations')
                        .select('id, name, logo_url')
                        .eq('id', targetOrgId)
                        .maybeSingle();
                    if (data) {
                        setOrgInfo(data);
                        return;
                    }
                }

                if (news?.author) {
                    const { data } = await dbClient
                        .from('organizations')
                        .select('id, name, logo_url')
                        .ilike('name', `%${news.author}%`)
                        .maybeSingle();
                    if (data) {
                        setOrgInfo(data);
                        return;
                    }
                }

                // Fallback: fetch primary organization
                const { data: defaultOrg } = await dbClient
                    .from('organizations')
                    .select('id, name, logo_url')
                    .order('id', { ascending: true })
                    .limit(1)
                    .maybeSingle();
                if (defaultOrg) setOrgInfo(defaultOrg);
            } catch (e) {
                console.warn('Error loading org info in NewsDetailScreen:', e);
            }
        };

        if (news) {
            fetchOrgInfo();
        }
    }, [news]);

    const fetchNewsDetail = async () => {
        try {
            setIsLoading(true);
            const data = await apiService.getNewsById(newsId);
            setNews(data);
        } catch (error) {
            console.error('Error fetching news detail:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleShare = async () => {
        try {
            if (!news) return;
            const title = getLocalizedNewsField(news, 'title', i18n.language) || news.title;
            const content = getLocalizedNewsField(news, 'content', i18n.language) || news.content;
            await Share.share({
                message: `${title}\n\n${content.substring(0, 100)}...\n\n${t('news.share_text')}`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: homeColors.background }]}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <Ionicons name="newspaper-outline" size={48} color={homeColors.accent} />
                <Text style={[styles.loadingText, { color: homeColors.textSecondary }]}>
                    {t('news.loading', 'YANGILIK YUKLANMOQDA...')}
                </Text>
            </View>
        );
    }

    if (!news) {
        return (
            <View style={[styles.errorContainer, { backgroundColor: homeColors.background }]}>
                <Text style={[styles.errorText, { color: homeColors.textPrimary }]}>{t('news.not_found', 'YANGILIK TOPILMADI')}</Text>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: homeColors.accent }]} onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtnText}>{t('news.back_to_list', 'ORTGA QAYTISH')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const categoryLabel = getLocalizedNewsCategory(news.category, t).toUpperCase();
    const titleText = getLocalizedNewsField(news, 'title', i18n.language) || news.title || '';
    const contentText = getLocalizedNewsField(news, 'content', i18n.language) || news.content || '';
    const formattedDate = new Date(news.createdAt).toLocaleDateString(
        i18n.language === 'ru' ? 'ru-RU' : (i18n.language === 'en' ? 'en-US' : 'uz-UZ'),
        { day: '2-digit', month: 'long', year: 'numeric' }
    ).toUpperCase();

    return (
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

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
                <View style={{ flex: 1 }} {...swipeBackPanResponder.panHandlers}>
                    <ScrollView
                        style={{ flex: 1 }}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 80 }}
                        bounces={true}
                    >
                    {/* Hero Image Container */}
                    <View style={styles.imageContainer}>
                        <SmartImage
                            uri={news.imageUrl || 'https://images.unsplash.com/photo-1574629810360-7efbb6b6973f?q=80&w=1000'}
                            style={styles.mainImage}
                            contentFit="cover"
                        />

                        {/* Floating Action Buttons */}
                        <SafeAreaView style={styles.floatingHeaderActions} edges={['top']}>
                            <TouchableOpacity 
                                style={styles.headerActionBtn} 
                                onPress={() => navigation.goBack()}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.headerActionBtn} 
                                onPress={handleShare}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        </SafeAreaView>
                    </View>

                    {/* Article Content Area */}
                    <View
                        style={[
                            styles.contentArea,
                            {
                                backgroundColor: homeColors.background,
                                borderColor: isDark ? 'rgba(255,255,255,0.06)' : homeColors.border,
                            }
                        ]}
                    >
                        {/* Category & Date Row */}
                        <View style={styles.categoryRow}>
                            <View
                                style={[
                                    styles.categoryBadge,
                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }
                                ]}
                            >
                                <Text style={[styles.categoryBadgeText, { color: homeColors.accent }]}>
                                    {categoryLabel}
                                </Text>
                            </View>

                            <Text style={[styles.dateText, { color: homeColors.textSecondary }]}>
                                {formattedDate}
                            </Text>
                        </View>

                        {/* Title */}
                        <Text style={[styles.title, { color: homeColors.textPrimary }]}>
                            {titleText}
                        </Text>

                        {/* Author and Views Meta */}
                        <View
                            style={[
                                styles.metaRow,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8F9FA',
                                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : homeColors.border,
                                }
                            ]}
                        >
                            <View style={styles.authorBox}>
                                {orgInfo?.logo_url ? (
                                    <Image
                                        source={{ uri: orgInfo.logo_url }}
                                        style={styles.authorLogo}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View
                                        style={[
                                            styles.authorFallbackIcon,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }
                                        ]}
                                    >
                                        <Ionicons name="shield-checkmark" size={16} color={homeColors.accent} />
                                    </View>
                                )}
                                <View>
                                    <Text style={[styles.authorName, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                        {(orgInfo?.name || news.author || 'AMATORA').toUpperCase()}
                                    </Text>
                                    <Text style={[styles.authorSub, { color: homeColors.textSecondary }]}>
                                        {t('common.official_source', 'Rasmiy manba')}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.viewsBox}>
                                <Ionicons name="eye-outline" size={15} color={homeColors.textSecondary} />
                                <Text style={[styles.viewsText, { color: homeColors.textSecondary }]}>
                                    {news.views || 0}
                                </Text>
                            </View>
                        </View>

                        {/* Article Text Content */}
                        <Text style={[styles.content, { color: homeColors.textPrimary }]}>
                            {contentText}
                        </Text>
                    </View>
                </ScrollView>
            </View>
        </Animated.View>
    </View>
);
}

const styles = StyleSheet.create({
    mainAnimatedContainer: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    errorText: { fontSize: 16, fontWeight: '800', marginBottom: 20 },
    backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
    backBtnText: { color: '#000000', fontWeight: '900', fontSize: 13 },
    imageContainer: { width: '100%', height: 320, position: 'relative' },
    mainImage: { width: '100%', height: '100%' },
    floatingHeaderActions: {
        position: 'absolute',
        top: 0,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
    },
    headerActionBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    contentArea: {
        marginTop: -26,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 24,
        borderWidth: 1,
        borderBottomWidth: 0,
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    categoryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4.5,
        borderRadius: 8,
    },
    categoryBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    dateText: {
        fontSize: 11,
        fontWeight: '700',
    },
    title: {
        fontSize: 21,
        fontWeight: '900',
        lineHeight: 28,
        marginBottom: 20,
        letterSpacing: 0.2,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 24,
    },
    authorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    authorLogo: {
        width: 34,
        height: 34,
        borderRadius: 17,
        marginRight: 10,
    },
    authorFallbackIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    authorName: {
        fontSize: 12.5,
        fontWeight: '800',
    },
    authorSub: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 1,
    },
    viewsBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewsText: {
        fontSize: 11.5,
        fontWeight: '700',
    },
    content: {
        fontSize: 15.5,
        lineHeight: 26,
        fontWeight: '400',
        letterSpacing: 0.2,
    },
});

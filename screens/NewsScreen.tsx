import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    Animated,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { News } from '../types';
import SmartImage from '../components/SmartImage';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AppNavbar from '../components/AppNavbar';
import { useNavBarScroll } from '../context/NavBarScrollContext';
import CustomRefreshControl from '../components/CustomRefreshControl';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { formatLocalizedRelativeTime } from '../utils/dateLocalization';
import { getLocalizedNewsField, getLocalizedNewsCategory } from '../utils/localizationUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Theme-Aware Skeleton Shimmer ──────────────────────────────────────────
const SkeletonBox: React.FC<{ width?: number | string; height?: number; borderRadius?: number; isDark?: boolean; style?: any }> = ({
    width = '100%', height = 14, borderRadius = 6, isDark = true, style
}) => {
    const anim = useRef(new Animated.Value(0.3)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 0.65, duration: 750, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.3, duration: 750, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                    opacity: anim,
                },
                style
            ]}
        />
    );
};

const NewsSkeletonLoader = ({ isDark = true }: { isDark?: boolean }) => {
    const homeColors = getHomeScreenColors(isDark);
    return (
        <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 14 }}>
            {/* Featured skeleton */}
            <View
                style={{
                    height: 240,
                    borderRadius: 20,
                    overflow: 'hidden',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : homeColors.border,
                }}
            >
                <SkeletonBox height={240} borderRadius={20} isDark={isDark} />
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18, gap: 8 }}>
                    <SkeletonBox width={80} height={18} borderRadius={6} isDark={isDark} />
                    <SkeletonBox width={'90%'} height={18} borderRadius={5} isDark={isDark} />
                    <SkeletonBox width={'60%'} height={14} borderRadius={5} isDark={isDark} />
                    <SkeletonBox width={120} height={12} borderRadius={4} isDark={isDark} />
                </View>
            </View>

            {/* Card skeletons */}
            {[1, 2, 3, 4].map((i) => (
                <View
                    key={i}
                    style={{
                        flexDirection: 'row',
                        padding: 12,
                        borderRadius: 16,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : homeColors.border,
                        gap: 12,
                    }}
                >
                    <SkeletonBox width={96} height={86} borderRadius={12} isDark={isDark} />
                    <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
                        <SkeletonBox width={70} height={12} borderRadius={4} isDark={isDark} />
                        <SkeletonBox width={'90%'} height={14} borderRadius={5} isDark={isDark} />
                        <SkeletonBox width={'60%'} height={12} borderRadius={4} isDark={isDark} />
                    </View>
                </View>
            ))}
        </View>
    );
};

export default function NewsScreen() {
    const { t, i18n } = useTranslation();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const navigation = useNavigation<any>();
    const { handleScroll: handleNavBarScroll } = useNavBarScroll();

    const [news, setNews] = useState<News[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const categories = [
        { id: 'all', label: t('news.category_all', 'Barchasi'), rawKey: 'Barchasi' },
        { id: 'tournaments', label: t('news.category_tournaments', 'Turnirlar'), rawKey: 'Turnirlar' },
        { id: 'teams', label: t('news.category_teams', 'Jamoalar'), rawKey: 'Jamoalar' },
        { id: 'transfers', label: t('news.category_transfers', 'Transferlar'), rawKey: 'Transferlar' },
        { id: 'matches', label: t('news.category_matches', "O'yinlar"), rawKey: "O'yinlar" },
    ];

    const fetchNews = async () => {
        try {
            const foundCategory = categories.find(c => c.id === selectedCategory);
            const categoryParam = (!foundCategory || foundCategory.id === 'all') ? undefined : foundCategory.rawKey;
            const data = await apiService.getNews(1, 40, categoryParam); 
            setNews(data || []);
        } catch (error) {
            console.error('Error fetching news:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        setIsLoading(true);
        fetchNews();
    }, [selectedCategory]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNews();
    };

    const filteredNews = news.filter(item => {
        const title = getLocalizedNewsField(item, 'title', i18n.language) || item.title || '';
        const content = getLocalizedNewsField(item, 'content', i18n.language) || item.content || '';
        const q = searchQuery.toLowerCase();
        return title.toLowerCase().includes(q) || content.toLowerCase().includes(q);
    });

    const renderCategories = () => (
        <View style={[styles.categoriesContainer, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : homeColors.border }]}>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.categoriesContent}
            >
                {categories.map((cat) => {
                    const isActive = selectedCategory === cat.id;
                    return (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.categoryBtn,
                                {
                                    backgroundColor: isActive
                                        ? homeColors.accent
                                        : (isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F4'),
                                    borderColor: isActive
                                        ? homeColors.accent
                                        : (isDark ? 'rgba(255,255,255,0.08)' : homeColors.border),
                                }
                            ]}
                            onPress={() => setSelectedCategory(cat.id)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.categoryText,
                                    {
                                        color: isActive
                                            ? '#000000'
                                            : homeColors.textSecondary,
                                        fontWeight: isActive ? '900' : '600',
                                    }
                                ]}
                            >
                                {cat.label.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );

    const renderNewsItem = ({ item, index }: { item: News, index: number }) => {
        const isFeatured = index === 0 && selectedCategory === 'all' && !searchQuery;
        const timeAgoText = formatLocalizedRelativeTime(item.createdAt, i18n.language);
        const categoryLabel = getLocalizedNewsCategory(item.category, t).toUpperCase();
        const newsTitle = getLocalizedNewsField(item, 'title', i18n.language) || item.title || '';

        if (isFeatured) {
            return (
                <TouchableOpacity 
                    style={[
                        styles.featuredCard,
                        {
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : homeColors.border,
                            backgroundColor: isDark ? '#141414' : '#FFFFFF',
                        }
                    ]}
                    onPress={() => navigation.navigate('NewsDetail', { newsId: item._id, news: item })}
                    activeOpacity={0.88}
                >
                    <SmartImage
                        uri={item.imageUrl || 'https://images.unsplash.com/photo-1574629810360-7efbb6b6973f?q=80&w=1000'}
                        style={styles.featuredImage}
                        contentFit="cover"
                    />

                    {/* Dark gradient overlay for readability */}
                    <View style={styles.featuredOverlay}>
                        <View style={{ padding: 18 }}>
                            <View style={styles.featuredCategoryBadge}>
                                <Text style={styles.featuredCategoryBadgeText}>{categoryLabel}</Text>
                            </View>

                            <Text style={styles.featuredTitle} numberOfLines={2}>
                                {newsTitle.toUpperCase()}
                            </Text>

                            <View style={styles.newsMeta}>
                                <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.metaText}>{timeAgoText.toUpperCase()}</Text>
                                <View style={styles.metaDivider} />
                                <Ionicons name="eye-outline" size={13} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.metaText}>{item.views || 0}</Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity 
                style={[
                    styles.newsCard,
                    {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : homeColors.border,
                    }
                ]}
                onPress={() => navigation.navigate('NewsDetail', { newsId: item._id, news: item })}
                activeOpacity={0.8}
            >
                <View style={{ flexDirection: 'row', padding: 12, alignItems: 'center' }}>
                    <SmartImage
                        uri={item.imageUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1000'}
                        style={styles.newsImage}
                        contentFit="cover"
                    />
                    <View style={styles.newsContent}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                            <Text style={[styles.newsCategory, { color: homeColors.accent }]}>
                                {categoryLabel}
                            </Text>
                            <Text style={{ fontSize: 9, color: homeColors.textSecondary }}>•</Text>
                            <Text style={[styles.metaTextSmall, { color: homeColors.textSecondary }]}>
                                {timeAgoText}
                            </Text>
                        </View>

                        <Text style={[styles.newsTitle, { color: homeColors.textPrimary }]} numberOfLines={2}>
                            {newsTitle}
                        </Text>

                        <View style={styles.newsMetaBottom}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="eye-outline" size={12} color={homeColors.textSecondary} />
                                <Text style={[styles.metaTextSmall, { color: homeColors.textSecondary }]}>
                                    {item.views || 0}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={homeColors.textSecondary} style={{ opacity: 0.5 }} />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: homeColors.background }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

            <SafeAreaView style={styles.container} edges={['top']}>
                <FlatList
                    data={filteredNews}
                    keyExtractor={(item) => item._id || String(Math.random())}
                    renderItem={renderNewsItem}
                    ListHeaderComponent={
                        <View>
                            <AppNavbar
                                title={t('news.title', 'YANGILIKLAR')}
                                subtitle="AMATORA"
                                showSearch={true}
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                                searchPlaceholder={t('news.search_placeholder', 'Qidiruv...')}
                            />
                            {renderCategories()}
                            {searchQuery ? (
                                <View style={styles.searchResultHeader}>
                                    <Text style={[styles.searchResultText, { color: homeColors.textSecondary }]}>
                                        "{searchQuery.toUpperCase()}" : {filteredNews.length}
                                    </Text>
                                    <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10}>
                                        <Text style={{ color: homeColors.accent, fontWeight: '800', fontSize: 11 }}>
                                            {t('common.clear', 'Tozalash').toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                        </View>
                    }
                    contentContainerStyle={styles.listContent}
                    onScroll={(e) => handleNavBarScroll('news', e)}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        isLoading ? (
                            <NewsSkeletonLoader isDark={isDark} />
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="newspaper-outline" size={54} color={homeColors.textSecondary} style={{ opacity: 0.4, marginBottom: 12 }} />
                                <Text style={[styles.emptyText, { color: homeColors.textSecondary }]}>
                                    {t('common.no_data', "Ma'lumot topilmadi")}
                                </Text>
                            </View>
                        )
                    }
                />
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    categoriesContainer: {
        paddingVertical: 10,
        marginBottom: 10,
        borderBottomWidth: 1,
    },
    categoriesContent: {
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 8,
    },
    categoryBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    categoryText: {
        fontSize: 11,
        letterSpacing: 0.3,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 110,
    },
    featuredCard: {
        width: '100%',
        height: 240,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 14,
        borderWidth: 1,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    featuredImage: {
        width: '100%',
        height: '100%',
    },
    featuredOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'flex-end',
    },
    featuredCategoryBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 9,
        paddingVertical: 3.5,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    featuredCategoryBadgeText: {
        color: '#FFFFFF',
        fontSize: 9.5,
        fontWeight: '900',
        letterSpacing: 0.4,
    },
    featuredTitle: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '900',
        lineHeight: 22,
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    newsMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 10,
        fontWeight: '700',
    },
    metaDivider: {
        width: 1,
        height: 10,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 8,
    },
    newsCard: {
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 5,
        elevation: 1,
    },
    newsImage: {
        width: 96,
        height: 86,
        borderRadius: 12,
    },
    newsContent: {
        flex: 1,
        marginLeft: 14,
        justifyContent: 'center',
    },
    newsCategory: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    newsTitle: {
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 18,
        marginBottom: 8,
        letterSpacing: 0.1,
    },
    newsMetaBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    metaTextSmall: {
        fontSize: 10,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '600',
    },
    searchResultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginBottom: 4,
    },
    searchResultText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
});

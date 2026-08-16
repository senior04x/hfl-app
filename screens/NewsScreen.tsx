import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    RefreshControl,
    ScrollView,
    Modal,
    TextInput,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import AnimatedBackground from '../components/AnimatedBackground';
import backgroundImage from '../assets/images/backroud-image.png';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import { News } from '../types';
import SmartImage from '../components/SmartImage';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

// ─── Skeleton Shimmer ────────────────────────────────────────────────────────
const SkeletonBox: React.FC<{ width?: number | string; height?: number; borderRadius?: number; style?: any }> = ({
    width = '100%', height = 14, borderRadius = 6, style
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
        <Animated.View style={[{ width, height, borderRadius, backgroundColor: 'rgba(255,255,255,0.18)', opacity: anim }, style]} />
    );
};

const NewsSkeletonFeatured = () => (
    <View style={{ height: 260, borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
        <SkeletonBox height={260} borderRadius={16} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, gap: 8 }}>
            <SkeletonBox width={80} height={12} borderRadius={4} />
            <SkeletonBox width={'90%'} height={18} borderRadius={5} />
            <SkeletonBox width={'60%'} height={14} borderRadius={5} />
            <SkeletonBox width={120} height={12} borderRadius={4} />
        </View>
    </View>
);

const NewsSkeletonCard = () => (
    <View style={{ flexDirection: 'row', padding: 12, marginBottom: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', gap: 12 }}>
        <SkeletonBox width={90} height={80} borderRadius={10} />
        <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
            <SkeletonBox width={60} height={10} borderRadius={4} />
            <SkeletonBox width={'85%'} height={14} borderRadius={5} />
            <SkeletonBox width={'60%'} height={14} borderRadius={5} />
            <SkeletonBox width={100} height={10} borderRadius={4} />
        </View>
    </View>
);

import { formatLocalizedRelativeTime } from '../utils/dateLocalization';
import { getLocalizedNewsField, getLocalizedNewsCategory } from '../utils/localizationUtils';

export default function NewsScreen() {
    const { t, i18n } = useTranslation();
    const [news, setNews] = useState<News[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigation = useNavigation<any>();

    const categories = [
        { id: 'all', label: t('news.category_all'), rawKey: 'Barchasi' },
        { id: 'tournaments', label: t('news.category_tournaments'), rawKey: 'Turnirlar' },
        { id: 'teams', label: t('news.category_teams'), rawKey: 'Jamoalar' },
        { id: 'transfers', label: t('news.category_transfers'), rawKey: 'Transferlar' },
        { id: 'matches', label: t('news.category_matches'), rawKey: "O'yinlar" },
    ];

    const fetchNews = async () => {
        try {
            setIsLoading(true);
            const foundCategory = categories.find(c => c.id === selectedCategory);
            const categoryParam = (!foundCategory || foundCategory.id === 'all') ? undefined : foundCategory.rawKey;
            const data = await apiService.getNews(1, 40, categoryParam); 
            setNews(data || []);
        } catch (error) {
            console.error('Error fetching news:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, [selectedCategory]);

    const filteredNews = news.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderHeader = () => (
        <View style={styles.header}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 20, paddingVertical: 15 }}>
                <Text style={styles.headerTitle}>{t('news.title')}</Text>
                <TouchableOpacity style={styles.searchBtn} onPress={() => setIsSearchVisible(true)}>
                    <Ionicons name="search" size={22} color="#000" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderCategories = () => (
        <View style={styles.categoriesContainer}>
            <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.categoriesContent}
            >
                {categories.map((cat) => (
                    <TouchableOpacity
                        key={cat.id}
                        style={[
                            styles.categoryBtn,
                            selectedCategory === cat.id && styles.categoryBtnActive
                        ]}
                        onPress={() => setSelectedCategory(cat.id)}
                    >
                        <Text style={[
                            styles.categoryText,
                            selectedCategory === cat.id && styles.categoryTextActive
                        ]}>
                            {cat.label.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const renderNewsItem = ({ item, index }: { item: News, index: number }) => {
        const isFeatured = index === 0 && selectedCategory === 'all' && !searchQuery;
        const timeAgoText = formatLocalizedRelativeTime(item.createdAt, i18n.language);

        if (isFeatured) {
            return (
                <TouchableOpacity 
                    style={styles.featuredCard}
                    onPress={() => navigation.navigate('NewsDetail', { newsId: item._id, news: item })}
                >
                    <SmartImage
                        uri={item.imageUrl || 'https://images.unsplash.com/photo-1574629810360-7efbb6b6973f?q=80&w=1000'}
                        style={styles.featuredImage}
                    />
                    <View style={styles.featuredOverlay}>
                        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={{ padding: 20 }}>
                            <View style={styles.categoryBadge}>
                                <Text style={styles.categoryBadgeText}>{getLocalizedNewsCategory(item.category, t).toUpperCase()}</Text>
                            </View>
                            <Text style={styles.featuredTitle} numberOfLines={2}>{getLocalizedNewsField(item, 'title', i18n.language).toUpperCase()}</Text>
                            <View style={styles.newsMeta}>
                                <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.metaText}>{timeAgoText.toUpperCase()}</Text>
                                <View style={styles.metaDivider} />
                                <Ionicons name="eye-outline" size={14} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.metaText}>{item.views || 0}</Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity 
                style={styles.newsCard}
                onPress={() => navigation.navigate('NewsDetail', { newsId: item._id, news: item })}
            >
                <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={{ flexDirection: 'row', padding: 12 }}>
                    <SmartImage
                        uri={item.imageUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1000'}
                        style={styles.newsImage}
                    />
                    <View style={styles.newsContent}>
                        <Text style={styles.newsCategory}>{getLocalizedNewsCategory(item.category, t).toUpperCase()}</Text>
                        <Text style={styles.newsTitle} numberOfLines={2}>{getLocalizedNewsField(item, 'title', i18n.language).toUpperCase()}</Text>
                        <View style={styles.newsMeta}>
                            <Text style={styles.metaTextSmall}>{timeAgoText.toUpperCase()}</Text>
                            <View style={[styles.metaDivider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                            <Ionicons name="eye-outline" size={12} color={Colors.textMuted} />
                            <Text style={styles.metaTextSmall}>{item.views || 0}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <AnimatedBackground overlayOpacity={0.7} backgroundImage={backgroundImage}>
            <SafeAreaView style={styles.container} edges={['top']}>
                <FlatList
                    data={searchQuery ? filteredNews : news}
                    keyExtractor={(item) => item._id}
                    renderItem={renderNewsItem}
                    ListHeaderComponent={
                        <View>
                            {renderHeader()}
                            {renderCategories()}
                            {searchQuery ? (
                                <View style={styles.searchResultHeader}>
                                    <Text style={styles.searchResultText}>"{searchQuery.toUpperCase()}" BO'YICHA NATIJALAR: {filteredNews.length}</Text>
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Text style={{ color: Colors.primary, fontWeight: '900', fontSize: 12 }}>{t('common.clear').toUpperCase()}</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                        </View>
                    }
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={isLoading} onRefresh={fetchNews} tintColor={Colors.primary} />
                    }
                    ListEmptyComponent={
                        isLoading ? (
                            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                                <NewsSkeletonFeatured />
                                {[1, 2, 3, 4, 5].map(i => <NewsSkeletonCard key={i} />)}
                            </View>
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="newspaper-outline" size={64} color="rgba(255,255,255,0.1)" />
                                <Text style={styles.emptyText}>{t('common.no_data')}</Text>
                            </View>
                        )
                    }
                />
            </SafeAreaView>

            {/* Search Modal */}
            <Modal
                visible={isSearchVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsSearchVisible(false)}
            >
                <View style={styles.searchModalContainer}>
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                    <SafeAreaView style={{ flex: 1 }}>
                        <View style={styles.searchBarContainer}>
                            <TouchableOpacity onPress={() => { setIsSearchVisible(false); }}>
                                <Ionicons name="chevron-back" size={28} color={Colors.primary} />
                            </TouchableOpacity>
                            <View style={styles.searchInputWrapper}>
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder={t('news.search_placeholder').toUpperCase()}
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoFocus
                                    returnKeyType="search"
                                    onSubmitEditing={() => setIsSearchVisible(false)}
                                />
                                {searchQuery !== '' && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.5)" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                        <TouchableOpacity 
                            style={styles.searchConfirmBtn}
                            onPress={() => setIsSearchVisible(false)}
                        >
                            <Text style={styles.searchConfirmText}>{t('common.confirm')}</Text>
                        </TouchableOpacity>
                    </SafeAreaView>
                </View>
            </Modal>
        </AnimatedBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: { overflow: 'hidden' },
    headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', fontStyle: 'italic' },
    searchBtn: { backgroundColor: Colors.primary, width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
    categoriesContainer: { paddingVertical: 12, marginBottom: 15, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    categoriesContent: { paddingHorizontal: 15, alignItems: 'center' },
    categoryBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, marginRight: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    categoryBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
    categoryText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    categoryTextActive: { color: '#000' },
    listContent: { paddingHorizontal: 15, paddingBottom: 110 },
    featuredCard: { width: '100%', height: 260, borderRadius: 24, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    featuredImage: { width: '100%', height: '100%' },
    featuredOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, justifyContent: 'flex-end', overflow: 'hidden' },
    categoryBadge: { backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8 },
    categoryBadgeText: { color: '#000', fontSize: 10, fontWeight: '900' },
    featuredTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', marginBottom: 8, letterSpacing: 0.5 },
    newsMeta: { flexDirection: 'row', alignItems: 'center' },
    metaText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginLeft: 4, fontWeight: '600', opacity: 0.65 },
    metaDivider: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 10 },
    newsCard: { borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
    newsImage: { width: 90, height: 90, borderRadius: 14 },
    newsContent: { flex: 1, marginLeft: 15, justifyContent: 'center' },
    newsCategory: { color: Colors.primary, fontSize: 10, fontWeight: '900', marginBottom: 4, letterSpacing: 0.5 },
    newsTitle: { color: '#FFF', fontSize: 15, fontWeight: '800', marginBottom: 8, letterSpacing: 0.2 },
    metaTextSmall: { color: 'rgba(255,255,255,0.45)', fontSize: 9.5, fontWeight: '600', opacity: 0.65 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 16, fontWeight: '900', marginTop: 15 },
    searchResultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 5, marginBottom: 20 },
    searchResultText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    searchModalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    searchBarContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
    searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, marginLeft: 15, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    searchInput: { flex: 1, color: '#FFF', fontSize: 16, fontWeight: '700' },
    searchConfirmBtn: { backgroundColor: Colors.primary, marginHorizontal: 20, height: 55, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 15, marginTop: 20 },
    searchConfirmText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
});

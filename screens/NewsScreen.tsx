import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    RefreshControl,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import { News } from '../types';
import SmartImage from '../components/SmartImage';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function NewsScreen() {
    const [news, setNews] = useState<News[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('Barchasi');
    const navigation = useNavigation<any>();

    const categories = ['Barchasi', 'Turnirlar', 'Jamoalar', 'Transferlar', 'Amatora TV'];

    const fetchNews = async () => {
        try {
            setIsLoading(true);
            const category = selectedCategory === 'Barchasi' ? undefined : selectedCategory;
            const data = await apiService.getNews(1, 20, category);
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

    const renderHeader = () => (
        <View style={styles.header}>
            <Text style={styles.headerTitle}>YANGILIKLAR</Text>
            <TouchableOpacity style={styles.searchBtn}>
                <Ionicons name="search" size={20} color="#000" />
            </TouchableOpacity>
        </View>
    );

    const renderCategories = () => (
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
        >
            {categories.map((cat) => (
                <TouchableOpacity
                    key={cat}
                    style={[
                        styles.categoryBtn,
                        selectedCategory === cat && styles.categoryBtnActive
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                >
                    <Text style={[
                        styles.categoryText,
                        selectedCategory === cat && styles.categoryTextActive
                    ]}>
                        {cat.toUpperCase()}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    const renderNewsItem = ({ item, index }: { item: News, index: number }) => {
        const isFeatured = index === 0 && selectedCategory === 'Barchasi';

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
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{item.category || 'YANGILIK'}</Text>
                        </View>
                        <Text style={styles.featuredTitle} numberOfLines={2}>{item.title}</Text>
                        <View style={styles.newsMeta}>
                            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
                            <Text style={styles.metaText}>{new Date(item.createdAt).toLocaleDateString('uz-UZ')}</Text>
                            <View style={styles.metaDivider} />
                            <Ionicons name="eye-outline" size={14} color="rgba(255,255,255,0.7)" />
                            <Text style={styles.metaText}>{item.views || 0}</Text>
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
                <SmartImage
                    uri={item.imageUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1000'}
                    style={styles.newsImage}
                />
                <View style={styles.newsContent}>
                    <Text style={styles.newsCategory}>{item.category || 'YANGILIK'}</Text>
                    <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.newsMeta}>
                        <Text style={styles.metaTextSmall}>{new Date(item.createdAt).toLocaleDateString('uz-UZ')}</Text>
                        <View style={[styles.metaDivider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                        <Ionicons name="eye-outline" size={12} color={Colors.textMuted} />
                        <Text style={styles.metaTextSmall}>{item.views || 0}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <FlatList
                data={news}
                keyExtractor={(item) => item._id}
                renderItem={renderNewsItem}
                ListHeaderComponent={
                    <View>
                        {renderHeader()}
                        {renderCategories()}
                    </View>
                }
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={fetchNews} tintColor={Colors.primary} />
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="newspaper-outline" size={64} color={Colors.textMuted} />
                            <Text style={styles.emptyText}>Hozircha yangiliklar yo'q</Text>
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    headerTitle: {
        color: Colors.text,
        fontSize: 24,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    searchBtn: {
        backgroundColor: Colors.primary,
        padding: 8,
        borderRadius: 10,
    },
    categoriesContainer: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.background,
        paddingVertical: 10,
        marginBottom: 15,
    },
    categoriesContent: {
        paddingHorizontal: 15,
        alignItems: 'center',
    },
    categoryBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    categoryBtnActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    categoryText: {
        color: Colors.textMuted,
        fontSize: 12,
        fontWeight: '900',
    },
    categoryTextActive: {
        color: '#000',
    },
    listContent: {
        paddingHorizontal: 15,
        paddingBottom: 40,
    },
    featuredCard: {
        width: '100%',
        height: 250,
        borderRadius: 25,
        overflow: 'hidden',
        marginBottom: 20,
        backgroundColor: Colors.surface,
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
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    categoryBadge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    categoryBadgeText: {
        color: '#000',
        fontSize: 9,
        fontWeight: '900',
    },
    featuredTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 10,
    },
    newsMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginLeft: 4,
    },
    metaDivider: {
        width: 1,
        height: 12,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 10,
    },
    newsCard: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    newsImage: {
        width: 100,
        height: 100,
        borderRadius: 15,
    },
    newsContent: {
        flex: 1,
        marginLeft: 15,
        justifyContent: 'center',
    },
    newsCategory: {
        color: Colors.primary,
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 4,
    },
    newsTitle: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 8,
    },
    metaTextSmall: {
        color: Colors.textMuted,
        fontSize: 11,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        color: Colors.textMuted,
        fontSize: 16,
        fontWeight: '600',
        marginTop: 15,
    }
});

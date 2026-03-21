import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Share,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import { News } from '../types';
import SmartImage from '../components/SmartImage';

const { width } = Dimensions.get('window');

export default function NewsDetailScreen({ route, navigation }: any) {
    const { newsId, news: initialNews } = route.params;
    const [news, setNews] = useState<News | null>(initialNews || null);
    const [isLoading, setIsLoading] = useState(!initialNews);

    useEffect(() => {
        if (!initialNews && newsId) {
            fetchNewsDetail();
        }
    }, [newsId]);

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
            await Share.share({
                message: `${news.title}\n\n${news.content.substring(0, 100)}...\n\nBatafsil Amatora ilovasida!`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" />
                <Ionicons name="newspaper-outline" size={48} color={Colors.primary} />
                <Text style={styles.loadingText}>Yangilik yuklanmoqda...</Text>
            </View>
        );
    }

    if (!news) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Yangilik topilmadi</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtnText}>Ortga qaytish</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.imageContainer}>
                    <SmartImage
                        uri={news.imageUrl || 'https://images.unsplash.com/photo-1574629810360-7efbb6b6973f?q=80&w=1000'}
                        style={styles.mainImage}
                    />
                    <TouchableOpacity 
                        style={styles.headerActionBtn} 
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.headerActionBtn, { right: 20, left: undefined }]} 
                        onPress={handleShare}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="share-outline" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.contentArea}>
                    <View style={styles.categoryRow}>
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>{news.category?.toUpperCase() || 'YANGILIK'}</Text>
                        </View>
                        <Text style={styles.dateText}>
                            {new Date(news.createdAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </Text>
                    </View>

                    <Text style={styles.title}>{news.title}</Text>

                    <View style={styles.metaRow}>
                        <View style={styles.authorBox}>
                            <View style={styles.authorAvatar}>
                                <Ionicons name="person" size={14} color="#000" />
                            </View>
                            <Text style={styles.authorName}>{news.author || 'Amatora Admin'}</Text>
                        </View>
                        <View style={styles.viewsBox}>
                            <Ionicons name="eye-outline" size={16} color={Colors.textMuted} />
                            <Text style={styles.viewsText}>{news.views || 0} marta ko'rildi</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.content}>{news.content}</Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: Colors.textMuted,
        marginTop: 20,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: '#FFF',
        fontSize: 18,
        marginBottom: 20,
    },
    backBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    backBtnText: {
        color: '#000',
        fontWeight: 'bold',
    },
    imageContainer: {
        width: '100%',
        height: 350,
    },
    mainImage: {
        width: '100%',
        height: '100%',
    },
    headerActionBtn: {
        position: 'absolute',
        top: 50,
        left: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    contentArea: {
        padding: 20,
        marginTop: -30,
        backgroundColor: Colors.background,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    categoryBadge: {
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.2)',
    },
    categoryText: {
        color: Colors.primary,
        fontSize: 10,
        fontWeight: '900',
    },
    dateText: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    title: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '900',
        lineHeight: 32,
        marginBottom: 20,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    authorBox: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    authorAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    authorName: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    viewsBox: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewsText: {
        color: Colors.textMuted,
        fontSize: 13,
        marginLeft: 6,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginBottom: 20,
    },
    content: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 16,
        lineHeight: 26,
        textAlign: 'justify',
    }
});

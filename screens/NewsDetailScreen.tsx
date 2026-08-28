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
    Platform,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import AnimatedBackground from '../components/AnimatedBackground';
import backgroundImage from '../assets/images/backroud-image.png';
import Colors from '../constants/Colors';
import { apiService, supabase } from '../services/apiService';
import { News } from '../types';
import SmartImage from '../components/SmartImage';
import { useTranslation } from 'react-i18next';
import { getLocalizedNewsField, getLocalizedNewsCategory } from '../utils/localizationUtils';

const { width } = Dimensions.get('window');

export default function NewsDetailScreen({ route, navigation }: any) {
    const { t, i18n } = useTranslation();
    const { newsId, news: initialNews } = route.params || {};
    const [news, setNews] = useState<News | null>(initialNews || null);
    const [isLoading, setIsLoading] = useState(!initialNews);
    const [orgInfo, setOrgInfo] = useState<{ name?: string; logo_url?: string } | null>(null);

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
            await Share.share({
                message: `${news.title}\n\n${news.content.substring(0, 100)}...\n\n${t('news.share_text')}`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    if (isLoading) {
        return (
            <AnimatedBackground overlayOpacity={0.8} backgroundImage={backgroundImage}>
                <View style={styles.loadingContainer}>
                    <StatusBar barStyle="light-content" />
                    <Ionicons name="newspaper-outline" size={60} color={Colors.primary} />
                    <Text style={styles.loadingText}>{t('news.loading')}</Text>
                </View>
            </AnimatedBackground>
        );
    }

    if (!news) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('news.not_found')}</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtnText}>{t('news.back_to_list')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <AnimatedBackground overlayOpacity={0.85} backgroundImage={backgroundImage}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
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
                        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.headerActionBtn, { right: 20, left: undefined }]} 
                        onPress={handleShare}
                        activeOpacity={0.7}
                    >
                        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                        <Ionicons name="share-outline" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.contentArea}>
                    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={{ padding: 25 }}>
                        <View style={styles.categoryRow}>
                            <View style={styles.categoryBadge}>
                                <Text style={styles.categoryBadgeText}>{getLocalizedNewsCategory(news.category, t).toUpperCase()}</Text>
                            </View>
                            <Text style={styles.dateText}>
                                {new Date(news.createdAt).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : (i18n.language === 'en' ? 'en-US' : 'uz-UZ'), { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}
                            </Text>
                        </View>

                        <Text style={styles.title}>{getLocalizedNewsField(news, 'title', i18n.language).toUpperCase()}</Text>

                        <View style={styles.metaRow}>
                            <View style={styles.authorBox}>
                                {orgInfo?.logo_url ? (
                                    <Image
                                        source={{ uri: orgInfo.logo_url }}
                                        style={styles.authorLogoFree}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <View style={styles.authorFallbackIcon}>
                                        <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
                                    </View>
                                )}
                                <Text style={styles.authorName}>{(orgInfo?.name || news.author || 'AMATORA').toUpperCase()}</Text>
                            </View>
                            <View style={styles.viewsBox}>
                                <Ionicons name="eye-outline" size={16} color="rgba(255,255,255,0.5)" />
                                <Text style={styles.viewsText}>{t('common.views_count', { count: news.views || 0 }).toUpperCase()}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.content}>{getLocalizedNewsField(news, 'content', i18n.language)}</Text>
                    </View>
                </View>
            </ScrollView>
        </AnimatedBackground>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: Colors.primary, marginTop: 20, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    errorContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 20 },
    errorText: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 20 },
    backBtn: { backgroundColor: Colors.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 30 },
    backBtnText: { color: '#000', fontWeight: '900' },
    imageContainer: { width: '100%', height: 400 },
    mainImage: { width: '100%', height: '100%' },
    headerActionBtn: { position: 'absolute', top: 50, left: 20, width: 44, height: 44, borderRadius: 22, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    contentArea: { marginTop: -40, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden', minHeight: 500, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderBottomWidth: 0 },
    categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    categoryBadge: { backgroundColor: 'rgba(0, 223, 130, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0, 223, 130, 0.3)' },
    categoryBadgeText: { color: Colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    dateText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '900' },
    title: { color: '#FFF', fontSize: 26, fontWeight: '900', lineHeight: 34, marginBottom: 25, letterSpacing: 0.5 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    authorBox: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
    authorLogoFree: { width: 34, height: 34, marginRight: 10, backgroundColor: 'transparent' },
    authorFallbackIcon: { marginRight: 8, justifyContent: 'center', alignItems: 'center' },
    authorName: { color: '#FFF', fontSize: 13, fontWeight: '800', flexShrink: 1 },
    viewsBox: { flexDirection: 'row', alignItems: 'center' },
    viewsText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 6, fontWeight: '800' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 25 },
    content: { color: 'rgba(255,255,255,0.9)', fontSize: 17, lineHeight: 28, textAlign: 'justify', fontWeight: '500' }
});

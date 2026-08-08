import React, { useState, useEffect, useCallback } from 'react';
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
    Platform
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

const { width, height } = Dimensions.get('window');

export default function NewsScreen() {
    const [news, setNews] = useState<News[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('Barchasi');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigation = useNavigation<any>();

    // Add News Modal State
    const [isAddNewsModalVisible, setIsAddNewsModalVisible] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newCategory, setNewCategory] = useState("O'yinlar");
    const [newImageUrl, setNewImageUrl] = useState('');
    const [newContent, setNewContent] = useState('');
    const [isSubmittingNews, setIsSubmittingNews] = useState(false);

    const categories = ['Barchasi', 'Turnirlar', 'Jamoalar', 'Transferlar', "O'yinlar"];

    const handleCreateNews = async () => {
        if (!newTitle.trim()) {
            return;
        }
        try {
            setIsSubmittingNews(true);
            const payload = {
                title: newTitle.trim(),
                category: newCategory,
                imageUrl: newImageUrl.trim() || 'https://images.unsplash.com/photo-1574629810360-7efbb6b6973f?q=80&w=1000',
                content: newContent.trim()
            };
            const res = await apiService.createNews(payload);
            if (res?.success) {
                setIsAddNewsModalVisible(false);
                setNewTitle('');
                setNewContent('');
                setNewImageUrl('');
                fetchNews();
            }
        } catch (e) {
            console.error('Error creating news:', e);
        } finally {
            setIsSubmittingNews(false);
        }
    };

    const fetchNews = async () => {
        try {
            setIsLoading(true);
            const category = selectedCategory === 'Barchasi' ? undefined : selectedCategory;
            const data = await apiService.getNews(1, 40, category); 
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
                <Text style={styles.headerTitle}>YANGILIKLAR</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity style={styles.addNewsBtn} onPress={() => setIsAddNewsModalVisible(true)}>
                        <Ionicons name="add-circle" size={18} color="#000" style={{ marginRight: 4 }} />
                        <Text style={styles.addNewsBtnText}>QO'SHISH</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.searchBtn} onPress={() => setIsSearchVisible(true)}>
                        <Ionicons name="search" size={22} color="#000" />
                    </TouchableOpacity>
                </View>
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
        </View>
    );

    const renderNewsItem = ({ item, index }: { item: News, index: number }) => {
        const isFeatured = index === 0 && selectedCategory === 'Barchasi' && !searchQuery;

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
                                <Text style={styles.categoryBadgeText}>{item.category?.toUpperCase() || 'YANGILIK'}</Text>
                            </View>
                            <Text style={styles.featuredTitle} numberOfLines={2}>{item.title.toUpperCase()}</Text>
                            <View style={styles.newsMeta}>
                                <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.metaText}>{new Date(item.createdAt).toLocaleDateString('uz-UZ')}</Text>
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
                        <Text style={styles.newsCategory}>{item.category?.toUpperCase() || 'YANGILIK'}</Text>
                        <Text style={styles.newsTitle} numberOfLines={2}>{item.title.toUpperCase()}</Text>
                        <View style={styles.newsMeta}>
                            <Text style={styles.metaTextSmall}>{new Date(item.createdAt).toLocaleDateString('uz-UZ')}</Text>
                            <View style={[styles.metaDivider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                            <Ionicons name="eye-outline" size={12} color={Colors.textMuted} />
                            <Text style={styles.metaTextSmall}>{item.views || 0}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderAiCentralMatchCard = () => {
        if (selectedCategory !== 'Barchasi' || searchQuery) return null;

        return (
            <View style={styles.aiCardContainer}>
                <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.aiCardInner}>
                    {/* AI Header Tag */}
                    <View style={styles.aiCardHeader}>
                        <View style={styles.aiHeaderTag}>
                            <Ionicons name="sparkles" size={14} color="#FFE600" style={{ marginRight: 6 }} />
                            <Text style={styles.aiHeaderTagText}>AMATORA AI • MARKAZIY UCHRASHUV TAHLILI</Text>
                        </View>
                    </View>

                    {/* Match Spotlight Header */}
                    <View style={styles.aiTeamsRow}>
                        <View style={styles.aiTeamCol}>
                            <View style={styles.aiLogoCircle}>
                                <Text style={styles.aiLogoText}>B</Text>
                            </View>
                            <Text style={styles.aiTeamName} numberOfLines={1}>BUNYODKOR</Text>
                        </View>

                        <View style={styles.aiVsBox}>
                            <Text style={styles.aiVsText}>VS</Text>
                            <View style={styles.aiTimeBadge}>
                                <Text style={styles.aiTimeBadgeText}>20:00</Text>
                            </View>
                        </View>

                        <View style={styles.aiTeamCol}>
                            <View style={styles.aiLogoCircle}>
                                <Text style={styles.aiLogoText}>P</Text>
                            </View>
                            <Text style={styles.aiTeamName} numberOfLines={1}>PAXTAKOR</Text>
                        </View>
                    </View>

                    {/* AI Tactical Insights Box */}
                    <View style={styles.aiInsightBox}>
                        <View style={styles.aiInsightRow}>
                            <Ionicons name="analytics" size={14} color={Colors.primary} style={{ marginRight: 6 }} />
                            <Text style={styles.aiInsightTitle}>TAKTIK PREVIEW & TAHLIL</Text>
                        </View>
                        <Text style={styles.aiInsightBody}>
                            Amatora AI algoritmi tahliliga ko'ra, ushbu markaziy uchrashuvda mezbonlar yuqori pressinq va qanot hujumlariga tayanadi. Mehmon jamoa esa tezkor kontrhujumlar va markaziy yarim himoyadagi ustunlik orqali g'alabani qo'lga kiritishga urinadi.
                        </Text>
                    </View>

                    {/* AI Win Probability Bar */}
                    <View style={styles.aiProbContainer}>
                        <Text style={styles.aiProbTitle}>AI G'ALABA EHTIMOLI PROGNOZI</Text>
                        <View style={styles.aiProbBar}>
                            <View style={[styles.aiProbSegment, { width: '52%', backgroundColor: '#0EA5E9' }]} />
                            <View style={[styles.aiProbSegment, { width: '24%', backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                            <View style={[styles.aiProbSegment, { width: '24%', backgroundColor: '#EF4444' }]} />
                        </View>
                        <View style={styles.aiProbLabels}>
                            <Text style={{ color: '#0EA5E9', fontSize: 10, fontWeight: '900' }}>Mezbon 52%</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '800' }}>Durang 24%</Text>
                            <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '900' }}>Mehmon 24%</Text>
                        </View>
                    </View>
                </View>
            </View>
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
                            {renderAiCentralMatchCard()}
                            {searchQuery ? (
                                <View style={styles.searchResultHeader}>
                                    <Text style={styles.searchResultText}>"{searchQuery.toUpperCase()}" BO'YICHA NATIJALAR: {filteredNews.length}</Text>
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Text style={{ color: Colors.primary, fontWeight: '900', fontSize: 12 }}>TOZALASH</Text>
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
                        !isLoading ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="newspaper-outline" size={64} color="rgba(255,255,255,0.1)" />
                                <Text style={styles.emptyText}>Hozircha yangiliklar yo'q</Text>
                            </View>
                        ) : null
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
                                    placeholder="YANGILIK QIDIRING..."
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
                            <Text style={styles.searchConfirmText}>NATIJALARNI KO'RISH</Text>
                        </TouchableOpacity>
                    </SafeAreaView>
                </View>
            </Modal>

            {/* Admin Add News Modal */}
            <Modal
                visible={isAddNewsModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsAddNewsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.addNewsModalContent}>
                        <View style={styles.addNewsHeader}>
                            <Text style={styles.addNewsTitle}>YANGI YANGILIK QO'SHISH</Text>
                            <TouchableOpacity onPress={() => setIsAddNewsModalVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Title Field */}
                            <Text style={styles.inputLabel}>YANGILIK SARLAVHASI *</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="Masalan: 4-tur natijalari e'lon qilindi..."
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={newTitle}
                                onChangeText={setNewTitle}
                            />

                            {/* Category Select Buttons */}
                            <Text style={styles.inputLabel}>KATEGORIYA TANLANG *</Text>
                            <View style={styles.categorySelectRow}>
                                {['Turnirlar', 'Jamoalar', 'Transferlar', "O'yinlar"].map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            styles.catSelectChip,
                                            newCategory === cat && styles.catSelectChipActive
                                        ]}
                                        onPress={() => setNewCategory(cat)}
                                    >
                                        <Text style={[
                                            styles.catSelectChipText,
                                            newCategory === cat && styles.catSelectChipTextActive
                                        ]}>
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Image URL Field */}
                            <Text style={styles.inputLabel}>RASM HAVOLA (URL)</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="https://..."
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={newImageUrl}
                                onChangeText={setNewImageUrl}
                            />

                            {/* Content / Matn Field */}
                            <Text style={styles.inputLabel}>YANGILIK MATNI</Text>
                            <TextInput
                                style={[styles.formInput, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                                placeholder="Batafsil matnni yozing..."
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                multiline
                                numberOfLines={4}
                                value={newContent}
                                onChangeText={setNewContent}
                            />

                            {/* Submit Button */}
                            <TouchableOpacity 
                                style={[styles.submitNewsBtn, isSubmittingNews && { opacity: 0.6 }]}
                                onPress={handleCreateNews}
                                disabled={isSubmittingNews}
                            >
                                <Text style={styles.submitNewsBtnText}>
                                    {isSubmittingNews ? "CHOP ETILMOQDA..." : "YANGILIKNI CHOP ETISH"}
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
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
    metaText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginLeft: 4, fontWeight: '700' },
    metaDivider: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 10 },
    newsCard: { borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
    newsImage: { width: 90, height: 90, borderRadius: 14 },
    newsContent: { flex: 1, marginLeft: 15, justifyContent: 'center' },
    newsCategory: { color: Colors.primary, fontSize: 10, fontWeight: '900', marginBottom: 4, letterSpacing: 0.5 },
    newsTitle: { color: '#FFF', fontSize: 15, fontWeight: '800', marginBottom: 8, letterSpacing: 0.2 },
    metaTextSmall: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700' },
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

    // AI Central Match Spotlight Styles
    aiCardContainer: {
        marginBottom: 20,
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: '#FFE600',
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        ...Platform.select({
            ios: {
                shadowColor: '#FFE600',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.35,
                shadowRadius: 15,
            },
            android: { elevation: 8 },
        }),
    },
    aiCardInner: {
        padding: 16,
    },
    aiCardHeader: {
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    aiHeaderTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 230, 0, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 230, 0, 0.4)',
    },
    aiHeaderTagText: {
        color: '#FFE600',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    aiTeamsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 6,
    },
    aiTeamCol: {
        alignItems: 'center',
        flex: 1,
    },
    aiLogoCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1.5,
        borderColor: '#FFE600',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    aiLogoText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '900',
    },
    aiTeamName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
    },
    aiVsBox: {
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    aiVsText: {
        color: '#FFE600',
        fontSize: 20,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    aiTimeBadge: {
        backgroundColor: 'rgba(0, 255, 135, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginTop: 4,
    },
    aiTimeBadgeText: {
        color: Colors.primary,
        fontSize: 10,
        fontWeight: '900',
    },
    aiInsightBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 14,
        padding: 12,
        marginTop: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    aiInsightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    aiInsightTitle: {
        color: Colors.primary,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    aiInsightBody: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 12,
        lineHeight: 17,
        fontWeight: '500',
    },
    aiProbContainer: {
        marginTop: 14,
    },
    aiProbTitle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    aiProbBar: {
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 4,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    aiProbSegment: {
        height: '100%',
    },
    aiProbLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },

    // Add News Modal Styles
    addNewsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
    },
    addNewsBtnText: {
        color: '#000',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    addNewsModalContent: {
        width: '100%',
        maxHeight: '85%',
        backgroundColor: 'rgba(20, 25, 40, 0.95)',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    addNewsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    addNewsTitle: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    modalCloseBtn: {
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
    },
    inputLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 6,
        marginTop: 10,
    },
    formInput: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 48,
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    categorySelectRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    catSelectChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    catSelectChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    catSelectChipText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '700',
    },
    catSelectChipTextActive: {
        color: '#000',
        fontWeight: '900',
    },
    submitNewsBtn: {
        backgroundColor: Colors.primary,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 10,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
    },
    submitNewsBtnText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
});

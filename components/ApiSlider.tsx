import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Animated,
    ActivityIndicator,
} from 'react-native';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import SmartImage from './SmartImage';
import Skeleton from './Skeleton';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.9;
const CARD_SPACING = 10;
const SIDE_PADDING = (screenWidth - CARD_WIDTH) / 2;

interface SliderItem {
    _id?: string;
    id?: string;
    title: string;
    imageUrl: string;
    link?: string;
    linkType?: 'internal' | 'external';
    isActive: boolean;
}

interface ApiSliderProps {
    initialItems?: SliderItem[];
    externalLoading?: boolean;
}

const ApiSlider: React.FC<ApiSliderProps> = ({ initialItems, externalLoading }) => {
    const [items, setItems] = useState<SliderItem[]>(initialItems || []);
    const [loading, setLoading] = useState(externalLoading !== undefined ? externalLoading : true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (initialItems && initialItems.length > 0) {
            setItems(initialItems);
            setLoading(false);
        } else if (externalLoading === false) {
             // If not loading and no items, maybe we need to fetch or show fallback
             loadSliderItems();
        } else if (externalLoading === undefined) {
            loadSliderItems();
        }
    }, [initialItems]);

    useEffect(() => {
        if (externalLoading !== undefined) {
            setLoading(externalLoading);
        }
    }, [externalLoading]);

    const loadSliderItems = async () => {
        try {
            setLoading(true);
            const data = await apiService.getSliderItems();
            if (data && Array.isArray(data) && data.length > 0) {
                const activeItems = data.filter((item: SliderItem) => item.isActive);
                if (activeItems.length > 0) {
                    setItems(activeItems);
                    return;
                }
            }
            // Fallback to mock data if no items exist
            setItems([
                { id: 'm1', title: 'Amatora Superliga Yangi Mavsumi Boshlandi!', imageUrl: 'https://images.unsplash.com/photo-1518605368461-1ee0684f88e1?q=80&w=2074&auto=format&fit=crop', isActive: true },
                { id: 'm2', title: 'Chempionlar Ligasi finali yondiradi', imageUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=2070&auto=format&fit=crop', isActive: true },
                { id: 'm3', title: "Eng yaxshi to'purar aniqlandi", imageUrl: 'https://images.unsplash.com/photo-1551280857-2b9bbe5204ce?q=80&w=2070&auto=format&fit=crop', isActive: true }
            ]);
        } catch (error) {
            console.error('Error loading slider items:', error);
            // Fallback to mock data on error
            setItems([
                { id: 'm1', title: 'Amatora Superliga Yangi Mavsumi Boshlandi!', imageUrl: 'https://images.unsplash.com/photo-1518605368461-1ee0684f88e1?q=80&w=2074&auto=format&fit=crop', isActive: true },
                { id: 'm2', title: 'Chempionlar Ligasi finali yondiradi', imageUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=2070&auto=format&fit=crop', isActive: true }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (items.length > 1) {
            const interval = setInterval(() => {
                const nextIndex = (currentIndex + 1) % items.length;
                scrollViewRef.current?.scrollTo({
                    x: nextIndex * (CARD_WIDTH + CARD_SPACING),
                    animated: true,
                });
                setCurrentIndex(nextIndex);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [items, currentIndex]);

    const handleScroll = (event: any) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / (CARD_WIDTH + CARD_SPACING));
        setCurrentIndex(index);
    };

    if (loading && items.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <Skeleton width={screenWidth - 40} height={180} borderRadius={20} />
            </View>
        );
    }

    if (items.length === 0) return null;

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH + CARD_SPACING}
                decelerationRate="fast"
                onScroll={handleScroll}
                scrollEventThrottle={16}
                contentContainerStyle={styles.scrollContent}
            >
                {items.map((item, index) => (
                    <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.9}
                        style={[styles.card, { marginRight: index === items.length - 1 ? 0 : CARD_SPACING }]}
                    >
                        <SmartImage
                            uri={item.imageUrl}
                            style={styles.image}
                            contentFit="cover"
                            fallbackIcon="image-outline"
                            fallbackIconSize={48}
                        />
                        <View style={styles.overlay}>
                            <Text style={styles.title} numberOfLines={2}>
                                {item.title}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 15,
    },
    loadingContainer: {
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: SIDE_PADDING,
    },
    card: {
        width: CARD_WIDTH,
        height: 180,
        borderRadius: 15,
        overflow: 'hidden',
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 15,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    title: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 10,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.textMuted,
        marginHorizontal: 4,
        opacity: 0.5,
    },
    activeDot: {
        backgroundColor: Colors.primary,
        width: 20,
        opacity: 1,
    },
});

export default ApiSlider;

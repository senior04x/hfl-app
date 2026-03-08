import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    Animated,
    ActivityIndicator,
} from 'react-native';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.9;
const CARD_SPACING = 10;
const SIDE_PADDING = (screenWidth - CARD_WIDTH) / 2;

interface SliderItem {
    id: string;
    title: string;
    imageUrl: string;
    link?: string;
    linkType?: 'internal' | 'external';
    isActive: boolean;
}

const ApiSlider: React.FC = () => {
    const [items, setItems] = useState<SliderItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        loadSliderItems();
    }, []);

    const loadSliderItems = async () => {
        try {
            setLoading(true);
            const response = await apiService.getSliderItems();
            if (response.data.success && response.data.data) {
                const activeItems = response.data.data.filter((item: SliderItem) => item.isActive);
                setItems(activeItems);
            }
        } catch (error) {
            console.error('Error loading slider items:', error);
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

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color={Colors.primary} />
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
                        <Image
                            source={{ uri: item.imageUrl }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                        <View style={styles.overlay}>
                            <Text style={styles.title} numberOfLines={2}>
                                {item.title}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.pagination}>
                {items.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            currentIndex === index ? styles.activeDot : null
                        ]}
                    />
                ))}
            </View>
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

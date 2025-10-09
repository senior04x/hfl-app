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
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SliderItem } from '../types';
import { sliderService } from '../services/sliderService';
import { useTheme } from '../store/useThemeStore';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.85; // 85% width for better peek effect
const CARD_SPACING = 1; // Very tight spacing between cards
const SIDE_PADDING = (screenWidth - CARD_WIDTH) / 2; // Calculate side padding for 85% width

interface ApiSliderProps {
  onItemPress?: (item: SliderItem) => void;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  refreshTrigger?: number; // Add refresh trigger prop
}

const ApiSlider: React.FC<ApiSliderProps> = ({ 
  onItemPress,
  autoPlay = true,
  autoPlayInterval = 6000,
  refreshTrigger,
}) => {
  const { colors } = useTheme();
  const [sliderItems, setSliderItems] = useState<SliderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(1); // Start from 1 for infinite scroll
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSliderItems();
  }, []);

  // Reload slider items when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      loadSliderItems();
    }
  }, [refreshTrigger]);

  const loadSliderItems = async () => {
    try {
      setLoading(true);
      console.log('Loading slider items from API...');
      
      const response = await sliderService.getActiveSliderItems();
      
      if (response.success && response.data) {
        console.log('Slider items loaded:', response.data.length);
        setSliderItems(response.data);
        
        // Initial scroll to position the slider at the first real card
        if (response.data.length > 0) {
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({
              x: (CARD_WIDTH + CARD_SPACING),
              animated: false,
            });
          }, 100);
        }
      } else {
        console.error('Failed to load slider items:', response.error);
        setSliderItems([]);
      }
    } catch (error) {
      console.error('Error loading slider items:', error);
      setSliderItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Create infinite cards array with unique keys
  const infiniteCards = sliderItems.length > 0 ? [
    { ...sliderItems[sliderItems.length - 1], id: `${sliderItems[sliderItems.length - 1].id}-clone-last` },
    ...sliderItems,
    { ...sliderItems[0], id: `${sliderItems[0].id}-clone-first` }
  ] : [];

  useEffect(() => {
    if (autoPlay && sliderItems.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          scrollViewRef.current?.scrollTo({
            x: nextIndex * (CARD_WIDTH + CARD_SPACING),
            animated: true,
          });
          return nextIndex;
        });
      }, autoPlayInterval);

      return () => clearInterval(interval);
    }
  }, [autoPlay, autoPlayInterval, sliderItems.length]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleScrollEnd = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / (CARD_WIDTH + CARD_SPACING));
    
    // Handle infinite scroll
    if (index === 0) {
      // If at the first (duplicate) card, jump to the real last card
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: sliderItems.length * (CARD_WIDTH + CARD_SPACING),
          animated: false,
        });
        setCurrentIndex(sliderItems.length);
      }, 50);
    } else if (index === infiniteCards.length - 1) {
      // If at the last (duplicate) card, jump to the real first card
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: (CARD_WIDTH + CARD_SPACING),
          animated: false,
        });
        setCurrentIndex(1);
      }, 50);
    } else {
      setCurrentIndex(index);
    }
  };

  const handleItemPress = async (item: SliderItem) => {
    console.log('Slider item pressed:', item.title, 'Link:', item.link, 'Type:', item.linkType);
    
    if (onItemPress) {
      onItemPress(item);
    }
    
    // Handle link navigation
    if (item.link) {
      if (item.linkType === 'external') {
        // Open external URL
        try {
          const supported = await Linking.canOpenURL(item.link);
          if (supported) {
            await Linking.openURL(item.link);
          } else {
            Alert.alert('Xatolik', 'Bu linkni ochish mumkin emas');
          }
        } catch (error) {
          console.error('Error opening external link:', error);
          Alert.alert('Xatolik', 'Link ochishda xatolik yuz berdi');
        }
      } else if (item.linkType === 'internal') {
        // Handle internal navigation
        console.log('Internal navigation to:', item.link);
        // Bu yerda navigation logic qo'shiladi
        // Masalan: navigation.navigate(item.link)
        Alert.alert('Ichki sahifa', `${item.link} sahifasiga o'tish`);
      }
    } else {
      console.log('No link specified for this slider item');
    }
  };

  const renderSliderItem = (item: SliderItem, index: number) => {
    const inputRange = [
      (index - 1) * (CARD_WIDTH + CARD_SPACING),
      index * (CARD_WIDTH + CARD_SPACING),
      (index + 1) * (CARD_WIDTH + CARD_SPACING),
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.7, 1, 0.7],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        key={item.id}
        style={[
          styles.card,
          {
            width: CARD_WIDTH,
            marginRight: index === infiniteCards.length - 1 ? 0 : CARD_SPACING,
            transform: [{ scale }],
            opacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => handleItemPress(item)}
          activeOpacity={0.8}
        >
          {item.imageUrl && (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Slider yuklanmoqda...
        </Text>
      </View>
    );
  }

  if (sliderItems.length === 0) {
    return null; // Don't render anything if no slider items
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="center"
        decelerationRate="fast"
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
      >
        {infiniteCards.map((item, index) => (
          <React.Fragment key={item.id}>
            {renderSliderItem(item, index)}
          </React.Fragment>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginHorizontal: 20,
  },
  loadingText: {
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: SIDE_PADDING,
  },
  card: {
    height: 200,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardContent: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 16,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noImageContent: {
    padding: 16,
    backgroundColor: 'white',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  indicator: {
    marginLeft: 8,
  },
});

export default ApiSlider;

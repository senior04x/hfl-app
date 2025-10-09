import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.85; // 85% width for better peek effect
const CARD_SPACING = 1; // Very tight spacing between cards
const SIDE_PADDING = (screenWidth - CARD_WIDTH) / 2; // Calculate side padding for 80% width

interface SliderCard {
  id: string;
  imageUrl: string;
  onPress?: () => void;
}

interface CardSliderProps {
  cards: SliderCard[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  onCardPress?: (card: SliderCard) => void;
}

const CardSlider: React.FC<CardSliderProps> = ({
  cards,
  autoPlay = true,
  autoPlayInterval = 4000,
  onCardPress,
}) => {
  const { colors } = useTheme();
  const { getText } = useLanguage();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(1); // Start from 1 for infinite scroll
  const scrollX = useRef(new Animated.Value(0)).current;
  
  // Create infinite cards array with unique keys
  const infiniteCards = [
    { ...cards[cards.length - 1], id: `${cards[cards.length - 1].id}-clone-last` },
    ...cards,
    { ...cards[0], id: `${cards[0].id}-clone-first` }
  ];

  useEffect(() => {
    // Initial scroll to position the slider at the first real card
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        x: (CARD_WIDTH + CARD_SPACING),
        animated: false,
      });
    }, 100);
  }, []);

  useEffect(() => {
    if (autoPlay && cards.length > 1) {
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
  }, [autoPlay, autoPlayInterval, cards.length]);

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
          x: cards.length * (CARD_WIDTH + CARD_SPACING),
          animated: false,
        });
        setCurrentIndex(cards.length);
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

  const renderCard = (card: SliderCard, index: number) => {
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
        key={card.id}
        style={[
          styles.card,
          {
            width: CARD_WIDTH,
            marginRight: index === cards.length - 1 ? 0 : CARD_SPACING,
            transform: [{ scale }],
            opacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => {
            onCardPress?.(card);
            card.onPress?.();
          }}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: card.imageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderDots = () => {
    // Dots removed as requested
    return null;
  };

  // Get the real current index for display purposes
  const getRealCurrentIndex = () => {
    if (currentIndex === 0) return cards.length - 1;
    if (currentIndex === infiniteCards.length - 1) return 0;
    return currentIndex - 1;
  };

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
        {infiniteCards.map((card, index) => (
          <React.Fragment key={card.id}>
            {renderCard(card, index)}
          </React.Fragment>
        ))}
      </ScrollView>
      {renderDots()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: SIDE_PADDING,
  },
  card: {
    height: 200, // Fixed height for full image coverage
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
    borderRadius: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    paddingHorizontal: SIDE_PADDING,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});

export default CardSlider;

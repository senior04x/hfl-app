import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Animated,
  Text,
} from 'react-native';
import { useTheme } from '../store/useThemeStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTeamStore } from '../store/useTeamStore';

interface SplashScreenProps {
  navigation: any;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { isLoggedIn: isPlayerLoggedIn, player } = usePlayerStore();
  const { isLoggedIn: isTeamLoggedIn, team } = useTeamStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after 2 seconds
    const timer = setTimeout(() => {
      if (isPlayerLoggedIn && player) {
        // Player login qilgan bo'lsa, PlayerDashboard'ga o'tish
        navigation.replace('PlayerDashboard', { 
          playerId: player.id,
          player: player 
        });
      } else if (isTeamLoggedIn && team) {
        // Team login qilgan bo'lsa, TrainerDashboard'ga o'tish
        const trainerData = {
          id: team.id,
          name: team.name,
          teamId: team.id,
          teamName: team.name,
          teamPhone: team.captainPhone,
          status: team.status,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
        };
        navigation.replace('TrainerDashboard', {
          trainerId: team.id,
          trainer: trainerData
        });
      } else {
        // Hech kim login qilmagan bo'lsa, Main sahifaga o'tish
        navigation.replace('Main');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation, fadeAnim, scaleAnim]);

  return (
    <View style={[styles.container, { backgroundColor: '#0f0f23' }]}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require('../../assets/havas-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.subtitle, { color: '#cccccc' }]}>HFL Sports</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
  subtitle: {
    fontSize: 14,
    color: '#cccccc',
    marginTop: -40,
    textAlign: 'center',
  },
});

export default SplashScreen;

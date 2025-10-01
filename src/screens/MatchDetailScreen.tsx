import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';

import { useTheme } from '../store/useThemeStore';
import { RootStackParamList, Match } from '../types';
import { db } from '../services/firebase';

type MatchDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MatchDetail'>;
type MatchDetailScreenRouteProp = RouteProp<RootStackParamList, 'MatchDetail'>;

const MatchDetailScreen = () => {
  const navigation = useNavigation<MatchDetailScreenNavigationProp>();
  const route = useRoute<MatchDetailScreenRouteProp>();
  const { colors } = useTheme();
  const { matchId } = route.params;
  
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatch();
  }, [matchId]);

  const fetchMatch = async () => {
    try {
      setLoading(true);
      console.log('Fetching match details:', matchId);
      
      const matchRef = doc(db, 'matches', matchId);
      const matchSnap = await getDoc(matchRef);
      
      if (matchSnap.exists()) {
        const data = matchSnap.data();
        const matchData: Match = {
          id: matchSnap.id,
          homeTeamId: data.homeTeamId || '',
          homeTeamName: data.homeTeamName || '',
          awayTeamId: data.awayTeamId || '',
          awayTeamName: data.awayTeamName || '',
          homeScore: data.homeScore || 0,
          awayScore: data.awayScore || 0,
            matchDate: data.matchDate?.toDate ? data.matchDate.toDate() : new Date(data.matchDate),
            status: data.status || 'scheduled',
            venue: data.venue || '',
            referee: data.referee || '',
            youtubeLink: data.youtubeLink || '',
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        };
        
        console.log('Match details fetched:', matchData);
        setMatch(matchData);
      } else {
        console.log('Match not found');
        setMatch(null);
      }
    } catch (error) {
      console.error('Error fetching match details:', error);
      setMatch(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return '#FF3B30';
      case 'finished':
        return '#34C759';
      default:
        return '#007AFF';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Rejalashtirilgan';
      case 'live':
        return 'Jarayonda';
      case 'finished':
        return 'Tugagan';
      default:
        return 'Noma\'lum';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('uz-UZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const openYouTubeLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Xatolik', 'YouTube linkini ochish mumkin emas');
      }
    } catch (error) {
      console.error('Error opening YouTube link:', error);
      Alert.alert('Xatolik', 'YouTube linkini ochishda xatolik yuz berdi');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Ma'lumotlar yuklanmoqda...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!match) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            O'yin topilmadi
          </Text>
          <TouchableOpacity
            style={[styles.backToHomeButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backToHomeText}>Orqaga qaytish</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>O'yin Tafsilotlari</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Match Header */}
        <View style={[styles.matchHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.teamsContainer}>
            <View style={styles.teamContainer}>
              <Text style={[styles.teamName, { color: colors.text }]}>{match.homeTeamName}</Text>
            </View>
            
            <View style={styles.scoreContainer}>
              <Text style={[styles.score, { color: colors.text }]}>
                {match.status === 'scheduled' ? 'VS' : `${match.homeScore} - ${match.awayScore}`}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(match.status) }]}>
                <Text style={styles.statusText}>
                  {getStatusText(match.status)}
                </Text>
              </View>
            </View>
            
            <View style={styles.teamContainer}>
              <Text style={[styles.teamName, { color: colors.text }]}>{match.awayTeamName}</Text>
            </View>
          </View>
        </View>

        {/* Match Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>O'yin Ma'lumotlari</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Sana va Vaqt</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {formatDate(match.matchDate)}
              </Text>
            </View>
          </View>

          {match.venue && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Maydon</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{match.venue}</Text>
              </View>
            </View>
          )}

          {match.referee && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Hakam</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{match.referee}</Text>
              </View>
            </View>
          )}

          {match.youtubeLink && (
            <View style={styles.infoRow}>
              <Ionicons name="play-circle-outline" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Jonli Ko'rish</Text>
                <TouchableOpacity
                  style={[styles.youtubeButton, { backgroundColor: colors.primary }]}
                  onPress={() => openYouTubeLink(match.youtubeLink!)}
                >
                  <Ionicons name="play" size={16} color="white" />
                  <Text style={styles.youtubeButtonText}>YouTube da Ko'rish</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>


        {/* Live Match Indicator */}
        {match.status === 'live' && (
          <View style={[styles.liveCard, { backgroundColor: '#FF3B30' }]}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <Text style={styles.liveDescription}>
              O'yin hozir jarayonda. Hisoblar real vaqtda yangilanadi.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  backToHomeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  backToHomeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  matchHeader: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamContainer: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  score: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  liveCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 8,
  },
  liveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  liveDescription: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
  },
  youtubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  youtubeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default MatchDetailScreen;


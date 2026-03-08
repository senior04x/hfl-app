import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';

import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';
import { RootStackParamList, Match } from '../types';
import { db } from '../lib/firebase';

type MatchDetailScreenRouteProp = RouteProp<RootStackParamList, 'MatchDetail'>;
type MatchDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MatchDetail'>;

const MatchDetailScreen = () => {
  const route = useRoute<MatchDetailScreenRouteProp>();
  const navigation = useNavigation<MatchDetailScreenNavigationProp>();
  const { colors } = useTheme();
  const { getText, language } = useLanguage();
  const { matchId } = route.params;
  
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatchDetails();
  }, [matchId]);

  const fetchMatchDetails = async () => {
    try {
      setLoading(true);
      const matchDoc = await getDoc(doc(db, 'matches', matchId));
      
      if (matchDoc.exists()) {
        const data = matchDoc.data();
        const matchData: Match = {
          id: matchDoc.id,
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
          leagueType: data.leagueType || '',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        };
        setMatch(matchData);
      } else {
        Alert.alert(getText('error'), 'Match not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching match details:', error);
      Alert.alert(getText('error'), 'Failed to load match details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    let locale = 'uz-UZ';
    if (language === 'en') {
      locale = 'en-US';
    } else if (language === 'ru') {
      locale = 'ru-RU';
    }
    
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
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
        return getText('scheduled');
      case 'live':
        return getText('live');
      case 'finished':
        return getText('finished');
      default:
        return getText('unknown');
    }
  };

  const openYouTubeLink = async () => {
    if (match?.youtubeLink) {
      try {
        const supported = await Linking.canOpenURL(match.youtubeLink);
        if (supported) {
          await Linking.openURL(match.youtubeLink);
        } else {
          Alert.alert(getText('error'), 'Cannot open YouTube link');
        }
      } catch (error) {
        Alert.alert(getText('error'), 'Error opening YouTube link');
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{getText('matchDetails')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>{getText('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!match) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{getText('matchDetails')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>{getText('noData')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{getText('matchDetails')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Match Status */}
        <View style={[styles.statusCard, { backgroundColor: colors.surface }]}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(match.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(match.status) }]}>
              {getStatusText(match.status).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Teams and Score */}
        <View style={[styles.matchCard, { backgroundColor: colors.surface }]}>
          <View style={styles.teamsContainer}>
            <View style={styles.teamContainer}>
              <Text style={[styles.teamName, { color: colors.text }]}>{match.homeTeamName}</Text>
            </View>
            
            <View style={styles.scoreContainer}>
              <Text style={[styles.score, { color: colors.text }]}>
                {match.status === 'scheduled' ? 'VS' : `${match.homeScore} - ${match.awayScore}`}
              </Text>
            </View>
            
            <View style={styles.teamContainer}>
              <Text style={[styles.teamName, { color: colors.text }]}>{match.awayTeamName}</Text>
            </View>
          </View>
        </View>

        {/* Match Information */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{getText('matchInformation')}</Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{getText('dateAndTime')}:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(match.matchDate)}</Text>
          </View>
          
          {match.venue && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{getText('venue')}:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{match.venue}</Text>
            </View>
          )}
          
          {match.referee && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{getText('referee')}:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{match.referee}</Text>
            </View>
          )}
          
          {match.leagueType && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{getText('league')}:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{match.leagueType}</Text>
            </View>
          )}
        </View>

        {/* YouTube Link */}
        {match.youtubeLink && (
          <TouchableOpacity 
            style={[styles.youtubeCard, { backgroundColor: colors.surface }]}
            onPress={openYouTubeLink}
          >
            <View style={styles.youtubeContent}>
              <Ionicons name="logo-youtube" size={24} color="#FF0000" />
              <View style={styles.youtubeText}>
                <Text style={[styles.youtubeTitle, { color: colors.text }]}>{getText('liveStream')}</Text>
                <Text style={[styles.youtubeSubtitle, { color: colors.textSecondary }]}>{getText('watchOnYouTube')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  matchCard: {
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  score: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  youtubeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  youtubeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  youtubeText: {
    flex: 1,
    marginLeft: 12,
  },
  youtubeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  youtubeSubtitle: {
    fontSize: 14,
  },
});

export default MatchDetailScreen;

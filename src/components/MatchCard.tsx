import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Match } from '../types';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';

interface MatchCardProps {
  match: Match;
  onPress: () => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onPress }) => {
  const { colors } = useTheme();
  const { getText, language } = useLanguage();
  const formatDate = (date: Date) => {
    let locale = 'uz-UZ';
    if (language === 'en') {
      locale = 'en-US';
    } else if (language === 'ru') {
      locale = 'ru-RU';
    }
    
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getTeamShortName = (teamName: string) => {
    // Convert team name to 3-letter abbreviation
    const words = teamName.split(' ');
    if (words.length >= 2) {
      return words.map(word => word.charAt(0)).join('').substring(0, 3).toUpperCase();
    }
    return teamName.substring(0, 3).toUpperCase();
  };

  const getMatchRound = (match: Match) => {
    // Generate round number based on match ID (1-30 rounds)
    const hash = match.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const roundNumber = (Math.abs(hash) % 30) + 1;
    return `${roundNumber}-${getText('round')}`;
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live':
        return 'radio';
      case 'finished':
        return 'checkmark-circle';
      default:
        return 'time';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return getText('scheduled').toUpperCase();
      case 'live':
        return getText('live').toUpperCase();
      case 'finished':
        return getText('finished').toUpperCase();
      default:
        return getText('unknown').toUpperCase();
    }
  };

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: colors.surface }]} onPress={onPress}>
      {/* Match Round */}
      <Text style={[styles.matchStage, { color: colors.textSecondary }]}>
        {getMatchRound(match)}
      </Text>

      {/* Teams and Score */}
      <View style={styles.teamsContainer}>
        {/* Home Team */}
        <View style={styles.teamContainer}>
          <Text style={[styles.teamShortName, { color: colors.text }]}>
            {getTeamShortName(match.homeTeamName)}
          </Text>
          <View style={styles.teamLogo}>
            <Ionicons name="football" size={20} color={colors.primary} />
          </View>
        </View>

        {/* Score */}
        <View style={styles.scoreContainer}>
          <Text style={[styles.score, { color: colors.text }]}>
            {match.status === 'scheduled' ? '-:-' : `${match.homeScore} - ${match.awayScore}`}
          </Text>
          <Text style={[styles.dateTime, { color: colors.textSecondary }]}>
            {formatDate(match.matchDate)}
          </Text>
        </View>

        {/* Away Team */}
        <View style={styles.teamContainer}>
          <View style={styles.teamLogo}>
            <Ionicons name="football" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.teamShortName, { color: colors.text }]}>
            {getTeamShortName(match.awayTeamName)}
          </Text>
        </View>
      </View>

      {/* Venue */}
      {match.venue && (
        <View style={styles.venueContainer}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.venue, { color: colors.textSecondary }]}>{match.venue}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 120,
  },
  matchStage: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'lowercase',
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  teamContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamShortName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  teamLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  score: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dateTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  venueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  venue: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default MatchCard;


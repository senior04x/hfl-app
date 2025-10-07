import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
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
      month: 'short',
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
    <TouchableOpacity style={[styles.container, { backgroundColor: colors.card }]} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={getStatusIcon(match.status)} 
            size={16} 
            color={getStatusColor(match.status)} 
          />
          <Text style={[styles.status, { color: getStatusColor(match.status) }]}>
            {getStatusText(match.status)}
          </Text>
        </View>
        <Text style={[styles.date, { color: colors.textSecondary }]}>{formatDate(match.matchDate)}</Text>
      </View>

      <View style={styles.teams}>
        <View style={styles.team}>
          <Text style={[styles.teamName, { color: colors.text }]}>{match.homeTeamName}</Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={[styles.score, { color: colors.text }]}>
            {match.status === 'scheduled' ? 'VS' : `${match.homeScore} - ${match.awayScore}`}
          </Text>
        </View>

        <View style={styles.team}>
          <Text style={[styles.teamName, { color: colors.text }]}>{match.awayTeamName}</Text>
        </View>
      </View>

      {match.venue && (
        <View style={styles.venueContainer}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.venue, { color: colors.textSecondary }]}>{match.venue}</Text>
        </View>
      )}

      {match.status === 'live' && (
        <View style={[styles.liveIndicator, { borderTopColor: colors.border }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 140,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  date: {
    fontSize: 14,
    fontWeight: '500',
  },
  teams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  team: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  teamColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 8,
  },
  scoreContainer: {
    alignItems: 'center',
    minWidth: 60,
  },
  score: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 6,
  },
  liveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  venueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  venue: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default MatchCard;


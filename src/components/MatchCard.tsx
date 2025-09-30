import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Match } from '../types';

interface MatchCardProps {
  match: Match;
  onPress: () => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onPress }) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('uz-UZ', {
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
        return 'REJALASHTIRILGAN';
      case 'live':
        return 'JARAYONDA';
      case 'finished':
        return 'TUGAGAN';
      default:
        return 'NOMA\'LUM';
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
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
        <Text style={styles.date}>{formatDate(match.matchDate)}</Text>
      </View>

      <View style={styles.teams}>
        <View style={styles.team}>
          <Text style={styles.teamName}>{match.homeTeamName}</Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.score}>
            {match.status === 'scheduled' ? 'VS' : `${match.homeScore} - ${match.awayScore}`}
          </Text>
        </View>

        <View style={styles.team}>
          <Text style={styles.teamName}>{match.awayTeamName}</Text>
        </View>
      </View>

      {match.venue && (
        <View style={styles.venueContainer}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.venue}>{match.venue}</Text>
        </View>
      )}

      {match.status === 'live' && (
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 280,
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
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  teams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  team: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF3B30',
  },
  venueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  venue: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});

export default MatchCard;


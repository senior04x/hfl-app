import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { DataService } from '../services/data';
import { Match } from '../types';

type MatchDetailRouteProp = RouteProp<RootStackParamList, 'MatchDetail'>;

const MatchDetailScreen = () => {
  const route = useRoute<MatchDetailRouteProp>();
  const { matchId } = route.params;
  
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Subscribe to real-time updates for this match
    const unsubscribe = DataService.subscribeToMatch(matchId, (updatedMatch) => {
      setMatch(updatedMatch);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [matchId]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading match details...</Text>
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>Match not found</Text>
      </View>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
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
      case 'live':
        return 'LIVE';
      case 'finished':
        return 'FINISHED';
      default:
        return 'SCHEDULED';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(match.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(match.status) }]}>
            {getStatusText(match.status)}
          </Text>
        </View>
        
        <Text style={styles.dateText}>{formatDate(match.scheduledAt)}</Text>
      </View>

      <View style={styles.scoreboard}>
        <View style={styles.teamSection}>
          <View style={styles.teamInfo}>
            <View style={[styles.teamColor, { backgroundColor: match.homeTeam.color }]} />
            <Text style={styles.teamName}>{match.homeTeam.name}</Text>
          </View>
          <Text style={styles.teamScore}>{match.score.home}</Text>
        </View>

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={styles.teamSection}>
          <Text style={styles.teamScore}>{match.score.away}</Text>
          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>{match.awayTeam.name}</Text>
            <View style={[styles.teamColor, { backgroundColor: match.awayTeam.color }]} />
          </View>
        </View>
      </View>

      {match.status === 'live' && (
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE UPDATES ENABLED</Text>
        </View>
      )}

      <View style={styles.matchInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={20} color="#666" />
          <Text style={styles.infoText}>
            {new Intl.DateTimeFormat('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }).format(match.scheduledAt)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time" size={20} color="#666" />
          <Text style={styles.infoText}>
            {new Intl.DateTimeFormat('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }).format(match.scheduledAt)}
          </Text>
        </View>

        {match.startedAt && (
          <View style={styles.infoRow}>
            <Ionicons name="play" size={20} color="#34C759" />
            <Text style={styles.infoText}>
              Started: {formatDate(match.startedAt)}
            </Text>
          </View>
        )}

        {match.finishedAt && (
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text style={styles.infoText}>
              Finished: {formatDate(match.finishedAt)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.teamsInfo}>
        <Text style={styles.sectionTitle}>Teams</Text>
        
        <View style={styles.teamCard}>
          <View style={styles.teamHeader}>
            <View style={[styles.teamColor, { backgroundColor: match.homeTeam.color }]} />
            <Text style={styles.teamName}>{match.homeTeam.name}</Text>
          </View>
          <Text style={styles.playerCount}>{match.homeTeam.players.length} players</Text>
        </View>

        <View style={styles.teamCard}>
          <View style={styles.teamHeader}>
            <View style={[styles.teamColor, { backgroundColor: match.awayTeam.color }]} />
            <Text style={styles.teamName}>{match.awayTeam.name}</Text>
          </View>
          <Text style={styles.playerCount}>{match.awayTeam.players.length} players</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#FF3B30',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  scoreboard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  teamSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 12,
  },
  teamColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  teamScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 60,
    textAlign: 'center',
  },
  vsContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  vsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
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
    fontSize: 14,
    fontWeight: 'bold',
  },
  matchInfo: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  teamsInfo: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  teamCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerCount: {
    fontSize: 14,
    color: '#666',
  },
});

export default MatchDetailScreen;

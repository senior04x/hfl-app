import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { DataService } from '../services/data';
import { Match } from '../types';

type AdminScoreUpdateRouteProp = RouteProp<RootStackParamList, 'AdminScoreUpdate'>;

const AdminScoreUpdateScreen = () => {
  const route = useRoute<AdminScoreUpdateRouteProp>();
  const { matchId } = route.params;
  
  const [match, setMatch] = useState<Match | null>(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const loadMatch = async () => {
      try {
        const matchData = await DataService.getMatch(matchId);
        if (matchData) {
          setMatch(matchData);
          setHomeScore(matchData.score.home);
          setAwayScore(matchData.score.away);
        }
      } catch (error) {
        console.error('Error loading match:', error);
        Alert.alert('Error', 'Failed to load match details');
      } finally {
        setIsLoading(false);
      }
    };

    loadMatch();
  }, [matchId]);

  const handleUpdateScore = async () => {
    if (!match) return;

    setIsUpdating(true);
    try {
      await DataService.updateMatchScore(matchId, {
        home: homeScore,
        away: awayScore,
      });
      Alert.alert('Success', 'Score updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update score');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (status: 'scheduled' | 'live' | 'finished') => {
    if (!match) return;

    Alert.alert(
      'Change Match Status',
      `Are you sure you want to change the match status to ${status.toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await DataService.updateMatchStatus(matchId, status);
              Alert.alert('Success', 'Match status updated successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to update match status');
            }
          },
        },
      ]
    );
  };

  const ScoreInput = ({ 
    label, 
    value, 
    onChange, 
    teamColor 
  }: { 
    label: string; 
    value: number; 
    onChange: (value: number) => void; 
    teamColor: string; 
  }) => (
    <View style={styles.scoreInputContainer}>
      <Text style={styles.scoreInputLabel}>{label}</Text>
      <View style={styles.scoreInputRow}>
        <TouchableOpacity
          style={[styles.scoreButton, { backgroundColor: teamColor }]}
          onPress={() => onChange(Math.max(0, value - 1))}
        >
          <Ionicons name="remove" size={20} color="white" />
        </TouchableOpacity>
        
        <View style={styles.scoreDisplay}>
          <Text style={styles.scoreText}>{value}</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.scoreButton, { backgroundColor: teamColor }]}
          onPress={() => onChange(value + 1)}
        >
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Update Score</Text>
        <Text style={styles.subtitle}>
          {match.homeTeam.name} vs {match.awayTeam.name}
        </Text>
      </View>

      <View style={styles.matchInfo}>
        <View style={styles.teamInfo}>
          <View style={[styles.teamColor, { backgroundColor: match.homeTeam.color }]} />
          <Text style={styles.teamName}>{match.homeTeam.name}</Text>
        </View>
        
        <Text style={styles.vsText}>VS</Text>
        
        <View style={styles.teamInfo}>
          <Text style={styles.teamName}>{match.awayTeam.name}</Text>
          <View style={[styles.teamColor, { backgroundColor: match.awayTeam.color }]} />
        </View>
      </View>

      <View style={styles.scoreSection}>
        <Text style={styles.sectionTitle}>Current Score</Text>
        
        <ScoreInput
          label={match.homeTeam.name}
          value={homeScore}
          onChange={setHomeScore}
          teamColor={match.homeTeam.color}
        />
        
        <ScoreInput
          label={match.awayTeam.name}
          value={awayScore}
          onChange={setAwayScore}
          teamColor={match.awayTeam.color}
        />
      </View>

      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Match Status</Text>
        
        <View style={styles.statusContainer}>
          <Text style={styles.currentStatus}>
            Current Status: <Text style={styles.statusValue}>{match.status.toUpperCase()}</Text>
          </Text>
          
          <View style={styles.statusButtons}>
            {match.status !== 'scheduled' && (
              <TouchableOpacity
                style={styles.statusButton}
                onPress={() => handleStatusChange('scheduled')}
              >
                <Text style={styles.statusButtonText}>Mark as Scheduled</Text>
              </TouchableOpacity>
            )}
            
            {match.status !== 'live' && (
              <TouchableOpacity
                style={[styles.statusButton, styles.liveButton]}
                onPress={() => handleStatusChange('live')}
              >
                <Text style={styles.statusButtonText}>Start Match</Text>
              </TouchableOpacity>
            )}
            
            {match.status !== 'finished' && (
              <TouchableOpacity
                style={[styles.statusButton, styles.finishedButton]}
                onPress={() => handleStatusChange('finished')}
              >
                <Text style={styles.statusButtonText}>End Match</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.updateButton, isUpdating && styles.updateButtonDisabled]}
        onPress={handleUpdateScore}
        disabled={isUpdating}
      >
        {isUpdating ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="save" size={20} color="white" />
            <Text style={styles.updateButtonText}>Update Score</Text>
          </>
        )}
      </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  matchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  vsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginHorizontal: 16,
  },
  scoreSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  scoreInputContainer: {
    marginBottom: 20,
  },
  scoreInputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  scoreInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreDisplay: {
    width: 80,
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  statusContainer: {
    alignItems: 'center',
  },
  currentStatus: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  statusValue: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statusButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
  },
  liveButton: {
    backgroundColor: '#FF3B30',
  },
  finishedButton: {
    backgroundColor: '#34C759',
  },
  statusButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 16,
    borderRadius: 8,
  },
  updateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AdminScoreUpdateScreen;

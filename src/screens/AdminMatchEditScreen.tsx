import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { useAppStore } from '../store/useAppStore';
import { DataService } from '../services/data';
import { RootStackParamList, Team, Match } from '../types';

type AdminMatchEditNavigationProp = StackNavigationProp<RootStackParamList, 'AdminMatchEdit'>;

const AdminMatchEditScreen = () => {
  const navigation = useNavigation<AdminMatchEditNavigationProp>();
  const { teams, loadTeams } = useAppStore();
  
  const [selectedHomeTeam, setSelectedHomeTeam] = useState<Team | null>(null);
  const [selectedAwayTeam, setSelectedAwayTeam] = useState<Team | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);

  const handleCreateMatch = async () => {
    if (!selectedHomeTeam || !selectedAwayTeam) {
      Alert.alert('Error', 'Please select both teams');
      return;
    }

    if (selectedHomeTeam.id === selectedAwayTeam.id) {
      Alert.alert('Error', 'Home and away teams cannot be the same');
      return;
    }

    setIsLoading(true);
    try {
      const matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'> = {
        homeTeamId: selectedHomeTeam.id,
        awayTeamId: selectedAwayTeam.id,
        homeTeam: selectedHomeTeam,
        awayTeam: selectedAwayTeam,
        status: 'scheduled',
        score: { home: 0, away: 0 },
        scheduledAt: selectedDate,
      };

      await DataService.createMatch(matchData);
      Alert.alert('Success', 'Match created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create match');
    } finally {
      setIsLoading(false);
    }
  };

  const TeamSelector = ({ 
    title, 
    selectedTeam, 
    onSelect 
  }: { 
    title: string; 
    selectedTeam: Team | null; 
    onSelect: (team: Team) => void; 
  }) => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorTitle}>{title}</Text>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => {
          // In a real app, you'd show a team selection modal
          Alert.alert('Team Selection', 'Team selection modal would be implemented here');
        }}
      >
        {selectedTeam ? (
          <View style={styles.selectedTeam}>
            <View style={[styles.teamColor, { backgroundColor: selectedTeam.color }]} />
            <Text style={styles.teamName}>{selectedTeam.name}</Text>
          </View>
        ) : (
          <Text style={styles.placeholderText}>Select {title.toLowerCase()}</Text>
        )}
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create New Match</Text>
        <Text style={styles.subtitle}>Set up a new match between two teams</Text>
      </View>

      <View style={styles.form}>
        <TeamSelector
          title="Home Team"
          selectedTeam={selectedHomeTeam}
          onSelect={setSelectedHomeTeam}
        />

        <TeamSelector
          title="Away Team"
          selectedTeam={selectedAwayTeam}
          onSelect={setSelectedAwayTeam}
        />

        <View style={styles.dateContainer}>
          <Text style={styles.selectorTitle}>Match Date & Time</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => {
              // In a real app, you'd show a date/time picker
              Alert.alert('Date Picker', 'Date picker would be implemented here');
            }}
          >
            <Ionicons name="calendar" size={20} color="#666" />
            <Text style={styles.dateText}>
              {selectedDate.toLocaleDateString()} at {selectedDate.toLocaleTimeString()}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Match Preview</Text>
          {selectedHomeTeam && selectedAwayTeam ? (
            <View style={styles.matchPreview}>
              <View style={styles.teamPreview}>
                <View style={[styles.teamColor, { backgroundColor: selectedHomeTeam.color }]} />
                <Text style={styles.teamName}>{selectedHomeTeam.name}</Text>
              </View>
              <Text style={styles.vsText}>VS</Text>
              <View style={styles.teamPreview}>
                <Text style={styles.teamName}>{selectedAwayTeam.name}</Text>
                <View style={[styles.teamColor, { backgroundColor: selectedAwayTeam.color }]} />
              </View>
            </View>
          ) : (
            <Text style={styles.previewPlaceholder}>Select both teams to see preview</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.createButton, isLoading && styles.createButtonDisabled]}
          onPress={handleCreateMatch}
          disabled={isLoading || !selectedHomeTeam || !selectedAwayTeam}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.createButtonText}>Create Match</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  form: {
    padding: 20,
  },
  selectorContainer: {
    marginBottom: 20,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedTeam: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  teamName: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  dateContainer: {
    marginBottom: 20,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  preview: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  matchPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginHorizontal: 16,
  },
  previewPlaceholder: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AdminMatchEditScreen;

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { useAppStore } from '../store/useAppStore';
import { RootStackParamList, Team } from '../types';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';
import TeamSkeletonCard from '../components/TeamSkeletonCard';

type TeamsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const TeamsScreen = () => {
  const navigation = useNavigation<TeamsScreenNavigationProp>();
  const { teams, loadTeams, isLoading, setupRealTimeListeners } = useAppStore();
  const { colors } = useTheme();
  const { getText } = useLanguage();
  
  // Liga/Turnir tanlash uchun state
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [showLeagueModal, setShowLeagueModal] = useState(false);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  
  // Mock data - haqiqiy loyihada API dan keladi
  const leagues = [
    { id: '1', name: 'Havas Liga' },
    { id: '2', name: 'Regional Liga' },
    { id: '3', name: 'Youth Liga' }
  ];
  
  const tournaments = [
    { id: '1', name: 'Cup', leagueId: '1' },
    { id: '2', name: 'Championship', leagueId: '1' },
    { id: '3', name: 'Super Cup', leagueId: '1' },
    { id: '4', name: 'Friendly', leagueId: '1' },
    { id: '5', name: 'Regional Cup', leagueId: '2' },
    { id: '6', name: 'Youth Cup', leagueId: '3' }
  ];
  
  const filteredTournaments = selectedLeague 
    ? tournaments.filter(t => t.leagueId === selectedLeague)
    : tournaments;

  useEffect(() => {
    console.log('TeamsScreen: Loading teams...');
    loadTeams();
    
    // Setup real-time listeners
    const cleanup = setupRealTimeListeners();
    
    return () => {
      console.log('TeamsScreen: Cleaning up listeners...');
      cleanup();
    };
  }, [loadTeams, setupRealTimeListeners]);

  useEffect(() => {
    console.log('TeamsScreen: Teams updated:', teams.length, 'teams');
    console.log('TeamsScreen: Teams data:', teams);
  }, [teams]);

  const onRefresh = async () => {
    console.log('TeamsScreen: Refreshing teams...');
    await loadTeams();
  };
  
  const handleLeagueSelect = (leagueId: string) => {
    setSelectedLeague(leagueId);
    setSelectedTournament(null); // Turnirni reset qilish
    setShowLeagueModal(false);
  };
  
  const handleTournamentSelect = (tournamentId: string) => {
    setSelectedTournament(tournamentId);
    setShowTournamentModal(false);
  };
  
  const getSelectedLeagueName = () => {
    return leagues.find(l => l.id === selectedLeague)?.name || 'Liga tanlang';
  };
  
  const getSelectedTournamentName = () => {
    return tournaments.find(t => t.id === selectedTournament)?.name || 'Turnir tanlang';
  };

  const renderTeam = ({ item }: { item: Team }) => {
    console.log('🔍 Rendering team:', item.name, 'ID:', item.id);
    
    return (
      <TouchableOpacity
        style={[styles.teamCard, { backgroundColor: colors.surface }]}
        onPress={() => {
          console.log('🔍 Navigating to team detail with ID:', item.id);
          console.log('🔍 Team data:', item);
          
          if (!item.id) {
            console.error('❌ Team ID is missing:', item);
            return;
          }
          
          navigation.navigate('TeamDetail', { teamId: item.id });
        }}
      >
        <View style={styles.teamHeader}>
          {item.logo ? (
            <Image
              source={{ uri: item.logo }}
              style={styles.teamLogo}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.teamColor, { backgroundColor: item.color || '#3B82F6' }]} />
          )}
          <Text style={[styles.teamName, { color: colors.text }]}>{item.name || 'Unknown Team'}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>
        
        <View style={styles.teamStats}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>{item.players?.length || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Players</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.header }]}>
        <Text style={[styles.title, { color: colors.text }]}>{getText('teams')}</Text>
      </View>
      
      {/* Liga/Turnir tanlash */}
      <View style={[styles.filterContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.surface }]}
          onPress={() => setShowLeagueModal(true)}
        >
          <Ionicons name="trophy-outline" size={20} color={colors.primary} />
          <Text style={[styles.filterText, { color: colors.text }]}>
            {getSelectedLeagueName()}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.surface }]}
          onPress={() => setShowTournamentModal(true)}
        >
          <Ionicons name="medal-outline" size={20} color={colors.primary} />
          <Text style={[styles.filterText, { color: colors.text }]}>
            {getSelectedTournamentName()}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.list}>
          {Array.from({ length: 6 }).map((_, index) => (
            <TeamSkeletonCard key={index} />
          ))}
        </View>
      ) : (
        <FlatList
          data={teams || []}
          renderItem={renderTeam}
          keyExtractor={(item, index) => item.id || `team-${index}`}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {getText('noTeamsFound') || 'No teams found'}
              </Text>
            </View>
          }
        />
      )}
      
      {/* Liga tanlash modal */}
      <Modal
        visible={showLeagueModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLeagueModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Liga tanlang</Text>
              <TouchableOpacity onPress={() => setShowLeagueModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {leagues.map((league) => (
              <TouchableOpacity
                key={league.id}
                style={[
                  styles.modalItem,
                  { backgroundColor: selectedLeague === league.id ? colors.primary + '20' : 'transparent' }
                ]}
                onPress={() => handleLeagueSelect(league.id)}
              >
                <Text style={[styles.modalItemText, { color: colors.text }]}>
                  {league.name}
                </Text>
                {selectedLeague === league.id && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
      
      {/* Turnir tanlash modal */}
      <Modal
        visible={showTournamentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTournamentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Turnir tanlang</Text>
              <TouchableOpacity onPress={() => setShowTournamentModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {filteredTournaments.map((tournament) => (
              <TouchableOpacity
                key={tournament.id}
                style={[
                  styles.modalItem,
                  { backgroundColor: selectedTournament === tournament.id ? colors.primary + '20' : 'transparent' }
                ]}
                onPress={() => handleTournamentSelect(tournament.id)}
              >
                <Text style={[styles.modalItemText, { color: colors.text }]}>
                  {tournament.name}
                </Text>
                {selectedTournament === tournament.id && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  list: {
    padding: 20,
  },
  teamCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  teamLogo: {
    width: 24,
    height: 24,
    marginRight: 12,
    borderRadius: 12,
  },
  teamName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  teamStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  filterText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default TeamsScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../store/useThemeStore';
import { DataService } from '../services/data';
import { Team } from '../types';

interface TeamSelectionScreenProps {
  navigation: any;
}

const TeamSelectionScreen: React.FC<TeamSelectionScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const teamsData = await DataService.getTeams();
      setTeams(teamsData);
    } catch (error) {
      console.error('Error loading teams:', error);
      Alert.alert('Xatolik', 'Jamoalar yuklanmadi');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSelection = (team: Team) => {
    navigation.navigate('PlayerRegistration', { team });
  };

  const renderTeam = ({ item }: { item: Team }) => (
    <TouchableOpacity
      style={[styles.teamCard, { backgroundColor: colors.surface }]}
      onPress={() => handleTeamSelection(item)}
    >
      <View style={styles.teamInfo}>
        {item.logo ? (
          <Image source={{ uri: item.logo }} style={styles.teamLogo} />
        ) : (
          <View style={[styles.teamLogoPlaceholder, { backgroundColor: item.color || '#3B82F6' }]}>
            <Text style={styles.teamInitial}>{item.name?.charAt(0) || '?'}</Text>
          </View>
        )}
        <View style={styles.teamDetails}>
          <Text style={[styles.teamName, { color: colors.text }]}>{item.name || 'Unknown Team'}</Text>
          <Text style={[styles.teamDescription, { color: colors.textSecondary }]}>
            {item.description || 'Jamoa haqida ma\'lumot yo\'q'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Jamoalar yuklanmoqda...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Jamoa Tanlang</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Qaysi jamoa uchun o'ynashni xohlaysiz?
        </Text>
      </View>

      <FlatList
        data={teams || []}
        renderItem={renderTeam}
        keyExtractor={(item) => item.id || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Hozircha jamoalar yo'q
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  teamCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  teamLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamInitial: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  teamDetails: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  teamDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default TeamSelectionScreen;

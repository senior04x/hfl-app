import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../store/useThemeStore';
import { DataService } from '../services/data';

interface Team {
  id: string;
  name: string;
  logo?: string;
  color?: string;
  foundedDate?: string;
}

interface TransferRequestScreenProps {
  navigation: any;
  route: {
    params: {
      playerId: string;
      currentTeamId: string;
      currentTeamName: string;
    };
  };
}

const TransferRequestScreen: React.FC<TransferRequestScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { playerId, currentTeamId, currentTeamName } = route.params;
  
  console.log('TransferRequestScreen params:', { playerId, currentTeamId, currentTeamName });
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      console.log('Loading teams for transfer...');
      
      const teamsData = await DataService.getTeams();
      console.log('Teams loaded:', teamsData);
      
      // Filter out current team
      const availableTeams = teamsData.filter(team => team.id !== currentTeamId);
      setTeams(availableTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
      Alert.alert('Xatolik', 'Jamoalar yuklanmadi');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
  };

  const handleSubmitTransfer = async () => {
    if (!selectedTeam) {
      Alert.alert('Xatolik', 'Jamoani tanlang');
      return;
    }

    Alert.alert(
      'Transfer so\'rovi',
      `${selectedTeam.name} jamoasiga transfer so\'rovi yuborishni xohlaysizmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        { 
          text: 'Yuborish', 
          onPress: submitTransferRequest
        },
      ]
    );
  };

  const submitTransferRequest = async () => {
    try {
      setSubmitting(true);
      
      const transferData = {
        playerId: playerId || '',
        currentTeamId: currentTeamId || '',
        currentTeamName: currentTeamName || '',
        newTeamId: selectedTeam!.id,
        newTeamName: selectedTeam!.name,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('Submitting transfer request:', transferData);

      // Submit directly to Firebase
      const { collection, addDoc } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');
      
      const docRef = await addDoc(collection(db, 'transferRequests'), transferData);
      console.log('Transfer request submitted with ID:', docRef.id);

      Alert.alert(
        'Muvaffaqiyat',
        'Transfer so\'rovi yuborildi. Admin tasdiqlashini kuting.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('PlayerDashboard', { playerId })
          }
        ]
      );

    } catch (error) {
      console.error('Error submitting transfer request:', error);
      Alert.alert('Xatolik', 'Transfer so\'rovi yuborilmadi');
    } finally {
      setSubmitting(false);
    }
  };

  const renderTeam = ({ item }: { item: Team }) => (
    <TouchableOpacity
      style={[
        styles.teamCard,
        { 
          backgroundColor: colors.surface,
          borderColor: selectedTeam?.id === item.id ? colors.primary : colors.border,
          borderWidth: selectedTeam?.id === item.id ? 2 : 1,
        }
      ]}
      onPress={() => handleTeamSelect(item)}
    >
      <View style={styles.teamInfo}>
        {item.logo ? (
          <Image source={{ uri: item.logo }} style={styles.teamLogo} />
        ) : (
          <View style={[styles.teamLogoPlaceholder, { backgroundColor: item.color || colors.primary }]}>
            <Text style={styles.teamInitial}>
              {item.name?.charAt(0) || '?'}
            </Text>
          </View>
        )}
        
        <View style={styles.teamDetails}>
          <Text style={[styles.teamName, { color: colors.text }]}>
            {item.name || 'Unknown Team'}
          </Text>
          {item.foundedDate && (
            <Text style={[styles.teamFounded, { color: colors.textSecondary }]}>
              Tashkil etilgan: {new Date(item.foundedDate).getFullYear()}
            </Text>
          )}
        </View>
      </View>
      
      {selectedTeam?.id === item.id && (
        <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
          <Text style={styles.selectedText}>Tanlangan</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Jamoalar yuklanmoqda...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: colors.primary }]}>← Orqaga</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Transfer So'rovi</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.currentTeamCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.currentTeamTitle, { color: colors.text }]}>Joriy Jamoa</Text>
          <Text style={[styles.currentTeamName, { color: colors.primary }]}>
            {currentTeamName}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Yangi Jamoa Tanlang
        </Text>

        {teams.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Boshqa jamoalar topilmadi
            </Text>
          </View>
        ) : (
          <View style={styles.teamsList}>
            {teams.map((team) => (
              <View key={team.id}>
                {renderTeam({ item: team })}
              </View>
            ))}
          </View>
        )}

        {selectedTeam && (
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              submitting && styles.submitButtonDisabled
            ]}
            onPress={handleSubmitTransfer}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>
                {selectedTeam.name} ga Transfer So'rovi Yuborish
              </Text>
            )}
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  currentTeamCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  currentTeamTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  currentTeamName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  teamsList: {
    marginBottom: 20,
  },
  teamCard: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  teamLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  teamFounded: {
    fontSize: 14,
  },
  selectedIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  selectedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});

export default TransferRequestScreen;

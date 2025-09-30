import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/useThemeStore';

const AdminMatchEditScreen = ({ route, navigation }: any) => {
  const { colors } = useThemeStore();
  const { matchId } = route.params || {};

  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [status, setStatus] = useState('scheduled');

  const handleSave = () => {
    if (!homeScore || !awayScore) {
      Alert.alert('Xatolik', 'Hisobni kiriting');
      return;
    }

    // Here you would typically update the match in Firebase
    console.log('Updating match:', {
      matchId,
      homeScore: parseInt(homeScore),
      awayScore: parseInt(awayScore),
      status
    });

    Alert.alert('Muvaffaqiyat', 'O\'yin yangilandi', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>O'yin Tahrirlash</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Hisob</Text>
            
            <View style={styles.scoreContainer}>
              <View style={styles.scoreInput}>
                <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Uy jamoasi</Text>
                <TextInput
                  style={[styles.scoreField, { 
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border 
                  }]}
                  value={homeScore}
                  onChangeText={setHomeScore}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <Text style={[styles.vsText, { color: colors.text }]}>VS</Text>

              <View style={styles.scoreInput}>
                <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Mehmon jamoasi</Text>
                <TextInput
                  style={[styles.scoreField, { 
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border 
                  }]}
                  value={awayScore}
                  onChangeText={setAwayScore}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Holat</Text>
            
            <View style={styles.statusContainer}>
              {['scheduled', 'live', 'finished'].map((statusOption) => (
                <TouchableOpacity
                  key={statusOption}
                  style={[
                    styles.statusButton,
                    { 
                      backgroundColor: status === statusOption ? colors.primary : colors.card,
                      borderColor: colors.border 
                    }
                  ]}
                  onPress={() => setStatus(statusOption)}
                >
                  <Text style={[
                    styles.statusText,
                    { 
                      color: status === statusOption ? '#fff' : colors.text 
                    }
                  ]}>
                    {statusOption === 'scheduled' ? 'Rejalashtirilgan' :
                     statusOption === 'live' ? 'Jonli' : 'Tugallangan'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Saqlash</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreInput: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  scoreField: {
    width: 80,
    height: 60,
    borderWidth: 2,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
  },
  vsText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdminMatchEditScreen;

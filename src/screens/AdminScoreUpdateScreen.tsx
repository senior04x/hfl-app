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

const AdminScoreUpdateScreen = ({ route, navigation }: any) => {
  const { colors } = useThemeStore();
  const { matchId } = route.params || {};

  const [homeScore, setHomeScore] = useState('0');
  const [awayScore, setAwayScore] = useState('0');

  const handleUpdateScore = () => {
    const home = parseInt(homeScore);
    const away = parseInt(awayScore);

    if (isNaN(home) || isNaN(away)) {
      Alert.alert('Xatolik', 'To\'g\'ri hisob kiriting');
      return;
    }

    // Here you would typically update the match score in Firebase
    console.log('Updating match score:', {
      matchId,
      homeScore: home,
      awayScore: away
    });

    Alert.alert('Muvaffaqiyat', 'Hisob yangilandi', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  const incrementScore = (team: 'home' | 'away') => {
    if (team === 'home') {
      setHomeScore((prev) => (parseInt(prev) + 1).toString());
    } else {
      setAwayScore((prev) => (parseInt(prev) + 1).toString());
    }
  };

  const decrementScore = (team: 'home' | 'away') => {
    if (team === 'home') {
      setHomeScore((prev) => Math.max(0, parseInt(prev) - 1).toString());
    } else {
      setAwayScore((prev) => Math.max(0, parseInt(prev) - 1).toString());
    }
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
          <Text style={[styles.title, { color: colors.text }]}>Hisob Yangilash</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.matchInfo}>
            <Text style={[styles.matchTitle, { color: colors.text }]}>
              O'yin #{matchId}
            </Text>
            <Text style={[styles.matchSubtitle, { color: colors.textSecondary }]}>
              Hisobni yangilang
            </Text>
          </View>

          <View style={styles.scoreSection}>
            <View style={styles.teamContainer}>
              <Text style={[styles.teamName, { color: colors.text }]}>Uy Jamoasi</Text>
              <View style={styles.scoreControls}>
                <TouchableOpacity
                  style={[styles.scoreButton, { backgroundColor: colors.card }]}
                  onPress={() => decrementScore('home')}
                >
                  <Ionicons name="remove" size={24} color={colors.text} />
                </TouchableOpacity>
                
                <TextInput
                  style={[styles.scoreDisplay, { 
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border 
                  }]}
                  value={homeScore}
                  onChangeText={setHomeScore}
                  keyboardType="numeric"
                  textAlign="center"
                />
                
                <TouchableOpacity
                  style={[styles.scoreButton, { backgroundColor: colors.card }]}
                  onPress={() => incrementScore('home')}
                >
                  <Ionicons name="add" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.vsContainer}>
              <Text style={[styles.vsText, { color: colors.textSecondary }]}>VS</Text>
            </View>

            <View style={styles.teamContainer}>
              <Text style={[styles.teamName, { color: colors.text }]}>Mehmon Jamoasi</Text>
              <View style={styles.scoreControls}>
                <TouchableOpacity
                  style={[styles.scoreButton, { backgroundColor: colors.card }]}
                  onPress={() => decrementScore('away')}
                >
                  <Ionicons name="remove" size={24} color={colors.text} />
                </TouchableOpacity>
                
                <TextInput
                  style={[styles.scoreDisplay, { 
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border 
                  }]}
                  value={awayScore}
                  onChangeText={setAwayScore}
                  keyboardType="numeric"
                  textAlign="center"
                />
                
                <TouchableOpacity
                  style={[styles.scoreButton, { backgroundColor: colors.card }]}
                  onPress={() => incrementScore('away')}
                >
                  <Ionicons name="add" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.quickActions}>
            <Text style={[styles.actionsTitle, { color: colors.text }]}>Tezkor Harakatlar</Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.card }]}
                onPress={() => {
                  setHomeScore('0');
                  setAwayScore('0');
                }}
              >
                <Ionicons name="refresh" size={20} color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>Nolga qaytarish</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.card }]}
                onPress={() => {
                  setHomeScore('1');
                  setAwayScore('0');
                }}
              >
                <Ionicons name="home" size={20} color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>Uy g'olib</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.card }]}
                onPress={() => {
                  setHomeScore('0');
                  setAwayScore('1');
                }}
              >
                <Ionicons name="airplane" size={20} color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>Mehmon g'olib</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.updateButton, { backgroundColor: colors.primary }]}
            onPress={handleUpdateScore}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.updateButtonText}>Hisobni Yangilash</Text>
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
  matchInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  matchTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  matchSubtitle: {
    fontSize: 14,
  },
  scoreSection: {
    marginBottom: 32,
  },
  teamContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  scoreControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreDisplay: {
    width: 80,
    height: 60,
    borderWidth: 2,
    borderRadius: 8,
    fontSize: 24,
    fontWeight: 'bold',
  },
  vsContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  vsText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  quickActions: {
    marginBottom: 32,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    gap: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdminScoreUpdateScreen;

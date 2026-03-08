import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types';

type TeamFormationRouteProp = RouteProp<RootStackParamList, 'TeamFormation'>;

export default function TeamFormationScreen() {
  const route = useRoute<TeamFormationRouteProp>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { getText } = useLanguage();
  
  // Safely get route params
  const team = route.params?.team || null;
  const trainer = route.params?.trainer || null;
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple initialization
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleSave = () => {
    Alert.alert('Muvaffaqiyat', 'Formatsiya saqlandi');
  };

  const handleClose = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Formatsiya yuklanmoqda...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {team?.name || 'Jamoa'} Formatsiyasi
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Ionicons name="checkmark" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={[styles.field, { backgroundColor: colors.surface }]}>
          <Text style={[styles.fieldText, { color: colors.text }]}>
            Futbol maydoni
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            O'yinchilarni bu yerga joylashtiring
          </Text>
        </View>

        <View style={styles.playersSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            O'yinchilar
          </Text>
          <View style={[styles.playerList, { backgroundColor: colors.surface }]}>
            <Text style={[styles.playerText, { color: colors.textSecondary }]}>
              O'yinchilar ro'yxati bu yerda ko'rsatiladi
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  field: {
    height: 300,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  fieldText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
  },
  playersSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  playerList: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

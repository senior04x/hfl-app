import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';
import { Trainer } from '../types';
import { formatPhoneNumber, parsePhoneNumberForAPI, validatePhoneNumber } from '../utils/phoneUtils';
import { apiService } from '../services/apiService';

interface TrainerLoginScreenProps {
  navigation: any;
}

const TrainerLoginScreen: React.FC<TrainerLoginScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { getText } = useLanguage();
  const [phoneNumber, setPhoneNumber] = useState('+998 90 123 45 67');
  const [loading, setLoading] = useState(false);

  const handleTrainerLogin = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Xatolik', 'Telefon raqamini kiriting');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert('Xatolik', 'Telefon raqam formati noto\'g\'ri');
      return;
    }

    try {
      setLoading(true);
      
      const cleanPhone = parsePhoneNumberForAPI(phoneNumber);
      console.log('Trainer login for team phone:', cleanPhone);
      
      // Trainer login
      const result = await apiService.trainerLogin(cleanPhone);

      if (result.success) {
        // Get trainer data and map to Trainer type
        const apiTrainer = result.trainer;
        const trainerData: Trainer = {
          id: apiTrainer.id,
          name: apiTrainer.name,
          teamId: apiTrainer.teamId,
          teamName: apiTrainer.teamName,
          teamPhone: apiTrainer.teamPhone,
          status: apiTrainer.status || 'active',
          createdAt: new Date(apiTrainer.createdAt || Date.now()),
          updatedAt: new Date(apiTrainer.updatedAt || Date.now()),
        };

        console.log('Trainer data mapped:', trainerData);
        
        // Navigate to trainer dashboard
        navigation.navigate('TrainerDashboard', { 
          trainerId: trainerData.id,
          trainer: trainerData 
        });
        
        Alert.alert('Muvaffaqiyat', 'Murabbiy sifatida muvaffaqiyatli kirildi!');
      } else {
        Alert.alert('Xatolik', result.reason || 'Jamoaning telefon raqami topilmadi');
      }
    } catch (error: any) {
      console.error('Trainer login error:', error);
      
      if (error.name === 'AbortError') {
        Alert.alert('Xatolik', 'Server bilan bog\'lanishda xatolik');
      } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
        Alert.alert('Xatolik', 'Server ishlamayapti');
      } else {
        Alert.alert('Xatolik', error.message || 'Kirishda xatolik yuz berdi');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Murabbiy Kirish</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Jamoangizning telefon raqamini kiriting
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.content}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Jamoaning telefon raqami</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={phoneNumber}
              onChangeText={(value) => {
                const formatted = formatPhoneNumber(value);
                setPhoneNumber(formatted);
              }}
              maxLength={17}
              placeholder="+998 90 123 45 67"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={handleTrainerLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Kirilmoqda...' : 'Murabbiy sifatida kirish'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>
              Orqaga qaytish
            </Text>
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
  header: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },
  loginButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    alignItems: 'center',
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
  },
});

export default TrainerLoginScreen;

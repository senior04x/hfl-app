import React, { useState, useEffect, useRef } from 'react';
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
import { usePlayerStore } from '../store/usePlayerStore';
import { useLanguage } from '../store/useLanguageStore';
import { Player } from '../types';
import { formatPhoneNumber, parsePhoneNumberForAPI, validatePhoneNumber } from '../utils/phoneUtils';
import { apiService } from '../services/apiService';

interface PlayerLoginScreenProps {
  navigation: any;
}

const PlayerLoginScreen: React.FC<PlayerLoginScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { login } = usePlayerStore();
  const { getText } = useLanguage();
  const [phoneNumber, setPhoneNumber] = useState('+998 93 378 68 86');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'player' | 'trainer' | 'admin' | null>(null);
  const [currentStep, setCurrentStep] = useState<'role' | 'phone'>('role');
  const phoneInputRef = useRef<TextInput>(null);

  // Role tanlanganda telefon raqam sahifasiga o'tish
  const handleRoleSelect = (role: 'player' | 'trainer' | 'admin') => {
    setSelectedRole(role);
    setCurrentStep('phone');
    // Kichik kechikish bilan focus qilish
    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 300);
  };

  // Orqaga qaytish funksiyasi
  const handleGoBack = () => {
    setCurrentStep('role');
    setSelectedRole(null);
  };

  const requestOtp = async () => {
    if (!selectedRole) {
      Alert.alert('Xatolik', 'Iltimos, rolni tanlang');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert(getText('error'), getText('enterPhoneNumber'));
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert(getText('error'), getText('invalidPhoneFormat'));
      return;
    }

    try {
      setLoading(true);
      
      const cleanPhone = parsePhoneNumberForAPI(phoneNumber);
      console.log(`${selectedRole} login for phone:`, cleanPhone);
      
      let result;
      if (selectedRole === 'player') {
        result = await apiService.simpleLogin(cleanPhone);
      } else if (selectedRole === 'trainer') {
        result = await apiService.trainerLogin(cleanPhone);
      } else if (selectedRole === 'admin') {
        // Admin uchun alohida login logic
        result = await apiService.simpleLogin(cleanPhone);
      }

      if (result.success) {
        if (selectedRole === 'player') {
          // Get player data and map to Player type
          const apiPlayer = result.player;
          const playerData: Player = {
            id: apiPlayer.id,
            firstName: apiPlayer.firstName,
            lastName: apiPlayer.lastName,
            phone: apiPlayer.phone,
            teamId: '', // Will be set from team data
            teamName: apiPlayer.teamName || '',
            position: apiPlayer.position || '',
            number: apiPlayer.number || 0,
            goals: apiPlayer.goals || 0,
            assists: apiPlayer.assists || 0,
            yellowCards: apiPlayer.yellowCards || 0,
            redCards: apiPlayer.redCards || 0,
            matchesPlayed: apiPlayer.matchesPlayed || 0,
            status: apiPlayer.status || 'active',
            createdAt: new Date(apiPlayer.createdAt || Date.now()),
            updatedAt: new Date(apiPlayer.updatedAt || Date.now()),
          };

          console.log('Player data mapped:', playerData);
          
          // Login to store
          await login(playerData);
          
          // Navigate to dashboard
          navigation.navigate('PlayerDashboard', { 
            playerId: playerData.id,
            player: playerData 
          });
        } else if (selectedRole === 'trainer') {
          // Navigate to trainer dashboard
          navigation.navigate('TrainerDashboard', {
            trainerId: result.trainer.id,
            trainer: result.trainer
          });
        } else if (selectedRole === 'admin') {
          // Admin uchun alohida navigation
          // Hozircha player dashboard'ga o'tamiz, keyin admin panel qo'shamiz
          const apiPlayer = result.player;
          const playerData: Player = {
            id: apiPlayer.id,
            firstName: apiPlayer.firstName,
            lastName: apiPlayer.lastName,
            phone: apiPlayer.phone,
            teamId: '',
            teamName: apiPlayer.teamName || '',
            position: apiPlayer.position || '',
            number: apiPlayer.number || 0,
            goals: apiPlayer.goals || 0,
            assists: apiPlayer.assists || 0,
            yellowCards: apiPlayer.yellowCards || 0,
            redCards: apiPlayer.redCards || 0,
            matchesPlayed: apiPlayer.matchesPlayed || 0,
            status: apiPlayer.status || 'active',
            createdAt: new Date(apiPlayer.createdAt || Date.now()),
            updatedAt: new Date(apiPlayer.updatedAt || Date.now()),
          };
          
          await login(playerData);
          navigation.navigate('PlayerDashboard', { 
            playerId: playerData.id,
            player: playerData 
          });
        }
        
        Alert.alert(getText('success'), 'Muvaffaqiyatli kirildi!');
      } else {
        Alert.alert(getText('error'), result.reason || 'Telefon raqami topilmadi yoki ariza berish kerak');
      }
    } catch (error: any) {
      console.error('Auto-login error:', error);
      
      if (error.name === 'AbortError') {
        Alert.alert(getText('error'), getText('serverTimeout'));
      } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
        Alert.alert(getText('error'), getText('serverDown'));
      } else {
        Alert.alert(getText('error'), error.message || 'Kirishda xatolik yuz berdi');
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
        <Text style={[styles.title, { color: colors.text }]}>
          {currentStep === 'role' ? 'Tizimga kirish' : 'Telefon raqami'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {currentStep === 'role' 
            ? 'Rolni tanlang' 
            : `${selectedRole === 'player' ? 'O\'yinchi' : selectedRole === 'trainer' ? 'Murabbiy' : 'Liga Admini'} sifatida telefon raqamingizni kiriting`
          }
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
          {currentStep === 'role' ? (
            /* Role Selection Step */
            <View style={styles.roleSelection}>
              <Text style={[styles.label, { color: colors.text }]}>Rolni tanlang</Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    { 
                      backgroundColor: selectedRole === 'player' ? colors.primary : colors.surface,
                      borderColor: colors.border
                    }
                  ]}
                  onPress={() => handleRoleSelect('player')}
                >
                  <Text style={[
                    styles.roleButtonText,
                    { color: selectedRole === 'player' ? 'white' : colors.text }
                  ]}>
                    O'yinchi
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    { 
                      backgroundColor: selectedRole === 'trainer' ? colors.primary : colors.surface,
                      borderColor: colors.border
                    }
                  ]}
                  onPress={() => handleRoleSelect('trainer')}
                >
                  <Text style={[
                    styles.roleButtonText,
                    { color: selectedRole === 'trainer' ? 'white' : colors.text }
                  ]}>
                    Murabbiy
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    { 
                      backgroundColor: selectedRole === 'admin' ? colors.primary : colors.surface,
                      borderColor: colors.border
                    }
                  ]}
                  onPress={() => handleRoleSelect('admin')}
                >
                  <Text style={[
                    styles.roleButtonText,
                    { color: selectedRole === 'admin' ? 'white' : colors.text }
                  ]}>
                    Liga Admini
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Phone Input Step */
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>{getText('phoneNumber')}</Text>
                <TextInput
                  ref={phoneInputRef}
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
                  autoFocus={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.loginButton, { backgroundColor: colors.primary }]}
                onPress={requestOtp}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Kirilmoqda...' : 'Kirish'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.backButton}
            onPress={currentStep === 'role' ? () => navigation.goBack() : handleGoBack}
          >
            <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>
              {currentStep === 'role' ? getText('goBack') : 'Orqaga'}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 20,
  },
  content: {
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  roleSelection: {
    marginBottom: 30,
  },
  roleButtons: {
    flexDirection: 'column',
    gap: 12,
  },
  roleButton: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  loginButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
  },
  phoneDisplay: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  backToPhoneButton: {
    alignItems: 'center',
    marginTop: 15,
  },
  backToPhoneButtonText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default PlayerLoginScreen;

import React, { useState, useEffect } from 'react';
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
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [countdown, setCountdown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const requestOtp = async () => {
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
      console.log('Requesting OTP for:', cleanPhone);
      
      // Use API service
      const result = await apiService.requestOtp(cleanPhone);

      if (result.success) {
        setStep('otp');
        setCountdown(60); // 60 seconds countdown
        Alert.alert(getText('success'), getText('otpSent'));
      } else {
        Alert.alert(getText('error'), result.error || getText('otpSendError'));
      }
    } catch (error: any) {
      console.error('OTP request error:', error);
      
      if (error.name === 'AbortError') {
        Alert.alert(getText('error'), getText('serverTimeout'));
      } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
        Alert.alert(getText('error'), getText('serverDown'));
      } else {
        Alert.alert(getText('error'), error.message || getText('otpSendError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otpCode.trim()) {
      Alert.alert(getText('error'), getText('enterOtpCode'));
      return;
    }

    if (otpCode.length !== 4) {
      Alert.alert(getText('error'), getText('otpCodeLength'));
      return;
    }

    try {
      setLoading(true);
      
      const cleanPhone = parsePhoneNumberForAPI(phoneNumber);
      console.log('Verifying OTP:', cleanPhone, otpCode);
      
      // Use API service
      const result = await apiService.verifyOtp(cleanPhone, otpCode);

      if (result.success) {
        // Get player data and map to Player type
        const apiPlayer = result.player;
        const playerData: Player = {
          id: apiPlayer.id,
          firstName: apiPlayer.firstName,
          lastName: apiPlayer.lastName,
          phone: apiPlayer.phone,
          teamId: '', // Will be set from team data
          teamName: '', // Will be set from team data
          position: apiPlayer.position,
          number: parseInt(apiPlayer.number) || 0,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          matchesPlayed: 0,
          status: apiPlayer.status as 'active' | 'inactive' | 'suspended',
          createdAt: new Date(apiPlayer.createdAt),
          updatedAt: new Date(apiPlayer.updatedAt),
        };
        await login(playerData);
        
        // Navigate to player dashboard
        navigation.navigate('PlayerDashboard', { 
          playerId: playerData.id,
          player: playerData 
        });
      } else {
        // Check if user needs to apply
        if (result.needsApplication) {
          Alert.alert(
            'Ariza kerak',
            result.reason,
            [
              { text: 'Bekor qilish', style: 'cancel' },
              { text: 'Ariza berish', onPress: () => navigation.navigate('UserAccount') }
            ]
          );
          return;
        }
        
        // Check if user has pending application
        if (result.hasApplication) {
          Alert.alert(
            'Ariza ko\'rib chiqilmoqda',
            result.reason,
            [
              { text: 'OK', onPress: () => navigation.navigate('UserAccount') }
            ]
          );
          return;
        }
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          setIsBlocked(true);
          Alert.alert(getText('blocked'), getText('tooManyAttempts'));
        } else {
          Alert.alert(getText('error'), result.reason || getText('wrongCode'));
        }
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      
      if (error.name === 'AbortError') {
        Alert.alert(getText('error'), getText('serverTimeout'));
      } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
        Alert.alert(getText('error'), getText('serverDown'));
      } else {
        Alert.alert(getText('error'), error.message || getText('otpVerifyError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0) {
      Alert.alert(getText('wait'), `${countdown} ${getText('secondsWait')}`);
      return;
    }
    
    await requestOtp();
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{getText('playerLogin')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {step === 'phone' 
            ? getText('phoneStepSubtitle')
            : getText('otpStepSubtitle')
          }
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {step === 'phone' ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>{getText('phoneNumber')}</Text>
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
                onPress={requestOtp}
                disabled={loading || isBlocked}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? getText('sendingCode') : getText('sendVerificationCode')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>{getText('verificationCode')}</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.surface, 
                    color: colors.text,
                    borderColor: colors.border 
                  }]}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="1234"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={4}
                  autoFocus
                />
                <Text style={[styles.phoneDisplay, { color: colors.textSecondary }]}>
                  {getText('sentTo')} {phoneNumber}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, { backgroundColor: colors.primary }]}
                onPress={verifyOtp}
                disabled={loading || isBlocked}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? getText('verifying') : getText('verify')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={resendOtp}
                disabled={countdown > 0 || loading}
              >
                <Text style={[styles.resendButtonText, { color: colors.primary }]}>
                  {countdown > 0 ? `${getText('resend')} (${countdown}s)` : getText('resend')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToPhoneButton}
                onPress={() => setStep('phone')}
              >
                <Text style={[styles.backToPhoneButtonText, { color: colors.textSecondary }]}>
                  {getText('changePhoneNumber')}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>
              {getText('goBack')}
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

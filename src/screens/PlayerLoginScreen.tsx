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
import { formatPhoneNumber, parsePhoneNumberForAPI, validatePhoneNumber } from '../utils/phoneUtils';

interface PlayerLoginScreenProps {
  navigation: any;
}

const PlayerLoginScreen: React.FC<PlayerLoginScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { login } = usePlayerStore();
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
      Alert.alert('Xatolik', 'Telefon raqamini kiriting');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert('Xatolik', 'Telefon raqami noto\'g\'ri formatda. +998 90 123 45 67 ko\'rinishida kiriting');
      return;
    }

    try {
      setLoading(true);
      
      const cleanPhone = parsePhoneNumberForAPI(phoneNumber);
      console.log('Requesting OTP for:', cleanPhone);
      
      // Call backend to request OTP
      const response = await fetch('/api/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('otp');
        setCountdown(60); // 60 seconds countdown
        Alert.alert('Muvaffaqiyat', 'Tasdiqlash kodi yuborildi');
      } else {
        Alert.alert('Xatolik', data.error || 'Kod yuborishda xatolik');
      }
    } catch (error: any) {
      console.error('OTP request error:', error);
      Alert.alert('Xatolik', 'Kod yuborishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otpCode.trim()) {
      Alert.alert('Xatolik', 'Tasdiqlash kodini kiriting');
      return;
    }

    if (otpCode.length !== 6) {
      Alert.alert('Xatolik', 'Tasdiqlash kodi 6 xonali bo\'lishi kerak');
      return;
    }

    try {
      setLoading(true);
      
      const cleanPhone = parsePhoneNumberForAPI(phoneNumber);
      console.log('Verifying OTP:', cleanPhone, otpCode);
      
      // Call backend to verify OTP
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: cleanPhone, code: otpCode }),
      });

      const data = await response.json();

      if (data.success) {
        // Get player data and login
        const playerData = data.player;
        await login(playerData);
        
        // Navigate to player dashboard
        navigation.navigate('PlayerDashboard', { 
          playerId: playerData.id,
          player: playerData 
        });
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          setIsBlocked(true);
          Alert.alert('Bloklangan', 'Juda ko\'p noto\'g\'ri urinish. 15 daqiqa kutib turing');
        } else {
          Alert.alert('Xatolik', data.reason || 'Noto\'g\'ri kod');
        }
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      Alert.alert('Xatolik', 'Kod tekshirishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0) {
      Alert.alert('Kuting', `${countdown} soniya kutib turing`);
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
        <Text style={[styles.title, { color: colors.text }]}>O'yinchi Kirish</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {step === 'phone' 
            ? 'Telefon raqamingizni kiriting va tasdiqlash kodi oling'
            : 'Telefoningizga yuborilgan tasdiqlash kodini kiriting'
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
                <Text style={[styles.label, { color: colors.text }]}>Telefon raqam</Text>
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
                  {loading ? 'Kod yuborilmoqda...' : 'Tasdiqlash kodi yuborish'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Tasdiqlash kodi</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.surface, 
                    color: colors.text,
                    borderColor: colors.border 
                  }]}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="123456"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                <Text style={[styles.phoneDisplay, { color: colors.textSecondary }]}>
                  {phoneNumber} raqamiga yuborildi
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, { backgroundColor: colors.primary }]}
                onPress={verifyOtp}
                disabled={loading || isBlocked}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={resendOtp}
                disabled={countdown > 0 || loading}
              >
                <Text style={[styles.resendButtonText, { color: colors.primary }]}>
                  {countdown > 0 ? `Qayta yuborish (${countdown}s)` : 'Qayta yuborish'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToPhoneButton}
                onPress={() => setStep('phone')}
              >
                <Text style={[styles.backToPhoneButtonText, { color: colors.textSecondary }]}>
                  Telefon raqamni o'zgartirish
                </Text>
              </TouchableOpacity>
            </>
          )}

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

import React, { useState, useRef, useEffect } from 'react';
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

interface PlayerVerificationScreenProps {
  navigation: any;
  route: {
    params: {
      phoneNumber: string;
      verificationCode: string;
      playerId: string;
    };
  };
}

const PlayerVerificationScreen: React.FC<PlayerVerificationScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { phoneNumber, verificationCode, playerId, confirmationResult } = route.params;
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleVerification = async () => {
    if (!code.trim()) {
      Alert.alert('Xatolik', 'Tasdiqlash kodini kiriting');
      return;
    }

    try {
      setLoading(true);
      
      console.log('Verifying code:', code);
      
      // Firebase Auth orqali kodni tasdiqlash
      if (confirmationResult) {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        
        // SMS kodini tasdiqlash
        const result = await confirmationResult.confirm(code);
        console.log('✅ SMS kodi muvaffaqiyatli tasdiqlandi');
        console.log('👤 Foydalanuvchi:', result.user);
        
        // Navigate to player dashboard
        navigation.navigate('PlayerDashboard', { 
          playerId: result.user.uid,
          phoneNumber: phoneNumber 
        });
      } else {
        throw new Error('Confirmation result not available');
      }
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Xatolik', 'Tasdiqlashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setLoading(true);
      setCanResend(false);
      setTimeLeft(60);
      
      console.log('Resending verification code to:', phoneNumber);
      
      // Firebase Auth orqali kodni qayta yuborish (reCAPTCHA bilan)
      const { getAuth, signInWithPhoneNumber, RecaptchaVerifier } = await import('firebase/auth');
      const auth = getAuth();
      
      // reCAPTCHA verifier yaratish
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response: any) => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
        }
      });

      // Telefon raqamini to'g'ri formatda tayyorlash
      const cleanPhoneNumber = phoneNumber; // phoneNumber allaqachon to'g'ri formatda
      console.log('Telefon raqami (Firebase uchun):', cleanPhoneNumber);
      
      // SMS qayta yuborish
      const newConfirmationResult = await signInWithPhoneNumber(auth, cleanPhoneNumber, recaptchaVerifier);
      
      console.log('✅ Yangi SMS yuborildi');
      Alert.alert('Muvaffaqiyatli', 'Yangi tasdiqlash kodi yuborildi');
    } catch (error) {
      console.error('Resend error:', error);
      Alert.alert('Xatolik', 'Kod qayta yuborishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Tasdiqlash</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {phoneNumber} raqamiga yuborilgan kodni kiriting
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Tasdiqlash kodi</Text>
            <TextInput
              ref={inputRef}
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={code}
              onChangeText={setCode}
              placeholder="6 xonali kod"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.verifyButton, { backgroundColor: colors.primary }]}
            onPress={handleVerification}
            disabled={loading}
          >
            <Text style={styles.verifyButtonText}>
              {loading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
            </Text>
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            {!canResend ? (
              <Text style={[styles.timerText, { color: colors.textSecondary }]}>
                Qayta yuborish: {formatTime(timeLeft)}
              </Text>
            ) : (
              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendCode}
                disabled={loading}
              >
                <Text style={[styles.resendButtonText, { color: colors.primary }]}>
                  Kodni qayta yuborish
                </Text>
              </TouchableOpacity>
            )}
          </View>

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
    textAlign: 'center',
    letterSpacing: 2,
  },
  verifyButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 14,
  },
  resendButton: {
    padding: 8,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
  },
});

export default PlayerVerificationScreen;

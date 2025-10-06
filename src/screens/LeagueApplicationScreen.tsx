import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';
import { formatPhoneNumber, parsePhoneNumberForAPI, validatePhoneNumber } from '../utils/phoneUtils';

interface LeagueApplicationScreenProps {
  navigation: any;
}

const LeagueApplicationScreen: React.FC<LeagueApplicationScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { getText } = useLanguage();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    leagueName: '',
    foundedDate: '',
    description: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    website: '',
  });

  const handleInputChange = (field: string, value: string) => {
    if (field === 'contactPhone') {
      const formatted = formatPhoneNumber(value);
      setFormData(prev => ({ ...prev, [field]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.leagueName.trim() || !formData.contactPerson.trim() || !formData.contactPhone.trim()) {
      Alert.alert('Xatolik', 'Barcha majburiy maydonlarni to\'ldiring');
      return;
    }

    if (!validatePhoneNumber(formData.contactPhone)) {
      Alert.alert('Xatolik', 'Telefon raqami noto\'g\'ri formatda. +998 90 123 45 67 ko\'rinishida kiriting');
      return;
    }

    try {
      setLoading(true);
      
      const cleanPhone = parsePhoneNumberForAPI(formData.contactPhone);
      console.log('Phone formatting:', formData.contactPhone, '->', cleanPhone);
      
      const leagueApplicationData = {
        leagueName: formData.leagueName.trim(),
        foundedDate: formData.foundedDate,
        description: formData.description.trim(),
        contactPerson: formData.contactPerson.trim(),
        contactPhone: cleanPhone,
        contactEmail: formData.contactEmail.trim(),
        address: formData.address.trim(),
        website: formData.website.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      console.log('Submitting league application:', leagueApplicationData);
      
      // Submit to MongoDB via API
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...leagueApplicationData,
          type: 'league',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('League application submitted:', result);
      
      Alert.alert(
        'Muvaffaqiyatli',
        'Liga arizasi yuborildi. Admin tomonidan ko\'rib chiqilgandan so\'ng sizga xabar beriladi.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Main'),
          },
        ]
      );
    } catch (error) {
      console.error('League application error:', error);
      Alert.alert('Xatolik', 'Ariza yuborishda xatolik yuz berdi. Internet aloqasini tekshiring.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Liga Ariza
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Yangi liga sifatida ariza berish
            </Text>
          </View>

          <View style={styles.form}>
            {/* League Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Liga nomi *
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border,
                  color: colors.text 
                }]}
                value={formData.leagueName}
                onChangeText={(value) => handleInputChange('leagueName', value)}
                placeholder="Liga nomini kiriting"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Founded Date */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Tashkil etilgan sana
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border,
                  color: colors.text 
                }]}
                value={formData.foundedDate}
                onChangeText={(value) => handleInputChange('foundedDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Liga haqida
              </Text>
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border,
                  color: colors.text 
                }]}
                value={formData.description}
                onChangeText={(value) => handleInputChange('description', value)}
                placeholder="Liga haqida qisqacha ma'lumot"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Contact Person */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Aloqa shaxsi *
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border,
                  color: colors.text 
                }]}
                value={formData.contactPerson}
                onChangeText={(value) => handleInputChange('contactPerson', value)}
                placeholder="To'liq ism"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Contact Phone */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Telefon raqami *
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border,
                  color: colors.text 
                }]}
                value={formData.contactPhone}
                onChangeText={(value) => handleInputChange('contactPhone', value)}
                placeholder="+998 90 123 45 67"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>

            {/* Contact Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Email
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border,
                  color: colors.text 
                }]}
                value={formData.contactEmail}
                onChangeText={(value) => handleInputChange('contactEmail', value)}
                placeholder="email@example.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Manzil
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border,
                  color: colors.text 
                }]}
                value={formData.address}
                onChangeText={(value) => handleInputChange('address', value)}
                placeholder="Liga manzili"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Website */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Veb-sayt
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border,
                  color: colors.text 
                }]}
                value={formData.website}
                onChangeText={(value) => handleInputChange('website', value)}
                placeholder="https://example.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                loading && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Yuborilmoqda...' : 'Arizani yuborish'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
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
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  form: {
    padding: 20,
    paddingTop: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default LeagueApplicationScreen;


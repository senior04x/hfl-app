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
import { mongodbService } from '../services/mongodbService';

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
      Alert.alert(getText('error'), getText('fillAllFields'));
      return;
    }

    if (!validatePhoneNumber(formData.contactPhone)) {
      Alert.alert(getText('error'), getText('invalidPhoneFormat'));
      return;
    }

    try {
      setLoading(true);
      
      // First check network connectivity
      console.log('Checking network connectivity...');
      const isHealthy = await mongodbService.healthCheck();
      if (!isHealthy) {
        throw new Error(getText('serverConnectionError'));
      }
      
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
      
      // Submit to MongoDB via Service
      const result = await mongodbService.createApplication({
        ...leagueApplicationData,
        type: 'league',
      });

      console.log('League application submitted:', result);
      
      Alert.alert(
        getText('success'),
        getText('leagueApplicationSubmitted'),
        [
          {
            text: getText('ok'),
            onPress: () => navigation.navigate('Main'),
          },
        ]
      );
    } catch (error) {
      console.error('League application error:', error);
      const errorMessage = error instanceof Error ? error.message : getText('unknownError');
      Alert.alert(getText('error'), `${getText('applicationError')}: ${errorMessage}. ${getText('checkInternetConnection')}`);
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
              {getText('leagueApplication')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {getText('leagueApplicationSubtitle')}
            </Text>
          </View>

          <View style={styles.form}>
            {/* League Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                {getText('leagueName')} *
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border,
                  color: colors.text 
                }]}
                value={formData.leagueName}
                onChangeText={(value) => handleInputChange('leagueName', value)}
                placeholder={getText('enterLeagueName')}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Founded Date */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                {getText('foundedDate')}
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
                {getText('leagueDescription')}
              </Text>
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border,
                  color: colors.text 
                }]}
                value={formData.description}
                onChangeText={(value) => handleInputChange('description', value)}
                placeholder={getText('enterLeagueDescription')}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Contact Person */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                {getText('contactPerson')} *
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border,
                  color: colors.text 
                }]}
                value={formData.contactPerson}
                onChangeText={(value) => handleInputChange('contactPerson', value)}
                placeholder={getText('enterFullName')}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Contact Phone */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                {getText('phoneNumber')} *
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
                {getText('email')}
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
                {getText('address')}
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border,
                  color: colors.text 
                }]}
                value={formData.address}
                onChangeText={(value) => handleInputChange('address', value)}
                placeholder={getText('enterLeagueAddress')}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Website */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                {getText('website')}
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
                {loading ? getText('submitting') : getText('submitApplication')}
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


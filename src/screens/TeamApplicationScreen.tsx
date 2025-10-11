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
  Image,
  SafeAreaView,
} from 'react-native';
import SafeScrollView from '../components/SafeScrollView';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';
// Firebase imports removed - using MongoDB API
import { formatPhoneNumber, parsePhoneNumberForAPI, validatePhoneNumber } from '../utils/phoneUtils';
import { uploadImageToFirebase } from '../utils/uploadImage';
import { mongodbService } from '../services/mongodbService';

interface TeamApplicationScreenProps {
  navigation: any;
}

const TeamApplicationScreen: React.FC<TeamApplicationScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { getText } = useLanguage();
  
  console.log('TeamApplicationScreen mounted');
  
  const [formData, setFormData] = useState({
    teamName: '',
    foundedDate: '',
    teamColor: '#3B82F6',
    description: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    selectedLeague: '',
    selectedTournament: '',
  });
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    if (field === 'contactPhone') {
      const formatted = formatPhoneNumber(value);
      setFormData(prev => ({ ...prev, [field]: formatted }));
    } else if (field === 'selectedLeague') {
      // Liga tanlanganda turnirni reset qilish va yangi turnirlarni yuklash
      setFormData(prev => ({ 
        ...prev, 
        [field]: value,
        selectedTournament: '' // Turnirni reset qilish
      }));
      if (value) {
        loadTournaments(value);
      } else {
        setTournaments([]);
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Load leagues on component mount
  useEffect(() => {
    loadLeagues();
  }, []);

  const loadLeagues = async () => {
    try {
      setLoadingLeagues(true);
      const result = await mongodbService.getLeagues();
      if (result.success && result.data) {
        setLeagues(result.data);
      } else {
        console.error('Failed to load leagues:', result.error);
        Alert.alert(getText('error'), getText('failedToLoadLeagues'));
      }
    } catch (error) {
      console.error('Error loading leagues:', error);
      Alert.alert(getText('error'), getText('failedToLoadLeagues'));
    } finally {
      setLoadingLeagues(false);
    }
  };

  const loadTournaments = async (leagueId: string) => {
    try {
      setLoadingTournaments(true);
      const result = await mongodbService.getTournamentsByLeague(leagueId);
      if (result.success && result.data) {
        setTournaments(result.data);
      } else {
        console.error('Failed to load tournaments:', result.error);
        Alert.alert(getText('error'), 'Turnirlar yuklanmadi');
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
      Alert.alert(getText('error'), 'Turnirlar yuklanmadi');
    } finally {
      setLoadingTournaments(false);
    }
  };

  const handleLogoUpload = async () => {
    try {
      // Ruxsat so'raish
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(getText('permissionRequired'), getText('galleryPermissionRequired'));
        return;
      }

      // Rasm tanlash
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Kvadrat logo
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Upload to Cloudinary
        setUploadingLogo(true);
        try {
          const downloadURL = await uploadImageToFirebase(asset.uri, 'hfl-app/teams/logos');
          
          setFormData(prev => ({ 
            ...prev, 
            logo: downloadURL 
          }));
          
          console.log('Logo uploaded:', downloadURL);
          Alert.alert(getText('success'), getText('logoUploadedSuccessfully'));
        } catch (error) {
          console.error('Error uploading logo:', error);
          Alert.alert(getText('error'), getText('logoUploadError'));
        } finally {
          setUploadingLogo(false);
        }
      }
    } catch (error) {
      console.error('Error picking logo:', error);
      Alert.alert(getText('error'), getText('logoSelectionError'));
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.teamName.trim() || !formData.contactPerson.trim() || !formData.contactPhone.trim() || !formData.selectedLeague || !formData.selectedTournament) {
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
      
      const teamApplicationData = {
        teamName: formData.teamName.trim(),
        foundedDate: formData.foundedDate,
        logo: formData.logo, // Firebase Storage URL
        teamColor: formData.teamColor,
        description: formData.description.trim(),
        contactPerson: formData.contactPerson.trim(),
        contactPhone: cleanPhone,
        contactEmail: formData.contactEmail.trim(),
        selectedLeague: formData.selectedLeague,
        selectedTournament: formData.selectedTournament,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      console.log('🔍 Form data:', formData);
      console.log('🔍 Selected League:', formData.selectedLeague);
      console.log('🔍 Selected Tournament:', formData.selectedTournament);
      console.log('🔍 Submitting team application:', teamApplicationData);
      
      // Submit to MongoDB via Service
      const result = await mongodbService.createApplication({
        ...teamApplicationData,
        type: 'team',
      });

      console.log('Team application submitted:', result);
      
      Alert.alert(
        getText('success'),
        getText('teamApplicationSubmitted'),
        [
          {
            text: getText('ok'),
            onPress: () => navigation.navigate('Main'),
          },
        ]
      );
    } catch (error) {
      console.error('Team application error:', error);
      const errorMessage = error instanceof Error ? error.message : getText('unknownError');
      Alert.alert(getText('error'), `${getText('applicationError')}: ${errorMessage}. ${getText('checkInternetConnection')}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <SafeScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{getText('teamApplication')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {getText('teamApplicationSubtitle')}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{getText('teamName')} *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={formData.teamName}
              onChangeText={(value) => handleInputChange('teamName', value)}
              placeholder={getText('enterTeamName')}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{getText('foundedDate')}</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={formData.foundedDate}
              onChangeText={(value) => handleInputChange('foundedDate', value)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Liga tanlang *</Text>
            {loadingLeagues ? (
              <View style={[styles.input, { 
                backgroundColor: colors.surface, 
                borderColor: colors.border,
                justifyContent: 'center',
                alignItems: 'center'
              }]}>
                <Text style={{ color: colors.textSecondary }}>Ligalar yuklanmoqda...</Text>
              </View>
            ) : (
              <View style={[styles.input, { 
                backgroundColor: colors.surface, 
                borderColor: colors.border 
              }]}>
                {leagues.map((league) => (
                  <TouchableOpacity
                    key={league._id || league.id}
                    style={[
                      styles.leagueOption,
                      formData.selectedLeague === (league._id || league.id) && styles.selectedLeagueOption
                    ]}
                    onPress={() => handleInputChange('selectedLeague', league._id || league.id)}
                  >
                    <Text style={[
                      styles.leagueOptionText,
                      { color: colors.text },
                      formData.selectedLeague === (league._id || league.id) && styles.selectedLeagueText
                    ]}>
                      {league.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {formData.selectedLeague && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Turnir tanlang *</Text>
              {loadingTournaments ? (
                <View style={[styles.input, { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border,
                  justifyContent: 'center',
                  alignItems: 'center'
                }]}>
                  <Text style={{ color: colors.textSecondary }}>Turnirlar yuklanmoqda...</Text>
                </View>
              ) : (
                <View style={[styles.input, { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border 
                }]}>
                  {tournaments.map((tournament) => (
                    <TouchableOpacity
                      key={tournament._id || tournament.id}
                      style={[
                        styles.tournamentOption,
                        formData.selectedTournament === (tournament._id || tournament.id) && styles.selectedTournamentOption
                      ]}
                      onPress={() => handleInputChange('selectedTournament', tournament._id || tournament.id)}
                    >
                      <Text style={[
                        styles.tournamentOptionText,
                        { color: colors.text },
                        formData.selectedTournament === (tournament._id || tournament.id) && styles.selectedTournamentText
                      ]}>
                        {tournament.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{getText('teamLogo')}</Text>
            
            {formData.logo ? (
              <View style={styles.logoContainer}>
                <Image source={{ uri: formData.logo }} style={styles.logoPreview} />
                <View style={styles.logoActions}>
                  <TouchableOpacity
                    style={[styles.logoActionButton, { backgroundColor: colors.primary }]}
                    onPress={handleLogoUpload}
                    disabled={uploadingLogo}
                  >
                    <Text style={styles.logoActionText}>
                      {uploadingLogo ? getText('uploading') : getText('change')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.logoActionButton, { backgroundColor: '#FF3B30' }]}
                    onPress={() => setFormData(prev => ({ ...prev, logo: null }))}
                  >
                    <Text style={styles.logoActionText}>{getText('delete')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.logoButton, { 
                  backgroundColor: colors.surface,
                  borderColor: colors.border 
                }]}
                onPress={handleLogoUpload}
                disabled={uploadingLogo}
              >
                <Text style={[styles.logoButtonText, { color: colors.textSecondary }]}>
                  {uploadingLogo ? getText('uploading') : getText('selectLogo')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{getText('teamColor')}</Text>
            <View style={styles.colorInputContainer}>
              <View style={[styles.colorPreview, { backgroundColor: formData.teamColor }]} />
              <TextInput
                style={[styles.colorInput, { 
                  backgroundColor: colors.surface, 
                  color: colors.text,
                  borderColor: colors.border 
                }]}
                value={formData.teamColor}
                onChangeText={(value) => handleInputChange('teamColor', value)}
                placeholder="#3B82F6"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{getText('teamDescription')}</Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder={getText('enterTeamDescription')}
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{getText('contactPerson')} *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={formData.contactPerson}
              onChangeText={(value) => handleInputChange('contactPerson', value)}
              placeholder={getText('enterContactPerson')}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{getText('phoneNumber')} *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={formData.contactPhone}
              onChangeText={(value) => handleInputChange('contactPhone', value)}
              maxLength={17}
              placeholder="+998 90 123 45 67"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{getText('email')}</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={formData.contactEmail}
              onChangeText={(value) => handleInputChange('contactEmail', value)}
              placeholder="email@example.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? getText('submitting') : getText('submitApplication')}
            </Text>
          </TouchableOpacity>
        </View>
        </SafeScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
  form: {
    padding: 20,
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
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 80,
    textAlignVertical: 'top',
  },
  colorInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorPreview: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  colorInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  submitButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logoButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  logoButtonText: {
    fontSize: 16,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  logoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  logoActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  leagueOption: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedLeagueOption: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  leagueOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedLeagueText: {
    color: 'white',
  },
  tournamentOption: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedTournamentOption: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  tournamentOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedTournamentText: {
    color: 'white',
  },
});

export default TeamApplicationScreen;

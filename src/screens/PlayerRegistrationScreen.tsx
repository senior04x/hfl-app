import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';
import { Team } from '../types';
// Firebase imports removed - using MongoDB API
import { formatPhoneNumber, parsePhoneNumberForAPI, validatePhoneNumber } from '../utils/phoneUtils';
import { uploadImageToFirebase } from '../utils/uploadImage';
import { mongodbService } from '../services/mongodbService';
import SafeScrollView from '../components/SafeScrollView';

interface PlayerRegistrationScreenProps {
  navigation: any;
  route?: {
    params?: {
      team?: Team;
    };
  };
}

const PlayerRegistrationScreen: React.FC<PlayerRegistrationScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { getText } = useLanguage();
  const { team } = route?.params || {};
  
  console.log('PlayerRegistrationScreen mounted with team:', team);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    position: '',
    number: '',
    photo: null as string | null,
    selectedLeague: '',
    selectedTournament: '',
    selectedTeam: '',
  });
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    try {
      setLoadingLeagues(true);
      const result = await mongodbService.getLeagues();
      if (result.success && result.data) {
        setLeagues(result.data);
      }
    } catch (error) {
      console.error('Error fetching leagues:', error);
    } finally {
      setLoadingLeagues(false);
    }
  };

  const fetchTournaments = async (leagueId: string) => {
    try {
      setLoadingTournaments(true);
      const result = await mongodbService.getTournamentsByLeague(leagueId);
      if (result.success && result.data) {
        setTournaments(result.data);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoadingTournaments(false);
    }
  };

  const fetchTeams = async (tournamentId: string) => {
    try {
      setLoadingTeams(true);
      console.log('🔍 Fetching teams for tournament:', tournamentId);
      const result = await mongodbService.getTeamsByTournament(tournamentId);
      console.log('📋 Raw result from getTeamsByTournament:', JSON.stringify(result, null, 2));
      
      if (result.success && result.data) {
        // Handle nested data structure
        let teamsData = result.data;
        if (Array.isArray(result.data) && result.data.length > 0 && result.data[0].data) {
          teamsData = result.data[0].data;
        }
        console.log('✅ Final teams data to display:', JSON.stringify(teamsData, null, 2));
        setTeams(teamsData);
      } else {
        console.log('❌ No teams found for tournament:', tournamentId);
        setTeams([]);
      }
    } catch (error) {
      console.error('❌ Error fetching teams:', error);
      setTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'phone') {
      const formatted = formatPhoneNumber(value);
      setFormData(prev => ({ ...prev, [field]: formatted }));
    } else if (field === 'selectedLeague') {
      setFormData(prev => ({ 
        ...prev, 
        [field]: value,
        selectedTournament: '',
        selectedTeam: ''
      }));
      setTournaments([]);
      setTeams([]);
      if (value) {
        fetchTournaments(value);
      }
    } else if (field === 'selectedTournament') {
      setFormData(prev => ({ 
        ...prev, 
        [field]: value,
        selectedTeam: ''
      }));
      setTeams([]);
      if (value) {
        fetchTeams(value);
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handlePhotoUpload = async () => {
    try {
      // Ruxsat so'raish
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Ruxsat kerak', 'Rasm tanlash uchun galereya ruxsati kerak');
        return;
      }

      // Rasm tanlash
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // 1x1 kvadrat nisbat
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Upload to Cloudinary
        setUploadingPhoto(true);
        try {
          const downloadURL = await uploadImageToFirebase(asset.uri, 'hfl-app/players/photos');
          
          setFormData(prev => ({ 
            ...prev, 
            photo: downloadURL 
          }));
          
          console.log('Photo uploaded:', downloadURL);
          Alert.alert('Muvaffaqiyat', 'Rasm muvaffaqiyatli yuklandi');
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Xatolik', 'Rasm yuklashda xatolik yuz berdi');
        } finally {
          setUploadingPhoto(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(getText('error'), getText('imageSelectionError'));
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
      Alert.alert(getText('error'), getText('fillAllFields'));
      return;
    }

    if (!validatePhoneNumber(formData.phone)) {
      Alert.alert(getText('error'), getText('invalidPhoneFormat'));
      return;
    }

    if (!formData.selectedLeague || !formData.selectedTournament || !formData.selectedTeam) {
      Alert.alert('Xatolik', 'Liga, turnir va jamoa tanlanishi shart');
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

      const cleanPhone = parsePhoneNumberForAPI(formData.phone);
      console.log('Phone formatting:', formData.phone, '->', cleanPhone);
      
      const selectedTeam = teams.find(t => t._id === formData.selectedTeam);
      const selectedTournament = tournaments.find(t => t._id === formData.selectedTournament);
      const selectedLeague = leagues.find(l => l._id === formData.selectedLeague);

      const registrationData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: cleanPhone,
        email: formData.email.trim(),
        position: formData.position.trim(),
        number: parseInt(formData.number) || 0,
        photo: formData.photo,
        teamId: formData.selectedTeam,
        teamName: selectedTeam?.name || '',
        tournamentId: formData.selectedTournament,
        tournamentName: selectedTournament?.name || '',
        leagueId: formData.selectedLeague,
        leagueName: selectedLeague?.name || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      console.log('Submitting player registration:', registrationData);
      
      // Submit to MongoDB via Service
      const result = await mongodbService.createApplication({
        ...registrationData,
        type: 'player',
      });

      console.log('Player application submitted:', result);
      
      Alert.alert(
        getText('success'),
        getText('applicationSubmitted'),
        [
          {
            text: getText('ok'),
            onPress: () => navigation.navigate('Main'),
          },
        ]
      );
    } catch (error) {
      console.error('Registration error:', error);
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
          <Text style={[styles.title, { color: colors.text }]}>{getText('playerRegistration')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Liga, turnir va jamoa tanlab ariza to'ldiring
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{getText('firstName')} *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={formData.firstName}
              onChangeText={(value) => handleInputChange('firstName', value)}
              placeholder={getText('enterFirstName')}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{getText('lastName')} *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={formData.lastName}
              onChangeText={(value) => handleInputChange('lastName', value)}
              placeholder={getText('enterLastName')}
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
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
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
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="player@example.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Liga tanlash */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Liga *</Text>
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

          {/* Turnir tanlash */}
          {formData.selectedLeague && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Turnir *</Text>
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

          {/* Jamoa tanlash */}
          {formData.selectedTournament && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Jamoa *</Text>
              {loadingTeams ? (
                <View style={[styles.input, { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border,
                  justifyContent: 'center',
                  alignItems: 'center'
                }]}>
                  <Text style={{ color: colors.textSecondary }}>Jamoalar yuklanmoqda...</Text>
                </View>
              ) : (
                <View style={[styles.input, { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border 
                }]}>
                  {teams.map((team, index) => {
                    console.log(`🎯 Team ${index}:`, JSON.stringify(team, null, 2));
                    return (
                      <TouchableOpacity
                        key={team._id || team.id}
                        style={[
                          styles.teamOption,
                          formData.selectedTeam === (team._id || team.id) && styles.selectedTeamOption
                        ]}
                        onPress={() => handleInputChange('selectedTeam', team._id || team.id)}
                      >
                        <Text style={[
                          styles.teamOptionText,
                          { color: colors.text },
                          formData.selectedTeam === (team._id || team.id) && styles.selectedTeamText
                        ]}>
                          {team.name || team.teamName || 'Unknown Team'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{getText('position')}</Text>
            <View style={[styles.pickerContainer, { 
              backgroundColor: colors.surface, 
              borderColor: colors.border 
            }]}>
              <Text style={[styles.pickerText, { color: colors.text }]}>
                {formData.position || getText('selectPosition')}
              </Text>
            </View>
            <View style={styles.positionGrid}>
              {[
                { value: 'GK', label: getText('goalkeeper') },
                { value: 'CB', label: getText('centerBack') },
                { value: 'LB', label: getText('leftBack') },
                { value: 'RB', label: getText('rightBack') },
                { value: 'CDM', label: getText('defensiveMidfielder') },
                { value: 'CM', label: getText('centerMidfielder') },
                { value: 'CAM', label: getText('attackingMidfielder') },
                { value: 'LM', label: getText('leftMidfielder') },
                { value: 'RM', label: getText('rightMidfielder') },
                { value: 'LW', label: getText('leftWinger') },
                { value: 'RW', label: getText('rightWinger') },
                { value: 'ST', label: getText('striker') },
                { value: 'CF', label: getText('centerForward') },
              ].map((position) => (
                <TouchableOpacity
                  key={position.value}
                  style={[
                    styles.positionButton,
                    { 
                      backgroundColor: formData.position === position.value ? colors.primary : colors.surface,
                      borderColor: colors.border 
                    }
                  ]}
                  onPress={() => handleInputChange('position', position.value)}
                >
                  <Text style={[
                    styles.positionButtonText,
                    { 
                      color: formData.position === position.value ? 'white' : colors.text 
                    }
                  ]}>
                    {position.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{getText('jerseyNumber')}</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={formData.number}
              onChangeText={(value) => handleInputChange('number', value)}
              placeholder="10"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{getText('photo')}</Text>
            
            {formData.photo ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: formData.photo }} style={styles.photoPreview} />
                <View style={styles.photoActions}>
                  <TouchableOpacity
                    style={[styles.photoActionButton, { backgroundColor: colors.primary }]}
                    onPress={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  >
                    <Text style={styles.photoActionText}>
                      {uploadingPhoto ? getText('uploading') : getText('change')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoActionButton, { backgroundColor: '#FF3B30' }]}
                    onPress={() => setFormData(prev => ({ ...prev, photo: null }))}
                  >
                    <Text style={styles.photoActionText}>{getText('delete')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.photoButton, { 
                  backgroundColor: colors.surface,
                  borderColor: colors.border 
                }]}
                onPress={handlePhotoUpload}
                disabled={uploadingPhoto}
              >
                <Text style={[styles.photoButtonText, { color: colors.textSecondary }]}>
                  {uploadingPhoto ? getText('uploading') : getText('selectPhoto')}
                </Text>
              </TouchableOpacity>
            )}
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
  photoButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  photoButtonText: {
    fontSize: 16,
  },
  photoContainer: {
    alignItems: 'center',
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  photoActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  pickerText: {
    fontSize: 16,
  },
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  positionButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  positionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
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
  teamOption: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedTeamOption: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  teamOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedTeamText: {
    color: 'white',
  },
});

export default PlayerRegistrationScreen;

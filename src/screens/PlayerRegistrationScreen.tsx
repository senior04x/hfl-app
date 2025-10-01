import React, { useState } from 'react';
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
import { Team } from '../types';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { formatPhoneNumber, parsePhoneNumberForAPI, validatePhoneNumber } from '../utils/phoneUtils';
import { uploadImageToFirebase } from '../utils/uploadImage';

interface PlayerRegistrationScreenProps {
  navigation: any;
  route: {
    params: {
      team: Team;
    };
  };
}

const PlayerRegistrationScreen: React.FC<PlayerRegistrationScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { team } = route.params;
  
  console.log('PlayerRegistrationScreen mounted with team:', team);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    email: '',
    position: '',
    number: '',
    photo: null as string | null,
  });
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    if (field === 'phone') {
      const formatted = formatPhoneNumber(value);
      setFormData(prev => ({ ...prev, [field]: formatted }));
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
        aspect: [3, 4], // 3x4 nisbat
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Upload to Firebase Storage
        setUploadingPhoto(true);
        try {
          const fileName = `players/${Date.now()}-${team.id}-${asset.fileName || 'photo.jpg'}`;
          const downloadURL = await uploadImageToFirebase(asset.uri, fileName);
          
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
      Alert.alert('Xatolik', 'Rasm tanlashda xatolik yuz berdi');
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
      Alert.alert('Xatolik', 'Barcha majburiy maydonlarni to\'ldiring');
      return;
    }

    if (!validatePhoneNumber(formData.phone)) {
      Alert.alert('Xatolik', 'Telefon raqami noto\'g\'ri formatda. +998 90 123 45 67 ko\'rinishida kiriting');
      return;
    }

    try {
      setLoading(true);

      const cleanPhone = parsePhoneNumberForAPI(formData.phone);
      console.log('Phone formatting:', formData.phone, '->', cleanPhone);
      
      const registrationData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: cleanPhone,
        password: formData.password.trim(),
        email: formData.email.trim(),
        position: formData.position.trim(),
        number: parseInt(formData.number) || 0,
        photo: formData.photo, // Firebase Storage URL
        teamId: team?.id || '',
        teamName: team?.name || 'Unknown Team',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      console.log('Submitting player registration:', registrationData);
      
      // Submit directly to Firebase
      const docRef = await addDoc(collection(db, 'leagueApplications'), {
        ...registrationData,
        type: 'player',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('Document written with ID: ', docRef.id);
      
      Alert.alert(
        'Muvaffaqiyatli',
        'Arizangiz yuborildi. Admin tomonidan ko\'rib chiqilgandan so\'ng sizga xabar beriladi.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Main'),
          },
        ]
      );
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Xatolik', 'Ariza yuborishda xatolik yuz berdi. Internet aloqasini tekshiring.');
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
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>O'yinchi Ro'yxatdan O'tish</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {team?.name || 'Unknown Team'} jamoasi uchun ma'lumotlaringizni kiriting
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Ism *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={formData.firstName}
              onChangeText={(value) => handleInputChange('firstName', value)}
              placeholder="Ismingizni kiriting"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Familiya *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={formData.lastName}
              onChangeText={(value) => handleInputChange('lastName', value)}
              placeholder="Familiyangizni kiriting"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Telefon raqam *</Text>
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
            <Text style={[styles.label, { color: colors.text }]}>Parol *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              placeholder="Parolni kiriting"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
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

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Pozitsiya</Text>
            <View style={[styles.pickerContainer, { 
              backgroundColor: colors.surface, 
              borderColor: colors.border 
            }]}>
              <Text style={[styles.pickerText, { color: colors.text }]}>
                {formData.position || 'Pozitsiya tanlang'}
              </Text>
            </View>
            <View style={styles.positionGrid}>
              {[
                { value: 'GK', label: 'Darvozabon' },
                { value: 'CB', label: 'Markaziy himoyachi' },
                { value: 'LB', label: 'Chap qanot himoyachisi' },
                { value: 'RB', label: 'O\'ng qanot himoyachisi' },
                { value: 'CDM', label: 'Defensiv yarim himoyachi' },
                { value: 'CM', label: 'Markaziy yarim himoyachi' },
                { value: 'CAM', label: 'Hujumkor yarim himoyachi' },
                { value: 'LM', label: 'Chap qanot yarim himoyachisi' },
                { value: 'RM', label: 'O\'ng qanot yarim himoyachisi' },
                { value: 'LW', label: 'Chap qanot hujumchisi' },
                { value: 'RW', label: 'O\'ng qanot hujumchisi' },
                { value: 'ST', label: 'Markaziy hujumchi' },
                { value: 'CF', label: 'Soxta hujumchi' },
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
            <Text style={[styles.label, { color: colors.text }]}>Forma raqami</Text>
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
            <Text style={[styles.label, { color: colors.text }]}>3x4 rasm</Text>
            
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
                      {uploadingPhoto ? 'Yuklanmoqda...' : 'O\'zgartirish'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoActionButton, { backgroundColor: '#FF3B30' }]}
                    onPress={() => setFormData(prev => ({ ...prev, photo: null }))}
                  >
                    <Text style={styles.photoActionText}>O'chirish</Text>
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
                  {uploadingPhoto ? 'Yuklanmoqda...' : 'Rasm tanlash'}
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
              {loading ? 'Yuborilmoqda...' : 'Arizani yuborish'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    height: 160,
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
});

export default PlayerRegistrationScreen;

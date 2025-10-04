import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';

const TeamTransferRequestScreen = () => {
  const { colors } = useTheme();
  const { getText } = useLanguage();
  
  const [fromTournament, setFromTournament] = useState('');
  const [toTournament, setToTournament] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Mock data - haqiqiy loyihada API dan keladi
  const tournaments = [
    { id: '1', name: 'Cup' },
    { id: '2', name: 'Championship' },
    { id: '3', name: 'Super Cup' },
    { id: '4', name: 'Friendly' }
  ];
  
  const handleSubmit = async () => {
    if (!fromTournament || !toTournament || !reason) {
      Alert.alert('Xatolik', 'Barcha maydonlarni to\'ldiring');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // API call to submit transfer request
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock delay
      
      Alert.alert(
        'Muvaffaqiyat',
        'Jamoa transfer arizasi yuborildi. Admin ko\'rib chiqadi.',
        [{ text: 'OK', onPress: () => {
          // Navigate back or reset form
          setFromTournament('');
          setToTournament('');
          setReason('');
        }}]
      );
    } catch (error) {
      Alert.alert('Xatolik', 'Ariza yuborishda xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Jamoa Transfer Ariza
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Boshqa turnirga o'tish uchun ariza yuboring
          </Text>
        </View>
        
        {/* Form */}
        <View style={[styles.form, { backgroundColor: colors.card }]}>
          {/* From Tournament */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Joriy turnir
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
              <Ionicons name="trophy-outline" size={20} color={colors.primary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={fromTournament}
                onChangeText={setFromTournament}
                placeholder="Joriy turniringizni kiriting"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
          
          {/* To Tournament */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Yangi turnir
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
              <Ionicons name="trophy" size={20} color={colors.primary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={toTournament}
                onChangeText={setToTournament}
                placeholder="Yangi turnirni kiriting"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
          
          {/* Reason */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Sabab
            </Text>
            <View style={[styles.textAreaContainer, { backgroundColor: colors.surface }]}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              <TextInput
                style={[styles.textArea, { color: colors.text }]}
                value={reason}
                onChangeText={setReason}
                placeholder="Transfer sababini yozing..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>
        
        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>
              Jamoa transfer jarayoni
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              • Ariza admin tomonidan ko'rib chiqiladi{'\n'}
              • Tasdiqlangandan so'ng SMS xabar keladi{'\n'}
              • Barcha o'yinchilar bilan birga o'tadi{'\n'}
              • Statistika saqlanib qoladi
            </Text>
          </View>
        </View>
        
        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { 
              backgroundColor: colors.primary,
              opacity: isSubmitting ? 0.7 : 1
            }
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Text style={styles.submitButtonText}>Yuborilmoqda...</Text>
          ) : (
            <Text style={styles.submitButtonText}>Ariza yuborish</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  form: {
    margin: 20,
    borderRadius: 12,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  textAreaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
  },
  textArea: {
    flex: 1,
    fontSize: 16,
    minHeight: 80,
  },
  infoCard: {
    flexDirection: 'row',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  submitButton: {
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TeamTransferRequestScreen;

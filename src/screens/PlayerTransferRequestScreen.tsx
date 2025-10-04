import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  // ActivityIndicator, // Skeleton loading ishlatamiz
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';
import { transferService } from '../services/transferService';
import { useAppStore } from '../store/useAppStore';

const PlayerTransferRequestScreen = () => {
  const { colors } = useTheme();
  const { getText } = useLanguage();
  const { teams, loadTeams } = useAppStore();
  
  const [fromTeam, setFromTeam] = useState('');
  const [toTeam, setToTeam] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFromTeamModal, setShowFromTeamModal] = useState(false);
  const [showToTeamModal, setShowToTeamModal] = useState(false);
  
  // Load teams on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await loadTeams();
      } catch (error) {
        console.error('Error loading teams:', error);
        Alert.alert('Xatolik', 'Jamoalar yuklanmadi');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [loadTeams]);
  
  const handleSubmit = async () => {
    if (!fromTeam || !toTeam || !reason) {
      Alert.alert('Xatolik', 'Barcha maydonlarni to\'ldiring');
      return;
    }
    
    if (fromTeam === toTeam) {
      Alert.alert('Xatolik', 'Joriy jamoa va yangi jamoa bir xil bo\'lishi mumkin emas');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await transferService.submitPlayerTransfer({
        playerId: 'current_player_id', // In real app, get from user store
        currentTeamId: fromTeam,
        newTeamId: toTeam,
        reason: reason,
        status: 'pending'
      });
      
      if (result.success) {
        Alert.alert(
          'Muvaffaqiyat',
          'Transfer arizasi yuborildi. Admin ko\'rib chiqadi.',
          [{ text: 'OK', onPress: () => {
            // Navigate back or reset form
            setFromTeam('');
            setToTeam('');
            setReason('');
          }}]
        );
      } else {
        Alert.alert('Xatolik', result.error || 'Ariza yuborishda xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Transfer submission error:', error);
      Alert.alert('Xatolik', 'Ariza yuborishda xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          {/* Skeleton loading ishlatamiz */}
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Jamoalar yuklanmoqda...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            O'yinchi Transfer Ariza
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Boshqa jamoa yoki turnirga o'tish uchun ariza yuboring
          </Text>
        </View>
        
        {/* Form */}
        <View style={[styles.form, { backgroundColor: colors.card }]}>
          {/* From Team */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Joriy jamoa
            </Text>
            <TouchableOpacity 
              style={[styles.inputContainer, { backgroundColor: colors.surface }]}
              onPress={() => setShowFromTeamModal(true)}
            >
              <Ionicons name="people-outline" size={20} color={colors.primary} />
              <Text style={[styles.input, { color: colors.text }]}>
                {teams.find(t => t.id === fromTeam)?.name || 'Joriy jamoangizni tanlang'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          {/* To Team */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Yangi jamoa
            </Text>
            <TouchableOpacity 
              style={[styles.inputContainer, { backgroundColor: colors.surface }]}
              onPress={() => setShowToTeamModal(true)}
            >
              <Ionicons name="people" size={20} color={colors.primary} />
              <Text style={[styles.input, { color: colors.text }]}>
                {teams.find(t => t.id === toTeam)?.name || 'Yangi jamoani tanlang'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
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
              Transfer jarayoni
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              • Ariza admin tomonidan ko'rib chiqiladi{'\n'}
              • Tasdiqlangandan so'ng SMS xabar keladi{'\n'}
              • Statistika saqlanib qoladi{'\n'}
              • Faqat jamoasi o'zgaradi
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

      {/* From Team Selection Modal */}
      <Modal
        visible={showFromTeamModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFromTeamModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Joriy jamoa tanlang
              </Text>
              <TouchableOpacity onPress={() => setShowFromTeamModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamItem,
                    { borderBottomColor: colors.border },
                    fromTeam === team.id && { backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => {
                    setFromTeam(team.id);
                    setShowFromTeamModal(false);
                  }}
                >
                  <Text style={[styles.teamName, { color: colors.text }]}>
                    {team.name}
                  </Text>
                  {fromTeam === team.id && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* To Team Selection Modal */}
      <Modal
        visible={showToTeamModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowToTeamModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Yangi jamoa tanlang
              </Text>
              <TouchableOpacity onPress={() => setShowToTeamModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {teams.filter(team => team.id !== fromTeam).map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamItem,
                    { borderBottomColor: colors.border },
                    toTeam === team.id && { backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => {
                    setToTeam(team.id);
                    setShowToTeamModal(false);
                  }}
                >
                  <Text style={[styles.teamName, { color: colors.text }]}>
                    {team.name}
                  </Text>
                  {toTeam === team.id && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalList: {
    maxHeight: 400,
  },
  teamItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  teamName: {
    fontSize: 16,
    flex: 1,
  },
});

export default PlayerTransferRequestScreen;

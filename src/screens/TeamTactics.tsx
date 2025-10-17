import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';
import { Trainer, Team } from '../types';
import { mongodbService } from '../services/mongodbService';

interface TeamTacticsProps {
  navigation: any;
  route: {
    params: {
      teamId: string;
      team: Team;
      trainer: Trainer;
    };
  };
}

const TeamTactics: React.FC<TeamTacticsProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { getText } = useLanguage();
  const { teamId, team: initialTeam, trainer } = route.params;
  
  const [team, setTeam] = useState<Team>(initialTeam);
  const [tactics, setTactics] = useState(team.tactics || '');
  const [formation, setFormation] = useState(team.formation || '4-4-2');
  const [loading, setLoading] = useState(false);

  const formations = [
    { id: '4-4-2', name: '4-4-2', description: 'Klassik balansli format' },
    { id: '4-3-3', name: '4-3-3', description: 'Hujumkor format' },
    { id: '3-5-2', name: '3-5-2', description: 'Yarim himoyada ustunlik' },
    { id: '5-3-2', name: '5-3-2', description: 'Himoyaviy format' },
    { id: '4-2-3-1', name: '4-2-3-1', description: 'Zamonaviy format' },
    { id: '3-4-3', name: '3-4-3', description: 'Hujumkor 3 himoyachi' },
  ];

  const handleSaveTactics = async () => {
    if (!tactics.trim()) {
      Alert.alert('Xatolik', 'Taktika matnini kiriting');
      return;
    }

    try {
      setLoading(true);
      
      const updateData = {
        tactics: tactics.trim(),
        formation: formation,
      };

      const result = await mongodbService.updateTeam(teamId, updateData);
      
      if (result.success) {
        setTeam({ ...team, ...updateData });
        Alert.alert('Muvaffaqiyat', 'Jamoaning taktikasi yangilandi!');
      } else {
        Alert.alert('Xatolik', result.error || 'Taktikani saqlashda xatolik');
      }
    } catch (error) {
      console.error('Error saving tactics:', error);
      Alert.alert('Xatolik', 'Taktikani saqlashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const getFormationDescription = (formationId: string) => {
    const formation = formations.find(f => f.id === formationId);
    return formation?.description || '';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>
              ← Orqaga
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Jamoaning Taktikasi
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {trainer.teamName}
          </Text>
        </View>

        <View style={styles.formationContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Formatsiya Tanlash
          </Text>
          
          <View style={styles.formationsGrid}>
            {formations.map((formationItem) => (
              <TouchableOpacity
                key={formationItem.id}
                style={[
                  styles.formationCard,
                  { 
                    backgroundColor: colors.surface,
                    borderColor: formation === formationItem.id ? colors.primary : 'transparent',
                    borderWidth: formation === formationItem.id ? 2 : 0,
                  }
                ]}
                onPress={() => setFormation(formationItem.id)}
              >
                <Text style={[
                  styles.formationName,
                  { 
                    color: formation === formationItem.id ? colors.primary : colors.text 
                  }
                ]}>
                  {formationItem.name}
                </Text>
                <Text style={[styles.formationDescription, { color: colors.textSecondary }]}>
                  {formationItem.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {formation && (
            <View style={[styles.selectedFormation, { backgroundColor: colors.surface }]}>
              <Text style={[styles.selectedFormationTitle, { color: colors.text }]}>
                Tanlangan Formatsiya: {formation}
              </Text>
              <Text style={[styles.selectedFormationDesc, { color: colors.textSecondary }]}>
                {getFormationDescription(formation)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.tacticsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Taktika Matni
          </Text>
          
          <TextInput
            style={[
              styles.tacticsInput,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border,
              }
            ]}
            value={tactics}
            onChangeText={setTactics}
            placeholder="Jamoaning taktikasini yozing..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
          
          <View style={styles.tacticsTips}>
            <Text style={[styles.tipsTitle, { color: colors.text }]}>
              💡 Taktika yozish uchun maslahatlar:
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • Hujum va himoya strategiyasini batafsil yozing
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • O'yinchilarning roli va vazifalarini belgilang
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • Raqibga qarshi maxsus taktikalarni qo'shing
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • O'yin jarayonida o'zgarishlar haqida yozing
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { 
                backgroundColor: colors.primary,
                opacity: loading ? 0.6 : 1
              }
            ]}
            onPress={handleSaveTactics}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saqlanmoqda...' : 'Taktikani Saqlash'}
            </Text>
          </TouchableOpacity>
        </View>

        {team.tactics && (
          <View style={[styles.currentTactics, { backgroundColor: colors.surface }]}>
            <Text style={[styles.currentTacticsTitle, { color: colors.text }]}>
              Joriy Taktika
            </Text>
            <Text style={[styles.currentTacticsText, { color: colors.textSecondary }]}>
              {team.tactics}
            </Text>
          </View>
        )}
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
    paddingTop: 10,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
  },
  formationContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  formationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  formationCard: {
    width: '48%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  formationName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  formationDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
  selectedFormation: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  selectedFormationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  selectedFormationDesc: {
    fontSize: 14,
    textAlign: 'center',
  },
  tacticsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  tacticsInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 150,
    marginBottom: 15,
  },
  tacticsTips: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    marginBottom: 5,
    lineHeight: 20,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  saveButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentTactics: {
    margin: 20,
    padding: 15,
    borderRadius: 10,
  },
  currentTacticsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  currentTacticsText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default TeamTactics;

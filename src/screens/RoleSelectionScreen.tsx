import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';

interface RoleSelectionScreenProps {
  navigation: any;
}

const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { getText } = useLanguage();

  const handleRoleSelection = (role: 'player' | 'trainer' | 'admin') => {
    switch (role) {
      case 'player':
        navigation.navigate('PlayerLogin');
        break;
      case 'trainer':
        navigation.navigate('TrainerLogin');
        break;
      case 'admin':
        navigation.navigate('AdminLogin');
        break;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            HFL Mobile
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Kim sifatida kirishni xohlaysiz?
          </Text>
        </View>

        <View style={styles.roleButtons}>
          <TouchableOpacity
            style={[styles.roleButton, { backgroundColor: colors.primary }]}
            onPress={() => handleRoleSelection('player')}
          >
            <Text style={styles.roleIcon}>⚽</Text>
            <Text style={styles.roleTitle}>O'yinchi</Text>
            <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
              O'z statistikangizni ko'ring
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleButton, { backgroundColor: colors.secondary }]}
            onPress={() => handleRoleSelection('trainer')}
          >
            <Text style={styles.roleIcon}>🏆</Text>
            <Text style={styles.roleTitle}>Murabbiy</Text>
            <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
              Jamoangizni boshqaring
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleButton, { backgroundColor: colors.accent }]}
            onPress={() => handleRoleSelection('admin')}
          >
            <Text style={styles.roleIcon}>👨‍💼</Text>
            <Text style={styles.roleTitle}>Admin</Text>
            <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
              Liga boshqaruvi
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  roleButtons: {
    gap: 20,
  },
  roleButton: {
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  roleIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  roleDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default RoleSelectionScreen;

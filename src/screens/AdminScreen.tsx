import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/useThemeStore';

const AdminScreen = () => {
  const { colors } = useThemeStore();

  const adminFeatures = [
    {
      title: 'Jamoalar',
      description: 'Jamoalarni boshqarish',
      icon: 'people-outline',
      onPress: () => {
        // Navigate to teams management
        console.log('Navigate to teams management');
      }
    },
    {
      title: 'O\'yinlar',
      description: 'O\'yinlarni boshqarish',
      icon: 'football-outline',
      onPress: () => {
        // Navigate to matches management
        console.log('Navigate to matches management');
      }
    },
    {
      title: 'O\'yinchilar',
      description: 'O\'yinchilarni boshqarish',
      icon: 'person-outline',
      onPress: () => {
        // Navigate to players management
        console.log('Navigate to players management');
      }
    },
    {
      title: 'Hisobotlar',
      description: 'Hisobotlarni ko\'rish',
      icon: 'bar-chart-outline',
      onPress: () => {
        // Navigate to reports
        console.log('Navigate to reports');
      }
    }
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Admin Panel</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          HFL boshqaruv tizimi
        </Text>
      </View>

      <View style={styles.content}>
        {adminFeatures.map((feature, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.featureCard, { backgroundColor: colors.card }]}
            onPress={feature.onPress}
          >
            <View style={styles.featureIcon}>
              <Ionicons name={feature.icon as any} size={24} color={colors.primary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>
                {feature.title}
              </Text>
              <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                {feature.description}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Admin panel faqat ruxsat etilgan foydalanuvchilar uchun
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default AdminScreen;

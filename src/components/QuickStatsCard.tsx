import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';

interface QuickStat {
  id: string;
  title: string;
  value: string;
  icon: string;
  color: string;
  onPress?: () => void;
}

interface QuickStatsCardProps {
  stats: QuickStat[];
}

const QuickStatsCard: React.FC<QuickStatsCardProps> = ({ stats }) => {
  const { colors } = useTheme();
  const { getText } = useLanguage();

  const renderStat = (stat: QuickStat) => (
    <TouchableOpacity
      key={stat.id}
      style={[styles.statItem, { backgroundColor: colors.surface }]}
      onPress={stat.onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: stat.color }]}>
        <Ionicons name={stat.icon as any} size={24} color="white" />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{stat.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {getText('quickStats')}
        </Text>
      </View>
      <View style={styles.statsGrid}>
        {stats.map(renderStat)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    padding: 20,
    marginBottom: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default QuickStatsCard;

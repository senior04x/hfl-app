import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';
import { RootStackParamList, Match } from '../types';
import MatchCard from '../components/MatchCard';

type LeagueMatchesScreenRouteProp = RouteProp<RootStackParamList, 'LeagueMatches'>;
type LeagueMatchesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LeagueMatches'>;

const LeagueMatchesScreen = () => {
  const route = useRoute<LeagueMatchesScreenRouteProp>();
  const navigation = useNavigation<LeagueMatchesScreenNavigationProp>();
  const { colors } = useTheme();
  const { getText, language } = useLanguage();
  const { leagueType, dateString, matches } = route.params;

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    
    let locale = 'uz-UZ';
    if (language === 'en') {
      locale = 'en-US';
    } else if (language === 'ru') {
      locale = 'ru-RU';
    }
    
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long',
    }).format(date);
  };

  const renderMatch = ({ item }: { item: Match }) => (
    <MatchCard 
      match={item} 
      onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{leagueType}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {formatDateHeader(dateString)}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <FlatList
          data={matches}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.matchesList}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  matchesList: {
    paddingBottom: 20,
  },
});

export default LeagueMatchesScreen;

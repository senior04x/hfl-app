import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';

import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';
import { RootStackParamList, Match } from '../types';
import { db } from '../lib/firebase';
import MatchCard from '../components/MatchCard';
import MatchSkeletonCard from '../components/MatchSkeletonCard';
// import LoadingOverlay from '../components/LoadingOverlay'; // Skeleton loading ishlatamiz

type MatchesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const MatchesScreen = () => {
  const navigation = useNavigation<MatchesScreenNavigationProp>();
  const { colors } = useTheme();
  const { getText, language } = useLanguage();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // const [showLoadingOverlay, setShowLoadingOverlay] = useState(false); // Skeleton loading ishlatamiz
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'finished'>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('11 Okt 2025, Ses');
  const [toDate, setToDate] = useState('25 Okt 2025, Ses');
  const [showDatePicker, setShowDatePicker] = useState<'from' | 'to' | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [fromDay, setFromDay] = useState(11);
  const [toDay, setToDay] = useState(25);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      // setShowLoadingOverlay(true); // Skeleton loading ishlatamiz
      console.log('Fetching matches from Firebase...');
      
      const q = query(collection(db, 'matches'), orderBy('matchDate', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const matchesData: Match[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          matchesData.push({
            id: doc.id,
            homeTeamId: data.homeTeamId || '',
            homeTeamName: data.homeTeamName || '',
            awayTeamId: data.awayTeamId || '',
            awayTeamName: data.awayTeamName || '',
            homeScore: data.homeScore || 0,
            awayScore: data.awayScore || 0,
            matchDate: data.matchDate?.toDate ? data.matchDate.toDate() : new Date(data.matchDate),
            status: data.status || 'scheduled',
            venue: data.venue || '',
            referee: data.referee || '',
            youtubeLink: data.youtubeLink || '',
            leagueType: data.leagueType || '',
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
          });
        });
        
        console.log('Matches fetched:', matchesData);
        setMatches(matchesData);
        setLoading(false);
        // setShowLoadingOverlay(false); // Skeleton loading ishlatamiz
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error fetching matches:', error);
      setLoading(false);
      // setShowLoadingOverlay(false); // Skeleton loading ishlatamiz
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMatches();
    setRefreshing(false);
  };

  const filteredMatches = matches.filter(match => {
    const now = new Date();
    switch (filter) {
      case 'live':
        return match.status === 'live';
      case 'upcoming':
        return match.status === 'scheduled' && new Date(match.matchDate) > now;
      case 'finished':
        return match.status === 'finished';
      default:
        return true;
    }
  });

  // Group matches by date
  const groupedMatches = filteredMatches.reduce((groups, match) => {
    const dateKey = new Date(match.matchDate).toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(match);
    return groups;
  }, {} as Record<string, Match[]>);

  const sortedDates = Object.keys(groupedMatches).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

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

  const renderDateGroup = (dateString: string) => {
    const matches = groupedMatches[dateString];
    
    // Group matches by league type
    const leagueGroups = matches.reduce((groups, match) => {
      // Determine league type based on match data or create mock data
      const leagueType = getLeagueType(match);
      if (!groups[leagueType]) {
        groups[leagueType] = [];
      }
      groups[leagueType].push(match);
      return groups;
    }, {} as Record<string, Match[]>);

    return (
      <View key={dateString} style={styles.dateGroup}>
        <View style={[styles.dateHeader, { backgroundColor: colors.primary }]}>
          <Text style={styles.dateHeaderText}>
            {formatDateHeader(dateString)}
          </Text>
        </View>
        {Object.entries(leagueGroups).map(([leagueType, leagueMatches]) => {
          return (
            <View key={leagueType}>
              <TouchableOpacity
                style={[styles.leagueItem, { backgroundColor: colors.surface }]}
                onPress={() => {
                  // Navigate to a new screen with matches for this league and date
                  navigation.navigate('LeagueMatches', { 
                    leagueType, 
                    dateString, 
                    matches: leagueMatches 
                  });
                }}
              >
                <Text style={[styles.leagueName, { color: colors.text }]}>{leagueType}</Text>
                <View style={styles.leagueInfo}>
                  <Text style={[styles.matchCount, { color: colors.primary }]}>
                    {leagueMatches.length} {getText('matches')}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  const getLeagueType = (match: Match): string => {
    // Use leagueType from match data if available, otherwise fallback to mock
    if (match.leagueType) {
      return match.leagueType;
    }
    
    // Fallback to mock league assignment
    const leagues = ['HFL 3-liga', 'HFL Pro Liga', 'HFL Super Liga', 'HFL Chempions Liga'];
    const hash = match.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return leagues[Math.abs(hash) % leagues.length];
  };

  const FilterButton = ({ 
    title, 
    value, 
    isActive 
  }: { 
    title: string; 
    value: 'all' | 'live' | 'upcoming' | 'finished'; 
    isActive: boolean; 
  }) => (
    <TouchableOpacity
      style={[
        styles.filterButton, 
        { backgroundColor: isActive ? colors.primary : colors.surface },
        isActive && styles.filterButtonActive
      ]}
      onPress={() => setFilter(value)}
    >
      <Text style={[
        styles.filterText, 
        { color: isActive ? 'white' : colors.textSecondary },
        isActive && styles.filterTextActive
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      {/* LoadingOverlay ni o'chirib qo'yamiz - Skeleton loading ishlatamiz */}
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.header }]}>
          <Text style={[styles.title, { color: colors.text }]}>{getText('calendar')}</Text>
        </View>


        {/* Date Range Selector */}
        <View style={[styles.dateRangeSelector, { backgroundColor: colors.background }]}>
          <View style={styles.dateSelector}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{getText('from')}</Text>
            <TouchableOpacity 
              style={[styles.dateButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowDatePicker('from')}
            >
              <Text style={[styles.dateText, { color: colors.text }]}>{fromDate}</Text>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.dateSelector}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{getText('to')}</Text>
            <TouchableOpacity 
              style={[styles.dateButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowDatePicker('to')}
            >
              <Text style={[styles.dateText, { color: colors.text }]}>{toDate}</Text>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <View style={[styles.datePickerOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.datePickerModal, { backgroundColor: colors.background }]}>
              <View style={[styles.datePickerHeader, { backgroundColor: colors.surface }]}>
                <Text style={[styles.datePickerTitle, { color: colors.text }]}>
                  {showDatePicker === 'from' ? getText('startDate') : getText('endDate')}
                </Text>
                <View style={{ width: 24 }} />
              </View>
              
              <View style={[styles.calendarGrid, { backgroundColor: colors.surface }]}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity>
                    <Ionicons name="chevron-back" size={20} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.monthYear, { color: colors.text }]}>{getText('october')} 2025</Text>
                  <TouchableOpacity>
                    <Ionicons name="chevron-forward" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.weekDays}>
                  {[getText('mon'), getText('tue'), getText('wed'), getText('thu'), getText('fri'), getText('sat'), getText('sun')].map((day, index) => (
                    <Text key={index} style={[styles.weekDay, { color: colors.textSecondary }]}>{day}</Text>
                  ))}
                </View>
                
                <View style={styles.calendarDays}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const isSelected = selectedDay === day;
                    const isInRange = day >= fromDay && day <= toDay;
                    const isStartDay = day === fromDay;
                    const isEndDay = day === toDay;
                    const isCurrentlySelecting = selectedDay === day;
                    
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.calendarDay,
                          { backgroundColor: colors.background },
                          isInRange && styles.selectedRange,
                          isSelected && styles.selectedDay,
                          isStartDay && styles.rangeStart,
                          isEndDay && styles.rangeEnd,
                          isCurrentlySelecting && styles.currentlySelecting,
                        ]}
                        onPress={() => {
                          setSelectedDay(day);
                        }}
                      >
                        <Text style={[
                          styles.dayText,
                          { color: colors.text },
                          isSelected && styles.selectedDayText,
                          isInRange && !isSelected && styles.rangeDayText,
                          isStartDay && styles.rangeStartText,
                          isEndDay && styles.rangeEndText,
                          isCurrentlySelecting && styles.currentlySelectingText,
                        ]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              
              <TouchableOpacity 
                style={[styles.confirmButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (selectedDay && showDatePicker) {
                    const dayNames = [getText('mon'), getText('tue'), getText('wed'), getText('thu'), getText('fri'), getText('sat'), getText('sun')];
                    const dayName = dayNames[selectedDay % 7];
                    const monthShort = getText('october').substring(0, 3);
                    
                    if (showDatePicker === 'from') {
                      setFromDate(`${selectedDay} ${monthShort} 2025, ${dayName}`);
                      setFromDay(selectedDay);
                    } else {
                      setToDate(`${selectedDay} ${monthShort} 2025, ${dayName}`);
                      setToDay(selectedDay);
                    }
                  }
                  setSelectedDay(null);
                  setShowDatePicker(null);
                }}
              >
                <Text style={[styles.confirmButtonText, { color: 'white' }]}>{getText('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Calendar Events */}
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.calendarEvents}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {sortedDates.map(renderDateGroup)}
        </ScrollView>
      </SafeAreaView>
    </>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  dateRangeSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  dateSelector: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  calendarEvents: {
    paddingHorizontal: 16,
  },
  eventItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 2,
    borderRadius: 8,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  eventMatches: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Date Picker Modal Styles
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  datePickerModal: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 16,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  calendarGrid: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    paddingVertical: 8,
  },
  calendarDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  selectedRange: {
    backgroundColor: '#007AFF20',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedDay: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
  },
  selectedDayText: {
    color: 'white',
    fontWeight: '600',
  },
  rangeDayText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  rangeStart: {
    backgroundColor: '#007AFF',
    borderTopLeftRadius: 25,
    borderBottomLeftRadius: 25,
  },
  rangeEnd: {
    backgroundColor: '#007AFF',
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
  },
  rangeStartText: {
    color: 'white',
    fontWeight: '600',
  },
  rangeEndText: {
    color: 'white',
    fontWeight: '600',
  },
  currentlySelecting: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  currentlySelectingText: {
    color: 'white',
    fontWeight: '600',
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterButtonActive: {
    // backgroundColor handled dynamically
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    // color handled dynamically
  },
  list: {
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  leagueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leagueName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  leagueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchCount: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  matchesView: {
    flex: 1,
  },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  backTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
});

export default MatchesScreen;

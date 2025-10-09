import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/useThemeStore';
import { useLanguage } from '../store/useLanguageStore';

interface Player {
  id: string;
  name: string;
  team: string;
  position: string;
  goals: number;
  assists: number;
  rating: number;
  image?: string;
}

interface TopPlayersSectionProps {
  players: Player[];
  onPlayerPress?: (player: Player) => void;
  onViewAllPress?: () => void;
}

const TopPlayersSection: React.FC<TopPlayersSectionProps> = ({
  players,
  onPlayerPress,
  onViewAllPress,
}) => {
  const { colors } = useTheme();
  const { getText } = useLanguage();

  const renderPlayer = ({ item, index }: { item: Player; index: number }) => (
    <TouchableOpacity
      style={[styles.playerCard, { backgroundColor: colors.surface }]}
      onPress={() => onPlayerPress?.(item)}
      activeOpacity={0.7}
    >
      <View style={styles.rankContainer}>
        <Text style={[styles.rank, { color: colors.primary }]}>#{index + 1}</Text>
      </View>
      
      <View style={styles.playerInfo}>
        <View style={styles.playerImageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.playerImage} />
          ) : (
            <Ionicons name="person" size={32} color={colors.primary} />
          )}
        </View>
        
        <View style={styles.playerDetails}>
          <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.playerTeam, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.team}
          </Text>
          <Text style={[styles.playerPosition, { color: colors.textTertiary }]}>
            {item.position}
          </Text>
        </View>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{item.goals}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Goals</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{item.assists}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Assists</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{item.rating}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rating</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="trophy" size={24} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            {getText('topPlayers')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={onViewAllPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.viewAllText, { color: colors.primary }]}>
            {getText('viewAll')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={players.slice(0, 5)}
        renderItem={renderPlayer}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
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
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rank: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
  },
  playerImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  playerTeam: {
    fontSize: 14,
    marginBottom: 2,
  },
  playerPosition: {
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    marginLeft: 15,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
  },
});

export default TopPlayersSection;

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

const TeamSkeletonCard: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SkeletonLoader width={24} height={24} borderRadius={12} />
        <SkeletonLoader width={120} height={20} style={styles.teamName} />
        <SkeletonLoader width={20} height={20} borderRadius={10} />
      </View>
      
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <SkeletonLoader width={30} height={24} />
          <SkeletonLoader width={50} height={12} style={styles.statLabel} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamName: {
    flex: 1,
    marginLeft: 12,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    marginTop: 4,
  },
});

export default TeamSkeletonCard;

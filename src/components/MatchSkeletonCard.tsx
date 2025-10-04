import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

const MatchSkeletonCard: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SkeletonLoader width={80} height={16} />
        <SkeletonLoader width={60} height={16} />
      </View>
      
      <View style={styles.teams}>
        <View style={styles.team}>
          <SkeletonLoader width={24} height={24} borderRadius={12} />
          <SkeletonLoader width={80} height={18} style={styles.teamName} />
        </View>
        
        <View style={styles.score}>
          <SkeletonLoader width={40} height={24} />
        </View>
        
        <View style={styles.team}>
          <SkeletonLoader width={80} height={18} style={styles.teamName} />
          <SkeletonLoader width={24} height={24} borderRadius={12} />
        </View>
      </View>
      
      <View style={styles.footer}>
        <SkeletonLoader width={100} height={14} />
        <SkeletonLoader width={60} height={14} />
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
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  teams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  team: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    marginHorizontal: 8,
  },
  score: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default MatchSkeletonCard;

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../store/useAuthStore';
import { RootStackParamList } from '../types';

type AdminScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const AdminScreen = () => {
  const navigation = useNavigation<AdminScreenNavigationProp>();
  const { user, signOut } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: signOut 
        },
      ]
    );
  };

  const AdminAction = ({ 
    title, 
    description, 
    icon, 
    onPress 
  }: { 
    title: string; 
    description: string; 
    icon: keyof typeof Ionicons.glyphMap; 
    onPress: () => void; 
  }) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={24} color="#007AFF" />
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.subtitle}>Welcome, {user?.displayName}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Match Management</Text>
        
        <AdminAction
          title="Create Match"
          description="Add a new match to the schedule"
          icon="add-circle"
          onPress={() => navigation.navigate('AdminMatchEdit')}
        />

        <AdminAction
          title="Update Scores"
          description="Update live match scores"
          icon="football"
          onPress={() => {
            // For demo purposes, navigate to a specific match
            // In a real app, you'd show a list of matches to choose from
            Alert.alert('Info', 'Select a match to update scores');
          }}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System</Text>
        
        <AdminAction
          title="Refresh Data"
          description="Reload all data from server"
          icon="refresh"
          onPress={() => {
            Alert.alert('Info', 'Data refresh functionality would be implemented here');
          }}
        />

        <AdminAction
          title="Send Notifications"
          description="Send push notifications to users"
          icon="notifications"
          onPress={() => {
            Alert.alert('Info', 'Notification system would be implemented here');
          }}
        />
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out" size={20} color="#FF3B30" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  signOutText: {
    fontSize: 16,
    color: '#FF3B30',
    marginLeft: 8,
    fontWeight: '600',
  },
});

export default AdminScreen;

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ApplicationTypeModalProps {
  visible: boolean;
  onClose: () => void;
  onPlayerApplication: () => void;
  onTeamApplication: () => void;
  onLeagueApplication: () => void;
}

const { width } = Dimensions.get('window');

const ApplicationTypeModal: React.FC<ApplicationTypeModalProps> = ({
  visible,
  onClose,
  onPlayerApplication,
  onTeamApplication,
  onLeagueApplication,
}) => {
  const scaleValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(scaleValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [visible, scaleValue]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleValue }],
            },
          ]}
        >
          <View style={styles.modalContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="information-circle" size={48} color="#3B82F6" />
            </View>
            
            <Text style={styles.title}>Ariza Turi</Text>
            <Text style={styles.message}>Qanday ariza berishni xohlaysiz?</Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.applicationButton, styles.playerButton]}
                onPress={onPlayerApplication}
              >
                <Ionicons name="person" size={24} color="white" />
                <Text style={styles.buttonText}>O'yinchi Ariza</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.applicationButton, styles.teamButton]}
                onPress={onTeamApplication}
              >
                <Ionicons name="people" size={24} color="white" />
                <Text style={styles.buttonText}>Jamoa Ariza</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.applicationButton, styles.leagueButton]}
                onPress={onLeagueApplication}
              >
                <Ionicons name="trophy" size={24} color="white" />
                <Text style={styles.buttonText}>Liga Ariza</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>Bekor qilish</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  applicationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
  },
  playerButton: {
    backgroundColor: '#3B82F6',
  },
  teamButton: {
    backgroundColor: '#10B981',
  },
  leagueButton: {
    backgroundColor: '#F59E0B',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
});

export default ApplicationTypeModal;

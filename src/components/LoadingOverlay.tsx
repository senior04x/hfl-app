// Loading Overlay Component for HFL Mobile App
// Shows loading state with customizable message

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/useThemeStore';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  showCancel?: boolean;
  onCancel?: () => void;
  type?: 'default' | 'success' | 'error' | 'warning';
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Yuklanmoqda...',
  showCancel = false,
  onCancel,
  type = 'default',
}) => {
  const { colors } = useTheme();

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          color: '#4CAF50',
          backgroundColor: '#E8F5E8',
        };
      case 'error':
        return {
          icon: 'close-circle',
          color: '#F44336',
          backgroundColor: '#FFEBEE',
        };
      case 'warning':
        return {
          icon: 'warning',
          color: '#FF9800',
          backgroundColor: '#FFF3E0',
        };
      default:
        return {
          icon: 'refresh',
          color: colors.primary,
          backgroundColor: colors.surface,
        };
    }
  };

  const config = getTypeConfig();

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.iconContainer, { backgroundColor: config.backgroundColor }]}>
            {type === 'default' ? (
              <ActivityIndicator size="large" color={config.color} />
            ) : (
              <Ionicons name={config.icon as any} size={40} color={config.color} />
            )}
          </View>
          
          <Text style={[styles.message, { color: colors.text }]}>
            {message}
          </Text>
          
          {showCancel && onCancel && (
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={onCancel}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Bekor qilish
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  cancelButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LoadingOverlay;

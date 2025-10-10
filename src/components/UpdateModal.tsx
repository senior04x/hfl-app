import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/useThemeStore';

interface UpdateInfo {
  version: string;
  downloadUrl: string;
  forceUpdate: boolean;
  releaseNotes: string;
  updateType: 'ota' | 'manual';
}

interface UpdateModalProps {
  visible: boolean;
  updateInfo: UpdateInfo | null;
  onUpdate: () => void;
  onLater: () => void;
  onClose: () => void;
  isUpdating?: boolean;
  updateProgress?: number;
}

const { width } = Dimensions.get('window');

export const UpdateModal: React.FC<UpdateModalProps> = ({
  visible,
  updateInfo,
  onUpdate,
  onLater,
  onClose,
  isUpdating = false,
  updateProgress = 0,
}) => {
  const { theme } = useTheme();
  const [showDetails, setShowDetails] = useState(false);

  if (!updateInfo) return null;

  const isOTA = updateInfo.updateType === 'ota';
  const canClose = !updateInfo.forceUpdate && !isUpdating;

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modal: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 24,
      width: width * 0.9,
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 10,
      },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    icon: {
      marginRight: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      flex: 1,
    },
    version: {
      fontSize: 16,
      color: theme.colors.primary,
      fontWeight: '600',
      marginBottom: 8,
    },
    message: {
      fontSize: 16,
      color: theme.colors.text,
      lineHeight: 24,
      marginBottom: 16,
    },
    releaseNotes: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: 16,
    },
    detailsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    detailsText: {
      fontSize: 14,
      color: theme.colors.primary,
      marginRight: 4,
    },
    progressContainer: {
      marginBottom: 20,
    },
    progressBar: {
      height: 6,
      backgroundColor: theme.colors.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 3,
    },
    progressText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    primaryButtonText: {
      color: '#FFFFFF',
    },
    secondaryButtonText: {
      color: theme.colors.text,
    },
    closeButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      padding: 8,
    },
    updateType: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isOTA ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      alignSelf: 'flex-start',
      marginBottom: 12,
    },
    updateTypeText: {
      fontSize: 12,
      fontWeight: '600',
      color: isOTA ? '#22c55e' : '#3b82f6',
      marginLeft: 4,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={canClose ? onClose : undefined}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {canClose && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}

          <View style={styles.header}>
            <Ionicons
              name={isOTA ? "cloud-download" : "download"}
              size={28}
              color={theme.colors.primary}
              style={styles.icon}
            />
            <Text style={styles.title}>
              {isOTA ? 'OTA Yangilanish' : 'Yangilanish mavjud'}
            </Text>
          </View>

          <View style={styles.updateType}>
            <Ionicons
              name={isOTA ? "flash" : "phone-portrait"}
              size={16}
              color={isOTA ? '#22c55e' : '#3b82f6'}
            />
            <Text style={styles.updateTypeText}>
              {isOTA ? 'OTA Update' : 'Manual Update'}
            </Text>
          </View>

          <Text style={styles.version}>Versiya {updateInfo.version}</Text>

          <Text style={styles.message}>
            {isOTA
              ? 'Yangi versiya mavjud. OTA yangilanish tez va xavfsiz.'
              : 'Yangi versiya chiqarildi. Yangilanishni yuklab oling.'}
          </Text>

          {updateInfo.releaseNotes && (
            <>
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => setShowDetails(!showDetails)}
              >
                <Text style={styles.detailsText}>
                  {showDetails ? 'Yashirish' : 'Tafsilotlarni ko\'rish'}
                </Text>
                <Ionicons
                  name={showDetails ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>

              {showDetails && (
                <Text style={styles.releaseNotes}>{updateInfo.releaseNotes}</Text>
              )}
            </>
          )}

          {isUpdating && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${updateProgress}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {isOTA ? 'OTA yangilanish yuklanmoqda...' : 'Yangilanish yuklanmoqda...'} {Math.round(updateProgress)}%
              </Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            {!updateInfo.forceUpdate && !isUpdating && (
              <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={onLater}>
                <Ionicons name="time" size={20} color={theme.colors.text} />
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  Keyinroq
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={isOTA ? "cloud-download" : "download"}
                  size={20}
                  color="#FFFFFF"
                />
              )}
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                {isUpdating
                  ? 'Yuklanmoqda...'
                  : isOTA
                  ? 'OTA Yangilash'
                  : 'Yangilash'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

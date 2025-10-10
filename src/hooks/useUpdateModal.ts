import { useState, useCallback } from 'react';
import UpdateService from '../services/updateService';

interface UpdateInfo {
  version: string;
  downloadUrl: string;
  forceUpdate: boolean;
  releaseNotes: string;
  updateType: 'ota' | 'manual';
}

export const useUpdateModal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  const showUpdateModal = useCallback((info: UpdateInfo) => {
    setUpdateInfo(info);
    setIsVisible(true);
    setIsUpdating(false);
    setUpdateProgress(0);
  }, []);

  const hideUpdateModal = useCallback(() => {
    setIsVisible(false);
    setUpdateInfo(null);
    setIsUpdating(false);
    setUpdateProgress(0);
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!updateInfo) return;

    setIsUpdating(true);
    setUpdateProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUpdateProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      if (updateInfo.updateType === 'ota') {
        // OTA update
        await UpdateService.performOTAUpdate();
      } else {
        // Manual update - open download URL
        await UpdateService.downloadUpdate(updateInfo);
      }

      clearInterval(progressInterval);
      setUpdateProgress(100);

      // Hide modal after successful update
      setTimeout(() => {
        hideUpdateModal();
      }, 1000);

    } catch (error) {
      console.error('Update failed:', error);
      setIsUpdating(false);
      setUpdateProgress(0);
    }
  }, [updateInfo, hideUpdateModal]);

  const handleLater = useCallback(() => {
    hideUpdateModal();
  }, [hideUpdateModal]);

  // Set up the update service callback
  const setupUpdateCallback = useCallback(() => {
    UpdateService.setUpdateModalCallback(showUpdateModal);
  }, [showUpdateModal]);

  return {
    isVisible,
    updateInfo,
    isUpdating,
    updateProgress,
    showUpdateModal,
    hideUpdateModal,
    handleUpdate,
    handleLater,
    setupUpdateCallback,
  };
};


import Constants, { ExecutionEnvironment } from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

const isAndroidExpoGo = Platform.OS === 'android' && (
    isRunningInExpoGo() ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants.appOwnership === 'expo' || Constants.appOwnership === 'guest'
);

// SDK 55+ throws during module initialization in Android Expo Go, before a
// push registration guard can run. Keep the native module out of that runtime.
export const notifications: typeof import('expo-notifications') | null =
    isAndroidExpoGo ? null : require('expo-notifications');

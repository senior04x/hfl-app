import { Platform } from 'react-native';
import LegacyAppNavigator from './SwipeableAppNavigator';

// Do not initialize the native tab implementation on older iOS runtimes.
const useNativeTabs = Platform.OS === 'ios' && Number.parseInt(String(Platform.Version), 10) >= 26;
const AppNavigator: typeof LegacyAppNavigator = useNativeTabs
    ? require('./NativeAppNavigator.ios').default
    : LegacyAppNavigator;

export default AppNavigator;

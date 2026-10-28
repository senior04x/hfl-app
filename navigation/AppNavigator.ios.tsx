import { Platform } from 'react-native';
import LegacyAppNavigator from './SwipeableAppNavigator';

// Keep the existing panel on iPad while the experimental iOS26 tab host is
// unverified there. The native iPad flow stalls when entering the main scene.
const useNativeTabs = Platform.OS === 'ios' && !Platform.isPad && Number.parseInt(String(Platform.Version), 10) >= 26;
const AppNavigator: typeof LegacyAppNavigator = useNativeTabs
    ? require('./NativeAppNavigator.ios').default
    : LegacyAppNavigator;

export default AppNavigator;

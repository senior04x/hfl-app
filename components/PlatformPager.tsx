import { Animated, FlatList, Platform, ScrollView } from 'react-native';
import {
    FlatList as GestureFlatList,
    ScrollView as GestureScrollView,
} from 'react-native-gesture-handler';

// Android's native horizontal ScrollView can intercept nested vertical lists.
// Gesture Handler coordinates their native touch handlers; iOS keeps its pager.
export const PagerScrollView = Platform.OS === 'android'
    ? Animated.createAnimatedComponent(GestureScrollView)
    : Animated.ScrollView;

export const PagerFlatList = (Platform.OS === 'android'
    ? GestureFlatList
    : FlatList) as typeof FlatList;

export const PagerContentScrollView = (Platform.OS === 'android'
    ? GestureScrollView
    : ScrollView) as typeof ScrollView;

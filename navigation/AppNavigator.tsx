import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View, TouchableOpacity, Dimensions, Animated, PanResponder } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../store/useAuthStore';
import SmartImage from '../components/SmartImage';

import HomeScreen from '../screens/HomeScreen';
import TournamentsScreen from '../screens/TournamentsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import NewsScreen from '../screens/NewsScreen';
import AccountScreen from '../screens/AccountScreen';

const { width } = Dimensions.get('window');
const CAPSULE_WIDTH = width - 72;
const TAB_COUNT = 5;
const TAB_ITEM_WIDTH = (CAPSULE_WIDTH - 8) / TAB_COUNT;
const HIGHLIGHT_WIDTH = 48;
const HIGHLIGHT_OFFSET = (TAB_ITEM_WIDTH - HIGHLIGHT_WIDTH) / 2;

const Tab = createBottomTabNavigator();

function CustomFloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { user } = useAuthStore();
    const userAvatarUri = user?.photo || user?.photo_url || user?.avatar || user?.logo || user?.logo_url;

    // Animated position for sliding pill highlight
    const translateX = useRef(new Animated.Value(state.index * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4)).current;

    const startIndexRef = useRef(state.index);
    const isDraggingRef = useRef(false);

    useEffect(() => {
        if (!isDraggingRef.current) {
            startIndexRef.current = state.index;
            Animated.spring(translateX, {
                toValue: state.index * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4,
                useNativeDriver: true,
                tension: 70,
                friction: 9,
            }).start();
        }
    }, [state.index]);

    // Ultra-smooth 120fps PanResponder drag gesture
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 10,
            onPanResponderGrant: () => {
                isDraggingRef.current = true;
                startIndexRef.current = state.index;
            },
            onPanResponderMove: (_, gestureState) => {
                const startX = startIndexRef.current * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4;
                const minX = HIGHLIGHT_OFFSET + 4;
                const maxX = (TAB_COUNT - 1) * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4;
                const currentX = Math.max(minX, Math.min(maxX, startX + gestureState.dx));
                translateX.setValue(currentX);
            },
            onPanResponderRelease: (_, gestureState) => {
                isDraggingRef.current = false;
                const startX = startIndexRef.current * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4;
                const finalX = startX + gestureState.dx;
                const targetIndex = Math.max(
                    0,
                    Math.min(TAB_COUNT - 1, Math.round((finalX - HIGHLIGHT_OFFSET - 4) / TAB_ITEM_WIDTH))
                );

                if (targetIndex !== state.index) {
                    navigation.navigate(state.routes[targetIndex].name);
                } else {
                    Animated.spring(translateX, {
                        toValue: state.index * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4,
                        useNativeDriver: true,
                        tension: 70,
                        friction: 9,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                isDraggingRef.current = false;
                Animated.spring(translateX, {
                    toValue: state.index * TAB_ITEM_WIDTH + HIGHLIGHT_OFFSET + 4,
                    useNativeDriver: true,
                    tension: 70,
                    friction: 9,
                }).start();
            },
        })
    ).current;

    return (
        <View style={styles.floatingContainer}>
            <View style={styles.floatingCapsuleWrapper} {...panResponder.panHandlers}>
                <BlurView
                    intensity={Platform.OS === 'ios' ? 45 : 55}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                />

                {/* SLIDING ACTIVE HIGHLIGHT PILL */}
                <Animated.View
                    style={[
                        styles.slidingHighlight,
                        {
                            transform: [{ translateX }],
                        },
                    ]}
                />

                <View style={styles.tabRow}>
                    {state.routes.map((route, index) => {
                        const { options } = descriptors[route.key];
                        const isFocused = state.index === index;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        let iconName: any = "home-outline";
                        if (route.name === 'Asosiy') {
                            iconName = isFocused ? "home" : "home-outline";
                        } else if (route.name === 'Turnirlar') {
                            iconName = isFocused ? "trophy" : "trophy-outline";
                        } else if (route.name === 'Taqvim') {
                            iconName = isFocused ? "calendar" : "calendar-outline";
                        } else if (route.name === 'Yangiliklar') {
                            iconName = isFocused ? "newspaper" : "newspaper-outline";
                        }

                        return (
                            <TouchableOpacity
                                key={route.key}
                                accessibilityRole="button"
                                accessibilityState={isFocused ? { selected: true } : {}}
                                accessibilityLabel={options.tabBarAccessibilityLabel}
                                testID={options.tabBarTestID}
                                onPress={onPress}
                                activeOpacity={0.7}
                                style={styles.tabItem}
                            >
                                <View style={styles.iconWrapper}>
                                    {route.name === 'Profil' ? (
                                        userAvatarUri ? (
                                            <SmartImage
                                                uri={userAvatarUri}
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: 12,
                                                    borderWidth: isFocused ? 2 : 1,
                                                    borderColor: isFocused ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                                                }}
                                                contentFit="cover"
                                                fallbackIcon="person-circle-outline"
                                                fallbackIconSize={24}
                                            />
                                        ) : (
                                            <Ionicons
                                                name={isFocused ? "person" : "person-outline"}
                                                size={22}
                                                color={isFocused ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)'}
                                            />
                                        )
                                    ) : (
                                        <Ionicons
                                            name={iconName}
                                            size={22}
                                            color={isFocused ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)'}
                                        />
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

export default function AppNavigator() {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomFloatingTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                sceneContainerStyle: { backgroundColor: 'transparent' },
            }}
        >
            <Tab.Screen name="Asosiy" component={HomeScreen} />
            <Tab.Screen name="Turnirlar" component={TournamentsScreen} />
            <Tab.Screen name="Taqvim" component={CalendarScreen} />
            <Tab.Screen name="Yangiliklar" component={NewsScreen} />
            <Tab.Screen name="Profil" component={AccountScreen} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    floatingContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 36 : 28,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingCapsuleWrapper: {
        width: CAPSULE_WIDTH,
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.16)',
        backgroundColor: 'rgba(20, 15, 25, 0.48)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45,
        shadowRadius: 20,
        elevation: 8,
        position: 'relative',
    },
    slidingHighlight: {
        position: 'absolute',
        top: 9,
        left: 0,
        width: HIGHLIGHT_WIDTH,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
    },
    tabRow: {
        flexDirection: 'row',
        width: '100%',
        height: 56,
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 4,
    },
    tabItem: {
        flex: 1,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapper: {
        width: 48,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
});

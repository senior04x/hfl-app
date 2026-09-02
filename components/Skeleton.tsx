import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

interface SkeletonProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    style?: ViewStyle;
    circle?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 8,
    style,
    circle = false,
}) => {
    const opacity = useRef(new Animated.Value(0.3)).current;
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );

        animation.start();

        return () => animation.stop();
    }, [opacity]);

    const defaultBg = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';

    const skeletonStyle: ViewStyle = {
        width: width as any,
        height: height as any,
        borderRadius: circle ? (typeof height === 'number' ? height / 2 : 50) : borderRadius,
        backgroundColor: defaultBg,
        opacity: opacity as any,
    };

    return <Animated.View style={[skeletonStyle, style, { opacity }]} />;
};

export default Skeleton;

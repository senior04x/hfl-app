import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/Colors';

const { width, height } = Dimensions.get('window');

interface AnimatedBackgroundProps {
    children?: React.ReactNode;
    overlayOpacity?: number;
    backgroundImage?: any;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ 
    children, 
    overlayOpacity = 0.85,
    backgroundImage
}) => {
    const anim1 = useRef(new Animated.Value(0)).current;
    const anim2 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const startAnimation = () => {
            Animated.loop(
                Animated.parallel([
                    Animated.timing(anim1, {
                        toValue: 1,
                        duration: 15000,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim2, {
                        toValue: 1,
                        duration: 20000,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    })
                ])
            ).start();
        };

        startAnimation();
    }, []);

    const transX1 = anim1.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [-width * 0.2, width * 0.2, -width * 0.2],
    });

    const transY1 = anim1.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [-height * 0.1, height * 0.1, -height * 0.1],
    });

    const transX2 = anim2.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [width * 0.1, -width * 0.1, width * 0.1],
    });

    const transY2 = anim2.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [height * 0.05, -height * 0.05, height * 0.05],
    });

    const rotation1 = anim1.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.container}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />

            {backgroundImage && (
                <Image 
                    source={backgroundImage} 
                    style={StyleSheet.absoluteFill} 
                    resizeMode="cover"
                />
            )}

            <Animated.View 
                style={[
                    styles.gradientBox, 
                    { 
                        transform: [
                            { translateX: transX1 }, 
                            { translateY: transY1 },
                            { rotate: rotation1 },
                            { scale: 1.5 }
                        ],
                        opacity: 0.4
                    }
                ]}
            >
                <LinearGradient
                    colors={[Colors.primary + '66', 'transparent']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            </Animated.View>

            <Animated.View 
                style={[
                    styles.gradientBox, 
                    { 
                        transform: [
                            { translateX: transX2 }, 
                            { translateY: transY2 },
                            { scale: 2 }
                        ],
                        opacity: 0.3
                    }
                ]}
            >
                <LinearGradient
                    colors={['#333', 'transparent']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0, y: 1 }}
                />
            </Animated.View>

            <LinearGradient
                colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.6)']}
                style={StyleSheet.absoluteFill}
            />

            <View 
                style={[
                    StyleSheet.absoluteFill, 
                    { backgroundColor: `rgba(0,0,0,${overlayOpacity})` }
                ]} 
            />

            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    gradientBox: {
        position: 'absolute',
        width: width * 1.5,
        height: width * 1.5,
        borderRadius: width,
        top: -width * 0.25,
        left: -width * 0.25,
    }
});

export default AnimatedBackground;

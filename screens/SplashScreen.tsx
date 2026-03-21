import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image, StatusBar } from 'react-native';

const AnimatedText = Animated.createAnimatedComponent(Text);

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
    // Animation refs
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoTranslateX = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const textTranslateX = useRef(new Animated.Value(0)).current;
    const letterSpacing = useRef(new Animated.Value(-10)).current; // Faded in bunched

    useEffect(() => {
        // Sequenced animation
        Animated.sequence([
            // 1. Logo Fade In at center
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            // 2. Delay before split
            Animated.delay(400),
            // 3. The "Grand Reveal"
            Animated.parallel([
                // Logo slides left
                Animated.timing(logoTranslateX, {
                    toValue: -80,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                // Text emerges from behind the logo (hidden by overflow)
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(textTranslateX, {
                    toValue: 0,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                // Letters spread out
                Animated.timing(letterSpacing, {
                    toValue: 4,
                    duration: 1200,
                    useNativeDriver: false, // letterSpacing doesn't support native driver
                }),
            ]),
        ]).start();

        // Callback after delay
        const timer = setTimeout(() => {
            onFinish();
        }, 4000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            <View style={styles.contentWrapper}>
                {/* Logo - Stays on top and moves left */}
                <Animated.View style={[
                    styles.logoContainer,
                    {
                        opacity: logoOpacity,
                        transform: [{ translateX: logoTranslateX }]
                    }
                ]}>
                    <Image
                        source={require('../assets/logo.png')}
                        style={styles.logo}
                        defaultSource={require('../assets/images/icon.png')}
                    />
                </Animated.View>

                {/* Clipping Container for the Text */}
                <View style={styles.clippingContainer}>
                    <Animated.View style={[
                        styles.textContainer,
                        {
                            opacity: textOpacity,
                            transform: [{ translateX: textTranslateX }]
                        }
                    ]}>
                        <AnimatedText style={[
                            styles.brandName,
                            { letterSpacing: letterSpacing }
                        ]}>
                            AMATORA
                        </AnimatedText>
                    </Animated.View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        position: 'relative',
    },
    logoContainer: {
        width: 70, // Slightly wider to better hide emerging text
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        zIndex: 10,
    },
    logo: {
        width: 70,
        height: 70,
        resizeMode: 'contain',
    },
    clippingContainer: {
        position: 'absolute',
        left: '45%', // Start from the center
        width: 300,  // Enough space for text
        height: 50,
        overflow: 'hidden', // This is the key: hides text that hasn't "slid out" yet
        justifyContent: 'center',
        zIndex: 5,
    },
    textContainer: {
        // Starts at 0 (hidden inside clipping container because it's left-aligned to center)
    },
    brandName: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: '900',
        // letterSpacing is animated
    },
});

export default SplashScreen;

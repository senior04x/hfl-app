import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import VideoBackground from './VideoBackground';

interface AnimatedBackgroundProps {
    children?: React.ReactNode;
    overlayOpacity?: number;
    backgroundImage?: any;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ 
    children, 
    overlayOpacity = 0.72,
    backgroundImage,
}) => {
    return (
        <View style={styles.wrapper}>
            <StatusBar style="light" />
            <VideoBackground 
                source={require('../assets/images/welcomeScreenVideo1.mp4')} 
                posterSource={backgroundImage}
                overlayOpacity={overlayOpacity}
                style={StyleSheet.absoluteFill}
            />
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: '#050811',
    },
});

export default AnimatedBackground;

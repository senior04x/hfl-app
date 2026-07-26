import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import VideoBackground from './VideoBackground';

interface AnimatedBackgroundProps {
    children?: React.ReactNode;
    overlayOpacity?: number;
    backgroundImage?: any;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ 
    children, 
    overlayOpacity = 0.72,
}) => {
    return (
        <View style={styles.wrapper}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <VideoBackground 
                source={require('../assets/images/welcomeScreenVideo1.mp4')} 
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

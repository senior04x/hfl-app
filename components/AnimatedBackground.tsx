import React from 'react';
import { StyleSheet } from 'react-native';
import VideoBackground from './VideoBackground';

interface AnimatedBackgroundProps {
    children?: React.ReactNode;
    overlayOpacity?: number;
    backgroundImage?: any;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ 
    children, 
    overlayOpacity = 0.75,
}) => {
    return (
        <VideoBackground 
            source={require('../assets/images/welcomeScreenVideo1.mp4')} 
            overlayOpacity={overlayOpacity}
            style={StyleSheet.absoluteFill}
        >
            {children}
        </VideoBackground>
    );
};

export default AnimatedBackground;

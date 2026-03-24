import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Platform, Image } from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';

interface VideoBackgroundProps {
    source: any;
    posterSource?: any;
    posterResizeMode?: 'cover' | 'contain' | 'center' | 'stretch';
    overlayOpacity?: number;
    style?: any;
    children?: React.ReactNode;
}

/**
 * Reusable Video Background component optimized for Android and iOS.
 * Handles auto-play, looping, and muting.
 */
const VideoBackground: React.FC<VideoBackgroundProps> = ({ 
    source, 
    posterSource,
    posterResizeMode = 'cover',
    overlayOpacity = 0.85,
    style,
    children 
}) => {
    const videoRef = useRef<Video>(null);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);

    useEffect(() => {
        // Essential for Android autoplay in standalone builds
        const setupAudio = async () => {
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    staysActiveInBackground: false,
                    interruptionModeIOS: 1, // interruptionModeIOS.DoNotMix
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                    interruptionModeAndroid: 1, // interruptionModeAndroid.DoNotMix
                    playThroughEarpieceAndroid: false,
                });
            } catch (error) {
                console.log('Audio mode setup error:', error);
            }
        };

        setupAudio();

        // Extra push for Android to start playing
        if (Platform.OS === 'android') {
            const timer = setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.playAsync();
                }
            }, 800);
            return () => clearTimeout(timer);
        }
    }, []);

    return (
        <View style={[styles.container, style]}>
            {/* Fallback Image / Poster - Shows while loading or if video fails */}
            {posterSource && !isVideoLoaded && (
                <Image 
                    source={posterSource} 
                    style={StyleSheet.absoluteFill} 
                    resizeMode={posterResizeMode}
                />
            )}

            <Video
                ref={videoRef}
                source={source}
                posterSource={posterSource}
                usePoster={true}
                posterStyle={{ resizeMode: posterResizeMode }}
                style={[StyleSheet.absoluteFill, { opacity: isVideoLoaded ? 1 : 0 }]}
                resizeMode={ResizeMode.COVER}
                shouldPlay={true}
                isLooping={true}
                isMuted={true}
                useNativeControls={false}
                onLoad={() => {
                    setIsVideoLoaded(true);
                    if (videoRef.current) {
                        videoRef.current.playAsync();
                    }
                }}
                onError={(err) => {
                    console.log('Video Playback Error:', err);
                    setIsVideoLoaded(false);
                }}
            />
            {/* Dark Overlay */}
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
        backgroundColor: '#000', // Fallback color
    },
});

export default VideoBackground;

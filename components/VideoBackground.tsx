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
 * Handles auto-play, looping, and muting seamlessly across platforms.
 */
const VideoBackground: React.FC<VideoBackgroundProps> = ({ 
    source, 
    posterSource,
    posterResizeMode = 'cover',
    overlayOpacity = 0.78,
    style,
    children 
}) => {
    const videoRef = useRef<Video>(null);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);

    useEffect(() => {
        const setupAudioAndPlay = async () => {
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    staysActiveInBackground: false,
                    interruptionModeIOS: 1, // DoNotMix
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                    interruptionModeAndroid: 1, // DoNotMix
                    playThroughEarpieceAndroid: false,
                });
            } catch (error) {
                console.log('Audio mode setup error:', error);
            }

            if (videoRef.current) {
                try {
                    await videoRef.current.playAsync();
                } catch (e) {
                    console.log('Play async error:', e);
                }
            }
        };

        setupAudioAndPlay();

        if (Platform.OS === 'android') {
            const timer = setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.playAsync().catch(() => {});
                }
            }, 400);
            return () => clearTimeout(timer);
        }
    }, []);

    return (
        <View style={[styles.container, style]}>
            {/* Fallback Image - Only shows if poster specified and video not ready */}
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
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.COVER}
                shouldPlay={true}
                isLooping={true}
                isMuted={true}
                useNativeControls={false}
                usePoster={false}
                onLoad={() => {
                    setIsVideoLoaded(true);
                    if (videoRef.current) {
                        videoRef.current.playAsync().catch(() => {});
                    }
                }}
                onReadyForDisplay={() => {
                    setIsVideoLoaded(true);
                    if (videoRef.current) {
                        videoRef.current.playAsync().catch(() => {});
                    }
                }}
                onError={(err) => {
                    console.log('Video Playback Error:', err);
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
        backgroundColor: '#050811',
    },
});

export default VideoBackground;

import React, { useEffect, useState } from 'react';
import { AppState, View, StyleSheet, Image } from 'react-native';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';

interface VideoBackgroundProps {
    source: VideoSource;
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
    const player = useVideoPlayer(source, player => {
        player.loop = true;
        player.muted = true;
        player.audioMixingMode = 'mixWithOthers';
        if (AppState.currentState === 'active') player.play();
    });
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);

    useEffect(() => {
        setIsVideoLoaded(false);
    }, [player]);

    useEventListener(player, 'statusChange', ({ status }) => {
        if (status === 'error') setIsVideoLoaded(false);
    });

    useEffect(() => {
        const subscription = AppState.addEventListener('change', state => {
            if (state === 'active') player.play();
            else player.pause();
        });
        return () => subscription.remove();
    }, [player]);
    return (
        <View style={[styles.container, style]}>

            <VideoView
                player={player}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                surfaceType="textureView"
                nativeControls={false}
                onFirstFrameRender={() => setIsVideoLoaded(true)}
            />
            {/* Keep the poster above the native video until a frame is displayed. */}
            {posterSource && !isVideoLoaded && (
                <Image
                    source={posterSource}
                    style={StyleSheet.absoluteFill}
                    resizeMode={posterResizeMode}
                />
            )}
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

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

const { width } = Dimensions.get('window');

interface YoutubePlayerCardProps {
    videoUrl: string;
}

const YoutubePlayerCard: React.FC<YoutubePlayerCardProps> = ({ videoUrl }) => {
    const [loading, setLoading] = useState(true);

    // YouTube ID ajratib olish funksiyasi
    const videoId = useMemo(() => {
        if (!videoUrl) return null;
        
        // Regex for various YouTube formats (watch, share, shorts)
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = videoUrl.match(regex);
        return match ? match[1] : null;
    }, [videoUrl]);

    const onReady = useCallback(() => {
        setLoading(false);
    }, []);

    if (!videoId) return null;

    return (
        <View style={styles.container}>
            <View style={styles.playerWrapper}>
                <YoutubePlayer
                    height={(width - 32) * (9 / 16)}
                    width={width - 32}
                    videoId={videoId}
                    onReady={onReady}
                    play={false}
                    initialPlayerParams={{
                        controls: true,
                        modestbranding: true,
                        rel: false,
                        preventFullScreen: false,
                    }}
                />
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#3B82F6" />
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        marginVertical: 10,
    },
    playerWrapper: {
        width: width - 32,
        height: (width - 32) * (9 / 16),
        backgroundColor: '#000',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default YoutubePlayerCard;

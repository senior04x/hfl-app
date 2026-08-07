import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';

interface ReplayVideoCardProps {
  videoUrl: string;
  title: string;
  minute?: number | string;
  teamName?: string;
  playerPhoto?: string;
}

export default function ReplayVideoCard({
  videoUrl,
  title,
  minute,
  teamName
}: ReplayVideoCardProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await videoRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  return (
    <View style={styles.card}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      
      {/* Video Header Badge */}
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Ionicons name="videocam" size={14} color="#00FF66" />
          <Text style={styles.badgeText}>{minute ? `${minute}' GOL REPLAY` : '20s REPLAY'}</Text>
        </View>
        {teamName && <Text style={styles.teamName}>{teamName.toUpperCase()}</Text>}
      </View>

      {/* Video Player Box */}
      <View style={styles.videoBox}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary || '#7c3aed'} />
          </View>
        )}

        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          isLooping={true}
          useNativeControls={true}
          onLoad={() => setLoading(false)}
          onError={(e) => console.log('Replay video error:', e)}
        />

        {!isPlaying && !loading && (
          <TouchableOpacity style={styles.playButton} onPress={togglePlay} activeOpacity={0.8}>
            <Ionicons name="play" size={32} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}
      </View>

      {/* Title */}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    marginVertical: 10,
    padding: 12
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 102, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.3)',
    gap: 6
  },
  badgeText: {
    color: '#00FF66',
    fontSize: 12,
    fontWeight: '800'
  },
  teamName: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700'
  },
  videoBox: {
    width: '100%',
    height: 210,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  video: {
    width: '100%',
    height: '100%'
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justify: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 2
  },
  playButton: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(124, 58, 237, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    boxShadow: '0 4px 15px rgba(124, 58, 237, 0.5)'
  },
  title: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'left'
  }
});

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';

const DEFAULT_AVATAR = require('../shadow-man.png');

interface ReplayVideoCardProps {
  videoUrl: string;
  minute?: number | string;
  teamName?: string;
  teamLogo?: string;
  scorerName?: string;
  scorerPhoto?: string;
  assistantName?: string;
  assistantPhoto?: string;
  eventType?: string;
}

export default function ReplayVideoCard({
  videoUrl,
  minute,
  teamName,
  teamLogo,
  scorerName,
  scorerPhoto,
  assistantName,
  assistantPhoto,
  eventType = 'goal'
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

  const getPlayerPhotoSource = (photoUrl?: string) => {
    if (photoUrl && typeof photoUrl === 'string' && photoUrl.trim().length > 0) {
      return { uri: photoUrl };
    }
    return DEFAULT_AVATAR;
  };

  return (
    <View style={styles.card}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      
      {/* Header Badge */}
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Ionicons name="football" size={14} color="#00FF66" />
          <Text style={styles.badgeText}>{minute ? `${minute}-DAQIQADA GOL` : '20s REPLAY'}</Text>
        </View>

        {teamName && (
          <View style={styles.teamGroup}>
            {teamLogo && <Image source={{ uri: teamLogo }} style={styles.teamLogo} />}
            <Text style={styles.teamName}>{teamName.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Video Box */}
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

      {/* Detail Description Box */}
      <View style={styles.detailsBox}>
        {/* Scorer Info with Player Avatar Photo (No Ball Icon) */}
        <View style={styles.detailRow}>
          <View style={styles.playerPhotoCircle}>
            <Image 
              source={getPlayerPhotoSource(scorerPhoto)} 
              style={styles.playerAvatarImage} 
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailLabel}>GOL MUALLIFI</Text>
            <Text style={styles.detailValue}>{scorerName ? scorerName.toUpperCase() : "NOMA'LUM FUTBOLCHI"}</Text>
          </View>
          <Text style={styles.minuteBadge}>{minute}-daqiqa</Text>
        </View>

        {/* Assistant Info with Player Avatar Photo (No Ball Icon) */}
        {assistantName ? (
          <View style={[styles.detailRow, { marginTop: 10 }]}>
            <View style={styles.playerPhotoCircle}>
              <Image 
                source={getPlayerPhotoSource(assistantPhoto)} 
                style={styles.playerAvatarImage} 
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>ASSISTENT (UZATMALAR)</Text>
              <Text style={styles.detailValueAssist}>{assistantName.toUpperCase()}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    marginVertical: 10,
    padding: 12
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 102, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.35)',
    gap: 6
  },
  badgeText: {
    color: '#00FF66',
    fontSize: 12,
    fontWeight: '800'
  },
  teamGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  teamLogo: {
    width: 18,
    height: 18,
    resizeMode: 'contain'
  },
  teamName: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700'
  },
  videoBox: {
    width: '100%',
    height: 215,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
    justify.content: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  video: {
    width: '100%',
    height: '100%'
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
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
    zIndex: 3
  },
  detailsBox: {
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  playerPhotoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#00FF66'
  },
  playerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover'
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },
  detailValueAssist: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '700'
  },
  minuteBadge: {
    color: '#FACC15',
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: 'rgba(250, 204, 21, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  }
});

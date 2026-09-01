import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import Colors from '../constants/Colors';
import { getCachedVideoUri } from '../utils/videoCache';
import { formatLocalizedDate } from '../utils/stringUtils';

interface ReplayEvent {
  id?: string;
  minute?: number | string;
  replay_video_url?: string;
  video_url?: string;
  replay_url?: string;
  video?: string;
  event_type?: string;
  details?: any;
}

interface PlayerMatchReplayCardProps {
  match: any;
  replays: ReplayEvent[];
  playerName?: string;
}

function SingleReplayPlayer({ replay }: { replay: ReplayEvent }) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const rawUrl = replay.replay_video_url || replay.video_url || replay.replay_url || replay.video || '';
  const [sourceUri, setSourceUri] = useState<string>(rawUrl);

  useEffect(() => {
    let isMounted = true;
    if (rawUrl) {
      getCachedVideoUri(rawUrl).then((cached) => {
        if (isMounted) setSourceUri(cached);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [rawUrl]);

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
    <View style={styles.videoBox}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary || '#00FF66'} />
        </View>
      )}

      <Video
        ref={videoRef}
        source={{ uri: sourceUri }}
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
          <Ionicons name="play" size={30} color="#FFFFFF" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function PlayerMatchReplayCard({ match, replays, playerName }: PlayerMatchReplayCardProps) {
  const { t, i18n } = useTranslation();
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!replays || replays.length === 0) return null;

  // Sort replays strictly in chronological order by minute (1-gol: 2', 2-gol: 3', etc.)
  const sortedReplays = [...replays].sort((a, b) => {
    const minA = parseInt(String(a.minute || '0'), 10) || 0;
    const minB = parseInt(String(b.minute || '0'), 10) || 0;
    return minA - minB;
  });

  const currentReplay = sortedReplays[selectedIdx] || sortedReplays[0];

  const homeTeam = match?.home_team || {};
  const awayTeam = match?.away_team || {};

  const homeName = homeTeam.name || match?.home_team_name || t('matches.home_team', 'Uy jamoasi');
  const homeLogo = homeTeam.logo_url || match?.home_team_logo;

  const awayName = awayTeam.name || match?.away_team_name || t('matches.away_team', 'Mehmon jamoasi');
  const awayLogo = awayTeam.logo_url || match?.away_team_logo;

  const homeScore = match?.home_score !== undefined && match?.home_score !== null ? match?.home_score : '-';
  const awayScore = match?.away_score !== undefined && match?.away_score !== null ? match?.away_score : '-';

  const matchTime = match?.match_time ? match.match_time.slice(0, 5) : '';
  const matchDate = formatLocalizedDate(match?.match_date || match?.date || match?.created_at, i18n.language, matchTime);
  const location = match?.location || '';
  const league = match?.league || '';
  const round = match?.round ? t('stories.round_tour', '{{round}}-TUR', { round: match.round }) : '';

  return (
    <View style={styles.container}>
      <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />

      {/* Header Info */}
      <View style={styles.topHeaderRow}>
        <View style={styles.leagueBadge}>
          <Ionicons name="trophy-outline" size={12} color="#00FF66" />
          <Text style={styles.leagueBadgeText}>
            {[league, round].filter(Boolean).join(' • ') || t('replays.match_replay', "O'YIN REPLAYI")}
          </Text>
        </View>

        {sortedReplays.length > 1 ? (
          <View style={styles.multiGoalPill}>
            <Text style={styles.multiGoalPillText}>
              {t('replays.goals_count', '{{count}} TA GOL', { count: sortedReplays.length })}
            </Text>
          </View>
        ) : (
          <View style={styles.singleGoalPill}>
            <Ionicons name="football" size={11} color="#00FF66" />
            <Text style={styles.singleGoalPillText}>
              {currentReplay.minute ? `${currentReplay.minute}'-${t('common.minute_short', 'daqiqa')}` : t('stories.goal', 'Gol')}
            </Text>
          </View>
        )}
      </View>

      {/* Multi-goal Tab Switcher (sorted by minute chronologically) */}
      {sortedReplays.length > 1 && (
        <View style={styles.tabsRow}>
          {sortedReplays.map((r, i) => {
            const isSelected = selectedIdx === i;
            return (
              <TouchableOpacity
                key={r.id || i}
                onPress={() => setSelectedIdx(i)}
                style={[styles.goalTabBtn, isSelected && styles.goalTabBtnActive]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="football"
                  size={12}
                  color={isSelected ? '#000000' : 'rgba(255,255,255,0.7)'}
                />
                <Text style={[styles.goalTabText, isSelected && styles.goalTabTextActive]}>
                  {t('replays.goal_number', '{{number}}-gol', { number: i + 1 })} ({r.minute || '—'}')
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Video Player */}
      <SingleReplayPlayer key={currentReplay.id || selectedIdx} replay={currentReplay} />

      {/* Bottom Match Scoreboard Section */}
      <View style={styles.bottomMatchSection}>
        <View style={styles.scoreRow}>
          {/* Home Team */}
          <View style={styles.teamCol}>
            {homeLogo ? (
              <Image source={{ uri: homeLogo }} style={styles.teamLogo} resizeMode="contain" />
            ) : (
              <View style={styles.teamLogoFallback}>
                <Ionicons name="shield-outline" size={16} color="rgba(255,255,255,0.4)" />
              </View>
            )}
            <Text style={styles.teamNameText} numberOfLines={1}>
              {homeName.toUpperCase()}
            </Text>
          </View>

          {/* Score Box */}
          <View style={styles.scoreBox}>
            <Text style={styles.scoreText}>
              {homeScore} : {awayScore}
            </Text>
          </View>

          {/* Away Team */}
          <View style={styles.teamCol}>
            {awayLogo ? (
              <Image source={{ uri: awayLogo }} style={styles.teamLogo} resizeMode="contain" />
            ) : (
              <View style={styles.teamLogoFallback}>
                <Ionicons name="shield-outline" size={16} color="rgba(255,255,255,0.4)" />
              </View>
            )}
            <Text style={styles.teamNameText} numberOfLines={1}>
              {awayName.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Match Date, Time, Location Meta */}
        <View style={styles.metaRow}>
          {matchDate ? (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
              <Text style={styles.metaText}>
                {matchDate} {matchTime ? `• ${matchTime}` : ''}
              </Text>
            </View>
          ) : null}

          {location ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color="#94A3B8" />
              <Text style={styles.metaText}>{location}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  leagueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 102, 0.1)',
    borderColor: 'rgba(0, 255, 102, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  leagueBadgeText: {
    color: '#00FF66',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  multiGoalPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  multiGoalPillText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  singleGoalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 102, 0.12)',
    borderColor: 'rgba(0, 255, 102, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 7,
    gap: 5,
  },
  singleGoalPillText: {
    color: '#00FF66',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 8,
  },
  goalTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  goalTabBtnActive: {
    backgroundColor: '#00FF66',
    borderColor: '#00FF66',
  },
  goalTabText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '800',
  },
  goalTabTextActive: {
    color: '#000000',
    fontWeight: '900',
  },
  videoBox: {
    width: '100%',
    height: 210,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0f19',
    zIndex: 2,
  },
  playButton: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  videoMinuteBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderColor: 'rgba(0, 255, 102, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
    zIndex: 6,
  },
  videoMinuteText: {
    color: '#00FF66',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bottomMatchSection: {
    padding: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  teamLogo: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  teamLogoFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamNameText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  scoreBox: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 255, 102, 0.1)',
    borderColor: 'rgba(0, 255, 102, 0.3)',
    borderWidth: 1,
    marginHorizontal: 10,
  },
  scoreText: {
    color: '#00FF66',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
});

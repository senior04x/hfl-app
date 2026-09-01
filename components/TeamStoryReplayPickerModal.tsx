import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/apiService';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { getCachedVideoUri } from '../utils/videoCache';

const { height } = Dimensions.get('window');

// Yuklanish paytida ko'rsatiladigan "skeleton" karta — foydalanuvchi
// so'roviga ko'ra oddiy spinner o'rniga, haqiqiy karta shaklidagi nur
// o'tib turuvchi (shimmer) joy-egallovchi.
function ReplayPickerSkeletonCard({ isDark }: { isDark: boolean }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);
  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-160, 260] });
  const baseColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  return (
    <View style={[skeletonStyles.card, { backgroundColor: baseColor }]}>
      <View style={[skeletonStyles.thumb, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[skeletonStyles.line, { width: '70%', backgroundColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)' }]} />
        <View style={[skeletonStyles.line, { width: '40%', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
      </View>
      <View style={[skeletonStyles.shimmerClip]} pointerEvents="none">
        <Animated.View style={[StyleSheet.absoluteFillObject, { width: 140, transform: [{ translateX }] }]}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.45)' }]} />
        </Animated.View>
      </View>
    </View>
  );
}

// Har bir replay uchun kichik video preview — foydalanuvchi story sifatida
// QO'SHISHDAN OLDIN uni haqiqatan ko'rib chiqishi mumkin (tap = play/pause).
function ReplayPreviewThumb({ videoUrl, isDark }: { videoUrl: string; isDark: boolean }) {
  const videoRef = useRef<Video>(null);
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (videoUrl) {
      getCachedVideoUri(videoUrl).then((cached) => {
        if (isMounted) setSourceUri(cached);
      });
    }
    return () => { isMounted = false; };
  }, [videoUrl]);

  const togglePlay = async (e: any) => {
    e?.stopPropagation?.();
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync().catch(() => {});
      setIsPlaying(false);
    } else {
      await videoRef.current.setPositionAsync(0).catch(() => {});
      await videoRef.current.playAsync().catch(() => {});
      setIsPlaying(true);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={togglePlay}
      style={[skeletonStyles.previewBox, { backgroundColor: isDark ? '#000000' : '#0B0B0C' }]}
    >
      {sourceUri && (
        <Video
          ref={videoRef}
          source={{ uri: sourceUri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode={ResizeMode.COVER}
          isMuted={false}
          isLooping
          shouldPlay={false}
          onPlaybackStatusUpdate={(status: any) => {
            if (status?.isLoaded) setIsPlaying(!!status.isPlaying);
          }}
        />
      )}
      {!isPlaying && (
        <View style={skeletonStyles.previewPlayBadge}>
          <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginLeft: 1.5 }} />
        </View>
      )}
    </TouchableOpacity>
  );
}

interface TeamStoryReplayPickerModalProps {
  visible: boolean;
  teamId: string | null | undefined;
  teamName?: string;
  selectedByPhone?: string;
  // Hali story sifatida qo'shilgan (aktiv) match_event id'lari — shu
  // ro'yxatdagilarga checkmark bilan belgi qo'yiladi.
  activeReplayEventIds?: Array<string | number>;
  onClose: () => void;
  // Muvaffaqiyatli qo'shilgandan keyin chaqiriladi (chaqiruvchi story
  // ro'yxatini yangilashi uchun).
  onAdded?: () => void;
  // If false, renders as an absolute overlay instead of native <Modal>
  // so it can be embedded directly inside StoryViewerModal without closing it!
  useNativeModal?: boolean;
}

/**
 * Pastdan tepaga qarab, butun ekranni qoplab ochiladigan story-replay
 * tanlash modal'i. Trener/rahbar (yoki jamoa akkaunti) mavjud gol-replaylardan
 * birini tanlab, "team_story_replays" ga (ko'p-storyli, 48 soatda avtomatik
 * eskiruvchi) qo'shadi. Home ekrandagi o'z story halqasidan HAM,
 * StoryViewerModal ichidagi "+" tugmasidan HAM, Account ekranidan HAM shu
 * BITTA komponent ishlatiladi.
 */
export default function TeamStoryReplayPickerModal({
  visible,
  teamId,
  teamName,
  selectedByPhone,
  activeReplayEventIds = [],
  onClose,
  onAdded,
  useNativeModal = true,
}: TeamStoryReplayPickerModalProps) {
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const homeColors = getHomeScreenColors(isDark);
  const [replays, setReplays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const translateY = useRef(new Animated.Value(height)).current;
  const activeIdSet = new Set((activeReplayEventIds || []).map((id) => String(id)));

  useEffect(() => {
    if (visible && teamId) {
      setLoading(true);
      apiService
        .getTeamAvailableReplays(String(teamId))
        .then((events: any[]) => {
          setReplays(events || []);
        })
        .finally(() => setLoading(false));

      translateY.setValue(height);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, teamId]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: height,
      duration: 240,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handlePick = async (ev: any) => {
    if (!teamId || savingId) return;
    setSavingId(ev.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const res = await apiService.setTeamStoryReplay(String(teamId), ev.id, selectedByPhone);
    setSavingId(null);
    if (res?.success) {
      if (onAdded) onAdded();
      handleClose();
    }
  };

  if (!visible) return null;

  const content = (
    <View style={styles.backdrop}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
      <Animated.View
        style={[
          styles.sheet,
          // Qorong'i rejimda avval to'q-ko'k soyali (#0B0F17) edi — endi
          // navbar bilan bir xil "toza qora" ("qoraytirilgan oyna") ohangda.
          { backgroundColor: isDark ? '#050506' : '#FFFFFF', transform: [{ translateY }] },
        ]}
      >
        <View style={[styles.handleBar, { backgroundColor: homeColors.border }]} />

        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: homeColors.textPrimary }]} numberOfLines={1}>
            {teamName ? `${teamName.toUpperCase()} — ${t('stories.add_story', "STORY QO'SHISH")}` : t('stories.add_story', "STORY QO'SHISH")}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={22} color={homeColors.textPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.subtitle, { color: homeColors.textSecondary }]}>
          {t('stories.add_story_subtitle', "Gol replaylardan birini tanlang — 48 soat davomida story sifatida ko'rinadi")}
        </Text>

        {loading ? (
          <View style={styles.listContent}>
            <ReplayPickerSkeletonCard isDark={isDark} />
            <ReplayPickerSkeletonCard isDark={isDark} />
            <ReplayPickerSkeletonCard isDark={isDark} />
          </View>
        ) : replays.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="film-outline" size={32} color={homeColors.textSecondary} />
            <Text style={[styles.emptyText, { color: homeColors.textSecondary }]}>
              {t('stories.no_replays', "Hozircha tanlash uchun replay topilmadi")}
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
            {replays.map((ev: any) => {
              const isActive = activeIdSet.has(String(ev.id));
              const isSaving = savingId === ev.id;
              return (
                <TouchableOpacity
                  key={ev.id}
                  style={[styles.card, { backgroundColor: homeColors.surface, borderColor: homeColors.border }]}
                  activeOpacity={0.8}
                  disabled={!!savingId}
                  onPress={() => handlePick(ev)}
                >
                  {/* Video preview — qo'shishdan oldin ko'rib chiqish uchun (tap = play/pause) */}
                  {ev.replay_video_url ? (
                    <ReplayPreviewThumb videoUrl={ev.replay_video_url} isDark={isDark} />
                  ) : (
                    <View
                      style={[
                        styles.cardIcon,
                        { backgroundColor: isDark ? 'rgba(0,223,130,0.14)' : 'rgba(0,200,100,0.1)' },
                      ]}
                    >
                      <Ionicons name="football" size={20} color={homeColors.accent} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardMinute, { color: homeColors.textPrimary }]}>
                      {ev.minute ? t('stories.minute_goal', '{{minute}}-daqiqa gol', { minute: ev.minute }) : t('stories.goal_replay', 'Gol replay')}
                    </Text>
                    <Text style={[styles.cardSub, { color: homeColors.textSecondary }]} numberOfLines={1}>
                      {ev.player_name ? `${ev.player_name}` : t('stories.unknown_player', "Noma'lum o'yinchi")}
                      {ev.match_title ? ` • ${ev.match_title}` : ''}
                    </Text>
                  </View>
                  {isSaving ? (
                    <ActivityIndicator size="small" color={homeColors.accent} />
                  ) : isActive ? (
                    <Ionicons name="checkmark-circle" size={22} color={homeColors.accent} />
                  ) : (
                    <Ionicons name="add-circle-outline" size={22} color={homeColors.textSecondary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );

  if (!useNativeModal) {
    return (
      <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999 }]}>
        {content}
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: height * 0.72,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 12.5,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  listContent: {
    gap: 10,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMinute: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },
});

const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  line: {
    height: 10,
    borderRadius: 5,
  },
  shimmerClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  previewBox: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlayBadge: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
});

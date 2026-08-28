import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  PanResponder,
  StatusBar,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/Colors';
import SmartImage from './SmartImage';
import SmartBlurView from './SmartBlurView';
import { getCachedVideoUri } from '../utils/videoCache';
import { StoryGroup, StoryMediaItem } from './MatchStoriesTray';

const { width, height } = Dimensions.get('window');
const STORY_DEFAULT_DURATION = 6000; // 6 seconds

interface StoryViewerModalProps {
  visible: boolean;
  storyGroups: StoryGroup[];
  initialGroupIndex?: number;
  onClose: () => void;
  onNavigateMatch?: (matchId: string) => void;
  onStoryGroupViewed?: (groupId: string, groupIndex: number) => void;
}

export default function StoryViewerModal({
  visible,
  storyGroups,
  initialGroupIndex = 0,
  onClose,
  onNavigateMatch,
  onStoryGroupViewed,
}: StoryViewerModalProps) {
  const [currentGroupIdx, setCurrentGroupIdx] = useState(initialGroupIndex);
  const [currentItemIdx, setCurrentItemIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [cachedVideoUri, setCachedVideoUri] = useState<string | null>(null);

  const videoRef = useRef<Video>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const currentGroup = storyGroups?.[currentGroupIdx];
  const items = currentGroup?.items || [];
  const currentItem: StoryMediaItem | undefined = items[currentItemIdx];

  useEffect(() => {
    if (visible) {
      setCurrentGroupIdx(initialGroupIndex);
      setCurrentItemIdx(0);
      panY.setValue(0);
    }
  }, [visible, initialGroupIndex]);

  // Trigger viewed callback for every story group the user views/browses into
  useEffect(() => {
    if (visible && currentGroup?.id && onStoryGroupViewed) {
      onStoryGroupViewed(currentGroup.id, currentGroupIdx);
    }
  }, [visible, currentGroupIdx, currentGroup?.id]);

  // Video caching
  useEffect(() => {
    let isMounted = true;
    if (currentItem?.mediaType === 'video' && currentItem?.mediaUrl) {
      setMediaLoading(true);
      getCachedVideoUri(currentItem.mediaUrl)
        .then((cached) => {
          if (isMounted) {
            setCachedVideoUri(cached);
          }
        })
        .catch(() => {
          if (isMounted) setCachedVideoUri(currentItem.mediaUrl);
        });
    } else {
      setCachedVideoUri(null);
      setMediaLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [currentGroupIdx, currentItemIdx]);

  // Progress bar animation
  useEffect(() => {
    if (!visible || !currentItem || isPaused) {
      if (animRef.current) animRef.current.stop();
      return;
    }

    progressAnim.setValue(0);
    const duration = currentItem.durationSeconds ? currentItem.durationSeconds * 1000 : STORY_DEFAULT_DURATION;

    animRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: duration,
      useNativeDriver: false,
    });

    animRef.current.start(({ finished }) => {
      if (finished) {
        goToNext();
      }
    });

    return () => {
      if (animRef.current) animRef.current.stop();
    };
  }, [visible, currentGroupIdx, currentItemIdx, isPaused]);

  // Pan Responder for Swipe Down to Close
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 15 && Math.abs(gestureState.dx) < 15;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120) {
          Animated.timing(panY, {
            toValue: height,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onClose());
        } else {
          Animated.spring(panY, {
            toValue: 0,
            friction: 7,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const goToNext = () => {
    if (currentItemIdx < items.length - 1) {
      setCurrentItemIdx((prev) => prev + 1);
    } else if (currentGroupIdx < storyGroups.length - 1) {
      setCurrentGroupIdx((prev) => prev + 1);
      setCurrentItemIdx(0);
    } else {
      onClose();
    }
  };

  const goToPrev = () => {
    if (currentItemIdx > 0) {
      setCurrentItemIdx((prev) => prev - 1);
    } else if (currentGroupIdx > 0) {
      const prevGroup = storyGroups[currentGroupIdx - 1];
      setCurrentGroupIdx((prev) => prev - 1);
      setCurrentItemIdx((prevGroup?.items?.length || 1) - 1);
    }
  };

  const handleTap = (evt: any) => {
    const touchX = evt.nativeEvent.locationX;
    Haptics.selectionAsync().catch(() => {});
    if (touchX < width * 0.35) {
      goToPrev();
    } else {
      goToNext();
    }
  };

  const handlePressIn = () => {
    setIsPaused(true);
  };

  const handlePressOut = () => {
    setIsPaused(false);
  };

  const toggleMute = () => {
    Haptics.selectionAsync().catch(() => {});
    setIsMuted((prev) => !prev);
  };

  const handleGoToMatch = () => {
    if (currentItem?.matchId && onNavigateMatch) {
      onClose();
      onNavigateMatch(currentItem.matchId);
    }
  };

  if (!visible || !currentGroup || !currentItem) return null;

  const hasVideo = currentItem.mediaType === 'video' && !!cachedVideoUri;
  const isMatchStory = !!(currentItem.homeTeam || currentItem.awayTeam || currentItem.matchScore);
  const isPlayerStory = !!(currentItem.playerName || currentItem.playerPhoto);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: panY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Background Visual Layer */}
        {hasVideo ? (
          <View style={styles.mediaContainer}>
            <Video
              ref={videoRef}
              source={{ uri: cachedVideoUri! }}
              style={styles.media}
              resizeMode={ResizeMode.COVER}
              shouldPlay={!isPaused}
              isLooping
              isMuted={isMuted}
              onLoad={() => setMediaLoading(false)}
            />
            {mediaLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#00DF82" />
              </View>
            )}
          </View>
        ) : (
          /* Matchday Stadium Graphic Canvas (No stretched logo, 100% Television Grade) */
          <LinearGradient
            colors={['#04160E', '#0A2B1C', '#030E09']}
            style={StyleSheet.absoluteFillObject}
          >
            {/* Field Grid Pattern */}
            <View style={styles.fieldPattern}>
              <View style={styles.fieldCenterCircle} />
              <View style={styles.fieldCenterLine} />
              <View style={styles.fieldFloodlightGlow} />
            </View>
          </LinearGradient>
        )}

        {/* Center Story Content Presentation (When not video) */}
        {!hasVideo && (
          <View style={styles.centerCanvasContainer}>
            {isPlayerStory ? (
              /* ⭐ Player of the Match / Top Scorer Showcase */
              <View style={styles.playerShowcaseCard}>
                <View style={styles.categoryPill}>
                  <Ionicons name="sparkles" size={13} color="#00DF82" />
                  <Text style={styles.categoryPillText}>TOP TO'PURAR / YETAKCHI</Text>
                </View>

                {/* Player Photo with Halo Aura */}
                <View style={styles.playerAvatarWrapper}>
                  <View style={styles.playerHaloAura} />
                  {currentItem.playerPhoto ? (
                    <Image
                      source={{ uri: currentItem.playerPhoto }}
                      style={styles.playerAvatarLarge}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.playerAvatarLarge, styles.playerAvatarPlaceholder]}>
                      <FontAwesome5 name="user-alt" size={48} color="#00DF82" />
                    </View>
                  )}
                  <View style={styles.playerStarBadge}>
                    <Ionicons name="star" size={12} color="#050A14" />
                    <Text style={styles.playerStarText}>9.3</Text>
                  </View>
                </View>

                <Text style={styles.playerMainName}>
                  {(currentItem.playerName || 'O\'YINCHI').toUpperCase()}
                </Text>
                <Text style={styles.playerSubTitle}>
                  {currentItem.subtitle || 'Amatora Liga Yetakchisi'}
                </Text>

                {/* Metric Pills */}
                <View style={styles.metricPillsRow}>
                  <View style={styles.metricPill}>
                    <Ionicons name="football" size={14} color="#00DF82" />
                    <Text style={styles.metricPillText}>TO'PURAR</Text>
                  </View>
                  <View style={styles.metricPill}>
                    <Ionicons name="trophy-outline" size={14} color="#FBBF24" />
                    <Text style={styles.metricPillText}>MVP ADVENT</Text>
                  </View>
                </View>
              </View>
            ) : isMatchStory ? (
              /* ⚽ Matchday Arena Stadium Clash */
              <View style={styles.matchClashCard}>
                <View style={[styles.categoryPill, currentGroup.isLive && { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: '#EF4444' }]}>
                  <Ionicons name={currentGroup.isLive ? 'radio' : 'football'} size={13} color={currentGroup.isLive ? '#EF4444' : '#00DF82'} />
                  <Text style={[styles.categoryPillText, currentGroup.isLive && { color: '#EF4444' }]}>
                    {currentGroup.isLive ? 'JONLI EFIR' : (currentItem.matchScore ? 'O\'YIN NATIJASI' : 'MARKAZIY O\'YIN')}
                  </Text>
                </View>

                <Text style={styles.matchLeagueText}>
                  {currentItem.subtitle || 'AMATORA SUPER LIGA'}
                </Text>

                {/* Teams Clash Arena */}
                <View style={styles.clashArenaRow}>
                  {/* Home Team */}
                  <View style={styles.clashTeamColumn}>
                    <View style={styles.teamLogoCircleLarge}>
                      {currentItem.homeTeam?.logo ? (
                        <Image source={{ uri: currentItem.homeTeam.logo }} style={styles.teamLogoImg} resizeMode="cover" />
                      ) : (
                        <Ionicons name="shield-outline" size={32} color="#00DF82" />
                      )}
                    </View>
                    <Text style={styles.clashTeamName} numberOfLines={2}>
                      {currentItem.homeTeam?.name || 'Mezbon'}
                    </Text>
                  </View>

                  {/* Score / Time Badge */}
                  <View style={styles.clashScoreBox}>
                    <LinearGradient
                      colors={['rgba(0, 223, 130, 0.25)', 'rgba(0, 240, 255, 0.1)']}
                      style={styles.clashScoreGradient}
                    >
                      <Text style={styles.clashScoreText}>
                        {currentItem.matchScore
                          ? `${currentItem.matchScore.home} : ${currentItem.matchScore.away}`
                          : 'VS'}
                      </Text>
                    </LinearGradient>
                    <Text style={styles.clashStatusMini}>
                      {currentGroup.isLive ? 'LIVE' : (currentItem.matchScore ? 'TUGADI' : '19:00')}
                    </Text>
                  </View>

                  {/* Away Team */}
                  <View style={styles.clashTeamColumn}>
                    <View style={styles.teamLogoCircleLarge}>
                      {currentItem.awayTeam?.logo ? (
                        <Image source={{ uri: currentItem.awayTeam.logo }} style={styles.teamLogoImg} resizeMode="cover" />
                      ) : (
                        <Ionicons name="shield-outline" size={32} color="#00DF82" />
                      )}
                    </View>
                    <Text style={styles.clashTeamName} numberOfLines={2}>
                      {currentItem.awayTeam?.name || 'Mehmon'}
                    </Text>
                  </View>
                </View>

                {/* Venue & Tournament Pill */}
                <View style={styles.venuePill}>
                  <Ionicons name="location-outline" size={13} color="#94A3B8" />
                  <Text style={styles.venuePillText}>Amatora Arena • Toshkent</Text>
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* Tap Gesture Zones */}
        <TouchableWithoutFeedback
          onPress={handleTap}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>

        {/* Top Vignette Gradient */}
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.88)', 'rgba(0, 0, 0, 0.4)', 'transparent']}
          style={styles.topGradient}
          pointerEvents="none"
        />

        {/* Bottom Vignette Gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.95)']}
          style={styles.bottomGradient}
          pointerEvents="none"
        />

        {/* Multi-Segment Progress Bars */}
        <View style={styles.progressContainer}>
          {items.map((_, idx) => {
            let widthPercent: any = '0%';
            if (idx < currentItemIdx) {
              widthPercent = '100%';
            } else if (idx === currentItemIdx) {
              widthPercent = progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              });
            }

            return (
              <View key={`seg-${idx}`} style={styles.progressBarBackground}>
                <Animated.View
                  style={[
                    styles.progressBarActive,
                    { width: widthPercent },
                  ]}
                />
              </View>
            );
          })}
        </View>

        {/* Header Bar */}
        <View style={styles.headerBar}>
          <View style={styles.authorInfo}>
            <SmartImage
              uri={currentGroup.avatarUrl}
              style={styles.authorAvatar}
              contentFit="cover"
              fallbackIcon="person-outline"
              fallbackIconSize={20}
            />
            <View>
              <View style={styles.titleRow}>
                <Text style={styles.authorTitle}>{currentGroup.title}</Text>
                {currentGroup.isLive && (
                  <View style={styles.headerLiveBadge}>
                    <Text style={styles.headerLiveText}>LIVE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.authorSubtitle}>
                {currentItem.subtitle || currentGroup.subtitle || "Amatora Match Stories"}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.headerActions}>
            {hasVideo && (
              <TouchableOpacity
                style={styles.iconCircle}
                onPress={toggleMute}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isMuted ? 'volume-mute' : 'volume-high'}
                  size={18}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.iconCircle}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom CTA Action Button */}
        {currentItem.matchId && onNavigateMatch && (
          <View style={styles.bottomCtaWrapper}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleGoToMatch}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#00DF82', '#00A862']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaText}>
                  {currentItem.actionText || "O'YIN TAFSILOTLARI"}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#0D111A" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mediaContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#05070A',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  fieldPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldCenterCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: '#00DF82',
    opacity: 0.35,
  },
  fieldCenterLine: {
    position: 'absolute',
    width: '100%',
    height: 1.5,
    backgroundColor: '#00DF82',
    opacity: 0.35,
  },
  fieldFloodlightGlow: {
    position: 'absolute',
    top: '25%',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#00DF82',
    opacity: 0.12,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    zIndex: 10,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    zIndex: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 36,
    left: 12,
    right: 12,
    gap: 4,
    zIndex: 20,
  },
  progressBarBackground: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarActive: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  headerBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 64 : 48,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#00DF82',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerLiveBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  headerLiveText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  authorSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  centerCanvasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 5,
  },
  playerShowcaseCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 20, 14, 0.65)',
    borderWidth: 1.2,
    borderColor: 'rgba(0, 223, 130, 0.35)',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  playerAvatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  playerHaloAura: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#00DF82',
    opacity: 0.2,
  },
  playerAvatarLarge: {
    width: 115,
    height: 115,
    borderRadius: 58,
    borderWidth: 2.5,
    borderColor: '#00DF82',
  },
  playerAvatarPlaceholder: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerStarBadge: {
    position: 'absolute',
    bottom: -6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  playerStarText: {
    color: '#050A14',
    fontWeight: '900',
    fontSize: 11,
  },
  playerMainName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: 4,
  },
  playerSubTitle: {
    color: '#00DF82',
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 3,
    textAlign: 'center',
  },
  metricPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  metricPillText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  matchClashCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 20, 14, 0.65)',
    borderWidth: 1.2,
    borderColor: 'rgba(0, 223, 130, 0.35)',
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 223, 130, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(0, 223, 130, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 14,
    marginBottom: 8,
  },
  categoryPillText: {
    color: '#00DF82',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  matchLeagueText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 16,
    textAlign: 'center',
  },
  clashArenaRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  clashTeamColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  teamLogoCircleLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#00DF82',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  teamLogoImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  clashTeamName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  clashScoreBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  clashScoreGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 223, 130, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clashScoreText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  clashStatusMini: {
    color: '#00DF82',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 4,
  },
  venuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 18,
  },
  venuePillText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomCtaWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 24,
    left: 20,
    right: 20,
    zIndex: 20,
  },
  ctaButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#00DF82',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  ctaText: {
    color: '#050A14',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

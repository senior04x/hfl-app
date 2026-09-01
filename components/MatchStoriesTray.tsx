import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import SmartImage from './SmartImage';
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

export interface StoryMediaItem {
  id: string;
  mediaUrl: string;
  mediaType: 'video' | 'image';
  durationSeconds?: number;
  title: string;
  subtitle?: string;
  minute?: number | string;
  matchId?: string;
  teamId?: string | number;
  eventId?: string | number;
  matchScore?: { home: number; away: number };
  homeTeam?: { name: string; logo?: string };
  awayTeam?: { name: string; logo?: string };
  playerName?: string;
  playerPhoto?: string;
  assistantName?: string;
  actionText?: string;
  round?: number | string;
  matchTime?: string;
  matchDate?: string;
  tournamentName?: string;
  status?: string;
  createdAt?: string;
  expiresAt?: string;
  likesCount?: number;
  viewsCount?: number;
  isLiked?: boolean;
}

export interface StoryGroup {
  id: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  category: 'live_match' | 'goal_highlight' | 'top_moment' | 'league_summary';
  isLive?: boolean;
  isViewed?: boolean;
  createdAt?: string;
  expiresAt?: string;
  // O'zining (hozirgi tizimga kirgan foydalanuvchining) jamoasi — doim
  // tray'da BIRINCHI o'rinda turadi. Agar `items` bo'sh bo'lsa — bu "+"
  // ("Story qo'shish") halqasi, tap qilinganda replay-tanlash modal ochiladi.
  isOwn?: boolean;
  teamId?: string | number;
  items: StoryMediaItem[];
}

interface MatchStoriesTrayProps {
  stories: StoryGroup[];
  onSelectStoryGroup: (group: StoryGroup, index: number) => void;
}

export default function MatchStoriesTray({
  stories,
  onSelectStoryGroup,
}: MatchStoriesTrayProps) {
  const { isDark } = useThemeStore();
  const homeColors = getHomeScreenColors(isDark);

  if (!stories || stories.length === 0) return null;

  const handlePress = (group: StoryGroup, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectStoryGroup(group, index);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {stories.map((group, index) => {
          const isLive = group.isLive;
          const isViewed = group.isViewed;
          const isOwnEmpty = !!group.isOwn && (!group.items || group.items.length === 0);

          return (
            <TouchableOpacity
              key={group.id || `story-${index}`}
              style={styles.storyItem}
              activeOpacity={0.82}
              onPress={() => handlePress(group, index)}
            >
              {/* Outer Ring */}
              <View style={styles.ringWrapper}>
                {isOwnEmpty ? (
                  <View style={[styles.viewedRing, { borderColor: homeColors.border, borderStyle: 'dashed' }]}>
                    <View style={[styles.innerRing, { backgroundColor: isDark ? homeColors.background : '#FFFFFF' }]}>
                      <SmartImage
                        uri={group.avatarUrl}
                        style={[styles.avatar, styles.viewedAvatar]}
                        contentFit="cover"
                        fallbackIcon="shield-outline"
                        fallbackIconSize={26}
                      />
                    </View>
                    <View style={[styles.addStoryBadge, { backgroundColor: homeColors.accent, borderColor: isDark ? homeColors.background : '#FFFFFF' }]}>
                      <Ionicons name="add" size={14} color="#FFFFFF" />
                    </View>
                  </View>
                ) : isLive ? (
                  <LinearGradient
                    colors={['#EF4444', '#FF3B30', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientRing}
                  >
                    <View style={[styles.innerRing, { backgroundColor: isDark ? homeColors.background : '#FFFFFF' }]}>
                      <SmartImage
                        uri={group.avatarUrl}
                        style={styles.avatar}
                        contentFit="cover"
                        fallbackIcon="person-outline"
                        fallbackIconSize={26}
                      />
                    </View>
                  </LinearGradient>
                ) : !isViewed ? (
                  <LinearGradient
                    colors={[homeColors.accent, '#3B82F6', '#8B5CF6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.gradientRing, { shadowColor: homeColors.accent }]}
                  >
                    <View style={[styles.innerRing, { backgroundColor: isDark ? homeColors.background : '#FFFFFF' }]}>
                      <SmartImage
                        uri={group.avatarUrl}
                        style={styles.avatar}
                        contentFit="cover"
                        fallbackIcon="person-outline"
                        fallbackIconSize={26}
                      />
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={[styles.viewedRing, { borderColor: homeColors.border }]}>
                    <View style={[styles.innerRing, { backgroundColor: isDark ? homeColors.background : '#FFFFFF' }]}>
                      <SmartImage
                        uri={group.avatarUrl}
                        style={[styles.avatar, styles.viewedAvatar]}
                        contentFit="cover"
                        fallbackIcon="person-outline"
                        fallbackIconSize={26}
                      />
                    </View>
                  </View>
                )}

                {/* Badge Overlay */}
                {isLive ? (
                  <View style={[styles.liveBadge, { borderColor: isDark ? homeColors.background : '#FFFFFF' }]}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                ) : group.items?.[0]?.minute ? (
                  <View style={[styles.minuteBadge, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0', borderColor: homeColors.border }]}>
                    <Text style={[styles.minuteBadgeText, { color: homeColors.accent }]}>{group.items[0].minute}'</Text>
                  </View>
                ) : null}
              </View>

              {/* Title / Label */}
              <Text
                style={[
                  styles.storyTitle,
                  { color: isViewed ? homeColors.textSecondary : homeColors.textPrimary },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {group.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 2,
    marginBottom: 10,
    height: 104,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
    alignItems: 'center',
  },
  storyItem: {
    alignItems: 'center',
    width: 72,
  },
  ringWrapper: {
    position: 'relative',
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewedRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRing: {
    width: 61,
    height: 61,
    borderRadius: 30.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  viewedAvatar: {
    opacity: 0.75,
  },
  liveBadge: {
    position: 'absolute',
    bottom: -3,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1.5,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  minuteBadge: {
    position: 'absolute',
    bottom: -3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  minuteBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  addStoryBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyTitle: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    width: 72,
  },
});

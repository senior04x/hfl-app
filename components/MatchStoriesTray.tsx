import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/Colors';
import SmartImage from './SmartImage';
import * as Haptics from 'expo-haptics';

export interface StoryMediaItem {
  id: string;
  mediaUrl: string;
  mediaType: 'video' | 'image';
  durationSeconds?: number;
  title: string;
  subtitle?: string;
  minute?: number | string;
  matchId?: string;
  matchScore?: { home: number; away: number };
  homeTeam?: { name: string; logo?: string };
  awayTeam?: { name: string; logo?: string };
  playerName?: string;
  playerPhoto?: string;
  assistantName?: string;
  actionText?: string;
}

export interface StoryGroup {
  id: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  category: 'live_match' | 'goal_highlight' | 'top_moment' | 'league_summary';
  isLive?: boolean;
  isViewed?: boolean;
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

          return (
            <TouchableOpacity
              key={group.id || `story-${index}`}
              style={styles.storyItem}
              activeOpacity={0.82}
              onPress={() => handlePress(group, index)}
            >
              {/* Outer Ring */}
              <View style={styles.ringWrapper}>
                {isLive ? (
                  <LinearGradient
                    colors={['#EF4444', '#FF3B30', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientRing}
                  >
                    <View style={styles.innerRing}>
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
                    colors={['#00DF82', '#00A862', '#3B82F6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.gradientRing, styles.glowEffect]}
                  >
                    <View style={styles.innerRing}>
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
                  <View style={styles.viewedRing}>
                    <View style={styles.innerRing}>
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
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                ) : group.items?.[0]?.minute ? (
                  <View style={styles.minuteBadge}>
                    <Text style={styles.minuteBadgeText}>{group.items[0].minute}'</Text>
                  </View>
                ) : null}
              </View>

              {/* Title / Label */}
              <Text
                style={[
                  styles.storyTitle,
                  isViewed && styles.viewedTitle,
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
    marginVertical: 10,
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
  glowEffect: {
    shadowColor: '#00DF82',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  viewedRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRing: {
    width: 61,
    height: 61,
    borderRadius: 30.5,
    backgroundColor: '#0D111A',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  viewedAvatar: {
    opacity: 0.8,
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
    borderColor: '#0D111A',
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
    backgroundColor: '#1E293B',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  minuteBadgeText: {
    color: '#00DF82',
    fontSize: 9,
    fontWeight: '800',
  },
  storyTitle: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
    textAlign: 'center',
    width: 72,
  },
  viewedTitle: {
    color: '#64748B',
    fontWeight: '500',
  },
});

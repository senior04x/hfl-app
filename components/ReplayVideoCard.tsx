import React from 'react';
import { View, Text, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import ReplayPlayer from './ReplayPlayer';
import SmartImage from './SmartImage';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { formatShortTeamName } from '../utils/stringUtils';

type Props = { id?: string; videoUrl: string; minute?: number | string; teamName?: string; teamLogo?: string; scorerName?: string; scorerPhoto?: string; assistantName?: string; assistantPhoto?: string; eventType?: string; activePlayingId?: string | null; onPlay?: (id: string) => void; onPause?: (id: string) => void };
export default function ReplayVideoCard({ id, videoUrl, minute, teamName, teamLogo, scorerName, scorerPhoto, assistantName, activePlayingId, onPlay, onPause }: Props) {
    const { t } = useTranslation();
    const { isDark } = useThemeStore();
    const colors = getHomeScreenColors(isDark);
    const cardId = id || videoUrl;
    return <View style={{ width: '100%', marginVertical: 6, borderRadius: Platform.OS === 'android' ? 12 : 16, overflow: 'hidden', backgroundColor: isDark ? '#141414' : '#FFFFFF', borderWidth: 1, borderColor: colors.border }}>
        <View style={{ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 12 }}>{minute != null ? minute + '′' : t('replays.match_replay', 'Replay')}</Text>
            <View style={{ flex: 1 }} />
            {teamLogo && <SmartImage uri={teamLogo} style={{ width: 22, height: 22 }} contentFit="contain" />}
            <Text numberOfLines={1} style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 11, maxWidth: '65%' }}>{formatShortTeamName(teamName, 18)}</Text>
        </View>
        <ReplayPlayer uri={videoUrl} enabled={activePlayingId === cardId} autoplay onActivate={() => onPlay?.(cardId)} onPause={() => onPause?.(cardId)} />
        <View style={{ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SmartImage uri={scorerPhoto || teamLogo} style={{ width: 30, height: 30, borderRadius: 15 }} fallbackIcon="person-outline" fallbackIconSize={18} />
            <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 12 }}>{scorerName || teamName || t('replays.team_goal', 'Jamoa goli')}</Text>
                {assistantName && <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 11, marginTop: 3 }}>{t('replays.assist', 'Assist')} · {assistantName}</Text>}
            </View>
        </View>
    </View>;
}

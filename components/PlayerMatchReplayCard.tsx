import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PagerContentScrollView } from './PlatformPager';
import ReplayMatchHeader from './ReplayMatchHeader';
import ReplayPlayer from './ReplayPlayer';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

type Replay = { id?: string; minute?: number | string; replay_video_url?: string; video_url?: string; replay_url?: string; video?: string; event_type?: string };
export default function PlayerMatchReplayCard({ match, replays }: { match: any; replays: Replay[]; playerName?: string }) {
    const { t } = useTranslation();
    const { isDark } = useThemeStore();
    const colors = getHomeScreenColors(isDark);
    const [selected, setSelected] = useState(0);
    const sorted = useMemo(() => [...replays].sort((a, b) => minuteValue(a.minute) - minuteValue(b.minute)), [replays]);
    const replay = sorted[selected] || sorted[0];
    if (!replay) return null;
    return <View style={{ marginHorizontal: 10, marginBottom: 12, borderRadius: Platform.OS === 'android' ? 12 : 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: isDark ? '#141414' : '#FFFFFF' }}>
        <View style={{ flexDirection: 'row', padding: 12 }}><ReplayMatchHeader match={match} color={colors.textPrimary} /></View>
        <ReplayPlayer key={replay.id || String(selected)} uri={replay.replay_video_url || replay.video_url || replay.replay_url || replay.video || ''} />
        <PagerContentScrollView horizontal nestedScrollEnabled={Platform.OS === 'android'} showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 8, gap: 8 }}>
            {sorted.map((goal, index) => <TouchableOpacity key={goal.id || index} accessibilityRole="button" accessibilityState={{ selected: selected === index }} onPress={() => setSelected(index)} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: Platform.OS === 'android' ? 8 : 12, backgroundColor: selected === index ? colors.accent : (isDark ? '#242424' : '#F5F5F5') }}>
                <Text style={{ color: selected === index ? '#FFFFFF' : colors.textPrimary, fontSize: 11, fontWeight: '700' }}>{t('replays.goal_number', '{{number}}-gol', { number: index + 1 })} · {goal.minute ?? '—'}′</Text>
            </TouchableOpacity>)}
        </PagerContentScrollView>
    </View>;
}
function minuteValue(value: Replay['minute']) { return String(value || 0).split('+').reduce((total, part) => total + (Number(part) || 0), 0); }

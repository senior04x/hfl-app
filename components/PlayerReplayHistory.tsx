import ReplayMatchHeader from './ReplayMatchHeader';
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getHomeScreenColors } from '../constants/homeTheme';
import PlayerMatchReplayCard from './PlayerMatchReplayCard';

export default function PlayerReplayHistory({ groups, isDark, playerName, active = true }: { groups: { match: any; replays: any[] }[]; isDark: boolean; playerName?: string; active?: boolean }) {
    const { t, i18n } = useTranslation();
    const colors = getHomeScreenColors(isDark);
    const [opened, setOpened] = useState<string | null>(null);
    const [limit, setLimit] = useState(8);
    const sorted = useMemo(() => [...groups].map(group => ({ ...group, replays: group.replays.filter(replay => ['goal', 'penalty_goal'].includes(String(replay.event_type || '').toLowerCase())) })).filter(group => group.replays.length > 0).sort((a, b) => (Date.parse(b.match.match_date || b.match.date) || 0) - (Date.parse(a.match.match_date || a.match.date) || 0)), [groups]);
    return <View>
        {sorted.slice(0, limit).map(group => {
            const id = String(group.match.id);
            const date = new Date(group.match.match_date || group.match.date);
            const dateLabel = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });
            return <View key={id}>
                <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: opened === id }} onPress={() => setOpened(opened === id ? null : id)} style={{ minHeight: 64, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 0.5, borderTopColor: colors.border }}>
                    <Ionicons name="play-circle-outline" size={28} color={colors.accent} />
                    <View style={{ flex: 1 }}><ReplayMatchHeader match={group.match} color={colors.textPrimary} /><Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'center' }}>{dateLabel} · {group.replays.length} {t('stats.goals_short', 'gol')}</Text></View>
                    <Ionicons name={opened === id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                {active && opened === id && <PlayerMatchReplayCard match={group.match} replays={group.replays} playerName={playerName} />}
            </View>;
        })}
        {!sorted.length && <Text style={{ color: colors.textSecondary, padding: 14, fontSize: 12 }}>{t('stats.no_goal_videos', 'Gol videolari hali mavjud emas')}</Text>}
        {sorted.length > limit && <TouchableOpacity accessibilityRole="button" onPress={() => setLimit(value => value + 8)} style={{ minHeight: 48, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: colors.accent, fontWeight: '700' }}>{t('common.show_more', 'Ko‘proq ko‘rsatish')}</Text></TouchableOpacity>}
    </View>;
}

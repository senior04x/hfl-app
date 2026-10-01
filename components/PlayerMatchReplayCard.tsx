import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { canSaveOwnGoal, saveOwnGoal } from '../services/saveOwnGoal';
import { useTranslation } from 'react-i18next';
import { PagerContentScrollView } from './PlatformPager';
import ReplayPlayer from './ReplayPlayer';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

type Replay = { id?: string; player_id?: string; minute?: number | string; replay_video_url?: string; video_url?: string; replay_url?: string; video?: string; event_type?: string; thumbnail_url?: string; replay_thumbnail_url?: string; poster_url?: string };
export default function PlayerMatchReplayCard({ match, replays, ownPlayerId }: { match: any; replays: Replay[]; playerName?: string; ownPlayerId?: string }) {
    const { t } = useTranslation();
    const { isDark } = useThemeStore();
    const colors = getHomeScreenColors(isDark);
    const [selected, setSelected] = useState(0);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const sorted = useMemo(() => [...replays].sort((a, b) => minuteValue(a.minute) - minuteValue(b.minute)), [replays]);
    const replay = sorted[selected] || sorted[0];
    if (!replay) return null;
    const uri = replay.replay_video_url || replay.video_url || replay.replay_url || replay.video || '';
    const downloadable = Boolean(ownPlayerId && replay.player_id === ownPlayerId && canSaveOwnGoal(ownPlayerId) && uri);
    const download = async () => {
        if (saving || !downloadable || !ownPlayerId) return;
        setSaving(true); setSaveMessage('');
        try { await saveOwnGoal(ownPlayerId, uri); setSaveMessage(t('replays.save_success')); }
        catch (error) { const code = error instanceof Error && ['permission', 'unavailable'].includes(error.message) ? error.message : 'failed'; setSaveMessage(t(`replays.save_${code}`)); }
        finally { setSaving(false); }
    };
    return <View style={{ marginHorizontal: 10, marginBottom: 12, borderRadius: Platform.OS === 'android' ? 12 : 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: isDark ? '#141414' : '#FFFFFF' }}>
        <View style={{ paddingHorizontal: 12, minHeight: 48, flexDirection: 'row', alignItems: 'center' }}><Text numberOfLines={2} style={{ flex: 1, color: colors.textPrimary, textAlign: 'center', fontSize: 12, fontWeight: '700' }}>{match.competitionName || match.tournament?.name || match.tournaments?.name || match.league || t('nav.tournaments')}</Text>
            {downloadable && <TouchableOpacity onPress={download} disabled={saving} accessibilityRole="button" accessibilityLabel={t('replays.save_goal')} accessibilityState={{ disabled: saving, busy: saving }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>{saving ? <ActivityIndicator size="small" color={colors.accent} /> : <Ionicons name="download-outline" size={22} color={colors.accent} />}</TouchableOpacity>}
        </View>
        {!!saveMessage && <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary, paddingHorizontal: 12, paddingBottom: 8, fontSize: 12, textAlign: 'center' }}>{saveMessage}</Text>}
        <ReplayPlayer posterUri={replay.replay_thumbnail_url || replay.thumbnail_url || replay.poster_url} key={replay.id || String(selected)} uri={replay.replay_video_url || replay.video_url || replay.replay_url || replay.video || ''} />
        <PagerContentScrollView horizontal nestedScrollEnabled={Platform.OS === 'android'} showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 8, gap: 8 }}>
            {sorted.map((goal, index) => <TouchableOpacity key={goal.id || index} accessibilityRole="button" accessibilityState={{ selected: selected === index }} disabled={saving} onPress={() => { setSelected(index); setSaveMessage(''); }} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: Platform.OS === 'android' ? 8 : 12, backgroundColor: selected === index ? colors.accent : (isDark ? '#242424' : '#F5F5F5') }}>
                <Text style={{ color: selected === index ? '#FFFFFF' : colors.textPrimary, fontSize: 11, fontWeight: '700' }}>{t('replays.goal_number', '{{number}}-gol', { number: index + 1 })} · {goal.minute ?? '—'}′</Text>
            </TouchableOpacity>)}
        </PagerContentScrollView>
    </View>;
}
function minuteValue(value: Replay['minute']) { return String(value || 0).split('+').reduce((total, part) => total + (Number(part) || 0), 0); }

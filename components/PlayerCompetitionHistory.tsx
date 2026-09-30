import React, { useMemo, useState } from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import SmartImage from './SmartImage';
import { PagerContentScrollView } from './PlatformPager';
import { getHomeScreenColors } from '../constants/homeTheme';
import { groupPlayerMatches, isFinishedMatch, playerGoals } from '../utils/playerCompetitions';

type Props = { matches: any[]; isDark: boolean; loading: boolean; error: string; onRefresh: () => void; refreshing?: boolean; onMatchPress?: (id: string) => void };
export function PlayerCareerGoals({ matches, isDark, loading, error, onRefresh }: Props) {
    const colors = getHomeScreenColors(isDark);
    const groups = useMemo(() => groupPlayerMatches(matches), [matches]);
    const { t } = useTranslation();
    const league = groups.filter(g => !g.tournament).reduce((n, g) => n + g.goals, 0);
    const tournament = groups.filter(g => g.tournament).reduce((n, g) => n + g.goals, 0);
    return <View style={[styles.card, { backgroundColor: isDark ? '#141414' : '#FFFFFF', borderColor: colors.border, marginBottom: 16 }]}>
        <View style={styles.header}><Ionicons name="football-outline" size={20} color={colors.accent} /><Text style={[styles.title, { color: colors.textPrimary }]}>{t('stats.career_goals_title', 'Karyera gollari')}</Text></View>
        {loading ? <ActivityIndicator style={{ padding: 20 }} color={colors.accent} /> : error ? <TouchableOpacity onPress={onRefresh} style={styles.row}><Text style={{ color: colors.textPrimary }}>{t('common.retry', 'Qayta urinish')}</Text></TouchableOpacity> : <>
            <View style={styles.totals}>{[[t('stats.total_goals', 'Jami'), league + tournament], [t('stats.match_league', 'Liga'), league], [t('stats.match_tournament', 'Turnir'), tournament]].map(([label, count], index) => <View key={String(label)} style={{ flex: 1, alignItems: 'center' }}><Text style={{ fontSize: index === 0 ? 34 : 26, fontWeight: '900', color: index === 0 ? colors.accent : colors.textPrimary }}>{count}</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text></View>)}</View>
            {groups.map(group => <View key={group.key} style={[styles.breakdown, { borderTopColor: colors.border }]}><Text numberOfLines={2} style={{ flex: 1, color: colors.textPrimary }}>{group.title}</Text><Text style={{ color: colors.accent, fontWeight: '800' }}>{group.goals} ⚽</Text></View>)}
            <Text style={{ color: colors.textSecondary, fontSize: 11, padding: 14 }}>{t('stats.recorded_career_goals', "Yakunlangan o‘yinlarda qayd etilgan gollar. Liga va turnir alohida hisoblanadi.")}</Text>
        </>}
    </View>;
}
export default function PlayerCompetitionHistory({ matches, isDark, loading, error, onRefresh, refreshing = false, onMatchPress }: Props) {
    const colors = getHomeScreenColors(isDark);
    const [filter, setFilter] = useState<'all' | 'league' | 'tournament'>('all');
    const sections = useMemo(() => groupPlayerMatches(matches).filter(group => filter === 'all' || group.tournament === (filter === 'tournament')), [matches, filter]);
    const { t, i18n } = useTranslation();
    if (loading && !matches.length) return <ActivityIndicator style={{ marginTop: 32 }} color={colors.accent} />;
    return <SectionList sections={sections} keyExtractor={m => String(m.id || m._id)} stickySectionHeadersEnabled={false}
        nestedScrollEnabled={Platform.OS === 'android'}
        renderScrollComponent={Platform.OS === 'android' ? props => <PagerContentScrollView {...props} nestedScrollEnabled /> : undefined}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }} initialNumToRender={12} maxToRenderPerBatch={10} windowSize={5}
        refreshing={refreshing} onRefresh={onRefresh}
        ListHeaderComponent={<View><View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>{(['all', 'league', 'tournament'] as const).map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={{ flex: 1, minHeight: 44, borderRadius: Platform.OS === 'android' ? 8 : 12, alignItems: 'center', justifyContent: 'center', backgroundColor: filter === value ? colors.accent : (isDark ? '#141414' : '#F5F5F5') }}><Text style={{ fontWeight: '700', fontSize: 12, color: filter === value ? '#FFFFFF' : colors.textPrimary }}>{value === 'all' ? t('common.all', 'Barchasi') : value === 'league' ? t('stats.match_league', 'Liga') : t('stats.match_tournament', 'Turnir')}</Text></TouchableOpacity>)}</View>{error ? <TouchableOpacity onPress={onRefresh} style={styles.row}><Text style={{ color: colors.textPrimary }}>{t('stats.matches_load_failed', "O‘yinlarni yuklab bo‘lmadi. Qayta urinish")}</Text></TouchableOpacity> : null}</View>}
        ListEmptyComponent={!error ? <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 24 }}>{t('teams.no_matches', "O‘yinlar tarixi mavjud emas")}</Text> : null}
        renderSectionHeader={({ section }) => <View style={[styles.header, styles.sectionHeader, { backgroundColor: isDark ? '#1C1C1C' : '#F5F5F5' }]}><View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: colors.accent }} /><View style={{ flex: 1 }}><Text style={[styles.title, { color: colors.textPrimary }]}>{section.title}</Text><Text style={{ color: colors.textSecondary, fontSize: 10 }}>{section.tournament ? t('stats.match_tournament', 'Turnir') : t('stats.match_league', 'Liga')}</Text></View><Text style={{ color: colors.textSecondary, fontSize: 11 }}>{section.data.length} {t('stats.matches_short', "o‘yin")}</Text></View>}
        renderSectionFooter={() => <View style={{ height: 16 }} />}
        renderItem={({ item: match }) => {
            const status = String(match.status || '').toLowerCase();
            const live = ['live', 'first_half', 'second_half', 'half_time', 'halftime', 'ongoing', 'in_progress', '1st_half', '2nd_half', '1-taym', '2-taym', 'tanaffus'].includes(status);
            const scored = live || isFinishedMatch(match);
            const date = new Date(match.match_date || match.date);
            const dateLabel = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
            const time = String(match.match_time || '').slice(0, 5) || '—';
            const goals = playerGoals(match);
            return <TouchableOpacity accessibilityRole="button" onPress={() => onMatchPress?.(match.id || match._id)} style={[styles.row, { backgroundColor: isDark ? '#141414' : '#FFFFFF', borderBottomColor: colors.border }]}>
                <View style={styles.teams}><View style={styles.team}><Text numberOfLines={2} style={[styles.teamName, { color: colors.textPrimary, textAlign: 'right' }]}>{match.homeTeamName || t('matches.home_short', 'UY')}</Text><SmartImage uri={match.homeTeamLogo} style={styles.logo} contentFit="contain" fallbackIcon="shield-outline" /></View>
                    <View style={{ width: 76, alignItems: 'center' }}><Text style={{ fontSize: 20, fontWeight: '900', color: live ? colors.accent : colors.textPrimary }}>{scored ? (match.home_score ?? 0) + ' : ' + (match.away_score ?? 0) : time}</Text><Text style={{ fontSize: 10, color: live ? colors.accent : colors.textSecondary }}>{live ? 'LIVE' : dateLabel}</Text></View>
                    <View style={styles.team}><SmartImage uri={match.awayTeamLogo} style={styles.logo} contentFit="contain" fallbackIcon="shield-outline" /><Text numberOfLines={2} style={[styles.teamName, { color: colors.textPrimary }]}>{match.awayTeamName || t('matches.away_short', 'MEH')}</Text></View></View>
                {goals > 0 && <Text style={{ color: colors.accent, textAlign: 'center', fontSize: 11, marginTop: 8 }}>⚽ {goals} {t('stats.goals_short', 'gol')}</Text>}
            </TouchableOpacity>;
        }} />;
}
const styles = StyleSheet.create({
    card: { borderRadius: Platform.OS === 'android' ? 12 : 16, borderWidth: 1, overflow: 'hidden' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
    sectionHeader: { borderTopLeftRadius: Platform.OS === 'android' ? 12 : 16, borderTopRightRadius: Platform.OS === 'android' ? 12 : 16 },
    title: { fontSize: 13, fontWeight: '800', flexShrink: 1 },
    row: { paddingHorizontal: 12, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    teams: { flexDirection: 'row', alignItems: 'center' },
    team: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
    teamName: { flex: 1, fontSize: 12, fontWeight: '700' },
    logo: { width: 26, height: 26 },
    totals: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20 },
    breakdown: { flexDirection: 'row', gap: 12, padding: 14, borderTopWidth: StyleSheet.hairlineWidth },
});

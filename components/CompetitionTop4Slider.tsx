import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SmartImage from './SmartImage';
import { supabase } from '../services/supabase';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const SLIDE_WIDTH = width - 40;

type Competition = {
    id: string;
    name: string;
    isTournament: boolean;
    standings: any[];
};

const isFinished = (status?: string) => ['finished', 'completed', 'ended', 'tugadi'].includes(String(status || '').toLowerCase().trim());

const getTeamDetails = (match: any, side: 'home' | 'away') => {
    const team = side === 'home' ? match.homeTeam : match.awayTeam;
    return {
        id: String(side === 'home' ? (match.home_team_id || team?.id || match.homeTeamId || '') : (match.away_team_id || team?.id || match.awayTeamId || '')),
        name: side === 'home'
            ? (team?.name || match.homeTeamName || match.home_team_name || 'Jamoa')
            : (team?.name || match.awayTeamName || match.away_team_name || 'Jamoa'),
        logo: side === 'home'
            ? (team?.logo || team?.logo_url || match.home_team_logo || '')
            : (team?.logo || team?.logo_url || match.away_team_logo || ''),
    };
};

export default function CompetitionTop4Slider({ matches, onSelectCompetition }: { matches: any[]; onSelectCompetition: (competition: Competition) => void }) {
    const { t } = useTranslation();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const [activeIndex, setActiveIndex] = useState(0);
    const [teamData, setTeamData] = useState<Record<string, any>>({});
    const loadedCompetitionIds = useRef(new Set<string>());

    const competitions = useMemo<Competition[]>(() => {
        const groups = new Map<string, { id: string; name: string; isTournament: boolean; matches: any[] }>();

        matches.filter((match: any) => isFinished(match.status)).forEach((match: any) => {
            const isTournament = Boolean(match.tournament_id || match.tournamentId);
            const id = String(isTournament
                ? (match.tournament_id || match.tournamentId)
                : (match.league_id || match.leagueId || match.league || ''));
            const name = isTournament
                ? (match.tournamentName || match.tournament?.name || match.league || t('home.competition_tournament', 'Tournament'))
                : (match.league || match.leagueName || match.tournamentName || t('home.competition_league', 'League'));

            if (!id) return;
            const key = `${isTournament ? 'tournament' : 'league'}_${id}`;
            const group: { id: string; name: string; isTournament: boolean; matches: any[] } = groups.get(key) || { id, name, isTournament, matches: [] };
            group.matches.push(match);
            groups.set(key, group);
        });

        return Array.from(groups.values()).map((group) => {
            const stats = new Map<string, any>();

            group.matches.forEach((match: any) => {
                const home = getTeamDetails(match, 'home');
                const away = getTeamDetails(match, 'away');
                if (!home.id || !away.id) return;

                if (!stats.has(home.id)) stats.set(home.id, { ...home, played: 0, points: 0, gf: 0, ga: 0, wins: 0 });
                if (!stats.has(away.id)) stats.set(away.id, { ...away, played: 0, points: 0, gf: 0, ga: 0, wins: 0 });

                const homeStats = stats.get(home.id);
                const awayStats = stats.get(away.id);
                const homeScore = Number(match.score?.home ?? match.home_score ?? 0);
                const awayScore = Number(match.score?.away ?? match.away_score ?? 0);
                homeStats.played += 1;
                awayStats.played += 1;
                homeStats.gf += homeScore;
                homeStats.ga += awayScore;
                awayStats.gf += awayScore;
                awayStats.ga += homeScore;

                if (homeScore > awayScore) {
                    homeStats.points += 3;
                    homeStats.wins += 1;
                } else if (awayScore > homeScore) {
                    awayStats.points += 3;
                    awayStats.wins += 1;
                } else {
                    homeStats.points += 1;
                    awayStats.points += 1;
                }
            });

            const standings = Array.from(stats.values())
                .sort((a: any, b: any) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || b.wins - a.wins)
                .slice(0, 4);

            return { id: group.id, name: group.name, isTournament: group.isTournament, standings };
        }).filter((competition) => competition.standings.length > 0);
    }, [matches, t]);

    useEffect(() => {
        if (activeIndex >= competitions.length) setActiveIndex(0);
    }, [activeIndex, competitions.length]);

    useEffect(() => {
        const activeCompetition = competitions[activeIndex];
        if (!activeCompetition || loadedCompetitionIds.current.has(`${activeCompetition.isTournament}_${activeCompetition.id}`)) return;

        const loadTeams = async () => {
            const teamIds = activeCompetition.standings.map((team) => team.id).filter(Boolean);
            if (teamIds.length === 0) return;
            const { data } = await supabase.from('teams').select('id, name, logo_url, logo').in('id', teamIds);
            if (data) {
                setTeamData((current) => ({
                    ...current,
                    ...Object.fromEntries(data.map((team: any) => [String(team.id), team])),
                }));
            }
            loadedCompetitionIds.current.add(`${activeCompetition.isTournament}_${activeCompetition.id}`);
        };

        loadTeams();
    }, [activeIndex, competitions]);

    if (competitions.length === 0) return null;

    return (
        <View style={[styles.container, { backgroundColor: isDark ? homeColors.background : '#FFFFFF', shadowColor: isDark ? '#FFFFFF' : '#000000', shadowOpacity: isDark ? 0.14 : 0.18 }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.eyebrow, { color: homeColors.accent }]}>{t('home.standings_label', 'STANDINGS').toUpperCase()}</Text>
                    <Text style={[styles.title, { color: homeColors.textPrimary }]}>{t('home.top_four', 'TOP 4').toUpperCase()}</Text>
                </View>
                <TouchableOpacity onPress={() => onSelectCompetition(competitions[activeIndex])} style={[styles.detailButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]} activeOpacity={0.75}>
                    <Text style={[styles.detailText, { color: homeColors.textPrimary }]}>{t('common.details', 'DETAILS').toUpperCase()}</Text>
                    <Ionicons name="chevron-forward" size={14} color={homeColors.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                onMomentumScrollEnd={(event) => setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / SLIDE_WIDTH))}
            >
                {competitions.map((competition) => (
                    <View key={`${competition.isTournament}_${competition.id}`} style={styles.slide}>
                        <View style={styles.competitionRow}>
                            <View style={[styles.competitionDot, { backgroundColor: homeColors.accent }]} />
                            <Text style={[styles.competitionName, { color: homeColors.textPrimary }]} numberOfLines={1}>{competition.name.toUpperCase()}</Text>
                            <Text style={[styles.competitionType, { color: homeColors.textSecondary }]}>{t(competition.isTournament ? 'home.competition_tournament' : 'home.competition_league', competition.isTournament ? 'TOURNAMENT' : 'LEAGUE').toUpperCase()}</Text>
                        </View>
                        <View style={[styles.tableHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                            <Text style={[styles.position, styles.tableMuted, { color: homeColors.textSecondary }]}>#</Text>
                            <Text style={[styles.team, styles.tableMuted, { color: homeColors.textSecondary }]}>{t('standings.team', 'TEAM').toUpperCase()}</Text>
                            <Text style={[styles.stat, styles.tableMuted, { color: homeColors.textSecondary }]}>{t('standings.played', 'P').toUpperCase()}</Text>
                            <Text style={[styles.stat, styles.tableMuted, { color: homeColors.textSecondary }]}>GD</Text>
                            <Text style={[styles.points, styles.tableMuted, { color: homeColors.textSecondary }]}>{t('standings.points', 'PTS').toUpperCase()}</Text>
                        </View>
                        {competition.standings.map((item: any, index: number) => {
                            const resolvedTeam = teamData[item.id];
                            const teamName = resolvedTeam?.name || item.name;
                            const logo = resolvedTeam?.logo || resolvedTeam?.logo_url || item.logo;
                            const goalDifference = item.gf - item.ga;
                            return (
                                <View key={item.id} style={styles.tableRow}>
                                    <Text style={[styles.position, { color: index === 0 ? homeColors.accent : homeColors.textSecondary }]}>{index + 1}</Text>
                                    <View style={styles.team}>
                                        <View style={[styles.logo, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F5' }]}>
                                            {logo ? <SmartImage uri={logo} style={styles.logoImage} contentFit="contain" fallbackIcon="shield-outline" /> : <Text style={[styles.logoFallback, { color: homeColors.textSecondary }]}>{teamName.charAt(0).toUpperCase()}</Text>}
                                        </View>
                                        <Text style={[styles.teamName, { color: homeColors.textPrimary }]} numberOfLines={1}>{teamName}</Text>
                                    </View>
                                    <Text style={[styles.stat, { color: homeColors.textSecondary }]}>{item.played}</Text>
                                    <Text style={[styles.stat, { color: homeColors.textSecondary }]}>{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</Text>
                                    <Text style={[styles.points, { color: homeColors.textPrimary }]}>{item.points}</Text>
                                </View>
                            );
                        })}
                    </View>
                ))}
            </ScrollView>

            {competitions.length > 1 && (
                <View style={styles.pagination}>
                    {competitions.map((competition, index) => <View key={`${competition.id}_${index}`} style={[styles.paginationDot, { backgroundColor: index === activeIndex ? homeColors.accent : (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)') }]} />)}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: Platform.OS === 'ios' ? 16 : 12,
        paddingVertical: 14,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 5,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
    eyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
    title: { fontSize: 18, fontWeight: '900', letterSpacing: 0.2, marginTop: 1 },
    detailButton: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 10, minHeight: 32, borderRadius: 9 },
    detailText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
    slide: { width: SLIDE_WIDTH, paddingHorizontal: 16 },
    competitionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    competitionDot: { width: 6, height: 6, borderRadius: 3, marginRight: 7 },
    competitionName: { flex: 1, fontSize: 11.5, fontWeight: '900', letterSpacing: 0.2 },
    competitionType: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
    tableHeader: { flexDirection: 'row', alignItems: 'center', minHeight: 28, borderBottomWidth: 1 },
    tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 42 },
    position: { width: 24, textAlign: 'center', fontSize: 11, fontWeight: '800' },
    team: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
    stat: { width: 32, textAlign: 'center', fontSize: 11, fontWeight: '700' },
    points: { width: 46, textAlign: 'right', fontSize: 12, fontWeight: '900' },
    tableMuted: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    logo: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: 8 },
    logoImage: { width: 22, height: 22 },
    logoFallback: { fontSize: 10, fontWeight: '800' },
    teamName: { flex: 1, fontSize: 11.5, fontWeight: '700' },
    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 12 },
    paginationDot: { width: 5, height: 5, borderRadius: 3 },
});

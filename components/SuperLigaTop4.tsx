import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { apiService } from '../services/apiService';
import SmartImage from './SmartImage';
import { useThemeStore } from '../store/useThemeStore';
import { useTranslation } from 'react-i18next';
import { getHomeScreenColors } from '../constants/homeTheme';

/**
 * SuperLigaTop4 — Super Liga'ning top 4 jamoasini ko'rsatuvchi widget
 *
 * Ma'lumot manbai: apiService.getTournamentById('super')
 * Sorting: StandingsScreen'dagi mantiq (points DESC, goal_difference DESC, goals_for DESC, wins DESC)
 * Rang: Bosqich 2 lokal tema (homeTheme.ts) — to'liq neytral, accent yo'q
 */
export default function SuperLigaTop4({ onViewAll }: { onViewAll?: () => void }) {
    const { t } = useTranslation();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const [standings, setStandings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStandings();
    }, []);

    const loadStandings = async () => {
        try {
            setLoading(true);

            // 1. Super Liga tournament ma'lumotini olish
            const tournament = await apiService.getTournamentById('super');

            if (!tournament) {
                // Tournament topilmasa — widget ko'rsatilmaydi
                setStandings([]);
                setLoading(false);
                return;
            }

            // 2. Standings ma'lumotini olish (StandingsScreen.tsx:59-61 logikasi)
            const rawStandings = (tournament.standings && tournament.standings.length > 0)
                ? tournament.standings
                : (await apiService.getTeams(1, 100, 'super') || []);

            if (!rawStandings || rawStandings.length === 0) {
                setStandings([]);
                setLoading(false);
                return;
            }

            // 3. Sorting (StandingsScreen.tsx:63-83 aynan bir xil mantiq)
            const sorted = [...rawStandings].sort((a: any, b: any) => {
                const statsA = a.stats || {};
                const statsB = b.stats || {};

                // 1. Points DESC
                const ptsA = a.points ?? statsA.points ?? a.pts ?? 0;
                const ptsB = b.points ?? statsB.points ?? b.pts ?? 0;
                if (ptsB !== ptsA) return ptsB - ptsA;

                // 2. Goal Difference DESC
                const gfA = a.goalsFor ?? statsA.goalsFor ?? a.gf ?? 0;
                const gaA = a.goalsAgainst ?? statsA.goalsAgainst ?? a.ga ?? 0;
                const gfB = b.goalsFor ?? statsB.goalsFor ?? b.gf ?? 0;
                const gaB = b.goalsAgainst ?? statsB.goalsAgainst ?? b.ga ?? 0;
                const gdA = a.goalDifference ?? statsA.goalDifference ?? a.gd ?? (gfA - gaA);
                const gdB = b.goalDifference ?? statsB.goalDifference ?? b.gd ?? (gfB - gaB);
                if (gdB !== gdA) return gdB - gdA;

                // 3. Goals For DESC
                if (gfB !== gfA) return gfB - gfA;

                // 4. Wins DESC
                const winsA = a.won ?? a.wins ?? statsA.won ?? statsA.wins ?? 0;
                const winsB = b.won ?? b.wins ?? statsB.won ?? statsB.wins ?? 0;
                return winsB - winsA;
            });

            // 4. Top 4 faqat
            setStandings(sorted.slice(0, 4));
        } catch (error) {
            console.error('SuperLigaTop4: Error loading standings:', error);
            setStandings([]);
        } finally {
            setLoading(false);
        }
    };

    // Ma'lumot yo'q yoki loading muvaffaqiyatsiz — widget ko'rsatilmaydi
    if (!loading && standings.length === 0) {
        return null;
    }

    // Loading holati
    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: homeColors.background, borderWidth: 1, borderColor: homeColors.border }]}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: homeColors.textPrimary }]}>
                        {t('home.super_liga_top4', 'SUPER LIGA — TOP 4').toUpperCase()}
                    </Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={homeColors.textSecondary} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: homeColors.surface }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: homeColors.textPrimary }]}>
                    {t('home.super_liga_top4', 'SUPER LIGA — TOP 4').toUpperCase()}
                </Text>
                {onViewAll && (
                    <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
                        <Text style={[styles.viewAllText, { color: homeColors.textSecondary }]}>
                            {t('common.details', 'BATAFSIL').toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Standings Table */}
            <View style={styles.table}>
                {/* Table Header */}
                <View style={[styles.tableRow, styles.tableHeader, { borderBottomColor: homeColors.border }]}>
                    <Text style={[styles.headerText, styles.posColumn, { color: homeColors.textSecondary }]}>#</Text>
                    <Text style={[styles.headerText, styles.teamColumn, { color: homeColors.textSecondary }]}>
                        {t('standings.team', 'JAMOA').toUpperCase()}
                    </Text>
                    <Text style={[styles.headerText, styles.statColumn, { color: homeColors.textSecondary }]}>
                        {t('standings.played_short', 'O').toUpperCase()}
                    </Text>
                    <Text style={[styles.headerText, styles.statColumn, { color: homeColors.textSecondary }]}>
                        {t('standings.diff_short', 'GF').toUpperCase()}
                    </Text>
                    <Text style={[styles.headerText, styles.pointsColumn, { color: homeColors.textSecondary }]}>
                        {t('home.points_short', 'O').toUpperCase()}
                    </Text>
                </View>

                {/* Table Rows */}
                {standings.map((item, index) => {
                    const stats = item.stats || {};
                    const played = item.played ?? stats.played ?? item.pld ?? 0;
                    const goalDifference = item.goalDifference ?? stats.goalDifference ?? item.gd ??
                        ((item.goalsFor ?? stats.goalsFor ?? 0) - (item.goalsAgainst ?? stats.goalsAgainst ?? 0));
                    const points = item.points ?? stats.points ?? item.pts ?? 0;
                    const teamName = item.name || item.team_name || 'N/A';
                    const teamLogo = item.logo || item.logo_url || item.team?.logo || item.team?.logo_url;

                    return (
                        <View
                            key={item.id || item._id || index}
                            style={[
                                styles.tableRow,
                                { borderBottomColor: homeColors.border }
                            ]}
                        >
                            {/* Position */}
                            <Text style={[styles.posText, styles.posColumn, { color: homeColors.textPrimary }]}>
                                {index + 1}
                            </Text>

                            {/* Team Logo + Name */}
                            <View style={[styles.teamCell, styles.teamColumn]}>
                                <View style={[styles.logoCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                    {teamLogo ? (
                                        <SmartImage
                                            uri={teamLogo}
                                            style={styles.teamLogo}
                                            contentFit="contain"
                                            fallbackIcon="shield-outline"
                                        />
                                    ) : (
                                        <Text style={[styles.logoFallback, { color: homeColors.textSecondary }]}>
                                            {teamName.charAt(0).toUpperCase()}
                                        </Text>
                                    )}
                                </View>
                                <Text style={[styles.teamName, { color: homeColors.textPrimary }]} numberOfLines={1}>
                                    {teamName}
                                </Text>
                            </View>

                            {/* Played */}
                            <Text style={[styles.statText, styles.statColumn, { color: homeColors.textSecondary }]}>
                                {played}
                            </Text>

                            {/* Goal Difference */}
                            <Text style={[styles.statText, styles.statColumn, { color: homeColors.textSecondary }]}>
                                {goalDifference > 0 ? `+${goalDifference}` : goalDifference}
                            </Text>

                            {/* Points */}
                            <Text style={[styles.pointsText, styles.pointsColumn, { color: homeColors.textPrimary }]}>
                                {points}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 12,
        overflow: 'hidden',
        // Border OLIB TASHLANDI — neytral qora soya bilan almashtirildi
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    title: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    viewAllText: {
        fontSize: 11,
        fontWeight: '700',
    },
    loadingContainer: {
        paddingVertical: 30,
        alignItems: 'center',
    },
    table: {
        paddingBottom: 8,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    tableHeader: {
        paddingVertical: 8,
    },
    headerText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    posColumn: {
        width: 24,
        textAlign: 'center',
    },
    teamColumn: {
        flex: 1,
        paddingRight: 8,
    },
    statColumn: {
        width: 32,
        textAlign: 'center',
    },
    pointsColumn: {
        width: 36,
        textAlign: 'center',
    },
    posText: {
        fontSize: 12,
        fontWeight: '700',
    },
    teamCell: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    teamLogo: {
        width: 22,
        height: 22,
        borderRadius: 11,
    },
    logoFallback: {
        fontSize: 10,
        fontWeight: '700',
    },
    teamName: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    statText: {
        fontSize: 11,
        fontWeight: '500',
    },
    pointsText: {
        fontSize: 13,
        fontWeight: '900',
    },
});

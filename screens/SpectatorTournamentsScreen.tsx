import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/useThemeStore';
import { useSpectatorBrowseStore } from '../store/useSpectatorBrowseStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { firstCompetitionCursor, loadSpectatorCompetitions, loadSpectatorOrganizations } from '../services/spectatorBrowseService';

export default function SpectatorTournamentsScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { isDark } = useThemeStore();
    const colors = getHomeScreenColors(isDark);
    const { organization, selectOrganization } = useSpectatorBrowseStore();
    const orgId = organization?.id ?? null;
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const cursor = useRef(firstCompetitionCursor);
    const generation = useRef(0);
    const busy = useRef(false);
    const retryAppend = useRef(false);
    const [showOrganizations, setShowOrganizations] = useState(false);
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [orgLoading, setOrgLoading] = useState(false);
    const [orgError, setOrgError] = useState(false);
    const [orgHasMore, setOrgHasMore] = useState(false);
    const orgCursor = useRef<number | null | false>(null);
    const orgBusy = useRef(false);
    const orgRetryAppend = useRef(false);
    const orgGeneration = useRef(0);

    const load = useCallback(async (append = false, refresh = false) => {
        if (busy.current) return;
        busy.current = true;
        retryAppend.current = append;
        const token = generation.current;
        setLoading(true); setError(false);
        try {
            const result = await loadSpectatorCompetitions(orgId, append ? cursor.current : firstCompetitionCursor, refresh);
            if (token !== generation.current) return;
            setItems(previous => append ? [...previous, ...result.rows.filter(row => !previous.some(old =>
                old.id === row.id && old.is_tournament === row.is_tournament))] : result.rows);
            cursor.current = result.cursor;
            setHasMore(result.cursor.tournament !== false || result.cursor.league !== false);
        } catch (_) { if (token === generation.current) setError(true); }
        finally { if (token === generation.current) { busy.current = false; setLoading(false); setRefreshing(false); } }
    }, [orgId]);

    useEffect(() => {
        generation.current += 1; busy.current = false;
        setRefreshing(false);
        setItems([]); setHasMore(false); cursor.current = firstCompetitionCursor;
        void load();
        return () => { generation.current += 1; busy.current = false; };
    }, [load]);

    const loadOrganizations = useCallback(async (append = false) => {
        if (orgBusy.current || (append && orgCursor.current === false)) return;
        orgBusy.current = true;
        orgRetryAppend.current = append;
        const token = orgGeneration.current;
        setOrgLoading(true); setOrgError(false);
        try {
            const result = await loadSpectatorOrganizations(append ? (orgCursor.current || null) : null);
            if (token !== orgGeneration.current) return;
            setOrganizations(previous => append ? [...previous, ...result.rows] : result.rows);
            orgCursor.current = result.cursor; setOrgHasMore(result.cursor !== false);
        } catch (_) { if (token === orgGeneration.current) setOrgError(true); }
        finally { if (token === orgGeneration.current) { orgBusy.current = false; setOrgLoading(false); } }
    }, []);

    useEffect(() => {
        orgGeneration.current += 1; orgBusy.current = false;
        if (showOrganizations) void loadOrganizations();
        return () => { orgGeneration.current += 1; orgBusy.current = false; };
    }, [showOrganizations, loadOrganizations]);

    const surface = { backgroundColor: isDark ? '#141414' : '#FFFFFF', borderColor: colors.border };
    const text = { color: colors.textPrimary };
    const allLabel = t('common.all_organizations', 'Barcha tashkilotlar');
    const button = (label: string, action: () => void, disabled = false) => (
        <Pressable accessibilityRole="button" disabled={disabled} onPress={action}
            android_ripple={{ color: 'rgba(232,80,2,0.15)' }} style={[styles.button, { borderColor: colors.border }]}>
            <Text style={[styles.buttonText, text]}>{label}</Text>
        </Pressable>
    );

    return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
        <FlatList data={items} keyExtractor={item => `${item.is_tournament ? 't' : 'l'}:${item.id}`}
            contentContainerStyle={styles.content} initialNumToRender={10} maxToRenderPerBatch={10} windowSize={5}
            refreshing={refreshing}
            onRefresh={() => { generation.current += 1; busy.current = false; setRefreshing(true); void load(false, true); }}
            ListHeaderComponent={<View style={styles.header}>
                <Text style={[styles.eyebrow, { color: colors.accent }]}>AMATORA</Text>
                <Text style={[styles.title, text]}>{t('tournaments.title', 'Turnirlar')}</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {t('spectator.discover', 'Ligalar va turnirlarni kashf eting')}
                </Text>
                <Pressable accessibilityRole="button" onPress={() => setShowOrganizations(true)} style={[styles.filter, surface]}>
                    <Ionicons name="globe-outline" size={20} color={colors.accent} />
                    <Text numberOfLines={1} style={[styles.filterLabel, text]}>{organization?.name || allLabel}</Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </Pressable>
            </View>}
            renderItem={({ item }) => <Pressable accessibilityRole="button" style={[styles.card, surface]}
                android_ripple={{ color: 'rgba(232,80,2,0.12)' }}
                onPress={() => navigation.navigate('TournamentDetail', { tournament: item, tournamentId: item.id,
                    tournamentName: item.name, is_tournament: item.is_tournament })}>
                {item.logo_url ? <Image source={{ uri: item.logo_url }} style={styles.logo} resizeMode="contain" />
                    : <Ionicons name={item.is_tournament ? 'trophy-outline' : 'shield-outline'} size={30} color={colors.accent} />}
                <View style={styles.cardInfo}>
                    <Text style={[styles.kind, { color: colors.textSecondary }]}>{item.is_tournament ? t('tournaments.tournament', 'Turnir') : t('tournaments.league', 'Liga')}</Text>
                    <Text numberOfLines={2} style={[styles.name, text]}>{item.name}</Text>
                    <Text numberOfLines={1} style={[styles.organization, { color: colors.textSecondary }]}>{item.organizationName}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>}
            ListEmptyComponent={!loading && !error ? <Text style={[styles.empty, text]}>{t('tournaments.no_data', 'Ma’lumot topilmadi')}</Text> : null}
            ListFooterComponent={<View>
                {error && button(t('common.retry', 'Qayta urinish'), () => { void load(retryAppend.current); })}
                {loading ? <ActivityIndicator style={styles.loader} color={colors.accent} />
                    : hasMore && !error ? button(t('common.load_more', 'Ko‘proq ko‘rsatish'), () => { void load(true); }) : null}
            </View>} />
        <Modal visible={showOrganizations} transparent animationType="slide" onRequestClose={() => setShowOrganizations(false)}>
            <View style={styles.overlay}><SafeAreaView style={[styles.sheet, { backgroundColor: colors.background }]}>
                <View style={styles.sheetHeader}><Text style={[styles.name, text]}>{t('common.select_organization', 'Tashkilotni tanlang')}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel={t('common.close', 'Yopish')} style={styles.close} onPress={() => setShowOrganizations(false)}>
                        <Ionicons name="close" size={24} color={colors.textPrimary} />
                    </Pressable>
                </View>
                {button(allLabel, () => { selectOrganization(null); setShowOrganizations(false); })}
                <FlatList data={organizations} keyExtractor={item => String(item.id)}
                    renderItem={({ item }) => button(item.name, () => { selectOrganization({ id: Number(item.id), name: item.name }); setShowOrganizations(false); })}
                    ListFooterComponent={<View>{orgError && button(t('common.retry', 'Qayta urinish'), () => { void loadOrganizations(orgRetryAppend.current); })}
                        {orgLoading ? <ActivityIndicator style={styles.loader} color={colors.accent} />
                            : orgHasMore && !orgError ? button(t('common.load_more', 'Ko‘proq ko‘rsatish'), () => { void loadOrganizations(true); }) : null}</View>} />
            </SafeAreaView></View>
        </Modal>
    </SafeAreaView>;
}

const styles = StyleSheet.create({
    content: { padding: 20, paddingBottom: 130 }, header: { marginBottom: 20 },
    eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 2 }, title: { fontSize: 32, fontWeight: '800', marginTop: 6 },
    subtitle: { fontSize: 14, marginTop: 6, lineHeight: 21 },
    filter: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, marginTop: 20 },
    filterLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
    card: { minHeight: 100, flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12, borderWidth: 1,
        borderRadius: Platform.OS === 'ios' ? 16 : 12, overflow: 'hidden' },
    logo: { width: 48, height: 48 }, cardInfo: { flex: 1, marginHorizontal: 14 },
    kind: { fontSize: 12, marginBottom: 4 }, name: { fontSize: 17, fontWeight: '700' },
    organization: { fontSize: 13, marginTop: 5 }, button: { minHeight: 48, justifyContent: 'center', padding: 14,
        borderWidth: 1, borderRadius: Platform.OS === 'ios' ? 12 : 8, marginVertical: 5, overflow: 'hidden' },
    buttonText: { fontSize: 15, fontWeight: '600' }, loader: { margin: 20 }, empty: { padding: 20, textAlign: 'center' },
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: { height: '70%', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    close: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
});

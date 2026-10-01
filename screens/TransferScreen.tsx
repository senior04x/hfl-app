import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, ActivityIndicator, Alert, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import SmartImage from '../components/SmartImage';
import { restoreTransferLoginSession, revokeTransferLoginSession } from '../services/transferLoginStorage';
import { AppTransfer, TransferActor, TransferApiError, TransferDecision, TransferDirection, TransferSession,
    clearTransferSession, getTransferSession, transferAppService } from '../services/transferAppService';

type Candidate = { id: string; first_name: string; last_name: string; team_name: string; photo_url?: string; has_pending?: boolean };
export default function TransferScreen({ navigation, route }: any) {
    const { user, isGuest } = useAuthStore();
    const { isDark } = useThemeStore();
    const colors = getHomeScreenColors(isDark);
    const { t, i18n } = useTranslation();
    const tr = (key: string) => t(`transfer_app.${key}`);
    const actor: TransferActor = user?.role === 'player' ? 'player' : 'captain';
    const subjectId = String(actor === 'captain' ? user?.teamId || user?.team_id || user?.id || user?._id || '' : user?.id || user?._id || '');
    const [session, setSession] = useState<TransferSession | null>(() => getTransferSession(actor, subjectId));
    const [restoringSession, setRestoringSession] = useState(true);
    const [focusEpoch, setFocusEpoch] = useState(0);
    useFocusEffect(useCallback(() => { setFocusEpoch(value => value + 1); }, []));
    const [direction, setDirection] = useState<TransferDirection>('all');
    const [items, setItems] = useState<AppTransfer[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [writeUncertain, setWriteUncertain] = useState(false);
    const [newRequest, setNewRequest] = useState(false);
    const [windowOpen, setWindowOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [candidateCursor, setCandidateCursor] = useState<string | null>(null);
    const [candidateLoading, setCandidateLoading] = useState(false);
    const [selected, setSelected] = useState<Candidate | null>(null);
    const [reason, setReason] = useState('');
    const [focusedId, setFocusedId] = useState<string | undefined>(route?.params?.transferId);
    const generation = useRef(0);
    const listAbort = useRef<AbortController | null>(null);
    const candidateGeneration = useRef(0);
    const operation = useRef(false);
    const mounted = useRef(true);
    const identity = `${actor}:${subjectId}`;
    const identityRef = useRef(identity);
    identityRef.current = identity;
    const isCurrentAccount = () => mounted.current && identityRef.current === identity;
    const surface = { backgroundColor: isDark ? '#141414' : colors.surface, borderColor: colors.border };
    const fail = useCallback((e: unknown) => {
        if (!isCurrentAccount()) return;
        const status = e instanceof TransferApiError ? e.status : 0;
        if (status === 401 && session) { clearTransferSession(session); void revokeTransferLoginSession(session).catch(() => undefined); setSession(null); }
        setError(t(`transfer_app.error_${[0,400,401,403,404,409,429].includes(status) ? status : 500}`));
    }, [session, t, identity]);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; generation.current++; candidateGeneration.current++; listAbort.current?.abort(); };
    }, []);
    useEffect(() => {
        generation.current++; listAbort.current?.abort();
        setSession(getTransferSession(actor, subjectId)); setItems([]); setCursor(null); setError(''); setNotice('');
        setNewRequest(false); setSelected(null); setWindowOpen(false);
        setCandidates([]); setCandidateCursor(null); setQuery(''); setReason('');
        setWriteUncertain(false); setRestoringSession(true);
        let active = true;
        restoreTransferLoginSession(actor, subjectId).then(value => {
            if (active && isCurrentAccount()) setSession(value);
        }).catch(() => {
            if (active && isCurrentAccount()) setSession(null);
        }).finally(() => { if (active && isCurrentAccount()) setRestoringSession(false); });
        return () => { active = false; };
    }, [actor, subjectId, focusEpoch]);
    useEffect(() => { setFocusedId(route?.params?.transferId); }, [route?.params?.transferId]);

    const load = useCallback(async (after: string | null = null) => {
        if (!session || session.subjectId !== subjectId || session.actor !== actor) return;
        const epoch = ++generation.current;
        listAbort.current?.abort(); const controller = new AbortController(); listAbort.current = controller;
        setLoading(true); setError('');
        try {
            const data = await transferAppService.page(session, direction, after, focusedId, controller.signal);
            if (!isCurrentAccount() || epoch !== generation.current) return;
            setItems(previous => after ? [...previous, ...data.items.filter(item => !previous.some(existing => existing.id === item.id))] : data.items);
            setCursor(data.next_cursor);
            if (!after) setWriteUncertain(false);
            if (actor === 'captain') setWindowOpen(data.transfer_window_open === true);
        } catch (e) { if (epoch === generation.current && !controller.signal.aborted) fail(e); }
        finally { if (isCurrentAccount() && epoch === generation.current) setLoading(false); }
    }, [session, direction, focusedId, fail]);
    useEffect(() => { void load(); return () => { generation.current++; listAbort.current?.abort(); }; }, [load]);

    const findPlayers = useCallback(async (after: string | null, signal?: AbortSignal) => {
        if (!session) return;
        const epoch = ++candidateGeneration.current; setCandidateLoading(true);
        try {
            const data = await transferAppService.captainPage(session, 'players', query.trim(), after, signal);
            if (!isCurrentAccount() || epoch !== candidateGeneration.current || signal?.aborted) return;
            setCandidates(previous => after ? [...previous, ...data.items.filter((item: Candidate) => !previous.some(existing => existing.id === item.id))] : data.items);
            setCandidateCursor(data.next_cursor);
        } catch (e) { if (epoch === candidateGeneration.current && !signal?.aborted) fail(e); }
        finally { if (isCurrentAccount() && epoch === candidateGeneration.current) setCandidateLoading(false); }
    }, [session, query, fail]);
    useEffect(() => {
        if (!newRequest) return;
        const controller = new AbortController();
        candidateGeneration.current++; setCandidates([]); setCandidateCursor(null);
        const timer = setTimeout(() => void findPlayers(null, controller.signal), 400);
        return () => { clearTimeout(timer); controller.abort(); candidateGeneration.current++; };
    }, [newRequest, findPlayers]);

    const run = async (action: () => Promise<void>, writing = false) => {
        if (operation.current) return;
        operation.current = true; setBusy(true); setError(''); setNotice('');
        try { await action(); } catch (e) {
            if (writing && isCurrentAccount() && e instanceof TransferApiError && e.status === 0) setWriteUncertain(true);
            fail(e);
        }
        finally { operation.current = false; if (mounted.current) setBusy(false); }
    };
    const decide = (item: AppTransfer, decision: TransferDecision) => {
        Alert.alert(tr(decision === 'approved' ? 'approve' : 'reject'), tr('decision_confirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: tr('confirm'), style: decision === 'rejected' ? 'destructive' : 'default', onPress: () => void run(async () => {
                if (!session) return;
                await transferAppService.decide(session, item, decision);
                if (!isCurrentAccount()) return;
                setNotice(tr('decision_saved')); await load();
            }, true) },
        ]);
    };
    const button = (label: string, action: () => void, disabled = false, accent = false) => <Pressable
        accessibilityRole="button" disabled={disabled} onPress={action}
        style={[styles.button, { backgroundColor: accent ? colors.accent : surface.backgroundColor, borderColor: colors.border, opacity: disabled ? 0.45 : 1 }]}>
        <Text style={{ color: accent ? '#FFFFFF' : colors.textPrimary, fontWeight: '700' }}>{label}</Text>
    </Pressable>;
    const inputStyle = [styles.input, surface, { color: colors.textPrimary }];
    const renderTransfer = ({ item }: { item: AppTransfer }) => {
        const ownDecision = item.consents.find(consent => consent.party === item.actor_party);
        const allApproved = ['player','old_team','new_team'].every(party => item.consents.some(consent => consent.party === party && consent.decision === 'approved'));
        const rejected = item.consents.some(consent => consent.decision === 'rejected');
        return <View style={[styles.card, surface]}>
            <View style={styles.row}>
                <SmartImage uri={item.player_photo} style={styles.avatar} contentFit="cover" fallbackIcon="person-outline" />
                <View style={styles.flex}><Text style={[styles.title, { color: colors.textPrimary }]}>{item.player_name}</Text>
                    <Text style={{ color: colors.textSecondary }}>{new Date(item.created_at).toLocaleDateString(i18n.language)}</Text></View>
                <Text style={{ color: item.status === 'rejected' ? '#EF4444' : colors.accent, fontSize: 12, fontWeight: '700' }}>{tr(`status_${item.status}`)}</Text>
            </View>
            <View style={[styles.row, { marginVertical: 14 }]}>
                <SmartImage uri={item.old_team_logo} style={styles.teamLogo} contentFit="contain" fallbackIcon="shield-outline" />
                <Text style={[styles.flex, { color: colors.textPrimary }]}>{item.old_team_name}</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.textSecondary} />
                <Text style={[styles.flex, { color: colors.textPrimary, textAlign: 'right' }]}>{item.new_team_name}</Text>
                <SmartImage uri={item.new_team_logo} style={styles.teamLogo} contentFit="contain" fallbackIcon="shield-outline" />
            </View>
            <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>{item.reason}</Text>
            {(['player','old_team','new_team'] as const).map(party => {
                const consent = item.consents.find(value => value.party === party);
                return <View key={party} style={[styles.row, { paddingVertical: 5 }]}>
                    <Text style={[styles.flex, { color: colors.textSecondary }]}>{tr(`party_${party}`)}</Text>
                    <Text style={{ color: consent?.decision === 'rejected' ? '#EF4444' : consent ? colors.accent : colors.textSecondary }}>{tr(`status_${consent?.decision || 'pending'}`)}</Text>
                </View>;
            })}
            {item.status === 'pending' && <Text style={{ color: colors.textSecondary, marginTop: 10 }}>{tr(rejected ? 'party_rejected' : allApproved ? 'awaiting_admin' : 'awaiting_parties')}</Text>}
            {item.status === 'pending' && !ownDecision && !rejected && <View style={[styles.row, { marginTop: 14 }]}>
                <View style={styles.flex}>{button(tr('reject'), () => decide(item, 'rejected'), busy || writeUncertain)}</View>
                <View style={styles.flex}>{button(tr('approve'), () => decide(item, 'approved'), busy || writeUncertain, true)}</View>
            </View>}
        </View>;
    };
    return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => navigation.goBack()} style={styles.back}>
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} /></Pressable>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>{tr('title')}</Text>
        </View>
        {error ? <View style={styles.message}><Text style={{ color: '#EF4444' }}>{error}</Text>{session && button(t('common.retry'), () => void load(), loading || busy)}</View> : null}
        {notice ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: colors.textSecondary }]}>{notice}</Text> : null}
        {isGuest || !subjectId ? <Text style={[styles.message, { color: colors.textSecondary }]}>{tr('sign_in')}</Text> : restoringSession ? <ActivityIndicator style={styles.message} color={colors.accent} /> : !session ? <View style={styles.content}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{tr('session_required')}</Text>
            <Text style={{ color: colors.textSecondary, marginVertical: 12 }}>{tr('session_description')}</Text>
            {button(tr('sign_in_again'), () => navigation.navigate('Welcome', { transferReentry: true, phone: user?.phone || user?.phoneNumber || user?.phone_number || user?.tel || user?.captain_phone || '' }), false, true)}
        </View> : newRequest ? <FlatList data={candidates} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
            ListHeaderComponent={<View>
                {button(t('common.back'), () => { setNewRequest(false); setSelected(null); setReason(''); }, busy)}
                <Text style={[styles.title, { color: colors.textPrimary, marginVertical: 12 }]}>{tr('new_request')}</Text>
                <TextInput value={query} onChangeText={setQuery} placeholder={tr('search_player')} placeholderTextColor={colors.textSecondary} style={inputStyle} maxLength={80} />
                {selected && <View style={[styles.card, surface]}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>{selected.first_name} {selected.last_name}</Text>
                    <Text style={{ color: colors.textSecondary }}>{selected.team_name}</Text>
                    <TextInput value={reason} onChangeText={setReason} multiline maxLength={1000} placeholder={tr('reason')}
                        placeholderTextColor={colors.textSecondary} style={[inputStyle, { minHeight: 80, marginVertical: 12 }]} />
                    {button(tr('send_request'), () => Alert.alert(tr('new_request'), tr('request_confirm'), [
                        { text: t('common.cancel'), style: 'cancel' }, { text: tr('confirm'), onPress: () => void run(async () => {
                            await transferAppService.request(session, selected.id, reason);
                            if (!isCurrentAccount()) return;
                            setNewRequest(false); setSelected(null); setReason(''); setNotice(tr('request_sent')); await load();
                        }, true) },
                    ]), busy || writeUncertain || !reason.trim() || !windowOpen, true)}
                </View>}
            </View>}
            renderItem={({ item }) => <Pressable disabled={busy || item.has_pending} onPress={() => setSelected(item)} style={[styles.card, surface, { opacity: item.has_pending ? 0.5 : 1 }]}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{item.first_name} {item.last_name}</Text>
                <Text style={{ color: colors.textSecondary }}>{item.team_name}{item.has_pending ? ` · ${tr('existing_request')}` : ''}</Text>
            </Pressable>}
            ListEmptyComponent={!candidateLoading ? <Text style={{ color: colors.textSecondary }}>{tr('no_players')}</Text> : null}
            ListFooterComponent={candidateLoading ? <ActivityIndicator color={colors.accent} /> : candidateCursor ? button(t('common.show_more'), () => void findPlayers(candidateCursor), busy) : null} /> : <FlatList
                data={items} keyExtractor={item => item.id} renderItem={renderTransfer} contentContainerStyle={styles.content}
                refreshing={loading && !cursor} onRefresh={() => void load()}
                ListHeaderComponent={<View>
                    {focusedId && button(tr('all_requests'), () => setFocusedId(undefined))}
                    {actor === 'captain' && <>
                        <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>{tr(windowOpen ? 'window_open' : 'window_closed')}</Text>
                        {button(tr('new_request'), () => { setDirection('incoming'); setFocusedId(undefined); setNewRequest(true); setError(''); }, !windowOpen || busy || writeUncertain, true)}
                        <View style={[styles.row, { marginVertical: 14 }]}>{(['all','incoming','outgoing'] as const).map(value => <Pressable key={value}
                            onPress={() => { setDirection(value); setFocusedId(undefined); }} style={[styles.tab, { borderBottomColor: direction === value ? colors.accent : 'transparent' }]}>
                            <Text style={{ color: direction === value ? colors.accent : colors.textSecondary }}>{tr(value)}</Text></Pressable>)}</View>
                    </>}
                </View>}
                ListEmptyComponent={!loading && !error ? <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 30 }}>{tr('empty')}</Text> : null}
                ListFooterComponent={loading ? <ActivityIndicator color={colors.accent} /> : cursor ? button(t('common.show_more'), () => void load(cursor), busy) : null} />}
    </SafeAreaView>;
}
const styles = StyleSheet.create({
    container: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1 },
    back: { width: 44, height: 52, justifyContent: 'center' }, heading: { fontSize: 20, fontWeight: '700' },
    content: { padding: 16, gap: 12, paddingBottom: 40 }, message: { padding: 16, gap: 10 }, flex: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, title: { fontSize: 15, fontWeight: '700' },
    card: { padding: 14, borderWidth: 1, borderRadius: Platform.OS === 'android' ? 12 : 16, marginBottom: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20 }, teamLogo: { width: 24, height: 24 },
    button: { minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
        borderRadius: Platform.OS === 'android' ? 8 : 12, marginVertical: 4 },
    input: { borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 48, marginBottom: 10 },
    tab: { flex: 1, alignItems: 'center', minHeight: 44, justifyContent: 'center', borderBottomWidth: 2 },
});

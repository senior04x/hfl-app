import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Updates from 'expo-updates';
import Colors from '../constants/Colors';
import { useThemeStore } from '../store/useThemeStore';
import { createOtaUpdateActions } from '../services/otaUpdateActions';

const FOREGROUND_CHECK_INTERVAL = 30 * 60 * 1000;

export default function AppUpdateBanner() {
    // OTA APIs reject in Expo Go/debug builds. Keep those environments quiet.
    if (Platform.OS === 'web' || __DEV__ || !Updates.isEnabled) return null;
    return <ReleaseUpdateBanner />;
}

function ReleaseUpdateBanner() {
    const update = Updates.useUpdates();
    const snapshot = useRef(update);
    snapshot.current = update;
    const actions = useRef(createOtaUpdateActions(Updates)).current;
    const lastCheck = useRef(Date.now());
    const applying = useRef(false);
    const mounted = useRef(true);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    const insets = useSafeAreaInsets();
    const colors = useThemeStore(state => state.colors);
    const { t } = useTranslation();

    useEffect(() => {
        mounted.current = true;
        let previousState = AppState.currentState;
        const listener = AppState.addEventListener('change', next => {
            const foregrounded = next === 'active' && previousState !== 'active';
            previousState = next;
            const current = snapshot.current;
            const latestCheck = Math.max(lastCheck.current, current.lastCheckForUpdateTimeSinceRestart?.getTime() || 0);
            if (!foregrounded || Date.now() - latestCheck < FOREGROUND_CHECK_INTERVAL
                || current.isStartupProcedureRunning || current.isChecking || current.isDownloading
                || current.isRestarting || current.isUpdatePending || applying.current) return;
            lastCheck.current = Date.now();
            // Offline check failures should never block normal app use.
            actions.check().catch(() => {});
        });
        return () => { mounted.current = false; listener.remove(); };
    }, [actions]);

    const apply = async () => {
        const current = snapshot.current;
        if (applying.current || current.isChecking || current.isDownloading || current.isRestarting) return;
        applying.current = true;
        setBusy(true);
        setFailed(false);
        try {
            await actions.apply(current.isUpdatePending);
            // Keep the button locked while the native reload is dispatched.
        } catch {
            applying.current = false;
            if (mounted.current) { setBusy(false); setFailed(true); }
        }
    };

    if (!update.isUpdateAvailable && !update.isUpdatePending && !failed) return null;
    const disabled = busy || update.isChecking || update.isDownloading || update.isRestarting;
    const error = failed || (!update.isUpdatePending && Boolean(update.downloadError));
    const label = disabled
        ? t('app_update.loading', 'Yangilanmoqda…')
        : error ? t('app_update.retry', 'Qayta urinish')
        : t('app_update.action', 'Ilovani yangilash');

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12), paddingLeft: Math.max(insets.left, 16), paddingRight: Math.max(insets.right, 16) }]}>
            <View style={styles.content}>
                <Ionicons name="cloud-download-outline" size={22} color={Colors.primary} />
                <View style={styles.copy} accessibilityLiveRegion="polite">
                    <Text style={[styles.title, { color: colors.text }]}>{t('app_update.title', 'Yangi versiya mavjud')}</Text>
                    <Text style={[styles.description, { color: colors.textMuted }]}>
                        {error ? t('app_update.error', 'Yangilab bo‘lmadi. Internetni tekshirib, qayta urining.')
                            : update.isUpdatePending ? t('app_update.ready', 'Yangilanish tayyor. Ilova qayta ochiladi.')
                            : t('app_update.description', 'Yangilash uchun quyidagi tugmani bosing.')}
                    </Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, busy: disabled }}
                    disabled={disabled} onPress={apply} android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                    style={({ pressed }) => [styles.button, { backgroundColor: pressed ? Colors.primaryDark : Colors.primary, opacity: disabled ? 0.75 : 1 }]}>
                    {disabled && <ActivityIndicator size="small" color="#FFFFFF" />}
                    <Text style={styles.buttonText}>{label}</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { borderTopWidth: 1, paddingTop: 12 },
    content: { width: '100%', maxWidth: 560, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
    copy: { flex: 1, minWidth: 180 },
    title: { fontSize: 14, fontWeight: '700' },
    description: { fontSize: 12, marginTop: 3, lineHeight: 17 },
    button: { width: '100%', minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderRadius: Platform.OS === 'android' ? 8 : 12, overflow: 'hidden' },
    buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});

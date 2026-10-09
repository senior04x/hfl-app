import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/useThemeStore';
import { useSpectatorBrowseStore } from '../store/useSpectatorBrowseStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { loadSpectatorOrganizations } from '../services/spectatorBrowseService';
export default function SpectatorOrganizationPicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    const { isDark } = useThemeStore();
    const colors = getHomeScreenColors(isDark);
    const { selectOrganization } = useSpectatorBrowseStore();
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [orgLoading, setOrgLoading] = useState(false);
    const [orgError, setOrgError] = useState(false);
    const [orgHasMore, setOrgHasMore] = useState(false);
    const orgCursor = useRef<number | null | false>(null);
    const orgBusy = useRef(false);
    const orgRetryAppend = useRef(false);
    const orgGeneration = useRef(0);

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
        if (visible) void loadOrganizations();
        return () => { orgGeneration.current += 1; orgBusy.current = false; };
    }, [visible, loadOrganizations]);

    const surface = { backgroundColor: isDark ? '#141414' : '#FFFFFF', borderColor: colors.border };
    const text = { color: colors.textPrimary };
    const allLabel = t('common.all_organizations', 'Barcha tashkilotlar');
    const button = (label: string, action: () => void, disabled = false) => (
        <Pressable accessibilityRole="button" disabled={disabled} onPress={action}
            android_ripple={{ color: 'rgba(232,80,2,0.15)' }} style={[styles.button, { borderColor: colors.border }]}>
            <Text style={[styles.buttonText, text]}>{label}</Text>
        </Pressable>
    );

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={() => onClose()}>
            <View style={styles.overlay}><SafeAreaView style={[styles.sheet, { backgroundColor: colors.background }]}>
                <View style={styles.sheetHeader}><Text style={[styles.name, text]}>{t('common.select_organization', 'Tashkilotni tanlang')}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel={t('common.close', 'Yopish')} style={styles.close} onPress={() => onClose()}>
                        <Ionicons name="close" size={24} color={colors.textPrimary} />
                    </Pressable>
                </View>
                {button(allLabel, () => { selectOrganization(null); onClose(); })}
                <FlatList data={organizations} keyExtractor={item => String(item.id)}
                    renderItem={({ item }) => button(item.name, () => { selectOrganization({ id: Number(item.id), name: item.name }); onClose(); })}
                    ListFooterComponent={<View>{orgError && button(t('common.retry', 'Qayta urinish'), () => { void loadOrganizations(orgRetryAppend.current); })}
                        {orgLoading ? <ActivityIndicator style={styles.loader} color={colors.accent} />
                            : orgHasMore && !orgError ? button(t('common.load_more', 'Ko‘proq ko‘rsatish'), () => { void loadOrganizations(true); }) : null}</View>} />
            </SafeAreaView></View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    name: { fontSize: 17, fontWeight: '700' },
    button: { minHeight: 48, justifyContent: 'center', padding: 14, borderWidth: 1,
        borderRadius: Platform.OS === 'ios' ? 12 : 8, marginVertical: 5, overflow: 'hidden' },
    buttonText: { fontSize: 15, fontWeight: '600' }, loader: { margin: 20 },
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: { height: '70%', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    close: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
});

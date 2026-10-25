import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../store/useThemeStore';
import type { PublicOrganization } from '../store/usePublicOrganizationStore';
import { organizationPage } from '../services/organizationBrowse';

type Row = Awaited<ReturnType<typeof organizationPage>>['rows'][number];

// A full-screen choice: there is no dismiss action or implicit organization.
export default function PublicOrganizationPicker({ onSelect }: {
    onSelect: (organization: PublicOrganization) => void;
}) {
    const { isDark } = useThemeStore();
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [more, setMore] = useState(true);
    const [failed, setFailed] = useState(false);
    const page = useRef(0);
    const busy = useRef(false);
    const mounted = useRef(false);
    const colors = {
        background: isDark ? '#000000' : '#FFFFFF',
        surface: isDark ? '#141414' : '#F5F5F5',
        text: isDark ? '#FFFFFF' : '#151515',
        secondary: isDark ? '#A7A7A7' : '#646464',
    };

    async function load() {
        if (busy.current) return;
        busy.current = true;
        setLoading(true);
        setFailed(false);
        try {
            const result = await organizationPage(page.current);
            if (!mounted.current) return;
            setRows(previous => {
                const unique = new Map(previous.map(row => [row.id, row]));
                result.rows.forEach(row => unique.set(row.id, row));
                return [...unique.values()];
            });
            page.current += 1;
            setMore(result.more);
        } catch {
            if (mounted.current) setFailed(true);
        } finally {
            busy.current = false;
            if (mounted.current) setLoading(false);
        }
    }

    useEffect(() => {
        mounted.current = true;
        void load();
        return () => { mounted.current = false; };
    }, []);

    return (
        <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
            <Text style={styles.brand}>AMATORA</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Tashkilotni tanlang</Text>
            <Text style={[styles.subtitle, { color: colors.secondary }]}>
                Turnirlar, taqvim va yangiliklar tanlangan tashkilot bo‘yicha ko‘rsatiladi. Keyin Turnirlar sahifasidan almashtira olasiz.
            </Text>
            <FlatList
                data={rows}
                keyExtractor={item => String(item.id)}
                initialNumToRender={12}
                renderItem={({ item }) => (
                    <Pressable accessibilityRole="button" accessibilityLabel={item.name}
                        onPress={() => onSelect({ id: item.id, name: item.name, logoUrl: item.logo_url || undefined })}
                        style={({ pressed }) => [styles.row, { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }]}>
                        {item.logo_url ? <Image source={{ uri: item.logo_url }} style={styles.logo} /> :
                            <View style={styles.logo}><Text style={styles.initial}>{item.name.slice(0, 1)}</Text></View>}
                        <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                        <Text style={styles.arrow}>›</Text>
                    </Pressable>
                )}
                ListEmptyComponent={!loading && !failed ? <Text style={{ color: colors.secondary }}>Hozircha tashkilotlar yo‘q.</Text> : null}
                ListFooterComponent={<View style={styles.footer}>
                    {loading ? <ActivityIndicator color="#E85002" /> : failed ? <>
                        <Text style={{ color: colors.secondary }}>Yuklab bo‘lmadi. Internetni tekshiring.</Text>
                        <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.action}><Text style={styles.actionText}>Qayta urinish</Text></Pressable>
                    </> : more ? <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.action}><Text style={styles.actionText}>Yana ko‘rsatish</Text></Pressable> : null}
                </View>}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, paddingHorizontal: 20 },
    brand: { color: '#E85002', fontSize: 16, fontWeight: '800', marginTop: 20 },
    title: { fontSize: 26, fontWeight: '700', marginTop: 24 },
    subtitle: { fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 24 },
    row: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 10, borderRadius: Platform.OS === 'ios' ? 16 : 12 },
    logo: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#292929' },
    initial: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
    name: { flex: 1, fontSize: 16, fontWeight: '600', marginHorizontal: 14 },
    arrow: { color: '#E85002', fontSize: 28 },
    footer: { paddingVertical: 20, alignItems: 'center', gap: 12 },
    action: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, backgroundColor: '#E85002' },
    actionText: { color: '#FFFFFF', fontWeight: '600' },
});

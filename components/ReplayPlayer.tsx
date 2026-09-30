import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

type Props = { uri: string; enabled?: boolean; autoplay?: boolean; onActivate?: () => void; onPause?: () => void };
export default function ReplayPlayer({ uri, enabled = true, autoplay = false, onActivate, onPause }: Props) {
    const { t } = useTranslation();
    const [attempt, setAttempt] = useState(0);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const ready = useRef(false);
    useEffect(() => {
        ready.current = false;
        setLoading(true);
        setFailed(!uri);
        if (!enabled || !uri) return;
        const timer = setTimeout(() => { if (!ready.current) { setLoading(false); setFailed(true); } }, 25000);
        return () => clearTimeout(timer);
    }, [uri, enabled, attempt]);
    return <View style={styles.box}>
        {enabled && uri ? <Video key={uri + ':' + attempt} source={{ uri }} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.CONTAIN} useNativeControls shouldPlay={autoplay} isLooping={false}
            onLoad={() => { ready.current = true; setLoading(false); setFailed(false); }}
            onError={() => { ready.current = true; setLoading(false); setFailed(true); }}
            onPlaybackStatusUpdate={status => {
                if (!status.isLoaded) { if (status.error) { ready.current = true; setLoading(false); setFailed(true); } return; }
                if (status.didJustFinish) onPause?.();
            }} /> : <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('replays.play_video', 'Videoni ochish')} onPress={onActivate} style={styles.cover}>
                <Ionicons name="play-circle" size={48} color="#E85002" />
                <Text style={styles.text}>{t('replays.play_video', 'Videoni ochish')}</Text>
            </TouchableOpacity>}
        {enabled && loading && !failed && <View pointerEvents="none" style={styles.cover}><ActivityIndicator color="#E85002" /></View>}
        {enabled && failed && <View style={[styles.cover, { backgroundColor: '#141414' }]}>
            <Text style={styles.text}>{t('replays.load_error', 'Video ochilmadi')}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => setAttempt(value => value + 1)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 }}><Text style={{ color: '#E85002', fontWeight: '700' }}>{t('common.retry', 'Qayta urinish')}</Text></TouchableOpacity>
        </View>}
    </View>;
}
const styles = StyleSheet.create({ box: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000000', overflow: 'hidden' }, cover: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', gap: 8 }, text: { color: '#FFFFFF', fontSize: 12 } });

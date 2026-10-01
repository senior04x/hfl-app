import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, AppState, Platform } from 'react-native';
import { resolveAndroidReplay } from '../services/androidReplaySource';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

type Props = { uri: string; posterUri?: string; enabled?: boolean; autoplay?: boolean; onActivate?: () => void; onPause?: () => void };
export default function ReplayPlayer({ uri, posterUri, enabled = true, autoplay = false, onActivate, onPause }: Props) {
    const { t } = useTranslation();
    const videoRef = useRef<Video>(null);
    const [sourceUri, setSourceUri] = useState(Platform.OS === 'android' ? '' : uri);
    const [implementation, setImplementation] = useState<'ExoPlayer' | 'MediaPlayer'>('ExoPlayer');
    const fallbackUsed = useRef(false);
    const generation = useRef(0);
    useEffect(() => {
        const current = ++generation.current;
        fallbackUsed.current = false;
        setImplementation('ExoPlayer');
        setSourceUri(Platform.OS === 'android' ? '' : uri);
        if (Platform.OS === 'android') void resolveAndroidReplay(uri.trim()).then(value => {
            if (generation.current === current) setSourceUri(value);
        });
        return () => { generation.current++; };
    }, [uri]);
    useEffect(() => { setPosterFailed(false); }, [posterUri]);
    const [foreground, setForeground] = useState(AppState.currentState === 'active');
    useEffect(() => { const listener = AppState.addEventListener('change', value => setForeground(value === 'active')); return () => listener.remove(); }, []);
    const [posterFailed, setPosterFailed] = useState(false);
    useEffect(() => {
        if (!enabled) void videoRef.current?.setPositionAsync(1000).catch(() => {});
    }, [enabled]);
    const hasPoster = Boolean(posterUri) && !posterFailed;
    const needsVideo = enabled || !hasPoster;
    const [attempt, setAttempt] = useState(0);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const ready = useRef(false);
    const [failureKind, setFailureKind] = useState<'load_error' | 'format_error' | 'network_error' | 'slow_loading'>('load_error');
    const playbackKey = sourceUri + ':' + implementation + ':' + attempt;
    const activePlayer = useRef(playbackKey);
    activePlayer.current = playbackKey;
    const fail = (error: unknown) => {
        if (activePlayer.current !== playbackKey) return;
        ready.current = true;
        const detail = String(error || '').toLowerCase();
        if (Platform.OS === 'android' && !fallbackUsed.current && /decoder|codec|unsupported|format_supported=no|exoplaybackexception/.test(detail)) {
            fallbackUsed.current = true;
            setImplementation('MediaPlayer');
            setLoading(true); setFailed(false);
            return;
        }
        setFailureKind(/decoder|codec|unsupported|format_supported=no/.test(detail) ? 'format_error' : /network|http|connection|source error|unable to connect/.test(detail) ? 'network_error' : 'load_error');
        setLoading(false);
        setFailed(true);
    };
    useEffect(() => {
        ready.current = false;
        setLoading(true);
        setFailed(!uri);
        if (!needsVideo || !foreground || !sourceUri) return;
        const timer = setTimeout(() => { if (!ready.current) { setLoading(false); setFailureKind('slow_loading'); setFailed(true); } }, 45000);
        return () => clearTimeout(timer);
    }, [uri, sourceUri, implementation, needsVideo, foreground, attempt]);
    return <View style={styles.box}>
        {hasPoster && !enabled && <Image source={{ uri: posterUri }} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setPosterFailed(true)} />}
        {foreground && needsVideo && sourceUri && <Video ref={videoRef} key={playbackKey} source={{ uri: sourceUri }} status={{ androidImplementation: implementation }} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.CONTAIN} useNativeControls={enabled} shouldPlay={enabled && autoplay} positionMillis={enabled ? 0 : 1000} isMuted={!enabled} isLooping={false}
            onLoad={() => { if (activePlayer.current !== playbackKey) return; ready.current = true; setLoading(false); setFailed(false); }}
            onError={fail}
            onPlaybackStatusUpdate={status => {
                if (activePlayer.current !== playbackKey) return;
                if (!status.isLoaded) { if (status.error) fail(status.error); return; }
                if (status.didJustFinish) onPause?.();
            }} />}
        {!enabled && <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('replays.play_video', 'Videoni ochish')} onPress={onActivate} style={[styles.cover, { backgroundColor: 'rgba(0,0,0,0.15)' }]}>
                <Ionicons name="play-circle" size={48} color="#E85002" />
                <Text style={styles.text}>{t('replays.play_video', 'Videoni ochish')}</Text>
            </TouchableOpacity>}
        {needsVideo && loading && !failed && <View pointerEvents="none" style={styles.cover}><ActivityIndicator color="#E85002" /></View>}
        {enabled && failed && <View style={[styles.cover, { backgroundColor: '#141414' }]}>
            <Text style={styles.text}>{t('replays.' + failureKind, 'Video ochilmadi')}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => setAttempt(value => value + 1)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 }}><Text style={{ color: '#E85002', fontWeight: '700' }}>{t('common.retry', 'Qayta urinish')}</Text></TouchableOpacity>
        </View>}
    </View>;
}
const styles = StyleSheet.create({ box: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000000', overflow: 'hidden' }, cover: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', gap: 8 }, text: { color: '#FFFFFF', fontSize: 12 } });

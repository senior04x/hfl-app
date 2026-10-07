import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, AppState, Platform } from 'react-native';
import { resolveAndroidReplay } from '../services/androidReplaySource';
import PlaybackVideo, { type PlaybackVideoHandle } from './PlaybackVideo';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useIsFocused } from '@react-navigation/native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import { acquireReplayPreview } from '../services/replayPreviewQueue';

const previews = new Map<string, string>();
function rememberPreview(key: string, image: string) {
    const previous = previews.get(key);
    if (previous && previous !== image) releaseCapture(previous);
    previews.set(key, image);
    if (previews.size > 64) {
        const oldest = previews.keys().next().value!;
        releaseCapture(previews.get(oldest)!);
        previews.delete(oldest);
    }
}

type Props = { uri: string; posterUri?: string; visible?: boolean; enabled?: boolean; autoplay?: boolean; onActivate?: () => void; onPause?: () => void };
export default function ReplayPlayer({ uri, posterUri, visible = true, enabled = true, autoplay = false, onActivate, onPause }: Props) {
    const { t } = useTranslation();
    const routeFocused = useIsFocused();
    const focused = routeFocused && visible;
    const videoRef = useRef<PlaybackVideoHandle>(null);
    const captureView = useRef<View>(null);
    const [preview, setPreview] = useState({ key: uri, image: previews.get(uri) });
    const [previewAllowed, setPreviewAllowed] = useState(false);
    const [previewFailed, setPreviewFailed] = useState(false);
    const capturing = useRef(false);
    const firstFrame = useRef(false);
    const frameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [sourceUri, setSourceUri] = useState(Platform.OS === 'android' ? '' : uri);
    const generation = useRef(0);
    useEffect(() => {
        const current = ++generation.current;
        setPreviewFailed(false);
        setPreview({ key: uri, image: previews.get(uri) });
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
        if (!enabled) videoRef.current?.seek(1);
    }, [enabled]);
    const imageUri = (!posterFailed && posterUri) || (preview.key === uri ? preview.image : undefined);
    const hasPoster = Boolean(imageUri);
    useEffect(() => {
        if (Platform.OS !== 'android' || !focused || !foreground || enabled || hasPoster || previewFailed) return;
        const release = acquireReplayPreview(() => setPreviewAllowed(true));
        return () => { setPreviewAllowed(false); release(); };
    }, [focused, foreground, enabled, hasPoster, previewFailed]);
    const needsVideo = focused && (enabled || (!hasPoster && (Platform.OS !== 'android' || previewAllowed)));
    const [attempt, setAttempt] = useState(0);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const ready = useRef(false);
    const [failureKind, setFailureKind] = useState<'load_error' | 'format_error' | 'network_error' | 'slow_loading'>('load_error');
    const playbackKey = sourceUri + ':' + attempt + ':' + enabled + ':' + focused + ':' + foreground;
    const activePlayer = useRef(playbackKey);
    activePlayer.current = playbackKey;
    const fail = (error: unknown) => {
        if (activePlayer.current !== playbackKey) return;
        if (!enabled && Platform.OS === 'android') { setPreviewFailed(true); setLoading(false); return; }
        ready.current = true;
        const detail = String(error || '').toLowerCase();
        setFailureKind(/decoder|codec|unsupported|format_supported=no/.test(detail) ? 'format_error' : /network|http|connection|source error|unable to connect/.test(detail) ? 'network_error' : 'load_error');
        setLoading(false);
        setFailed(true);
    };
    useEffect(() => {
        ready.current = false;
        firstFrame.current = false;
        capturing.current = false;
        if (frameTimer.current) { clearTimeout(frameTimer.current); frameTimer.current = null; }
        setLoading(true);
        setFailed(!uri);
        if (!needsVideo || !foreground || !sourceUri) return;
        const timer = setTimeout(() => { if (!ready.current) { setLoading(false); setFailureKind('slow_loading'); setFailed(true); } }, 45000);
        return () => { clearTimeout(timer); if (frameTimer.current) { clearTimeout(frameTimer.current); frameTimer.current = null; } };
    }, [uri, sourceUri, needsVideo, foreground, attempt, enabled]);
    const startFrameWatchdog = () => {
        if (Platform.OS !== 'android' || firstFrame.current || frameTimer.current) return;
        frameTimer.current = setTimeout(() => {
            frameTimer.current = null;
            if (!firstFrame.current && activePlayer.current === playbackKey) fail('decoder produced no video frame');
        }, 8000);
    };
    return <View style={styles.box}>
        {hasPoster && !enabled && <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => {
            if (imageUri === posterUri) setPosterFailed(true);
            else { previews.delete(uri); setPreview({ key: uri, image: undefined }); setPreviewFailed(true); }
        }} />}
        {foreground && needsVideo && sourceUri && <View ref={captureView} collapsable={false} style={StyleSheet.absoluteFill}><PlaybackVideo ref={videoRef} key={playbackKey} uri={sourceUri.trim()} style={StyleSheet.absoluteFill} controls={enabled} playing={enabled && autoplay} startSeconds={enabled ? 0 : 1} muted={!enabled}
            onLoad={() => { if (activePlayer.current !== playbackKey) return; ready.current = true; setLoading(false); setFailed(false); if (!enabled) startFrameWatchdog(); }}
            onFirstFrame={() => {
                if (activePlayer.current !== playbackKey) return;
                firstFrame.current = true;
                if (frameTimer.current) { clearTimeout(frameTimer.current); frameTimer.current = null; }
                if (Platform.OS !== 'android' || enabled || capturing.current || hasPoster) return;
                capturing.current = true;
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    if (activePlayer.current !== playbackKey || !captureView.current) return;
                    void captureRef(captureView, { format: 'jpg', quality: 0.75, width: 640, height: 360, result: 'tmpfile' }).then(image => {
                        if (activePlayer.current !== playbackKey) { releaseCapture(image); return; }
                        rememberPreview(uri, image);
                        setPreview({ key: uri, image });
                    }).catch(() => { if (activePlayer.current === playbackKey) setPreviewFailed(true); });
                }));
            }}
            onError={fail}
            onStatus={status => {
                if (activePlayer.current !== playbackKey) return;
                if (!status.isLoaded) return;
                if (status.isPlaying) startFrameWatchdog();
                if (status.didJustFinish) onPause?.();
            }} /></View>}
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
const styles = StyleSheet.create({ box: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000000', overflow: 'hidden' }, cover: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', gap: 8 }, text: { color: '#FFFFFF', fontSize: 12 } });

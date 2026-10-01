import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/useThemeStore';

const KEY = '@amatora_rating_prompt_v1';
const MONTH = 30 * 24 * 60 * 60 * 1000;
const STORE = 'https://play.google.com/store/apps/details?id=com.amatora.mobile';

export default function AppRatingPrompt({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const { colors } = useThemeStore();
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [face, setFace] = useState(3);
  const [error, setError] = useState(false);
  const [opening, setOpening] = useState(false);
  const faceRef = useRef(3);
  const reduced = useRef(false);
  const storage = useRef({ visits: 0, next: 0, done: false });

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;
    let disposed = false;
    const hide = AppState.addEventListener('change', state => { if (state !== 'active') setVisible(false); });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { reduced.current = value; }).catch(() => {});
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        const saved = raw ? JSON.parse(raw) : {};
        if (disposed) return;
        storage.current = { visits: (Number(saved.visits) || 0) + 1, next: Number(saved.next) || 0, done: saved.done === true };
        await AsyncStorage.setItem(KEY, JSON.stringify(storage.current));
        if (disposed || storage.current.done || storage.current.visits < 3 || Date.now() < storage.current.next) return;
        if (AppState.currentState === 'active') setVisible(true);
      } catch { /* A persistence failure must not produce repeated prompts. */ }
    })();
    return () => { disposed = true; hide.remove(); setVisible(false); };
  }, [enabled]);

  useEffect(() => {
    const target = rating || 3;
    if (reduced.current) { faceRef.current = target; setFace(target); return; }
    const from = faceRef.current;
    const start = Date.now();
    let frame = 0;
    const animate = () => {
      const progress = Math.min(1, (Date.now() - start) / 280);
      const value = from + (target - from) * (1 - Math.pow(1 - progress, 3));
      faceRef.current = value;
      setFace(value);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [rating]);

  const dismiss = async (done = false) => {
    storage.current = { ...storage.current, next: Date.now() + MONTH, done };
    setVisible(false);
    try { await AsyncStorage.setItem(KEY, JSON.stringify(storage.current)); } catch {}
  };
  const openStore = async () => {
    if (opening) return;
    setOpening(true); setError(false);
    try { await Linking.openURL(STORE); await dismiss(true); }
    catch { setError(true); }
    finally { setOpening(false); }
  };
  const smile = (face - 3) * 9;
  const joy = Math.max(0, face - 3) / 2;
  const browLift = 2 + joy * 3;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { void dismiss(); }} statusBarTranslucent>
    <View style={styles.backdrop}>
      <View accessibilityViewIsModal style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          <Svg width={80} height={80} viewBox="0 0 120 120" accessibilityLabel={t('ratingPrompt.face', { count: rating || 3 })}>
            <Path d="M 29 19 Q 60 10 91 19 Q 105 24 105 43 L 105 77 Q 105 97 88 102 Q 60 110 32 102 Q 15 97 15 77 L 15 43 Q 15 24 29 19 Z" stroke="#E85002" strokeWidth={2.5} opacity={0.28} fill="none"/>
            <Path d={`M 31 40 Q 40 ${40 - browLift} 49 40 M 71 40 Q 80 ${40 - browLift} 89 40`} stroke="#E85002" strokeWidth={3} fill="none" strokeLinecap="round"/>
            <Path d={`M 33 ${54 + joy * 2} Q 40 ${66 - joy * 21} 47 ${54 + joy * 2} M 73 ${54 + joy * 2} Q 80 ${66 - joy * 21} 87 ${54 + joy * 2}`} stroke="#E85002" strokeWidth={3.5} fill="none" strokeLinecap="round"/>
            <Path d={`M 37 80 Q 60 ${80 + smile} 83 80`} stroke="#E85002" strokeWidth={4} fill="none" strokeLinecap="round"/>
          </Svg>
          <Text style={[styles.title, { color: colors.text }]}>{t('ratingPrompt.title')}</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>{t('ratingPrompt.description')}</Text>
          <View style={styles.stars}>{[1, 2, 3, 4, 5].map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={t('ratingPrompt.star', { count: value })} accessibilityState={{ selected: value === rating }} onPress={() => setRating(value)} style={styles.star}><Ionicons name={value <= rating ? 'star' : 'star-outline'} size={34} color="#E85002"/></Pressable>)}</View>
          {error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{t('ratingPrompt.error')}</Text>}
          <Pressable accessibilityRole="button" disabled={opening} onPress={() => { void openStore(); }} style={[styles.button, { opacity: opening ? 0.6 : 1 }]}><Text style={styles.buttonText}>{t('ratingPrompt.store')}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { void dismiss(); }} style={styles.later}><Text style={{ color: colors.textMuted }}>{t('ratingPrompt.later')}</Text></Pressable>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, maxHeight: '85%', borderRadius: Platform.OS === 'android' ? 12 : 20, borderWidth: 1 },
  content: { padding: 24, alignItems: 'center', gap: 16 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  description: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  star: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  button: { width: '100%', minHeight: 48, backgroundColor: '#E85002', borderRadius: 8, alignItems: 'center', justifyContent: 'center', padding: 12 },
  buttonText: { color: '#FFF', fontWeight: '700', textAlign: 'center' },
  later: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 20 },
});

import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
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
  const smile = (face - 3) * 13;
  const eyeHeight = 7 - Math.max(0, face - 3) * 1.8;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { void dismiss(); }} statusBarTranslucent>
    <View style={styles.backdrop}>
      <View accessibilityViewIsModal style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          <Svg width={150} height={150} viewBox="0 0 160 160" accessibilityLabel={t('ratingPrompt.face', { count: rating || 3 })}>
            <Defs><RadialGradient id="ratingFace" cx="35%" cy="25%" r="80%"><Stop offset="0" stopColor="#FFAB70"/><Stop offset="0.6" stopColor="#E85002"/><Stop offset="1" stopColor="#B83D00"/></RadialGradient></Defs>
            <Ellipse cx={80} cy={145} rx={43} ry={6} fill="#000" opacity={0.14}/>
            <Circle cx={80} cy={75} r={61} fill="url(#ratingFace)"/>
            <Path d="M 36 53 Q 46 26 70 24" stroke="#FFF" strokeWidth={5} opacity={0.22} fill="none" strokeLinecap="round"/>
            <Ellipse cx={58} cy={65} rx={5} ry={eyeHeight} fill="#231107"/>
            <Ellipse cx={102} cy={65} rx={5} ry={eyeHeight} fill="#231107"/>
            <Path d={`M 46 ${48 + (3 - face) * 2} Q 58 ${46 - (3 - face) * 3} 67 48 M 93 48 Q 102 ${46 - (3 - face) * 3} 114 ${48 + (3 - face) * 2}`} stroke="#231107" strokeWidth={3} fill="none" strokeLinecap="round"/>
            <Path d={`M 52 98 Q 80 ${98 + smile} 108 98`} stroke="#231107" strokeWidth={5} fill="none" strokeLinecap="round"/>
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

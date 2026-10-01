import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/useThemeStore';

// Temporary visual QA mode: disable before the Play Store release.
const RATING_TEST_MODE = true;
const EMOJIS = ['😞', '🙁', '😐', '🙂', '😄'];
const KEY = '@amatora_rating_prompt_v1';
const MONTH = 30 * 24 * 60 * 60 * 1000;
const STORE = 'https://play.google.com/store/apps/details?id=com.amatora.mobile';

export default function AppRatingPrompt({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const { colors } = useThemeStore();
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [face, setFace] = useState(3);
  const emojiScale = useRef(new Animated.Value(1)).current;
  const emojiOpacity = useRef(new Animated.Value(1)).current;
  const [error, setError] = useState(false);
  const [opening, setOpening] = useState(false);
  const reduced = useRef(false);
  const storage = useRef({ visits: 0, next: 0, done: false });

  useEffect(() => {
    if (!enabled || (Platform.OS !== 'android' && !(RATING_TEST_MODE && Platform.OS === 'ios'))) return;
    let disposed = false;
    const hide = AppState.addEventListener('change', state => {
      if (state !== 'active') setVisible(false);
      else if (RATING_TEST_MODE && !disposed) setVisible(true);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { reduced.current = value; }).catch(() => {});
    if (RATING_TEST_MODE) setVisible(true);
    else void (async () => {
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
    emojiScale.stopAnimation();
    emojiOpacity.stopAnimation();
    if (reduced.current) {
      setFace(target); emojiScale.setValue(1); emojiOpacity.setValue(1); return;
    }
    const exit = Animated.parallel([
      Animated.timing(emojiScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(emojiOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]);
    let enter: Animated.CompositeAnimation | undefined;
    exit.start(({ finished }) => {
      if (!finished) return;
      setFace(target);
      enter = Animated.parallel([
        Animated.spring(emojiScale, { toValue: 1, damping: 14, stiffness: 180, mass: 0.7, useNativeDriver: true }),
        Animated.timing(emojiOpacity, { toValue: 1, duration: 140, useNativeDriver: true }),
      ]);
      enter.start();
    });
    return () => { exit.stop(); enter?.stop(); };
  }, [rating, emojiScale, emojiOpacity]);

  const dismiss = async (done = false) => {
    if (RATING_TEST_MODE) { setVisible(false); return; }
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
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { void dismiss(); }} statusBarTranslucent>
    <View style={styles.backdrop}>
      <View accessibilityViewIsModal style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          <Animated.View style={{ opacity: emojiOpacity, transform: [{ scale: emojiScale }] }}>
            <Text accessibilityLabel={t('ratingPrompt.face', { count: face })} style={styles.emoji}>{EMOJIS[face - 1]}</Text>
          </Animated.View>
          <Text style={[styles.title, { color: colors.text }]}>{t('ratingPrompt.title')}</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>{t('ratingPrompt.description')}</Text>
          <View style={styles.stars}>{[1, 2, 3, 4, 5].map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={t('ratingPrompt.star', { count: value })} accessibilityState={{ selected: value === rating }} onPress={() => setRating(value)} style={styles.star}><Ionicons name={value <= rating ? 'star' : 'star-outline'} size={34} color="#E85002"/></Pressable>)}</View>
          {error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{t('ratingPrompt.error')}</Text>}
          {Platform.OS === 'android' && <Pressable accessibilityRole="button" disabled={opening} onPress={() => { void openStore(); }} style={[styles.button, { opacity: opening ? 0.6 : 1 }]}><Text style={styles.buttonText}>{t('ratingPrompt.store')}</Text></Pressable>}
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
  emoji: { fontSize: 64, lineHeight: 84, textAlign: 'center', paddingHorizontal: 8 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  description: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  star: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  button: { width: '100%', minHeight: 48, backgroundColor: '#E85002', borderRadius: 8, alignItems: 'center', justifyContent: 'center', padding: 12 },
  buttonText: { color: '#FFF', fontWeight: '700', textAlign: 'center' },
  later: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 20 },
});

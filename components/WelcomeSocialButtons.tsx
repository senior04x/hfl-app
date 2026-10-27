import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import AppleSignInButton from './AppleSignInButton';
import GoogleSignInIcon from './GoogleSignInIcon';

type Props = {
 disabled: boolean;
 onApple: () => void;
 onTelegram: () => void;
 // Only display Google once a configured, working sign-in handler is supplied.
 onGoogle?: () => void;
};

export default function WelcomeSocialButtons({ disabled, onApple, onGoogle, onTelegram }: Props) {
 return <View style={styles.row}>
  <AppleSignInButton iconOnly onPress={onApple} disabled={disabled} />
  {onGoogle && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sign in with Google"
   accessibilityState={{ disabled }} disabled={disabled} onPress={onGoogle} activeOpacity={0.75}
   style={[styles.button, disabled && styles.disabled]}>
   <GoogleSignInIcon />
  </TouchableOpacity>}
  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Telegram orqali kirish"
   accessibilityState={{ disabled }} disabled={disabled} onPress={onTelegram} activeOpacity={0.75}
   style={[styles.button, disabled && styles.disabled]}>
   {disabled ? <ActivityIndicator size="small" color="#FFFFFF" /> : <FontAwesome name="telegram" size={22} color="#FFFFFF" />}
  </TouchableOpacity>
 </View>;
}

const styles = StyleSheet.create({
 row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 6, marginBottom: 10 },
 button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
 disabled: { opacity: 0.5 },
});

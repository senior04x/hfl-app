import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppleSignInButton from './AppleSignInButton';
import GoogleSignInIcon from './GoogleSignInIcon';

type Props = {
 disabled: boolean;
 onApple: () => void;
 onGuest: () => void;
 guestLabel: string;
 onTelegram: () => void;
 // Expo Go also receives a handler so the Google icon remains visible for UI preview;
 // the caller explains that OAuth itself requires a development build.
 onGoogle?: () => void;
};

export default function WelcomeSocialButtons({ disabled, onApple, onGuest, guestLabel, onGoogle, onTelegram }: Props) {
 return <View style={styles.row}>
  {Platform.OS === 'ios' ? <AppleSignInButton iconOnly onPress={onApple} disabled={disabled} /> :
   <TouchableOpacity accessibilityRole="button" accessibilityLabel={guestLabel}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onGuest} activeOpacity={0.75}
    style={[styles.button, disabled && styles.disabled]}>
    <MaterialCommunityIcons name="account-eye-outline" size={22} color="#E85002" />
   </TouchableOpacity>}
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

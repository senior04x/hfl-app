import React, { useEffect, useState } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import { getAppleAuthModule } from '../services/nativeAppleAuth';

export default function AppleSignInButton({ onPress, disabled, iconOnly = false }: { onPress: () => void; disabled: boolean; iconOnly?: boolean }) {
 const [available, setAvailable] = useState(false);
 const apple = getAppleAuthModule();
 useEffect(() => {
  let active = true;
  if (apple) apple.isAvailableAsync().then(value => { if (active) setAvailable(value); }).catch(() => undefined);
  return () => { active = false; };
 }, [apple]);
 if (!apple || !available) return null;
 if (iconOnly) return <TouchableOpacity onPress={onPress} disabled={disabled}
  accessibilityRole="button" accessibilityLabel="Sign in with Apple" accessibilityState={{ disabled }}
  activeOpacity={0.75} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}>
  <Image source={require('../assets/auth/apple-signin-glyph.png')} style={{ width: 52, height: 52, transform: [{ translateY: 1 }] }} accessible={false} />
 </TouchableOpacity>;
 const NativeButton = apple.AppleAuthenticationButton;
 return <View pointerEvents={disabled ? 'none' : 'auto'} accessibilityState={{ disabled }}
  style={{ width: '100%', marginTop: 10, opacity: disabled ? 0.5 : 1 }}>
  <NativeButton buttonType={apple.AppleAuthenticationButtonType.SIGN_IN}
   buttonStyle={apple.AppleAuthenticationButtonStyle.WHITE} cornerRadius={12}
   style={{ width: '100%', height: 48 }} onPress={onPress} />
 </View>;
}

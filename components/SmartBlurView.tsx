import React from 'react';
import { StyleSheet, View, Platform, StyleProp, ViewStyle } from 'react-native';
import { BlurView, BlurViewProps } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

export interface SmartBlurViewProps extends BlurViewProps {
  fallbackColor?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

// iOS 26+ da haqiqiy Apple Liquid Glass mavjudmi — bir marta hisoblanadi
const IOS_LIQUID_GLASS_AVAILABLE = Platform.OS === 'ios' && isLiquidGlassAvailable();

/**
 * SmartBlurView — Cross-platform Glassmorphism & Frosted Glass Component
 *
 * - iOS 26+: Native Liquid Glass (expo-glass-effect / UIVisualEffectView, yangi material).
 * - Eski iOS: Apple UIVisualEffectView orqali real-time backdrop blur (avvalgidek).
 * - Android: `dimezisBlurView` (GPU RenderEffect) + tiniq qora fon, hech qanday o'zgarishsiz.
 */
export const SmartBlurView: React.FC<SmartBlurViewProps> = ({
  intensity = 30,
  tint = 'dark',
  style,
  containerStyle,
  fallbackColor,
  children,
  ...props
}) => {
  if (IOS_LIQUID_GLASS_AVAILABLE) {
    return (
      <GlassView
        glassEffectStyle="clear"
        colorScheme={tint === 'light' ? 'light' : 'dark'}
        style={[StyleSheet.absoluteFill, style]}
      >
        {children}
      </GlassView>
    );
  }

  if (Platform.OS === 'android') {
    const defaultAndroidBg = tint === 'light' 
      ? 'rgba(255, 255, 255, 0.85)' 
      : 'rgba(5, 5, 8, 0.78)';

    return (
      <View 
        style={[
          StyleSheet.absoluteFill, 
          { backgroundColor: fallbackColor || defaultAndroidBg }, 
          containerStyle
        ]}
        pointerEvents="none"
      >
        <BlurView
          intensity={intensity}
          tint={tint}
          experimentalBlurMethod="dimezisBlurView"
          style={[StyleSheet.absoluteFill, style]}
          {...props}
        >
          {children}
        </BlurView>
      </View>
    );
  }

  return (
    <BlurView 
      intensity={intensity} 
      tint={tint} 
      style={[StyleSheet.absoluteFill, style]} 
      {...props}
    >
      {children}
    </BlurView>
  );
};

export default SmartBlurView;

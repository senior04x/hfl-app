import React from 'react';
import { StyleSheet, View, Platform, StyleProp, ViewStyle } from 'react-native';
import { BlurView, BlurViewProps } from 'expo-blur';

export interface SmartBlurViewProps extends BlurViewProps {
  fallbackColor?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * SmartBlurView — Cross-platform Glassmorphism & Frosted Glass Component
 * 
 * - On iOS: Utilizes native Apple UIVisualEffectView for real-time backdrop blur.
 * - On Android: Activates native `dimezisBlurView` (GPU RenderEffect) with a premium
 *   dark translucent underlay, ensuring 100% crisp, frosted glass aesthetics without grey artifacts.
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
  if (Platform.OS === 'android') {
    const defaultAndroidBg = tint === 'light' 
      ? 'rgba(255, 255, 255, 0.85)' 
      : 'rgba(15, 23, 42, 0.78)';

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

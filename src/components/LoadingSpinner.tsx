import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../store/useThemeStore';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  style?: any;
}

export function LoadingSpinner({ 
  size = 'md', 
  text = 'Yuklanmoqda...', 
  style 
}: LoadingSpinnerProps) {
  const { colors } = useTheme();
  
  const sizeMap = {
    sm: 'small' as const,
    md: 'large' as const,
    lg: 'large' as const
  };

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator 
        size={sizeMap[size]} 
        color={colors.primary} 
      />
      {text && (
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {text}
        </Text>
      )}
    </View>
  );
}

export function PageLoadingSpinner() {
  return (
    <View style={styles.pageContainer}>
      <LoadingSpinner size="lg" text="Ma'lumotlar yuklanmoqda..." />
    </View>
  );
}

export function InlineLoadingSpinner() {
  return (
    <View style={styles.inlineContainer}>
      <LoadingSpinner size="md" text="Yuklanmoqda..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontSize: 14,
    textAlign: 'center',
  },
  pageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  inlineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
});
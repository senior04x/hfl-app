import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

interface SmartImageProps {
    uri?: string | null;
    style?: any;
    contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
    placeholder?: string; // blurhash or URI
    fallbackIcon?: keyof typeof Ionicons.glyphMap;
    fallbackIconSize?: number;
    borderRadius?: number;
}

/**
 * SmartImage — an optimized image component that:
 * 1. Uses expo-image for disk/memory caching (via `contentFit` and `cachePolicy`)
 * 2. Shows a subtle skeleton placeholder while loading
 * 3. Falls back to an icon if no URI is provided
 * 4. Warns against Base64 usage in dev mode for debugging
 */
export default function SmartImage({
    uri,
    style,
    contentFit = 'cover',
    fallbackIcon = 'image-outline',
    fallbackIconSize = 36,
    borderRadius = 0,
}: SmartImageProps) {

    if (!uri) {
        return (
            <View style={[styles.fallback, style, borderRadius > 0 && { borderRadius }]}>
                <Ionicons name={fallbackIcon} size={fallbackIconSize} color={Colors.textMuted} />
            </View>
        );
    }

    // Convert null to undefined for compatibility with expo-image
    const imageUri = uri || undefined;

    return (
        <Image
            source={{ uri: imageUri }}
            style={[style, borderRadius > 0 && { borderRadius, overflow: 'hidden' }]}
            contentFit={contentFit}
            cachePolicy="memory-disk"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            transition={200}
        />
    );
}

const styles = StyleSheet.create({
    fallback: {
        backgroundColor: Colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

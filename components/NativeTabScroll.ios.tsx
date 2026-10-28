import React, { type ReactElement } from 'react';
import { Platform, StyleSheet, UIManager } from 'react-native';
import { isRunningInExpoGo } from 'expo';

function availableScrollMarker(): typeof import('react-native-screens/experimental').ScrollViewMarker | null {
    // Expo Go's fixed native binary cannot safely mount this experimental view.
    // A matching JS package or iOS version alone does not prove native support.
    if (isRunningInExpoGo() || Number.parseInt(String(Platform.Version), 10) < 26) return null;
    try {
        if (!UIManager.hasViewManagerConfig('RNSScrollViewMarker')) return null;
        return require('react-native-screens/experimental').ScrollViewMarker;
    } catch {
        return null;
    }
}

const ScrollViewMarker = availableScrollMarker();

// Register the vertical list explicitly: headers and nested horizontal sliders
// otherwise prevent UIKit's first-descendant heuristic from finding it.
export default function NativeTabScroll({ children }: { children: ReactElement }) {
    if (!ScrollViewMarker) return children;
    return <ScrollViewMarker style={styles.fill}>{children}</ScrollViewMarker>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });

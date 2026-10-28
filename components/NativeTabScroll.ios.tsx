import React, { type ReactElement } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { ScrollViewMarker } from 'react-native-screens/experimental';

// Register the vertical list explicitly: headers and nested horizontal sliders
// otherwise prevent UIKit's first-descendant heuristic from finding it.
export default function NativeTabScroll({ children }: { children: ReactElement }) {
    if (Number.parseInt(String(Platform.Version), 10) < 26) return children;
    return <ScrollViewMarker style={styles.fill}>{children}</ScrollViewMarker>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });

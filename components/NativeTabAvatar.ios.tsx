import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { captureRef, releaseCapture } from 'react-native-view-shot';

function releasePhoto(uri: string) {
    // Native HostFunction errors can be synchronous, including during unmount.
    try { releaseCapture(uri); } catch { /* The OS will clear the temporary file. */ }
}

// UITabBarItem accepts a bitmap, not a React avatar view. Render a small circular
// bitmap once per photo, preserving its colors and releasing it on account change.
export default function NativeTabAvatar({ uri, onReady }: { uri: string; onReady: (image: string) => void }) {
    const view = useRef<View>(null);
    const started = useRef(false);
    const disposed = useRef(false);
    const file = useRef<string | undefined>(undefined);
    const frame = useRef<number | undefined>(undefined);
    const callback = useRef(onReady);
    callback.current = onReady;
    useEffect(() => {
        disposed.current = false;
        return () => {
            disposed.current = true;
            if (frame.current !== undefined) cancelAnimationFrame(frame.current);
            if (file.current) releasePhoto(file.current);
        };
    }, []);

    const prepare = () => {
        if (started.current || disposed.current) return;
        started.current = true;
        frame.current = requestAnimationFrame(() => {
            frame.current = requestAnimationFrame(async () => {
                if (disposed.current || !view.current) return;
                try {
                    // Await inside try catches both bridge throws and rejected promises.
                    const image = await captureRef(view, { format: 'png', result: 'tmpfile', width: 84, height: 84, useRenderInContext: true });
                    if (disposed.current) { releasePhoto(image); return; }
                    file.current = image;
                    callback.current(image);
                } catch { /* Keep the SF Symbol when the optional photo fails. */ }
            });
        });
    };

    return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.host}>
        <View ref={view} collapsable={false} style={styles.circle}>
            <Image source={{ uri }} style={styles.image} contentFit="cover" cachePolicy="memory-disk"
                transition={0} onDisplay={prepare} />
        </View>
    </View>;
}

const styles = StyleSheet.create({
    host: { position: 'absolute', left: -64, top: 0, width: 28, height: 28 },
    circle: { width: 28, height: 28, borderRadius: 14, overflow: 'hidden', backgroundColor: 'transparent' },
    image: { width: 28, height: 28 },
});

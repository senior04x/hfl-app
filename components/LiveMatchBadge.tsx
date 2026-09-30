import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

export default function LiveMatchBadge() {
    const opacity = useRef(new Animated.Value(1)).current;
    const focused = useIsFocused();
    const [reduceMotion, setReduceMotion] = useState(true);
    useEffect(() => {
        let mounted = true;
        AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); }).catch(() => {});
        const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
        return () => { mounted = false; subscription.remove(); };
    }, []);
    useEffect(() => {
        opacity.setValue(1);
        if (!focused || reduceMotion) return;
        const animation = Animated.loop(Animated.sequence([
            Animated.timing(opacity, { toValue: 0.2, duration: 600, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]));
        animation.start();
        return () => animation.stop();
    }, [focused, reduceMotion, opacity]);
    return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
        <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', opacity }} />
        <Text style={{ fontSize: 9, fontWeight: '800', color: '#EF4444', letterSpacing: 0.4 }}>LIVE</Text>
    </View>;
}

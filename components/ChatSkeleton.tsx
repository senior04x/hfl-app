import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Skeleton from './Skeleton';

const { width, height } = Dimensions.get('window');

const ChatSkeleton = () => {
    return (
        <View style={styles.container}>
            <View style={{ flex: 1 }} />
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <View key={i} style={[styles.messageRow, i % 2 === 0 ? styles.myMessage : styles.otherMessage]}>
                    {i % 2 !== 0 && <Skeleton width={34} height={34} circle style={styles.avatar} />}
                    <View style={[styles.bubbleContainer, i % 2 === 0 ? { borderBottomRightRadius: 4 } : { borderBottomLeftRadius: 4 }]}>
                        <BlurView intensity={20} tint="dark" style={[styles.glassBubble, i % 2 === 0 && styles.myGlassBubble]}>
                            <Skeleton width={i % 3 === 0 ? 150 : 100} height={12} borderRadius={4} style={{ backgroundColor: i % 2 === 0 ? 'rgba(0,223,130,0.2)' : 'rgba(255,255,255,0.1)' }} />
                            <Skeleton width={40} height={8} borderRadius={4} style={{ marginTop: 8, alignSelf: 'flex-end', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                        </BlurView>
                    </View>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { padding: 15, height: height * 0.7, justifyContent: 'flex-end' },
    messageRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-end' },
    myMessage: { justifyContent: 'flex-end' },
    otherMessage: { justifyContent: 'flex-start' },
    avatar: { marginRight: 10, marginBottom: 2 },
    bubbleContainer: { maxWidth: '75%', borderRadius: 18, overflow: 'hidden' },
    glassBubble: { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.05)' },
    myGlassBubble: { backgroundColor: 'rgba(0,223,130,0.15)' }
});

export default ChatSkeleton;

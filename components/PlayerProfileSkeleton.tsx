import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import Skeleton from './Skeleton';

const { width } = Dimensions.get('window');

const PlayerProfileSkeleton = () => {
    return (
        <View style={styles.container}>
            <Video
                source={require('../assets/images/welcomeScreenVideo1.mp4')}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                isMuted
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <View style={styles.profileHeader}>
                        <View style={styles.photoContainer}>
                            <Skeleton width={160} height={160} borderRadius={15} style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
                        </View>
                        <View style={styles.nameContainer}>
                            <View style={styles.badgeRow}>
                                <Skeleton width={100} height={24} borderRadius={12} style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
                                <Skeleton width={60} height={24} borderRadius={12} style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
                            </View>
                            <Skeleton width={180} height={32} borderRadius={8} style={{ marginTop: 15, backgroundColor: "rgba(255,255,255,0.08)" }} />
                            <Skeleton width={130} height={20} borderRadius={8} style={{ marginTop: 10, backgroundColor: "rgba(255,255,255,0.08)" }} />
                        </View>
                    </View>
                </View>

                {/* Content Section */}
                <View style={styles.mainContent}>
                    <View style={styles.statsGrid}>
                        {[1, 2, 3, 4].map((i) => (
                            <View key={i} style={styles.statBoxSkeleton}>
                                <Skeleton width="100%" height={100} borderRadius={20} style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
                            </View>
                        ))}
                    </View>

                    <View style={styles.performanceSection}>
                        <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
                        {[1, 2].map((i) => (
                            <View key={i} style={{ marginBottom: 20 }}>
                                <Skeleton width={150} height={14} borderRadius={4} style={{ marginBottom: 10, backgroundColor: "rgba(255,255,255,0.08)" }} />
                                <Skeleton width="100%" height={8} borderRadius={4} style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
                            </View>
                        ))}
                    </View>

                    <View style={styles.infoSection}>
                        <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
                        <Skeleton width={200} height={24} borderRadius={4} style={{ marginBottom: 20, backgroundColor: "rgba(255,255,255,0.08)" }} />
                        {[1, 2, 3].map((i) => (
                            <View key={i} style={styles.infoRowSkeleton}>
                                <Skeleton width={40} height={40} borderRadius={20} style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Skeleton width="40%" height={12} borderRadius={4} style={{ marginBottom: 6, backgroundColor: "rgba(255,255,255,0.08)" }} />
                                    <Skeleton width="70%" height={16} borderRadius={4} style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    scrollContent: { paddingBottom: 40 },
    heroSection: {
        paddingTop: 60,
        paddingBottom: 30,
        paddingHorizontal: 24,
    },
    profileHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 24 },
    photoContainer: { position: 'relative' },
    nameContainer: { flex: 1 },
    badgeRow: { flexDirection: 'row', gap: 8 },
    mainContent: { padding: 24 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8, marginBottom: 24 },
    statBoxSkeleton: { width: '50%', padding: 8 },
    performanceSection: {
        marginBottom: 32,
        backgroundColor: 'rgba(255,255,255,0.04)',
        padding: 24,
        borderRadius: 25,
        overflow: 'hidden',
    },
    infoSection: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        padding: 24,
        borderRadius: 25,
        overflow: 'hidden',
    },
    infoRowSkeleton: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
});

export default PlayerProfileSkeleton;

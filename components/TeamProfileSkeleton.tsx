import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Skeleton from './Skeleton';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

const { width } = Dimensions.get('window');

// MyTeamScreen / TeamProfileScreen bilan bir xil oq-qora (homeTheme) skelet —
// hero (orqaga/chat/taktika tugmalari + logo-nom-rahbariyat) + info karta +
// tab switcher + tarkib grid — barchasi haqiqiy sahifa bilan bir xil o'lchamda,
// shu bilan yuklanish paytida "sakrash" (layout shift) bo'lmaydi.
const TeamProfileSkeleton = () => {
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);

    const cardSurface = Platform.OS === 'ios'
        ? { backgroundColor: homeColors.background, borderWidth: 1, borderColor: homeColors.border }
        : {
            backgroundColor: homeColors.background,
            elevation: 3,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
        };

    const skeletonColor = { backgroundColor: homeColors.surface };

    return (
        <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: homeColors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
            {/* FIXED HEADER SKELETON */}
            <View style={[styles.headerStickySection, { backgroundColor: homeColors.background, borderBottomColor: homeColors.border }]}>
                {/* TOP ROW: orqaga va harakatlar */}
                <View style={styles.topRow}>
                    <Skeleton width={38} height={38} borderRadius={12} style={skeletonColor} />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Skeleton width={38} height={38} borderRadius={12} style={skeletonColor} />
                        <Skeleton width={38} height={38} borderRadius={12} style={skeletonColor} />
                    </View>
                </View>

                {/* IDENTITY: logo chapda, nom/liga o'ngda */}
                <View style={styles.identityRowSticky}>
                    <Skeleton width={56} height={56} borderRadius={16} style={skeletonColor} />
                    <View style={{ flex: 1, paddingTop: 2, gap: 8 }}>
                        <Skeleton width="65%" height={16} borderRadius={5} style={skeletonColor} />
                        <Skeleton width="40%" height={12} borderRadius={4} style={skeletonColor} />
                    </View>
                </View>

                {/* INFO CARD */}
                <View style={[styles.infoCard, cardSurface]}>
                    <View style={styles.infoTopRow}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} width={26} height={16} borderRadius={4} style={skeletonColor} />
                        ))}
                    </View>
                </View>

                {/* TAB SWITCHER */}
                <View style={styles.switcherWrapper}>
                    <Skeleton width="30%" height={32} borderRadius={10} style={skeletonColor} />
                    <Skeleton width="30%" height={32} borderRadius={10} style={skeletonColor} />
                    <Skeleton width="30%" height={32} borderRadius={10} style={skeletonColor} />
                </View>
            </View>

            {/* SCROLLABLE CONTENT SKELETON */}
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* TARKIB GRID — haqiqiy playerCard bilan bir xil o'lcham */}
                <View style={styles.squadGrid}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <View key={i} style={[styles.playerCard, cardSurface]}>
                            <View style={styles.playerPhotoContainer}>
                                <Skeleton width="100%" height="100%" borderRadius={12} style={skeletonColor} />
                            </View>
                            <View style={styles.playerInfo}>
                                <Skeleton width="75%" height={12} borderRadius={4} style={{ ...skeletonColor, marginBottom: 6 }} />
                                <Skeleton width="50%" height={12} borderRadius={4} style={{ ...skeletonColor, marginBottom: 6 }} />
                                <Skeleton width="40%" height={9} borderRadius={4} style={skeletonColor} />
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerStickySection: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 0,
        borderBottomWidth: 1,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 },
    identityRowSticky: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
    switcherWrapper: { flexDirection: 'row', justifyContent: 'space-between', height: 44, alignItems: 'center' },
    scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 60 },
    infoCard: { borderRadius: 18, padding: 14, marginBottom: 12 },
    infoTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    squadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    playerCard: { width: (width - 44) / 2, borderRadius: 16, padding: 10 },
    playerPhotoContainer: { width: '100%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden' },
    playerInfo: { marginTop: 8 },
});

export default TeamProfileSkeleton;

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, Image, Modal, TouchableWithoutFeedback, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import SmartImage from './SmartImage';
import Skeleton from './Skeleton';
import { formatShortTeamName, formatLocalizedLeagueName } from '../utils/stringUtils';
import { useTranslation } from 'react-i18next';
import { useTabSwipe } from '../context/TabSwipeContext';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.86;
const CARD_SPACING = 12;
const SIDE_PADDING = (screenWidth - CARD_WIDTH) / 2;

const LEAGUE_LOGOS: Record<string, any> = {
    'super': require('../assets/images/super-liga.png'),
    'pro': require('../assets/images/pro-liga.png'),
    '3liga': require('../assets/images/3-liga.png'),
    '7x7': require('../assets/images/7x7-liga.png'),
};

const LEAGUE_BACKGROUNDS: Record<string, any> = {
    'super': require('../assets/images/super-liga.png'),
    'pro': require('../assets/images/pro-liga.png'),
    '3liga': require('../assets/images/3-liga.png'),
    '7x7': require('../assets/images/7x7-liga.png'),
};

const LEAGUE_ACCENTS: Record<string, string> = {
    'super': '#EF4444',
    'pro': '#3B82F6',
    '3liga': '#A855F7',
    '7x7': '#0EA5E9',
};

interface TopPlayer {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string;
    teamName: string;
    teamLogo: string;
    goals: number;
    assists: number;
}

interface LeagueSlideItem {
    id: string;
    leagueName: string;
    theme: [string, string, string];
    topPlayer: TopPlayer | null;
    round: number;
    bgImage?: string | null;
}

interface ApiSliderProps {
    initialItems?: any[];
    externalLoading?: boolean;
}

const ApiSlider: React.FC<ApiSliderProps> = ({ initialItems, externalLoading }) => {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language || 'uz';
    const { setSwipeDisabled } = useTabSwipe();
    const [rawItems, setRawItems] = useState<LeagueSlideItem[]>([]);
    const [infiniteItems, setInfiniteItems] = useState<LeagueSlideItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    const flatListRef = useRef<FlatList>(null);
    const currentIndexRef = useRef(1); // Start at index 1 (cloned real first item)
    const autoSlideTimer = useRef<any>(null);

    // PRELOAD ALL IMAGES ASYNCHRONOUSLY BEFORE HIDING SKELETON
    const preloadAllImagesAsync = async (slideItems: LeagueSlideItem[]) => {
        if (!slideItems || slideItems.length === 0) return;
        const promises: Promise<any>[] = [];
        slideItems.forEach(item => {
            if (item.bgImage) {
                promises.push(Image.prefetch(item.bgImage).catch(() => {}));
            }
            if (item.topPlayer?.photoUrl) {
                promises.push(Image.prefetch(item.topPlayer.photoUrl).catch(() => {}));
            }
            if (item.topPlayer?.teamLogo) {
                promises.push(Image.prefetch(item.topPlayer.teamLogo).catch(() => {}));
            }
        });
        await Promise.all(promises);
    };

    const setupInfiniteItems = (data: LeagueSlideItem[]) => {
        if (!data || data.length === 0) return;
        // Construct infinite loop array: [lastItem, ...items, firstItem]
        const firstItem = data[0];
        const lastItem = data[data.length - 1];
        const looped = [lastItem, ...data, firstItem];
        setRawItems(data);
        setInfiniteItems(looped);
    };

    useEffect(() => {
        const initializeSlider = async () => {
            if (initialItems && initialItems.length > 0) {
                await preloadAllImagesAsync(initialItems);
                setupInfiniteItems(initialItems);
                setLoading(false);
            } else {
                await loadItems();
            }
        };
        initializeSlider();
    }, [initialItems]);

    useEffect(() => {
        if (externalLoading !== undefined && rawItems.length === 0) {
            setLoading(externalLoading);
        }
    }, [externalLoading, rawItems.length]);

    const loadItems = async () => {
        try {
            setLoading(true);
            const data = await apiService.getSliderItems();
            if (data && Array.isArray(data) && data.length > 0) {
                await preloadAllImagesAsync(data);
                setupInfiniteItems(data);
            }
        } catch (error) {
            console.error('Error loading top scorers slider items:', error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-scroll Infinite Loop Timer
    useEffect(() => {
        if (rawItems.length <= 1) return;
        autoSlideTimer.current = setInterval(() => {
            if (flatListRef.current) {
                const nextIndex = currentIndexRef.current + 1;
                currentIndexRef.current = nextIndex;
                flatListRef.current.scrollToIndex({ index: nextIndex, animated: true });
            }
        }, 5500);

        return () => {
            if (autoSlideTimer.current) clearInterval(autoSlideTimer.current);
        };
    }, [rawItems.length]);

    // Handle Infinite Loop Jump Seamlessly on Momentum Scroll End
    const handleScrollEnd = (e: any) => {
        if (rawItems.length <= 1) return;
        const offsetX = e.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
        
        const realCount = rawItems.length;

        // If scrolled to index 0 (cloned last item), jump silently to real last item (index = realCount)
        if (index === 0) {
            currentIndexRef.current = realCount;
            flatListRef.current?.scrollToIndex({ index: realCount, animated: false });
        }
        // If scrolled to last cloned index (realCount + 1), jump silently to real first item (index = 1)
        else if (index === realCount + 1) {
            currentIndexRef.current = 1;
            flatListRef.current?.scrollToIndex({ index: 1, animated: false });
        }
        else {
            currentIndexRef.current = index;
        }
    };

    // Vote Modal State
    const [voteModalVisible, setVoteModalVisible] = useState(false);
    const [selectedLeagueForVote, setSelectedLeagueForVote] = useState<LeagueSlideItem | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [votedCandidateId, setVotedCandidateId] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
    const [animatedPercentages, setAnimatedPercentages] = useState<{ [key: string]: number }>({});
    const [voterId, setVoterId] = useState<string>('');

    const modalLeagueAccent = selectedLeagueForVote ? LEAGUE_ACCENTS[selectedLeagueForVote.id] || '#FFE600' : '#FFE600';

    /**
     * Determines the unique voter identity:
     * - Authenticated user → "user:<userId>"
     * - Guest → "ip:<ipAddress>"
     * These are completely separate identities, so voting as guest
     * and then logging in gives a fresh independent vote.
     */
    const getVoterIdentity = async (): Promise<{ voterId: string; voterType: 'user' | 'guest' }> => {
        // Check if user is authenticated
        const { useAuthStore } = require('../store/useAuthStore');
        const { isAuthenticated, user } = useAuthStore.getState();

        if (isAuthenticated && user) {
            const uid = String(user.id || user._id || user.userId);
            const vid = `user:${uid}`;
            setVoterId(vid);
            return { voterId: vid, voterType: 'user' };
        }

        // Guest: use IP address
        let ip = await AsyncStorage.getItem('@amatora_voter_ip');
        if (!ip) {
            try {
                const res = await fetch('https://api.ipify.org?format=json');
                const json = await res.json();
                if (json && json.ip) {
                    ip = String(json.ip);
                    await AsyncStorage.setItem('@amatora_voter_ip', ip);
                }
            } catch (e) {
                // Fallback to device id
                let dId = await AsyncStorage.getItem('poll_voter_device_id');
                if (!dId) {
                    dId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    await AsyncStorage.setItem('poll_voter_device_id', dId);
                }
                ip = dId;
            }
        }
        const vid = `ip:${ip}`;
        setVoterId(vid);
        return { voterId: vid, voterType: 'guest' };
    };

    /** AsyncStorage key is scoped per voter identity so guest/auth don't collide */
    const getLocalVoteKey = (vid: string) => `@amatora_votes_${vid}`;

    const loadRealCandidates = async (leagueItem: LeagueSlideItem) => {
        if (!leagueItem) return;
        setIsLoadingCandidates(true);
        try {
            const { voterId: vid } = await getVoterIdentity();

            // 1. Check local storage for this voter's own vote
            let userVotedFor: string | null = null;
            try {
                const myVotesRaw = await AsyncStorage.getItem(getLocalVoteKey(vid));
                if (myVotesRaw) {
                    const myVotes = JSON.parse(myVotesRaw);
                    if (myVotes && myVotes[leagueItem.id]) {
                        userVotedFor = String(myVotes[leagueItem.id]);
                    }
                }
            } catch (e) {}

            const [players, votes] = await Promise.all([
                apiService.getLeagueVotingCandidates(leagueItem.id || leagueItem.leagueName),
                apiService.getVotesForLeague(leagueItem.id, vid)
            ]);

            if (players && players.length > 0) {
                const voteCounts: Record<string, number> = {};
                
                (votes || []).forEach((v: any) => {
                    const pId = String(v.player_id);
                    voteCounts[pId] = (voteCounts[pId] || 0) + 1;
                    // Match this voter's own vote in DB
                    if (v.voter_id === vid) {
                        userVotedFor = pId;
                    }
                });

                if (userVotedFor && !voteCounts[userVotedFor]) {
                    voteCounts[userVotedFor] = 1;
                }

                const totalVotes = Math.max(1, Object.values(voteCounts).reduce((a, b) => a + b, 0));

                let realCandidates = players.slice(0, 5).map((p: any) => {
                    const cVotes = voteCounts[String(p.id)] || 0;
                    return {
                        id: String(p.id),
                        firstName: p.firstName || p.first_name || '',
                        lastName: p.lastName || p.last_name || '',
                        teamName: p.teamName || p.team_name || 'Jamoa',
                        photoUrl: p.photoUrl || p.photo_url || `https://ui-avatars.com/api/?name=${p.firstName || 'P'}&background=random`,
                        votes: cVotes,
                        percentage: (votes && votes.length === 0 && !userVotedFor) ? 0 : Math.round((cVotes / totalVotes) * 100)
                    };
                });
                
                setCandidates(realCandidates);

                if (userVotedFor) {
                    setHasVoted(true);
                    setVotedCandidateId(userVotedFor);
                    const pcts: any = {};
                    realCandidates.forEach((c: any) => pcts[c.id] = c.percentage);
                    setAnimatedPercentages(pcts);
                } else {
                    setHasVoted(false);
                    setVotedCandidateId(null);
                    setAnimatedPercentages({});
                }
            } else {
                setCandidates([]);
            }
        } catch (error) {
            console.error("Error loading voting candidates:", error);
        } finally {
            setIsLoadingCandidates(false);
        }
    };

    useEffect(() => {
        if (voteModalVisible && selectedLeagueForVote) {
            loadRealCandidates(selectedLeagueForVote);
        }
    }, [voteModalVisible, selectedLeagueForVote?.id]);

    const handleVote = async (candidateId: string) => {
        if (!selectedLeagueForVote) return;
        const candIdStr = String(candidateId);
        
        if (votedCandidateId === candIdStr) {
            // Un-vote
            setHasVoted(false);
            setVotedCandidateId(null);
            setAnimatedPercentages({});
            setCandidates(prev => {
                const newCandidates = prev.map(c => {
                    if (c.id === candIdStr) {
                        return { ...c, votes: Math.max(0, c.votes - 1) };
                    }
                    return c;
                });
                const totalVotes = Math.max(1, newCandidates.reduce((sum, c) => sum + c.votes, 0));
                return newCandidates.map(c => ({
                    ...c,
                    percentage: Math.round((c.votes / totalVotes) * 100)
                }));
            });
            await apiService.removeVote(candIdStr, selectedLeagueForVote.id, voterId);
            // Clear local
            try {
                const myVotesRaw = await AsyncStorage.getItem(getLocalVoteKey(voterId));
                const myVotes = myVotesRaw ? JSON.parse(myVotesRaw) : {};
                delete myVotes[selectedLeagueForVote.id];
                await AsyncStorage.setItem(getLocalVoteKey(voterId), JSON.stringify(myVotes));
            } catch (e) {}
            return;
        }

        if (hasVoted) return;
        
        setHasVoted(true);
        setVotedCandidateId(candIdStr);
        
        setCandidates(prev => {
            const newCandidates = prev.map(c => {
                if (c.id === candIdStr) {
                    return { ...c, votes: c.votes + 1 };
                }
                return c;
            });
            const totalVotes = Math.max(1, newCandidates.reduce((sum, c) => sum + c.votes, 0));
            const candidatesWithPct = newCandidates.map(c => ({
                ...c,
                percentage: Math.round((c.votes / totalVotes) * 100)
            }));
            
            const currentPct: { [key: string]: number } = {};
            candidatesWithPct.forEach(c => {
                currentPct[c.id] = c.percentage;
            });
            setAnimatedPercentages(currentPct);

            return candidatesWithPct;
        });

        await apiService.castVote(candIdStr, selectedLeagueForVote.id, voterId);
        // Save local
        try {
            const myVotesRaw = await AsyncStorage.getItem(getLocalVoteKey(voterId));
            const myVotes = myVotesRaw ? JSON.parse(myVotesRaw) : {};
            myVotes[selectedLeagueForVote.id] = candIdStr;
            await AsyncStorage.setItem(getLocalVoteKey(voterId), JSON.stringify(myVotes));
        } catch (e) {}
    };

    if (loading || infiniteItems.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.skeletonCard}>
                    <LinearGradient
                        colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.skeletonHeader}>
                        <Skeleton width={100} height={24} borderRadius={8} />
                        <Skeleton width={60} height={22} borderRadius={10} />
                    </View>
                    <View style={styles.skeletonBody}>
                        <Skeleton width={82} height={100} borderRadius={14} />
                        <View style={{ flex: 1, marginLeft: 14 }}>
                            <Skeleton width={120} height={20} borderRadius={6} />
                            <View style={{ height: 6 }} />
                            <Skeleton width={80} height={14} borderRadius={6} />
                            <View style={{ height: 10 }} />
                            <Skeleton width={70} height={24} borderRadius={8} />
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    const renderCardItem = ({ item, index }: { item: LeagueSlideItem; index: number }) => {
        const topPlayer = item?.topPlayer;
        const leagueAccent = LEAGUE_ACCENTS[item?.id] || item?.theme?.[1] || '#007AFF';

        // 4-Day Top Scorer Rule: Top scorer stays for 4 days, on 5th day and beyond next round teaser appears
        const updatedTime = (item as any)?.updated_at || (item as any)?.updatedAt || (item as any)?.created_at || (item as any)?.createdAt || (item as any)?.date;
        const diffDays = updatedTime ? (Date.now() - new Date(updatedTime).getTime()) / (1000 * 60 * 60 * 24) : 0;
        const isTopPlayerActive = !!topPlayer && diffDays <= 4;
        const currentRound = Number(item.round) || 1;
        const nextRound = isTopPlayerActive ? currentRound : (currentRound + 1);
        const localizedLeagueName = formatLocalizedLeagueName(item.leagueName, currentLang);

        return (
            <View style={styles.cardWrapper}>
                <View style={styles.card}>
                    {/* CLEAN CRISP BACKGROUND */}
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0B0E17' }]} pointerEvents="none">
                        {item?.bgImage ? (
                            <Image 
                                source={{ uri: item.bgImage }} 
                                style={[StyleSheet.absoluteFill, { opacity: 0.95 }]} 
                                resizeMode="cover" 
                            />
                        ) : (
                            <Image 
                                source={LEAGUE_BACKGROUNDS[item?.id] || require('../assets/images/backroud-image.png')} 
                                style={[StyleSheet.absoluteFill, { opacity: 0.9 }]} 
                                resizeMode="cover" 
                            />
                        )}
                        {/* Subtle dark vignette for text readability */}
                        <LinearGradient
                            colors={['rgba(5, 8, 17, 0.25)', 'rgba(5, 8, 17, 0.75)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                        />
                    </View>

                    <View style={styles.cardContent} pointerEvents="box-none">
                        {isTopPlayerActive && topPlayer ? (
                            <View style={styles.realDataContainer} pointerEvents="box-none">
                                <View style={styles.realDataLeftColumn} pointerEvents="none">
                                    <View style={styles.realDataLeagueHeader}>
                                        {LEAGUE_LOGOS[item.id] ? (
                                            <Image source={LEAGUE_LOGOS[item.id]} style={styles.slideLeagueLogo} resizeMode="contain" />
                                        ) : (
                                            <Text style={styles.leagueTitle}>{localizedLeagueName.toUpperCase()}</Text>
                                        )}
                                    </View>

                                    <View style={styles.realDataLeftCenter}>
                                        <View style={styles.realDataNameStack}>
                                            <Text style={styles.realDataFirstName} numberOfLines={1} adjustsFontSizeToFit>
                                                {(topPlayer.firstName || '').toUpperCase()}
                                            </Text>
                                            {topPlayer.lastName ? (
                                                <Text style={styles.realDataLastName} numberOfLines={1} adjustsFontSizeToFit>
                                                    {topPlayer.lastName.toUpperCase()}
                                                </Text>
                                            ) : null}
                                        </View>

                                        <View style={styles.playerTeamRow}>
                                            {topPlayer.teamLogo ? (
                                                <Image source={{ uri: topPlayer.teamLogo }} style={styles.realDataTeamMiniLogo} />
                                            ) : (
                                                <View style={[styles.realDataTeamMiniLogo, styles.playerTeamLogoFallback]}>
                                                    <Text style={styles.fallbackLogoText}>{topPlayer.teamName?.charAt(0) || 'T'}</Text>
                                                </View>
                                            )}
                                            <Text style={styles.playerTeamNameText} numberOfLines={1}>
                                                {formatShortTeamName(topPlayer.teamName, 14)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.realDataRightPhoto} pointerEvents="none">
                                    <SmartImage
                                        uri={topPlayer.photoUrl}
                                        style={styles.realDataPhotoImg}
                                        borderRadius={12}
                                        fallbackIcon="person"
                                        fallbackIconSize={50}
                                        contentFit="cover"
                                    />
                                    <View style={styles.photoOverlayPills}>
                                        <View style={styles.realDataPillHorizontal}>
                                            <Text style={styles.realDataPillText}>{topPlayer.goals} {t('slider.goals')}</Text>
                                        </View>
                                        <View style={styles.realDataPillHorizontal}>
                                            <Text style={styles.realDataPillText}>{topPlayer.assists} {t('slider.assists')}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={[styles.realDataRoundBadge, { backgroundColor: leagueAccent }]} pointerEvents="none">
                                    <Text style={styles.realDataRoundBadgeText}>
                                        {t('matches.round_tour', { round: currentRound })}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <>
                                <View style={styles.badgeHeader}>
                                    {LEAGUE_LOGOS[item.id] ? (
                                        <Image source={LEAGUE_LOGOS[item.id]} style={styles.slideLeagueLogo} resizeMode="contain" />
                                    ) : (
                                        <Text style={styles.leagueTitle}>{localizedLeagueName.toUpperCase()}</Text>
                                    )}
                                    <View style={[styles.roundBadge, { backgroundColor: leagueAccent }]}>
                                        <Text style={styles.roundBadgeText}>
                                            {t('matches.round_tour', { round: nextRound })}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.slideBody} pointerEvents="box-none">
                                    <View style={styles.questionContainer} pointerEvents="box-none">
                                        <View style={styles.questionTextWrap} pointerEvents="box-none">
                                            <Text style={[styles.questionTitle, { marginBottom: 12 }]}>
                                                {t('slider.top_scorer_question', { league: localizedLeagueName, round: nextRound })}
                                            </Text>
                                            <TouchableOpacity 
                                                style={[styles.voteButton, { backgroundColor: leagueAccent, zIndex: 50 }]}
                                                activeOpacity={0.8}
                                                onPress={() => {
                                                    if (autoSlideTimer.current) clearInterval(autoSlideTimer.current);
                                                    setSelectedLeagueForVote(item);
                                                    setVoteModalVisible(true);
                                                }}
                                            >
                                                <Text style={styles.voteButtonText}>{t('slider.vote_now')}</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <View style={{ alignSelf: 'flex-end', marginRight: -16, marginBottom: -14, position: 'relative' }}>
                                            <View>
                                                <Image source={require('../shadow-man.png')} style={{ width: 145, height: 155 }} resizeMode="contain" />
                                                <Text style={{ position: 'absolute', top: 8, alignSelf: 'center', fontSize: 40, fontWeight: '900', color: '#FFFFFF', textShadowColor: '#FFFFFF', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15, zIndex: 10, elevation: 20 }}>?</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View 
            style={styles.container}
            onTouchStart={() => setSwipeDisabled(true)}
            onTouchEnd={() => setSwipeDisabled(false)}
            onTouchCancel={() => setSwipeDisabled(false)}
        >
            {/* TRULY INFINITE LOOPING 60FPS FLATLIST SLIDER */}
            <FlatList
                ref={flatListRef}
                data={infiniteItems}
                keyExtractor={(item, idx) => `${item.id}_${idx}`}
                renderItem={renderCardItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={1}
                onScrollBeginDrag={() => setSwipeDisabled(true)}
                onScrollEndDrag={() => setSwipeDisabled(false)}
                onMomentumScrollBegin={() => setSwipeDisabled(true)}
                getItemLayout={(_, index) => ({
                    length: CARD_WIDTH + CARD_SPACING,
                    offset: (CARD_WIDTH + CARD_SPACING) * index,
                    index,
                })}
                snapToInterval={CARD_WIDTH + CARD_SPACING}
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
                onMomentumScrollEnd={(e) => {
                    setSwipeDisabled(false);
                    handleScrollEnd(e);
                }}
            />

            {/* Voting Modal */}
            <Modal
                visible={voteModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setVoteModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setVoteModalVisible(false)}>
                    <BlurView intensity={60} tint="dark" style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>
                                        {t('slider.who_is_top_scorer', { 
                                            league: formatLocalizedLeagueName(selectedLeagueForVote?.leagueName, currentLang), 
                                            round: (Number(selectedLeagueForVote?.round) || 1) + 1 
                                        })}
                                    </Text>
                                    <TouchableOpacity onPress={() => setVoteModalVisible(false)} style={styles.modalCloseBtn}>
                                        <Ionicons name="close" size={24} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                                
                                <ScrollView style={styles.candidatesList} showsVerticalScrollIndicator={false}>
                                    {isLoadingCandidates ? (
                                        Array.from({ length: 5 }).map((_, idx) => (
                                            <View key={`skeleton-${idx}`} style={styles.candidateCard}>
                                                <View style={styles.candidateInfoRow}>
                                                    <Skeleton style={styles.candidatePhoto} />
                                                    <View style={styles.candidateTextInfo}>
                                                        <Skeleton style={{ width: 120, height: 16, borderRadius: 4, marginBottom: 6 }} />
                                                        <Skeleton style={{ width: 80, height: 12, borderRadius: 4 }} />
                                                    </View>
                                                </View>
                                            </View>
                                        ))
                                    ) : (
                                        candidates.map((candidate) => {
                                            const isSelected = votedCandidateId === String(candidate.id);
                                            return (
                                                <TouchableOpacity 
                                                    key={candidate.id} 
                                                    style={[
                                                        styles.candidateCard, 
                                                        hasVoted && !isSelected && styles.candidateCardVoted,
                                                        isSelected && styles.candidateCardActive
                                                    ]}
                                                    onPress={() => handleVote(candidate.id)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.candidateInfoRow}>
                                                        <Image source={{ uri: candidate.photoUrl }} style={styles.candidatePhoto} />
                                                        <View style={styles.candidateTextInfo}>
                                                            <Text style={[styles.candidateName, isSelected && { color: '#00FF9D', fontWeight: '900' }]}>
                                                                {candidate.firstName} {candidate.lastName}
                                                            </Text>
                                                            <Text style={styles.candidateTeam}>{candidate.teamName}</Text>
                                                            {isSelected && (
                                                                <View style={styles.myVoteBadge}>
                                                                    <Ionicons name="checkmark-circle" size={13} color="#00FF9D" style={{ marginRight: 4 }} />
                                                                    <Text style={styles.myVoteBadgeText}>Sizning ovozingiz</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        {hasVoted && (
                                                            <View style={styles.voteStats}>
                                                                <Text style={[styles.votePercentage, { color: isSelected ? '#00FF9D' : modalLeagueAccent }]}>
                                                                    {animatedPercentages[candidate.id] !== undefined ? animatedPercentages[candidate.id] : 0}%
                                                                </Text>
                                                                <Text style={styles.voteCount}>
                                                                    {t('slider.votes_count', { count: candidate.votes })}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    
                                                    {hasVoted && (
                                                        <View style={styles.progressBarContainer}>
                                                            <View style={[styles.progressBarFill, { 
                                                                width: `${candidate.percentage}%`,
                                                                backgroundColor: isSelected ? '#00FF9D' : modalLeagueAccent 
                                                            }]} />
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })
                                    )}
                                </ScrollView>
                            </View>
                        </TouchableWithoutFeedback>
                    </BlurView>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 14,
    },
    loadingContainer: {
        paddingHorizontal: SIDE_PADDING,
        paddingVertical: 14,
    },
    skeletonCard: {
        width: CARD_WIDTH,
        height: 190,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: 20,
        justifyContent: 'space-between',
    },
    skeletonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    skeletonBody: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginTop: 14,
    },
    cardWrapper: {
        width: CARD_WIDTH + CARD_SPACING,
        paddingRight: CARD_SPACING,
    },
    card: {
        width: CARD_WIDTH,
        aspectRatio: 2.1,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1.2,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        backgroundColor: '#0B0E17',
        ...Platform.select({
            ios: {
                shadowColor: 'rgba(0, 0, 0, 0.4)',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.5,
                shadowRadius: 20,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    cardContent: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 14,
        justifyContent: 'space-between',
    },
    badgeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 2,
    },
    leagueTitle: {
        fontWeight: '800',
        fontSize: 15,
        color: 'rgba(255,255,255,0.95)',
        letterSpacing: 1.5,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    slideLeagueLogo: {
        height: 22,
        maxWidth: 95,
    },
    roundBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        ...Platform.select({
            ios: {
                shadowColor: 'rgba(0, 0, 0, 0.25)',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
            },
            android: { elevation: 2 },
        }),
    },
    roundBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.8,
    },
    slideBody: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    questionContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    questionTextWrap: {
        flex: 1,
        paddingRight: 14,
    },
    questionTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
        lineHeight: 20,
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    voteButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    voteButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        backgroundColor: 'rgba(30, 30, 45, 0.85)',
        borderRadius: 24,
        padding: 24,
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    modalTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
        paddingRight: 15,
        lineHeight: 24,
    },
    modalCloseBtn: {
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
    },
    candidatesList: {
        flexGrow: 0,
    },
    candidateCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    candidateCardVoted: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        opacity: 0.85,
    },
    candidateCardActive: {
        backgroundColor: 'rgba(0, 255, 157, 0.12)',
        borderColor: '#00FF9D',
        borderWidth: 1.5,
        opacity: 1,
    },
    myVoteBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    myVoteBadgeText: {
        color: '#00FF9D',
        fontSize: 11,
        fontWeight: '800',
    },
    candidateInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    candidatePhoto: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    candidateTextInfo: {
        flex: 1,
        marginLeft: 14,
    },
    candidateName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    candidateTeam: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '500',
    },
    voteStats: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    votePercentage: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFE600',
    },
    voteCount: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        marginTop: 14,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FFE600',
        borderRadius: 3,
    },
    realDataContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        position: 'relative',
    },
    realDataLeftColumn: {
        flex: 1,
        justifyContent: 'space-between',
        paddingRight: 8,
        zIndex: 2,
    },
    realDataLeagueHeader: {
        marginBottom: 4,
    },
    realDataLeftCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingBottom: 10,
    },
    playerTeamRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    realDataTeamMiniLogo: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        marginRight: 6,
    },
    playerTeamLogoFallback: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    fallbackLogoText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    playerTeamNameText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    realDataNameStack: {
        alignItems: 'flex-start',
        marginBottom: 4,
        width: '100%',
    },
    realDataFirstName: {
        fontFamily: 'Outfit',
        fontSize: 20,
        fontWeight: '900',
        color: '#FFF',
        textAlign: 'left',
    },
    realDataLastName: {
        fontFamily: 'Outfit',
        fontSize: 14,
        fontWeight: '500',
        color: '#FFF',
        textAlign: 'left',
        letterSpacing: 1,
    },
    realDataRightPhoto: {
        width: 140,
        height: 160,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        position: 'relative',
        zIndex: 1,
        borderRadius: 10,
        overflow: 'hidden',
    },
    realDataPhotoImg: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    photoOverlayPills: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
        zIndex: 10,
    },
    realDataPillHorizontal: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.35)',
        alignItems: 'center',
    },
    realDataPillText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
    },
    realDataRoundBadge: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignItems: 'center',
        zIndex: 10,
    },
    realDataRoundBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
});

export default ApiSlider;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, PanResponder, TouchableOpacity, Image, Modal, TouchableWithoutFeedback, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { apiService } from '../services/apiService';
import SmartImage from './SmartImage';
import Skeleton from './Skeleton';
import { formatShortTeamName } from '../utils/stringUtils';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.88;
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
    'super': '#EF4444',  // Vibrant League Red
    'pro': '#3B82F6',    // Vibrant League Blue
    '3liga': '#A855F7',  // Vibrant League Purple / Siyohrang
    '7x7': '#0EA5E9',    // Vibrant League Cyan / Sky Blue
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
    const [items, setItems] = useState<LeagueSlideItem[]>([]);
    const [loading, setLoading] = useState(externalLoading !== undefined ? externalLoading : true);
    
    const [activeIndex, setActiveIndex] = useState(0);
    const [displayedIndex, setDisplayedIndex] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const autoSlideTimer = useRef<any>(null);
    const isAnimating = useRef(false);

    // Refs to avoid stale closure inside PanResponder
    const activeIndexRef = useRef(0);
    const itemsRef = useRef<LeagueSlideItem[]>([]);

    useEffect(() => {
        activeIndexRef.current = activeIndex;
    }, [activeIndex]);

    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    // Vote Modal State
    const [voteModalVisible, setVoteModalVisible] = useState(false);
    const [selectedLeagueForVote, setSelectedLeagueForVote] = useState<LeagueSlideItem | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [votedCandidateId, setVotedCandidateId] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
    const [animatedPercentages, setAnimatedPercentages] = useState<{ [key: string]: number }>({});
    const [deviceId, setDeviceId] = useState<string>('');
    const voteProgressAnim = useRef(new Animated.Value(0)).current;
    
    // Derived league accent for modal
    const modalLeagueAccent = selectedLeagueForVote ? LEAGUE_ACCENTS[selectedLeagueForVote.id] || '#FFE600' : '#FFE600';

    const loadRealCandidates = async () => {
        if (!selectedLeagueForVote) return;
        setIsLoadingCandidates(true);
        try {
            // Get or generate device ID
            let dId = await AsyncStorage.getItem('poll_voter_device_id');
            if (!dId) {
                dId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                await AsyncStorage.setItem('poll_voter_device_id', dId);
            }
            setDeviceId(dId);

            // Fetch players and votes in parallel
            const [players, votes] = await Promise.all([
                apiService.getPlayers(1, 5), // Top 5 players
                apiService.getVotesForLeague(selectedLeagueForVote.id)
            ]);

            if (players && players.length > 0) {
                // Count votes for each player
                const voteCounts: Record<string, number> = {};
                let userVotedFor: string | null = null;
                
                votes.forEach((v: any) => {
                    voteCounts[v.player_id] = (voteCounts[v.player_id] || 0) + 1;
                    if (v.device_id === dId) {
                        userVotedFor = v.player_id;
                    }
                });

                const totalVotes = votes.length;

                let realCandidates = players.slice(0, 5).map((p: any) => {
                    const cVotes = voteCounts[p.id] || 0;
                    return {
                        id: p.id,
                        firstName: p.first_name || p.firstName || '',
                        lastName: p.last_name || p.lastName || '',
                        teamName: p.teams?.name || p.teamName || 'Noma\'lum',
                        photoUrl: p.photo_url || p.photoUrl || `https://ui-avatars.com/api/?name=${p.first_name || 'P'}&background=random`,
                        votes: cVotes,
                        percentage: totalVotes === 0 ? 0 : Math.round((cVotes / totalVotes) * 100)
                    };
                });
                
                // Initial sort by percentage
                realCandidates = realCandidates.sort((a, b) => b.percentage - a.percentage);

                setCandidates(realCandidates);

                // Restore user vote state
                if (userVotedFor) {
                    setHasVoted(true);
                    setVotedCandidateId(userVotedFor);
                    voteProgressAnim.setValue(1);
                    
                    // Set static percentages for UI since we instantly load it
                    const pcts: any = {};
                    realCandidates.forEach(c => pcts[c.id] = c.percentage);
                    setAnimatedPercentages(pcts);
                }
            }
        } catch (error) {
            console.error("Error loading voting candidates:", error);
        } finally {
            setIsLoadingCandidates(false);
        }
    };

    useEffect(() => {
        if (voteModalVisible) {
            setHasVoted(false);
            setVotedCandidateId(null);
            voteProgressAnim.setValue(0);
            setAnimatedPercentages({});
            if (candidates.length === 0) {
                loadRealCandidates();
            }
        }
    }, [voteModalVisible]);

    const handleVote = async (candidateId: string) => {
        if (!selectedLeagueForVote) return;
        
        if (votedCandidateId === candidateId) {
            // Cancel vote locally
            setHasVoted(false);
            setVotedCandidateId(null);
            voteProgressAnim.setValue(0);
            setAnimatedPercentages({});
            setCandidates(prev => {
                const newCandidates = prev.map(c => {
                    if (c.id === candidateId) {
                        return { ...c, votes: Math.max(0, c.votes - 1) };
                    }
                    return c;
                });
                const totalVotes = newCandidates.reduce((sum, c) => sum + c.votes, 0);
                return newCandidates.map(c => ({
                    ...c,
                    percentage: totalVotes === 0 ? 0 : Math.round((c.votes / totalVotes) * 100)
                })); // Do not sort on cancel to avoid jumpy UI
            });
            
            // Remove from Supabase
            await apiService.removeVote(candidateId, selectedLeagueForVote.id, deviceId);
            return;
        }

        if (hasVoted) return; // Prevent voting for someone else if already voted
        
        // Cast vote locally
        setHasVoted(true);
        setVotedCandidateId(candidateId);
        voteProgressAnim.setValue(0);
        
        setCandidates(prev => {
            const newCandidates = prev.map(c => {
                if (c.id === candidateId) {
                    return { ...c, votes: c.votes + 1 };
                }
                return c;
            });
            const totalVotes = newCandidates.reduce((sum, c) => sum + c.votes, 0);
            const candidatesWithPct = newCandidates.map(c => ({
                ...c,
                percentage: totalVotes === 0 ? 0 : Math.round((c.votes / totalVotes) * 100)
            })); // Do NOT sort here to prevent jumping!
            
            // Bar Animation
            Animated.timing(voteProgressAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: false
            }).start();
            
            // Text count animation
            const startTime = Date.now();
            const duration = 1000;
            const interval = setInterval(() => {
                const now = Date.now();
                const t = Math.min((now - startTime) / duration, 1);
                // Ease out cubic
                const progress = 1 - Math.pow(1 - t, 3);
                
                const currentPct: { [key: string]: number } = {};
                candidatesWithPct.forEach(c => {
                    currentPct[c.id] = Math.round(c.percentage * progress);
                });
                setAnimatedPercentages(currentPct);
                
                if (t === 1) clearInterval(interval);
            }, 16);

            return candidatesWithPct;
        });

        // Save to Supabase
        await apiService.castVote(candidateId, selectedLeagueForVote.id, deviceId);
    };

    useEffect(() => {
        if (initialItems && initialItems.length > 0) {
            setItems(initialItems);
            setLoading(false);
        } else {
            loadItems();
        }
    }, [initialItems]);

    useEffect(() => {
        if (externalLoading !== undefined) {
            setLoading(externalLoading && items.length === 0);
        }
    }, [externalLoading, items.length]);

    const loadItems = async () => {
        try {
            if (items.length === 0) setLoading(true);
            const data = await apiService.getSliderItems();
            if (data && Array.isArray(data) && data.length > 0) {
                setItems(data);
            }
        } catch (error) {
            console.error('Error loading top scorers slider items:', error);
        } finally {
            setLoading(false);
        }
    };

    const changeSlide = useCallback((targetIndex: number) => {
        if (isAnimating.current) return;
        isAnimating.current = true;

        // Update slide index IMMEDIATELY on swipe (0ms delay) so background and content change instantly
        setDisplayedIndex(targetIndex);
        setActiveIndex(targetIndex);

        fadeAnim.setValue(0.35);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
        }).start(() => {
            isAnimating.current = false;
        });
    }, [fadeAnim]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
            },
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
            },
            onPanResponderTerminationRequest: () => false,
            onShouldBlockNativeResponder: () => true,
            onPanResponderRelease: (_, gestureState) => {
                const currentIdx = activeIndexRef.current;
                const itemsCount = itemsRef.current.length;
                if (isAnimating.current || itemsCount <= 1) return;
                if (gestureState.dx < -20) {
                    if (autoSlideTimer.current) clearInterval(autoSlideTimer.current);
                    const nextIdx = (currentIdx + 1) % itemsCount;
                    changeSlide(nextIdx);
                } else if (gestureState.dx > 20) {
                    if (autoSlideTimer.current) clearInterval(autoSlideTimer.current);
                    const prevIdx = (currentIdx - 1 + itemsCount) % itemsCount;
                    changeSlide(prevIdx);
                }
            },
        })
    ).current;

    useEffect(() => {
        if (items.length <= 1) return;
        autoSlideTimer.current = setInterval(() => {
            setActiveIndex(currentIdx => {
                const nextIdx = (currentIdx + 1) % items.length;
                changeSlide(nextIdx);
                return nextIdx;
            });
        }, 15000);
        return () => {
            if (autoSlideTimer.current) clearInterval(autoSlideTimer.current);
        };
    }, [items.length, changeSlide]);

    if (loading && items.length === 0) {
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

    if (items.length === 0) return null;

    const currentItem = items[displayedIndex] || items[0];
    const topPlayer = currentItem?.topPlayer;
    const leagueAccent = LEAGUE_ACCENTS[currentItem?.id] || currentItem?.theme?.[1] || '#007AFF';

    const bgSource = currentItem?.bgImage 
        ? { uri: currentItem.bgImage }
        : LEAGUE_BACKGROUNDS[currentItem?.id] || require('../assets/images/backroud-image.png');

    return (
        <View style={styles.container}>
            <View style={{ paddingHorizontal: SIDE_PADDING, alignItems: 'center' }}>
                <View style={[styles.card, { position: 'relative' }]} {...panResponder.panHandlers}>
                    <Animated.View
                        style={[
                            StyleSheet.absoluteFill,
                            {
                                opacity: fadeAnim,
                            },
                        ]}
                    >
                        {/* Glassmorphism Blur Layer - Light blur */}
                        <BlurView intensity={8} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />

                        {/* Designated Pre-rendered League Background Backdrop */}
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0B0E17' }]} pointerEvents="none">
                            {currentItem?.bgImage ? (
                                <Image 
                                    key={`bg-remote-${currentItem.id}`}
                                    source={{ uri: currentItem.bgImage }} 
                                    style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} 
                                    resizeMode="cover" 
                                />
                            ) : (
                                Object.keys(LEAGUE_BACKGROUNDS).map((leagueId) => {
                                    const isCurrent = (currentItem?.id || 'super') === leagueId;
                                    return (
                                        <Image 
                                            key={`bg-local-${leagueId}`}
                                            source={LEAGUE_BACKGROUNDS[leagueId]} 
                                            style={[
                                                StyleSheet.absoluteFill, 
                                                { opacity: isCurrent ? 0.35 : 0 }
                                            ]} 
                                            resizeMode="cover" 
                                        />
                                    );
                                })
                            )}
                            <LinearGradient
                                colors={currentItem?.theme || ['rgba(15,23,42,0.7)', 'rgba(11,14,23,0.9)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={[StyleSheet.absoluteFill, { opacity: 0.65 }]}
                                pointerEvents="none"
                            />
                        </View>

                        <View style={styles.cardContent} pointerEvents="box-none">
                            {topPlayer ? (
                                <View style={styles.realDataContainer} pointerEvents="box-none">
                                    <View style={styles.realDataLeftColumn} pointerEvents="none">
                                        {/* League Logo Header */}
                                        <View style={styles.realDataLeagueHeader}>
                                            {LEAGUE_LOGOS[currentItem.id] ? (
                                                <Image source={LEAGUE_LOGOS[currentItem.id]} style={styles.slideLeagueLogo} resizeMode="contain" />
                                            ) : (
                                                <Text style={styles.leagueTitle}>{currentItem.leagueName.toUpperCase()}</Text>
                                            )}
                                        </View>

                                        {/* Center Content: Player Name + Team Info */}
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

                                    {/* Big Player Photo starting top right parallel to League Logo */}
                                    <View style={styles.realDataRightPhoto} pointerEvents="none">
                                        <SmartImage
                                            uri={topPlayer.photoUrl}
                                            style={styles.realDataPhotoImg}
                                            borderRadius={12}
                                            fallbackIcon="person"
                                            fallbackIconSize={50}
                                            contentFit="cover"
                                        />
                                        {/* Goal & Assist centered under photo */}
                                        <View style={styles.photoOverlayPills}>
                                            <View style={styles.realDataPillHorizontal}>
                                                <Text style={styles.realDataPillText}>{topPlayer.goals} goal</Text>
                                            </View>
                                            <View style={styles.realDataPillHorizontal}>
                                                <Text style={styles.realDataPillText}>{topPlayer.assists} asist</Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Round Badge at bottom left */}
                                    <View style={[styles.realDataRoundBadge, { backgroundColor: leagueAccent }]} pointerEvents="none">
                                        <Text style={styles.realDataRoundBadgeText}>{(currentItem.round || 1)}-TUR</Text>
                                    </View>
                                </View>
                            ) : (
                                <>
                                    <View style={styles.badgeHeader}>
                                        {LEAGUE_LOGOS[currentItem.id] ? (
                                            <Image source={LEAGUE_LOGOS[currentItem.id]} style={styles.slideLeagueLogo} resizeMode="contain" />
                                        ) : (
                                            <Text style={styles.leagueTitle}>{currentItem.leagueName.toUpperCase()}</Text>
                                        )}
                                        <View style={[styles.roundBadge, { backgroundColor: leagueAccent }]}>
                                            <Text style={styles.roundBadgeText}>{(currentItem.round || 1)}-TUR</Text>
                                        </View>
                                    </View>
                                    <View style={styles.slideBody} pointerEvents="box-none">
                                        <View style={styles.questionContainer} pointerEvents="box-none">
                                            <View style={styles.questionTextWrap} pointerEvents="box-none">
                                                <Text style={[styles.questionTitle, { marginBottom: 12 }]}>
                                                    {currentItem.leagueName} {(currentItem.round || 1)}-tur to'purari kim bo'lishi mumkin?
                                                </Text>
                                                <TouchableOpacity 
                                                    style={[styles.voteButton, { backgroundColor: leagueAccent, zIndex: 50 }]}
                                                    activeOpacity={0.8}
                                                    onPress={() => {
                                                        if (autoSlideTimer.current) clearInterval(autoSlideTimer.current);
                                                        setSelectedLeagueForVote(currentItem);
                                                        setVoteModalVisible(true);
                                                    }}
                                                >
                                                    <Text style={styles.voteButtonText}>OVOZ BERING</Text>
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
                    </Animated.View>
                </View>
            </View>

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
                                        {selectedLeagueForVote?.leagueName} {selectedLeagueForVote?.round}-tur to'purari kim?
                                    </Text>
                                    <TouchableOpacity onPress={() => setVoteModalVisible(false)} style={styles.modalCloseBtn}>
                                        <Ionicons name="close" size={24} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                                
                                <ScrollView style={styles.candidatesList} showsVerticalScrollIndicator={false}>
                                    {isLoadingCandidates ? (
                                        // Skeleton Loading State
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
                                        // Candidates List
                                        candidates.map((candidate) => (
                                            <TouchableOpacity 
                                                key={candidate.id} 
                                                style={[styles.candidateCard, hasVoted && votedCandidateId !== candidate.id && styles.candidateCardVoted]}
                                                onPress={() => handleVote(candidate.id)}
                                                activeOpacity={0.7}
                                                disabled={hasVoted && votedCandidateId !== candidate.id}
                                            >
                                                <View style={styles.candidateInfoRow}>
                                                    <Image source={{ uri: candidate.photoUrl }} style={styles.candidatePhoto} />
                                                    <View style={styles.candidateTextInfo}>
                                                        <Text style={styles.candidateName}>{candidate.firstName} {candidate.lastName}</Text>
                                                        <Text style={styles.candidateTeam}>{candidate.teamName}</Text>
                                                    </View>
                                                    {hasVoted && (
                                                        <View style={styles.voteStats}>
                                                            <Text style={[styles.votePercentage, { color: modalLeagueAccent }]}>
                                                                {animatedPercentages[candidate.id] !== undefined ? animatedPercentages[candidate.id] : 0}%
                                                            </Text>
                                                            <Text style={styles.voteCount}>{candidate.votes} ovoz</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                
                                                {hasVoted && (
                                                    <View style={styles.progressBarContainer}>
                                                        <Animated.View style={[styles.progressBarFill, { 
                                                            width: voteProgressAnim.interpolate({
                                                                inputRange: [0, 1],
                                                                outputRange: ['0%', `${candidate.percentage}%`]
                                                            }), 
                                                            backgroundColor: modalLeagueAccent 
                                                        }]} />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        ))
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
    scrollContent: {
        paddingHorizontal: SIDE_PADDING,
        paddingVertical: 10,
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
                shadowColor: 'rgba(0, 0, 0, 0.3)',
                shadowOffset: { width: 0, height: 16 },
                shadowOpacity: 0.4,
                shadowRadius: 30,
            },
            android: {
                elevation: 10,
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
    playerCutoutContainer: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 16,
    },
    playerFramedCard: {
        width: 88,
        height: 105,
        borderRadius: 18,
        borderWidth: 2.5,
        borderColor: 'rgba(255, 230, 0, 0.85)',
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        overflow: 'hidden',
    },
    playerFrameImg: {
        width: '100%',
        height: '100%',
    },
    slideInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    playerNameContainer: {
        marginBottom: 6,
    },
    playerFirstName: {
        fontFamily: 'Outfit',
        fontSize: 16,
        fontWeight: '900',
        color: '#FFFFFF',
        textTransform: 'uppercase',
        lineHeight: 19,
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
    },
    playerLastName: {
        fontFamily: 'Outfit',
        fontSize: 13,
        fontWeight: '400',
        color: 'rgba(255, 255, 255, 0.85)',
        textTransform: 'uppercase',
        lineHeight: 16,
        letterSpacing: 0.5,
    },
    playerTeamStatWrapper: {
        gap: 8,
    },
    playerTeamInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    playerTeamLogo: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    teamNameText: {
        fontSize: 14,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.95)',
    },
    playerStatsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    goalsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        gap: 4,
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
    goalsBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    statBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    statBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    // Question Fallback Slide
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
    questionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    questionBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFE600',
        letterSpacing: 0.5,
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
    silhouetteContainer: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    silhouetteGlow: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    silhouetteBox: {
        width: 75,
        height: 95,
        borderRadius: 18,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'rgba(255, 230, 0, 0.7)',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: 'rgba(0, 0, 0, 0.2)',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 15,
            },
            android: { elevation: 4 },
        }),
    },
    questionMarkOverlay: {
        position: 'absolute',
        fontSize: 40,
        fontWeight: '800',
        color: '#FFE600',
        textShadowColor: 'rgba(255, 230, 0, 0.8)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
    },
    // Pagination
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 14,
        gap: 8,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    activeDot: {
        width: 28,
        borderRadius: 10,
        backgroundColor: '#FFE600',
        ...Platform.select({
            ios: {
                shadowColor: 'rgba(255,230,0,0.8)',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 10,
            },
        }),
    },
    // Voting UI Styles
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

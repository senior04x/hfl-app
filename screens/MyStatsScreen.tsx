import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Linking,
    Dimensions,
    Image,
    Animated,
    SafeAreaView,
    StatusBar,
    Modal,
    TextInput
} from 'react-native';
import { apiService } from '../services/apiService';
import { BlurView } from 'expo-blur';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import SmartImage from '../components/SmartImage';
import { useAuthStore } from '../store/useAuthStore';
import PlayerProfileSkeleton from '../components/PlayerProfileSkeleton';

const { width } = Dimensions.get('window');

const getPositionFullUz = (pos: string) => {
    const map: any = {
        'GK': 'Darvozabon',
        'LB': 'Chap qanot himoyachisi',
        'CB': 'Markaziy himoyachi',
        'RB': "O'ng qanot himoyachisi",
        'CDM': 'Tayanch yarim himoyachisi',
        'CM': 'Markaziy yarim himoyachisi',
        'CAM': 'Hujumkor yarim himoyachisi',
        'LW': 'Chap qanot hujumchisi',
        'RW': "O'ng qanot hujumchisi",
        'ST': 'Markaziy hujumchi',
        'CF': 'Ikkinchi hujumchi',
        'LM': 'Chap qanot yarim himoyachisi',
        'RM': "O'ng qanot yarim himoyachisi",
        'LWB': 'Chap qanot qanot himoyachisi',
        'RWB': "O'ng qanot qanot himoyachisi",
    };
    return map[pos?.toUpperCase()] || pos || 'FUTBOLCHI';
};

const MyStatsScreen = ({ navigation }: any) => {
    const user = useAuthStore((state) => state.user);
    const [loading, setLoading] = useState(true);
    const [player, setPlayer] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('profil');
    const [matches, setMatches] = useState<any[]>([]);
    const [matchesLoading, setMatchesLoading] = useState(false);
    
    // Instagram state
    const [showInstagramModal, setShowInstagramModal] = useState(false);
    const [instagramInput, setInstagramInput] = useState('');
    const [savingInstagram, setSavingInstagram] = useState(false);
    const [instagramUsername, setInstagramUsername] = useState('');

    // Profile Update Request state
    const [showProfileUpdateModal, setShowProfileUpdateModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [submittingUpdate, setSubmittingUpdate] = useState(false);

    const [updateForm, setUpdateForm] = useState({
        photoUrl: '',
        phone: '',
        firstName: '',
        lastName: '',
        fatherName: '',
        position: '',
        playerNumber: ''
    });

    const slideAnim = useRef(new Animated.Value(0)).current;

    const tabs = ['profil', 'karyerasi', 'oyinlari'];
    const tabLabels: any = {
        profil: 'PROFIL',
        karyerasi: 'KARYERASI',
        oyinlari: "O'YINLARI"
    };

    const nextTab = () => {
        const currentIndex = tabs.indexOf(activeTab);
        const nextIndex = (currentIndex + 1) % tabs.length;
        const nextTabName = tabs[nextIndex];
        
        Animated.timing(slideAnim, {
            toValue: -50,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setActiveTab(nextTabName);
            slideAnim.setValue(50);
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        });
    };

    useEffect(() => {
        if (user && user.id && user.role === 'player') {
            fetchPlayer();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchPlayer = async () => {
        try {
            setLoading(true);
            const data = await apiService.getPlayerById(user.id);
            if (data) {
                setPlayer(data);
                
                // Parse Instagram if available
                if (data.instagram_username) {
                    setInstagramUsername(data.instagram_username);
                    setInstagramInput(data.instagram_username);
                } else if (data.instagram_url) {
                    const match = data.instagram_url.match(/instagram\.com\/([^/]+)/);
                    if (match?.[1]) {
                        setInstagramUsername(match[1]);
                        setInstagramInput(match[1]);
                    }
                }

                if (activeTab === 'oyinlari') {
                    fetchPlayerMatches();
                }
            }
        } catch (error) {
            console.error('Error fetching my stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlayerMatches = async () => {
        if (!user?.id) return;
        try {
            setMatchesLoading(true);
            const data = await apiService.getPlayerMatches(user.id);
            setMatches(data || []);
        } catch (error) {
            console.error('Error fetching player matches:', error);
        } finally {
            setMatchesLoading(false);
        }
    };

    // Save Instagram URL
    const handleSaveInstagram = async () => {
        if (!instagramInput.trim()) return;
        setSavingInstagram(true);
        try {
            const username = instagramInput.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9._]/g, '');
            const fullUrl = `https://www.instagram.com/${username}/`;

            await apiService.updatePlayerInstagram(player.id || user.id, username, fullUrl);

            setInstagramUsername(username);
            setPlayer((prev: any) => ({ ...prev, instagram_username: username, instagram_url: fullUrl }));
            setShowInstagramModal(false);
        } catch (err: any) {
            console.error('Error saving instagram:', err);
        } finally {
            setSavingInstagram(false);
        }
    };

    // Open Profile Update Modal
    const handleOpenUpdateModal = () => {
        setUpdateForm({
            photoUrl: player?.photo || player?.avatar || '',
            phone: player?.phone || '',
            firstName: player?.firstName || player?.first_name || '',
            lastName: player?.lastName || player?.last_name || '',
            fatherName: player?.fatherName || player?.father_name || '',
            position: player?.position || '',
            playerNumber: String(player?.number || player?.player_number || '')
        });
        setShowProfileUpdateModal(true);
    };

    // Submit Profile Update Request
    const handleSubmitProfileUpdate = async () => {
        setSubmittingUpdate(true);
        try {
            const payload = {
                playerId: player?.id || user?.id,
                orgId: player?.organization_id || 1,
                oldData: {
                    firstName: player?.firstName || '',
                    lastName: player?.lastName || '',
                    fatherName: player?.fatherName || '',
                    phone: player?.phone || '',
                    position: player?.position || '',
                    playerNumber: player?.number || '',
                    photoUrl: player?.photo || ''
                },
                newData: updateForm
            };

            await apiService.submitProfileUpdateRequest(payload);

            setShowProfileUpdateModal(false);
            setShowSuccessModal(true);
        } catch (err: any) {
            console.error('Error submitting profile update:', err);
        } finally {
            setSubmittingUpdate(false);
        }
    };

    if (loading) {
        return <PlayerProfileSkeleton />;
    }

    if (!user || user.role !== 'player' || !player) {
        return (
            <SafeAreaView style={styles.emptyContainer}>
                <StatusBar barStyle="light-content" />
                <View style={styles.emptyContent}>
                    <Ionicons name="person-circle-outline" size={80} color="rgba(255,255,255,0.2)" />
                    <Text style={styles.emptyTitle}>PROFIL MAVJUD EMAS</Text>
                    <Text style={styles.emptySub}>
                        Ushbu bo'lim faqat futbolchi sifatida ro'yxatdan o'tgan foydalanuvchilar uchun amal qiladi.
                    </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Welcome')} style={styles.loginBtn}>
                        <Text style={styles.loginBtnText}>TIZIMGA KIRISH</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const stats = player.stats || {
        goals: player.goals || 0,
        assists: player.assists || 0,
        matchesPlayed: player.matchesPlayed || 0,
        yellowCards: player.yellowCards || 0,
        redCards: player.redCards || 0,
        rating: player.rating || 0
    };

    const renderProfil = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.statsGrid}>
                <StatBox
                    label="GOLLAR"
                    value={stats.goals}
                    icon="football"
                    color={Colors.primary}
                />
                <StatBox
                    label="ASSISTLAR"
                    value={stats.assists}
                    icon="star"
                    color="#3b82f6"
                />
                <StatBox
                    label="O'YINLAR"
                    value={stats.matchesPlayed}
                    icon="calendar"
                    color="#FFF"
                />
                <StatBox
                    label="REYTING"
                    value={player.rating || 0}
                    icon="trending-up"
                    color="#FACC15"
                />
            </View>

            <View style={styles.physicalInfoBox}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.cardContent}>
                    <View style={styles.statItem}>
                        <View style={styles.statIconBox}>
                            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.statLabelSmall}>YOSHI</Text>
                            <Text style={styles.statValueSmall}>{player?.age || '—'}</Text>
                        </View>
                    </View>
                    <View style={styles.statItem}>
                        <View style={styles.statIconBox}>
                            <Ionicons name="resize-outline" size={18} color={Colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.statLabelSmall}>BO'YI</Text>
                            <Text style={styles.statValueSmall}>{player?.height ? `${player.height} SM` : '—'}</Text>
                        </View>
                    </View>
                    <View style={styles.statItem}>
                        <View style={styles.statIconBox}>
                            <Ionicons name="fitness-outline" size={18} color={Colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.statLabelSmall}>VAZNI</Text>
                            <Text style={styles.statValueSmall}>{player?.weight ? `${player.weight} KG` : '—'}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.infoSection}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="person-circle" size={20} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>SHAXSIY <Text style={styles.sectionTitleHighlight}>MA'LUMOTLAR</Text></Text>
                </View>
                <View style={styles.infoList}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <InfoRow label="OTASINING ISMI" value={player.fatherName || '---'} icon="person" />
                    <InfoRow label="MILLATI" value={player.citizenship || '---'} icon="planet" />
                    <InfoRow label="POZITSIYA" value={player.positionUz || player.position || '---'} icon="shield" />
                    <InfoRow label="TELEFON" value={player.phone || '---'} icon="call" />
                </View>
            </View>

            {/* INSTAGRAM & UPDATE REQUEST BUTTONS */}
            <View style={{ marginTop: 20, gap: 12, marginBottom: 35 }}>
                <TouchableOpacity
                    onPress={() => setShowInstagramModal(true)}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        backgroundColor: 'rgba(225, 48, 108, 0.15)',
                        borderColor: 'rgba(225, 48, 108, 0.4)',
                        borderWidth: 1,
                        paddingVertical: 14,
                        borderRadius: 16
                    }}
                >
                    <FontAwesome5 name="instagram" size={20} color="#E1306C" />
                    <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13, textTransform: 'uppercase' }}>
                        {instagramUsername ? `INSTAGRAM: @${instagramUsername}` : 'INSTAGRAM PROFILINI ULASH'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleOpenUpdateModal}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        backgroundColor: 'rgba(0, 255, 102, 0.15)',
                        borderColor: 'rgba(0, 255, 102, 0.4)',
                        borderWidth: 1,
                        paddingVertical: 14,
                        borderRadius: 16
                    }}
                >
                    <Ionicons name="create-outline" size={20} color={Colors.primary} />
                    <Text style={{ color: Colors.primary, fontWeight: '900', fontSize: 13, textTransform: 'uppercase' }}>
                        MA'LUMOTLARNI QAYTA KO'RIB CHIQISH
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    const renderCareer = () => {
        const history = player?.careerHistory || [];

        return (
            <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                    <Ionicons name="time-outline" size={20} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>KARYERA <Text style={styles.sectionTitleHighlight}>TARIXI</Text></Text>
                </View>

                <View style={styles.careerTimelineContainer}>
                    {history.length > 0 ? (
                        history.map((yearGroup: any) => (
                            <View key={yearGroup.year} style={styles.yearBlock}>
                                <View style={styles.yearHeaderBadge}>
                                    <Text style={styles.yearHeaderText}>{yearGroup.year}</Text>
                                    <View style={styles.yearStatLabels}>
                                        <Text style={styles.statColLabel}>И</Text>
                                        <Text style={styles.statColLabel}>G</Text>
                                        <Text style={styles.statColLabel}>P</Text>
                                    </View>
                                </View>

                                {yearGroup.teams.map((team: any) => (
                                    <View key={team.teamId} style={styles.teamCareerWrapper}>
                                        <View style={styles.teamMainRow}>
                                            <View style={styles.teamIconBox}>
                                                {team.teamLogo ? (
                                                    <Image source={{ uri: team.teamLogo }} style={styles.teamMiniLogo} />
                                                ) : (
                                                    <Ionicons name="shield" size={14} color={Colors.primary} />
                                                )}
                                                <View style={styles.timelineVerticalLine} />
                                            </View>
                                            <Text style={styles.teamNameCareer} numberOfLines={1}>{team.teamName?.toUpperCase()}</Text>
                                            <View style={styles.teamTotalStats}>
                                                <Text style={styles.teamStatVal}>{team.total.matchesPlayed}</Text>
                                                <Text style={styles.teamStatVal}>{team.total.goals}</Text>
                                                <Text style={styles.teamStatVal}>{team.total.assists}</Text>
                                            </View>
                                        </View>

                                        {team.tournaments.map((tour: any, tourIdx: number) => (
                                            <View key={tourIdx} style={styles.tournamentRow}>
                                                <View style={styles.tourIconWrap}>
                                                    <Ionicons name="football" size={12} color="rgba(255,255,255,0.4)" />
                                                </View>
                                                <Text style={styles.tourNameText} numberOfLines={1}>{tour.name}</Text>
                                                <View style={styles.tourStatsRow}>
                                                    <Text style={styles.tourStatVal}>{tour.matchesPlayed}</Text>
                                                    <Text style={styles.tourStatVal}>{tour.goals}</Text>
                                                    <Text style={styles.tourStatVal}>{tour.assists}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyCareer}>
                            <Text style={styles.emptyCareerText}>Karyera tarixi topilmadi</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        );
    };

    const renderMatches = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                <Ionicons name="football-outline" size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>O'TGAN <Text style={styles.sectionTitleHighlight}>O'YINLAR</Text></Text>
            </View>

            {matchesLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
            ) : matches.length > 0 ? (
                matches.map((match: any) => (
                    <MatchCard key={match.id} match={match} />
                ))
            ) : (
                <View style={styles.emptyCareer}>
                    <Text style={styles.emptyCareerText}>O'yinlar tarixi mavjud emas</Text>
                </View>
            )}
        </ScrollView>
    );

    const instagramUrl = instagramUsername ? `https://www.instagram.com/${instagramUsername}/` : null;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
            >
                <View style={styles.heroSection}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.brandText}>AMATORA</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <View style={styles.profileHeader}>
                        <View style={styles.photoContainer}>
                            <View style={[styles.mainPhotoWrapper, { shadowColor: 'transparent' }]}>
                                <SmartImage
                                    uri={player.photo || player.avatar}
                                    style={styles.profilePhoto}
                                    contentFit="cover"
                                    fallbackIcon="person"
                                    borderRadius={15}
                                />
                            </View>
                            <View style={styles.numberOverlay}>
                                <Text style={styles.numberText}>#{player.number || '0'}</Text>
                            </View>
                        </View>

                        <View style={styles.nameContainer}>
                            <View style={styles.badgeRow}>
                                <View style={[
                                    styles.statusBadge,
                                    player.status === 'inactive' && { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        player.status === 'inactive' && { color: '#EF4444' }
                                    ]}>
                                        {player.status === 'inactive' ? 'NOFAOL' : 'FAOL'} O'YINCHI
                                    </Text>
                                </View>
                                <View style={styles.ratingBadge}>
                                    <Text style={styles.ratingText}>★ {player?.rating || 0}</Text>
                                </View>
                            </View>

                            <Text style={styles.firstName}>{player.firstName}</Text>
                            <Text style={styles.lastName}>{player.lastName}</Text>
                            
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                                <View style={styles.posBadge}>
                                    <Text style={styles.posText}>{player?.position || 'O\'YINCHI'}</Text>
                                </View>

                                {instagramUrl ? (
                                    <TouchableOpacity
                                        onPress={() => Linking.openURL(instagramUrl)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 4,
                                            backgroundColor: 'rgba(225, 48, 108, 0.15)',
                                            borderColor: 'rgba(225, 48, 108, 0.4)',
                                            borderWidth: 1,
                                            paddingHorizontal: 10,
                                            paddingVertical: 4,
                                            borderRadius: 8
                                        }}
                                    >
                                        <FontAwesome5 name="instagram" size={13} color="#E1306C" />
                                        <Text style={{ color: '#E1306C', fontSize: 11, fontWeight: '800' }}>
                                            @{instagramUsername}
                                        </Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Slider-Style Tab Switcher */}
                <View style={styles.switcherWrapper}>
                    <View style={styles.carouselContainer}>
                        <View style={styles.animatedCardWrapper}>
                            <Animated.View style={[styles.miniTabCard, { transform: [{ translateX: slideAnim }] }]}>
                                <View style={styles.miniTabInner}>
                                    <View style={styles.miniTabIconBox}>
                                        <Ionicons 
                                            name={
                                                activeTab === 'profil' ? 'person' : 
                                                activeTab === 'karyerasi' ? 'trophy' : 'football'
                                            } 
                                            size={20} 
                                            color={Colors.primary} 
                                        />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.miniTabType}>BO'LIM</Text>
                                        <Text style={styles.miniTabName}>{tabLabels[activeTab]}</Text>
                                    </View>
                                </View>
                            </Animated.View>
                        </View>
                    </View>

                    <TouchableOpacity onPress={nextTab} style={styles.navArrowBtnLarge}>
                        <Ionicons name="chevron-forward" size={32} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.mainContent}>
                    <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
                        {activeTab === 'profil' && renderProfil()}
                        {activeTab === 'karyerasi' && renderCareer()}
                        {activeTab === 'oyinlari' && renderMatches()}
                    </Animated.View>
                </View>
            </ScrollView>

            {/* INSTAGRAM MODAL */}
            <Modal visible={showInstagramModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <FontAwesome5 name="instagram" size={24} color="#E1306C" />
                            <Text style={styles.modalTitle}>INSTAGRAM PROFILINI ULASH</Text>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Instagram usernamesini kiriting (masalan: omankulofff)
                        </Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="omankulofff"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={instagramInput}
                            onChangeText={setInstagramInput}
                            autoCapitalize="none"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                onPress={() => setShowInstagramModal(false)}
                                style={styles.modalCancelBtn}
                            >
                                <Text style={styles.modalCancelText}>BEKOR QILISH</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleSaveInstagram}
                                disabled={savingInstagram}
                                style={styles.modalSaveBtn}
                            >
                                {savingInstagram ? (
                                    <ActivityIndicator size="small" color="#000" />
                                ) : (
                                    <Text style={styles.modalSaveText}>SAQLASH</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* PROFILE UPDATE FORM MODAL */}
            <Modal visible={showProfileUpdateModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '85%' }]}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.modalHeader}>
                                <Ionicons name="create" size={24} color={Colors.primary} />
                                <Text style={styles.modalTitle}>MA'LUMOTLARNI QAYTA KO'RIB CHIQISH</Text>
                            </View>

                            <View style={{ gap: 12, marginTop: 15 }}>
                                <View>
                                    <Text style={styles.inputLabel}>FOTO RASYM URL</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        value={updateForm.photoUrl}
                                        onChangeText={val => setUpdateForm(prev => ({ ...prev, photoUrl: val }))}
                                        placeholder="https://..."
                                        placeholderTextColor="rgba(255,255,255,0.4)"
                                    />
                                </View>

                                <View>
                                    <Text style={styles.inputLabel}>ISMI</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        value={updateForm.firstName}
                                        onChangeText={val => setUpdateForm(prev => ({ ...prev, firstName: val }))}
                                    />
                                </View>

                                <View>
                                    <Text style={styles.inputLabel}>FAMILIYASI</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        value={updateForm.lastName}
                                        onChangeText={val => setUpdateForm(prev => ({ ...prev, lastName: val }))}
                                    />
                                </View>

                                <View>
                                    <Text style={styles.inputLabel}>OTASINING ISMI</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        value={updateForm.fatherName}
                                        onChangeText={val => setUpdateForm(prev => ({ ...prev, fatherName: val }))}
                                    />
                                </View>

                                <View>
                                    <Text style={styles.inputLabel}>TELEFON RAQAMI</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        value={updateForm.phone}
                                        onChangeText={val => setUpdateForm(prev => ({ ...prev, phone: val }))}
                                        keyboardType="phone-pad"
                                    />
                                </View>

                                <View>
                                    <Text style={styles.inputLabel}>POZITSIYA</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        value={updateForm.position}
                                        onChangeText={val => setUpdateForm(prev => ({ ...prev, position: val }))}
                                        placeholder="Hujumchi, Yarim himoyachi..."
                                        placeholderTextColor="rgba(255,255,255,0.4)"
                                    />
                                </View>

                                <View>
                                    <Text style={styles.inputLabel}>FORMA RAQAMI</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        value={updateForm.playerNumber}
                                        onChangeText={val => setUpdateForm(prev => ({ ...prev, playerNumber: val }))}
                                        keyboardType="number-pad"
                                    />
                                </View>
                            </View>

                            <View style={[styles.modalButtons, { marginTop: 20 }]}>
                                <TouchableOpacity
                                    onPress={() => setShowProfileUpdateModal(false)}
                                    style={styles.modalCancelBtn}
                                >
                                    <Text style={styles.modalCancelText}>BEKOR QILISH</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleSubmitProfileUpdate}
                                    disabled={submittingUpdate}
                                    style={styles.modalSaveBtn}
                                >
                                    {submittingUpdate ? (
                                        <ActivityIndicator size="small" color="#000" />
                                    ) : (
                                        <Text style={styles.modalSaveText}>YUBORISH</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* SUCCESS CONFIRMATION MODAL */}
            <Modal visible={showSuccessModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { alignItems: 'center', padding: 25 }]}>
                        <View style={{
                            width: 60,
                            height: 60,
                            borderRadius: 30,
                            backgroundColor: 'rgba(0, 255, 102, 0.2)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 15
                        }}>
                            <Ionicons name="checkmark-circle" size={40} color={Colors.primary} />
                        </View>

                        <Text style={[styles.modalTitle, { textAlign: 'center', marginBottom: 8 }]}>
                            ARIZA MUVAFFAQIYATLI YUBORILDI
                        </Text>

                        <Text style={{
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: 13,
                            textAlign: 'center',
                            marginBottom: 20,
                            lineHeight: 18
                        }}>
                            Sizning ma'lumotlarni almashtirish bo'yicha arizangiz muvaffaqiyatli yuborildi. Tashkilotchilar ko'rib chiqqach sizga xabar beramiz.
                        </Text>

                        <TouchableOpacity
                            onPress={() => setShowSuccessModal(false)}
                            style={[styles.modalSaveBtn, { width: '100%' }]}
                        >
                            <Text style={styles.modalSaveText}>TUSHUNDIM</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const StatBox = ({ label, value, icon, color }: any) => (
    <View style={styles.statBox}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.statLabelSmall}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
    </View>
);

const InfoRow = ({ label, value, icon }: any) => (
    <View style={styles.infoRow}>
        <View style={styles.infoIconBox}>
            <Ionicons name={icon} size={16} color={Colors.primary} />
        </View>
        <View>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    </View>
);

const MatchCard = ({ match }: any) => {
    return (
        <View style={styles.matchCard}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.matchTop}>
                <Text style={styles.matchLeague}>{match.leagueName || 'Amatora Turniri'}</Text>
                <Text style={styles.matchDate}>{new Date(match.date).toLocaleDateString('uz-UZ')}</Text>
            </View>
            <View style={styles.matchTeams}>
                <View style={styles.teamInfo}>
                    <SmartImage uri={match.homeTeam?.logo} style={styles.matchTeamLogo} contentFit="contain" />
                    <Text style={styles.matchTeamName} numberOfLines={1}>{match.homeTeam?.name}</Text>
                </View>
                <View style={styles.matchScore}>
                    <Text style={styles.scoreText}>{match.score?.home ?? 0}:{match.score?.away ?? 0}</Text>
                </View>
                <View style={styles.teamInfo}>
                    <SmartImage uri={match.awayTeam?.logo} style={styles.matchTeamLogo} contentFit="contain" />
                    <Text style={styles.matchTeamName} numberOfLines={1}>{match.awayTeam?.name}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050811',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    emptyContainer: {
        flex: 1,
        backgroundColor: '#050811',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContent: {
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFF',
        marginTop: 15,
        letterSpacing: 1,
    },
    emptySub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 18,
    },
    loginBtn: {
        marginTop: 20,
        backgroundColor: Colors.primary,
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 12,
    },
    loginBtnText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 12,
    },
    heroSection: {
        paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 40,
        paddingHorizontal: 20,
        paddingBottom: 15,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    brandText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 2,
        fontStyle: 'italic',
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    photoContainer: {
        position: 'relative',
    },
    mainPhotoWrapper: {
        width: 90,
        height: 105,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: Colors.primary,
    },
    profilePhoto: {
        width: '100%',
        height: '100%',
    },
    numberOverlay: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        backgroundColor: Colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    numberText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 12,
    },
    nameContainer: {
        flex: 1,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    statusBadge: {
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        borderColor: 'rgba(0, 255, 102, 0.2)',
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    statusText: {
        color: Colors.primary,
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    ratingBadge: {
        backgroundColor: 'rgba(250, 204, 21, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    ratingText: {
        color: '#FACC15',
        fontSize: 10,
        fontWeight: '900',
    },
    firstName: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFF',
        lineHeight: 22,
    },
    lastName: {
        fontSize: 20,
        fontWeight: '900',
        color: Colors.primary,
        lineHeight: 22,
    },
    posBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    posText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        fontWeight: '700',
    },
    switcherWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginVertical: 10,
    },
    carouselContainer: {
        flex: 1,
    },
    animatedCardWrapper: {
        overflow: 'hidden',
    },
    miniTabCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 14,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    miniTabInner: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniTabIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    miniTabType: {
        fontSize: 9,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 1,
    },
    miniTabName: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    navArrowBtnLarge: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.2)',
    },
    mainContent: {
        paddingHorizontal: 20,
    },
    tabContent: {
        flex: 1,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 15,
    },
    statBox: {
        width: (width - 50) / 2,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 16,
        padding: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    statIconContainer: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    statLabelSmall: {
        fontSize: 9,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFF',
        marginTop: 2,
    },
    physicalInfoBox: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        marginBottom: 15,
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 14,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(0,255,102,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValueSmall: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFF',
    },
    infoSection: {
        marginTop: 5,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    sectionTitleHighlight: {
        color: Colors.primary,
    },
    infoList: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        padding: 12,
        gap: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoIconBox: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFF',
    },
    careerTimelineContainer: {
        marginTop: 5,
    },
    yearBlock: {
        marginBottom: 15,
    },
    yearHeaderBadge: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        marginBottom: 8,
    },
    yearHeaderText: {
        color: Colors.primary,
        fontWeight: '900',
        fontSize: 12,
    },
    yearStatLabels: {
        flexDirection: 'row',
        gap: 15,
    },
    statColLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        fontWeight: '800',
        width: 15,
        textAlign: 'center',
    },
    teamCareerWrapper: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 10,
        marginBottom: 6,
    },
    teamMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    teamIconBox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    teamMiniLogo: {
        width: 18,
        height: 18,
        resizeMode: 'contain',
    },
    timelineVerticalLine: {
        display: 'none',
    },
    teamNameCareer: {
        flex: 1,
        color: '#FFF',
        fontWeight: '800',
        fontSize: 12,
    },
    teamTotalStats: {
        flexDirection: 'row',
        gap: 15,
    },
    teamStatVal: {
        color: Colors.primary,
        fontWeight: '900',
        fontSize: 12,
        width: 15,
        textAlign: 'center',
    },
    tournamentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        paddingLeft: 32,
    },
    tourIconWrap: {
        marginRight: 6,
    },
    tourNameText: {
        flex: 1,
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        fontWeight: '600',
    },
    tourStatsRow: {
        flexDirection: 'row',
        gap: 15,
    },
    tourStatVal: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        fontWeight: '700',
        width: 15,
        textAlign: 'center',
    },
    emptyCareer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyCareerText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
    },
    matchCard: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        padding: 12,
        marginBottom: 10,
    },
    matchTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    matchLeague: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.primary,
    },
    matchDate: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
    },
    matchTeams: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    teamInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    matchTeamLogo: {
        width: 20,
        height: 20,
    },
    matchTeamName: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },
    matchScore: {
        backgroundColor: 'rgba(0, 255, 102, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
        marginHorizontal: 10,
    },
    scoreText: {
        color: Colors.primary,
        fontWeight: '900',
        fontSize: 13,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#0c101c',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    modalSubtitle: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.primary,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    modalInput: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 15,
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
    },
    modalCancelText: {
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '800',
        fontSize: 12,
    },
    modalSaveBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: Colors.primary,
        alignItems: 'center',
    },
    modalSaveText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 12,
    },
});

export default MyStatsScreen;

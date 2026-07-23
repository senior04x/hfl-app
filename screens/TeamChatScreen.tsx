import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Modal,
    Dimensions,
    PanResponder,
    Animated,
    ActivityIndicator,
    LayoutAnimation,
    UIManager,
    Alert,
    Keyboard,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';
import { useAuthStore } from '../store/useAuthStore';
import { useSocket } from '../context/SocketContext';
import { apiService, supabase } from '../services/apiService';
import SmartImage from '../components/SmartImage';
import ChatSkeleton from '../components/ChatSkeleton';
import AnimatedBackground from '../components/AnimatedBackground';
import backgroundImage from '../assets/images/backroud-image.png';

const TeamChatScreen = ({ route, navigation }: any) => {
    const { teamId } = route.params;
    const { user } = useAuthStore();
    const insets = useSafeAreaInsets();
    
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [teamInfo, setTeamInfo] = useState<any>(null);
    const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
    const [showMembers, setShowMembers] = useState(false);
    const { socket, isConnected } = useSocket();
    const flatListRef = useRef<any>(null);
    
    // Context Menu States
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editMessageId, setEditMessageId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState({ y: 0, height: 0 });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const menuScaleAnim = useRef(new Animated.Value(0)).current;
    const menuFadeAnim = useRef(new Animated.Value(0)).current;
    const messageRefs = useRef<{ [key: string]: any }>({});
    const [isRateLimited, setIsRateLimited] = useState(false);

    // Initialize LayoutAnimation for Android
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    const { height } = Dimensions.get('window');
    const pan = useRef(new Animated.ValueXY()).current;

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
            onPanResponderMove: Animated.event([null, { dy: pan.y }], { useNativeDriver: false }),
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 150) {
                    setShowMembers(false);
                    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
                } else {
                    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
                }
            },
        })
    ).current;

    // Privacy Check
    const userTeamId = user?.teamId || user?.team_id || (user?.role === 'manager' ? (user?.id || user?._id) : null);
    const hasPermission = user && (
        String(userTeamId) === String(teamId) ||
        user.role === 'admin' ||
        user.role === 'manager' ||
        user.role === 'coach' ||
        user.role === 'trainer' ||
        user.role === 'team_admin'
    );

    if (!hasPermission) {
        return (
            <View style={{ flex: 1, backgroundColor: '#000' }}>
                <AnimatedBackground />
                <SafeAreaView style={styles.container} edges={['top']}>
                    <View style={styles.header}>
                        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={28} color={Colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>RUXSAT YO'Q</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                        <Ionicons name="lock-closed-outline" size={80} color={Colors.danger} />
                        <Text style={styles.errorText}>Siz bu jamoa a'zosi emassiz</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    const fetchMessages = async (pageNum = 1, force = false) => {
        if ((loading || isFetchingMore) && !force) return;
        
        try {
            if (pageNum === 1) setLoading(true);
            else setIsFetchingMore(true);

            const [msgData, tInfo, tPlayers] = await Promise.all([
                apiService.getChatMessages(teamId, 1, 300), // Load 300 at once for now
                pageNum === 1 ? apiService.getTeamById(teamId) : Promise.resolve(teamInfo),
                pageNum === 1 ? apiService.getPlayersByTeam(teamId) : Promise.resolve(teamPlayers)
            ]);

            if (pageNum === 1) {
                setMessages(msgData || []);
                setTeamInfo(tInfo);
                setTeamPlayers(tPlayers || []);
            } else {
                if (msgData && msgData.length > 0) {
                    setMessages(prev => {
                        const newMessages = msgData.filter((newMsg: any) => 
                            !prev.some((oldMsg: any) => 
                                (oldMsg._id === newMsg._id) || 
                                (oldMsg.id === newMsg._id) ||
                                (newMsg.localId && oldMsg.localId === newMsg.localId)
                            )
                        );
                        // SAFE FIX: Strictly sort merged lists by timestamp descending without mutating existing list shapes
                        return [...prev, ...newMessages].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    });
                }
            }

            if (!msgData || msgData.length < 20) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
        } catch (error) {
            console.error('Error fetching chat data:', error);
        } finally {
            setLoading(false);
            setIsFetchingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!hasMore || isFetchingMore || loading) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchMessages(nextPage);
    };

    const { resetUnreadCount, isChatMuted, toggleChatMute } = useAuthStore();

    useEffect(() => {
        fetchMessages(1, true);
        resetUnreadCount();
        
        if (socket && teamId && isConnected) {
            socket.emit('join-team', teamId);
        }

        // Supabase Realtime Channel for instant team chat
        const channel = supabase
            .channel(`team_chat_${teamId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'team_messages',
                    filter: `team_id=eq.${teamId}`
                },
                (payload) => {
                    const m = payload.new;
                    const newMsg = {
                        _id: m.id,
                        id: m.id,
                        teamId: m.team_id,
                        senderId: m.sender_id,
                        senderName: m.sender_name || 'Foydalanuvchi',
                        senderPhoto: m.sender_photo || '',
                        text: m.text,
                        timestamp: m.created_at,
                        replyTo: m.reply_to
                    };

                    setMessages((prev) => {
                        if (prev.some(old => old._id === newMsg._id || old.id === newMsg.id)) return prev;
                        if (Platform.OS === 'ios') {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                        }
                        return [newMsg, ...prev];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [teamId]);

    // Resync messages when socket reconnects (fixes offline gaps)
    const prevConnectedRef = useRef(isConnected);
    const isFetchingGapRef = useRef(false);
    useEffect(() => {
        if (!prevConnectedRef.current && isConnected) {
            // SAFE FIX: Prevent duplicate rapid fetch calls on network flutter using a simple ref guard
            if (!isFetchingGapRef.current) {
                isFetchingGapRef.current = true;
                console.log('🔄 Socket reconnected, fetching missed messages gap safely...');
                fetchMessages(1, true).finally(() => {
                    setTimeout(() => isFetchingGapRef.current = false, 2000);
                });
            }
        }
        prevConnectedRef.current = isConnected;
    }, [isConnected]);

    useEffect(() => {
        if (socket && teamId) {
            const messageHandler = (message: any) => {
                setMessages((prev) => {
                    const isMyMessage = String(message.senderId) === String(user?._id || user?.id);
                    
                    if (isMyMessage) {
                        const tempIndex = prev.findIndex(m => (m.localId && m.localId === message.localId) || (m._id?.startsWith('temp-') && m.text === message.text));
                        if (tempIndex !== -1) {
                            return prev.map((m, i) => i === tempIndex ? { ...message, localId: m.localId } : m);
                        }
                    }

                    if (prev.some(m => m._id === message._id)) return prev;

                    // Smooth animation (Only for non-my messages or if not found)
                    if (Platform.OS === 'ios') {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                    }
                    return [message, ...prev];
                });
            };

            const updateHandler = (data: { messageId: string, text: string, edited: boolean }) => {
                setMessages((prev) => prev.map(msg => 
                    (msg._id || msg.id) === data.messageId 
                    ? { ...msg, text: data.text, edited: data.edited } 
                    : msg
                ));
            };

            const errorHandler = (data: { messageId: string, error: string }) => {
                setMessages((prev) => prev.map(msg => 
                    (msg._id === data.messageId || msg.localId === data.messageId)
                    ? { ...msg, isError: true, errorMessage: data.error } 
                    : msg
                ));
            };

            const generalErrorHandler = (errStr: string) => {
                if (typeof errStr === 'string' && errStr.toLowerCase().includes('rate limit')) {
                    Alert.alert('Cheklov', 'Juda ko\'p xabar yubordingiz. Iltimos 5 soniya kuting.');
                    setIsRateLimited(true);
                    setTimeout(() => setIsRateLimited(false), 5000);
                } else if (typeof errStr === 'string') {
                    Alert.alert('Xatolik', errStr);
                }
            };

            socket.on('new-team-message', messageHandler);
            socket.on('message-updated', updateHandler);
            socket.on('message-save-error', errorHandler);
            socket.on('error', generalErrorHandler);
            
            return () => {
                socket.off('new-team-message', messageHandler);
                socket.off('message-updated', updateHandler);
                socket.off('message-save-error', errorHandler);
                socket.off('error', generalErrorHandler);
            };
        }
    }, [teamId, socket]);

    const retryMessage = (msg: any) => {
        if (isRateLimited) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        // Remove error state visually immediately
        setMessages((prev) => prev.map(m => 
            (m._id === msg._id || m.localId === msg.localId) 
            ? { ...m, isError: false, errorMessage: undefined } 
            : m
        ));

        if (socket && teamId) {
            // SAFE FIX: Send exact cloned payload, preserving fixed _id preventing duplicate DB inserts when backend recovers
            const payload = { ...msg };
            delete payload.isError;
            delete payload.errorMessage;
            socket.emit('send-team-message', payload);
        }
    };

    const sendMessage = () => {
        if (!inputText.trim() || !user) return;

        // Trigger haptics on send (Light and crisp)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Premium Telegram-style "Pop/Spring" animation
        LayoutAnimation.configureNext({
            duration: 450,
            create: {
                type: LayoutAnimation.Types.spring,
                property: LayoutAnimation.Properties.scaleXY,
                springDamping: 0.65,
                initialVelocity: 2,
            },
            update: {
                type: LayoutAnimation.Types.spring,
                springDamping: 0.7,
            },
            delete: {
                type: LayoutAnimation.Types.linear,
                property: LayoutAnimation.Properties.opacity,
            }
        });

        if (isEditing && editMessageId) {
            // Update existing message
            setMessages((prev) => prev.map(msg => 
                (msg._id || msg.id) === editMessageId 
                ? { ...msg, text: inputText.trim(), edited: true } 
                : msg
            ));
            
            if (socket && teamId) {
                socket.emit('edit-team-message', {
                    messageId: editMessageId,
                    text: inputText.trim(),
                    teamId
                });
            }
        } else {
            // Send new message
            const isTeamAcc = user.role === 'team' || user.role === 'admin';
            const localId = `local-${Date.now()}`;
            const senderName = isTeamAcc 
                ? (teamInfo?.name || 'TEAM') 
                : ((user.firstName || user.name || '') + (user.lastName ? ` ${user.lastName}` : '') || 'Foydalanuvchi').trim();
            
            const messageData = {
                _id: `temp-${Date.now()}`,
                localId,
                teamId,
                senderId: user._id || user.id,
                senderName,
                senderPhoto: isTeamAcc ? teamInfo?.logo : (user.photo || user.avatar),
                text: inputText.trim(),
                timestamp: new Date().toISOString(),
                edited: false,
                role: user.role
            };

            setMessages((prev) => [messageData, ...prev]);

            // Save to Supabase for persistent realtime team chat
            apiService.sendChatMessage(messageData);

            if (socket && teamId) {
                socket.emit('send-team-message', messageData);
            }
        }

        setInputText('');
        setIsEditing(false);
        setEditMessageId(null);
    };

    const copyToClipboard = async (text: string) => {
        await Clipboard.setStringAsync(text);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        closeMenu();
    };

    const closeMenu = () => {
        Animated.parallel([
            Animated.timing(menuScaleAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(menuFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true })
        ]).start(() => {
            setIsMenuVisible(false);
            setSelectedMessage(null);
        });
    };

    const handleDelete = (msgId: string) => {
        Alert.alert(
            "Xabarni o'chirish",
            "Haqiqatan ham ushbu xabarni o'chirmoqchimisiz?",
            [
                { text: "Bekor qilish", style: "cancel" },
                { 
                    text: "O'chirish", 
                    style: "destructive", 
                    onPress: () => {
                        setMessages(prev => prev.filter(m => (m._id || m.id) !== msgId));
                        setIsMenuVisible(false);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    } 
                }
            ]
        );
    };

    const handleEdit = (msg: any) => {
        setInputText(msg.text);
        setIsEditing(true);
        setEditMessageId(msg._id || msg.id);
        setIsMenuVisible(false);
    };

    const MessageBubble = React.memo(({ item, isMe, isTeamMsg, senderDisplayName, senderDisplayPhoto }: any) => {
        const fadeAnim = useRef(new Animated.Value(0)).current;
        const slideAnim = useRef(new Animated.Value(20)).current;
        const scaleAnim = useRef(new Animated.Value(0.8)).current;

        useEffect(() => {
            Animated.parallel([
                Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
                Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 7 }),
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
            ]).start();
        }, []);

        return (
            <Animated.View style={[
                styles.messageRow, 
                isMe ? styles.myMessageRow : styles.otherMessageRow,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }
            ]}>
                <TouchableOpacity 
                    activeOpacity={0.9}
                    onLongPress={() => {
                        const msgId = item._id || item.id;
                        const ref = messageRefs.current[msgId];
                        if (ref) {
                            Keyboard.dismiss();
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setSelectedMessage(item);
                            setIsMenuVisible(true);
                            
                            // Trigger smooth animation
                            menuScaleAnim.setValue(0.9);
                            menuFadeAnim.setValue(0);
                            Animated.parallel([
                                Animated.spring(menuScaleAnim, {
                                    toValue: 1,
                                    tension: 50,
                                    friction: 8,
                                    useNativeDriver: true
                                }),
                                Animated.timing(menuFadeAnim, {
                                    toValue: 1,
                                    duration: 300,
                                    useNativeDriver: true
                                })
                            ]).start();
                        }
                    }}
                    delayLongPress={300}
                    style={{ width: '100%', flexDirection: isMe ? 'row-reverse' : 'row' }}
                >
                    <View 
                        ref={el => { messageRefs.current[item._id || item.id] = el; }}
                        style={{ flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', width: '100%' }}
                    >
                    {!isMe && (
                        <TouchableOpacity 
                            style={styles.avatarContainer}
                            onPress={() => {
                                if (!isTeamMsg && item.senderId) {
                                    navigation.navigate('PlayerStats', { playerId: item.senderId });
                                }
                            }}
                        >
                            <SmartImage
                                uri={senderDisplayPhoto || (isTeamMsg ? teamInfo?.logo : null)}
                                style={[
                                    styles.avatar,
                                    isTeamMsg && { borderRadius: 0, backgroundColor: 'transparent' }
                                ]}
                                contentFit={isTeamMsg ? "contain" : "cover"}
                                fallbackIcon="person"
                            />
                        </TouchableOpacity>
                    )}
                    
                    <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
                        {!isMe && <Text style={styles.senderName}>{senderDisplayName.toUpperCase()}</Text>}
                        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
                            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                            <Text style={[styles.messageText, isMe ? styles.myText : styles.otherText]}>{item.text}</Text>
                            <View style={styles.messageFooter}>
                                {item.edited && <Text style={[styles.editedLabel, isMe ? styles.myTimestamp : styles.otherTimestamp]}>tahrirlangan</Text>}
                                <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.otherTimestamp]}>
                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                            {item.isError && (
                                <TouchableOpacity onPress={() => retryMessage(item)} style={{ marginTop: 4, alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ color: Colors.danger, fontSize: 10, fontWeight: 'bold', marginRight: 4 }}>
                                        Yuborilmadi - Qaytadan
                                    </Text>
                                    <Ionicons name="refresh-circle" size={14} color={Colors.danger} />
                                </TouchableOpacity>
                            )}
                        </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    });

    const renderMessage = React.useCallback(({ item }: { item: any }) => {
        const isMe = String(item.senderId) === String(user?._id || user?.id);
        
        // Find player name from teamPlayers if missing in message
        const getSenderName = () => {
            if (item.senderName && item.senderName !== 'FOYDALANUVCHI' && item.senderName !== 'User') {
                return item.senderName;
            }
            const foundPlayer = teamPlayers.find((p: any) => String(p._id || p.id) === String(item.senderId));
            if (foundPlayer) {
                return `${foundPlayer.firstName} ${foundPlayer.lastName || ''}`.trim();
            }
            return 'FOYDALANUVCHI';
        };

        const isTeamMsg = item.role === 'team' || 
                         (item.senderName?.toUpperCase() === teamInfo?.name?.toUpperCase() && teamInfo?.name) ||
                         (item.senderName === 'TEAM');

        const senderDisplayName = isTeamMsg ? (teamInfo?.name || item.senderName || 'TEAM') : getSenderName();
        const senderDisplayPhoto = isTeamMsg ? (teamInfo?.logo || item.senderPhoto) : item.senderPhoto;

        return (
            <MessageBubble 
                item={item} 
                isMe={isMe} 
                isTeamMsg={isTeamMsg} 
                senderDisplayName={senderDisplayName} 
                senderDisplayPhoto={senderDisplayPhoto} 
            />
        );
    }, [user, teamInfo]);

    return (
        <AnimatedBackground overlayOpacity={0.8} backgroundImage={backgroundImage}>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.headerInfo} 
                        onPress={() => setShowMembers(true)}
                    >
                        <Text style={styles.headerTitle} numberOfLines={1}>{(teamInfo?.name || 'JAMOA CHATI').toUpperCase()}</Text>
                        <View style={styles.statusBadge}>
                            <View style={[styles.statusDot, { backgroundColor: isConnected ? Colors.primary : Colors.danger }]} />
                            <Text style={[styles.headerStatus, { color: isConnected ? Colors.primary : Colors.danger }]}>
                                {isConnected ? 'ONLINE' : 'ULANILMOQDA...'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        onPress={() => {
                            toggleChatMute();
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }} 
                        style={styles.muteButton}
                    >
                        <Ionicons 
                            name={isChatMuted ? "notifications-off" : "notifications"} 
                            size={22} 
                            color={isChatMuted ? "rgba(255,255,255,0.4)" : Colors.primary} 
                        />
                    </TouchableOpacity>

                    <View style={styles.headerLogoContainer}>
                        {teamInfo?.logo && (
                            <SmartImage uri={teamInfo.logo} style={styles.headerLogo} contentFit="contain" />
                        )}
                    </View>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
                >
                    {loading ? (
                        <ChatSkeleton />
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            inverted={true}
                            renderItem={renderMessage}
                            keyExtractor={(item, index) => item.localId || item._id || item.id || `msg-${index}`}
                            contentContainerStyle={styles.messageList}
                            onRefresh={() => fetchMessages(1, true)}
                            refreshing={loading}
                            onEndReached={handleLoadMore}
                            onEndReachedThreshold={0.1} // More sensitive to trigger loading earlier
                            ListFooterComponent={isFetchingMore ? (
                                <View style={{ paddingVertical: 20 }}>
                                    <ActivityIndicator size="small" color={Colors.primary} />
                                </View>
                            ) : null}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="interactive"
                            initialNumToRender={15}
                            removeClippedSubviews={Platform.OS === 'android'}
                            maxToRenderPerBatch={10}
                            windowSize={11}
                        />
                    )}

                    {isEditing && (
                        <View style={styles.editingBanner}>
                            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                            <View style={styles.editingInfo}>
                                <Ionicons name="create" size={16} color={Colors.primary} />
                                <Text style={styles.editingText} numberOfLines={1}>Tahrirlash: {inputText}</Text>
                            </View>
                            <TouchableOpacity onPress={() => { setIsEditing(false); setInputText(''); }}>
                                <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.5)" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={[
                        styles.inputContainer,
                        { paddingBottom: Platform.OS === 'ios' ? 30 : Math.max(insets.bottom, 12) }
                    ]}>
                        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
                        <TextInput
                            style={styles.input}
                            placeholder="Xabar yozing..."
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />
                        <TouchableOpacity 
                            style={[styles.sendButton, { backgroundColor: Colors.primary }, (!inputText.trim() || isRateLimited) && { opacity: 0.5 }]} 
                            onPress={sendMessage}
                            disabled={!inputText.trim() || isRateLimited}
                        >
                            <Ionicons name={isEditing ? "checkmark" : "send"} size={20} color="#000" />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* Message Context Menu (Telegram Style) */}
            <Modal
                visible={isMenuVisible}
                transparent={true}
                animationType="none"
                onRequestClose={closeMenu}
            >
                <TouchableOpacity 
                    style={styles.menuOverlay} 
                    activeOpacity={1} 
                    onPress={closeMenu}
                >
                    <Animated.View style={[StyleSheet.absoluteFill, { opacity: menuFadeAnim }]}>
                        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                    </Animated.View>
                    
                    {selectedMessage && (
                        <Animated.View style={[
                            styles.menuContent,
                            { 
                                alignItems: String(selectedMessage.senderId) === String(user?._id || user?.id) ? 'flex-end' : 'flex-start',
                                paddingHorizontal: 20,
                                opacity: menuFadeAnim,
                                transform: [{ scale: menuScaleAnim }]
                            }
                        ]}>
                            {/* Scaled Message Bubble */}
                            <View style={[
                                styles.messageBubble, 
                                String(selectedMessage.senderId) === String(user?._id || user?.id) ? styles.myBubble : styles.otherBubble,
                                { 
                                    transform: [{ scale: 1.1 }], 
                                    marginBottom: 30, 
                                    paddingVertical: 14, 
                                    paddingHorizontal: 20,
                                    backgroundColor: String(selectedMessage.senderId) === String(user?._id || user?.id) 
                                        ? 'rgba(0, 80, 45, 0.95)' // Darker Green for my messages
                                        : 'rgba(30, 30, 30, 0.95)', // Darker Gray for others
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.15)'
                                }
                            ]}>
                                <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                                <Text style={[
                                    styles.messageText, 
                                    { fontSize: 20, lineHeight: 28 }, // Larger font
                                    String(selectedMessage.senderId) === String(user?._id || user?.id) ? styles.myText : styles.otherText
                                ]}>
                                    {selectedMessage.text}
                                </Text>
                            </View>

                            {/* Action Menu */}
                            <View style={[styles.menuCard, { width: 220 }]}>
                                <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                                
                                <TouchableOpacity style={[styles.menuItem, { paddingVertical: 16 }]} onPress={() => copyToClipboard(selectedMessage.text)}>
                                    <Text style={[styles.menuItemText, { fontSize: 18 }]}>Nusxalash</Text>
                                    <Ionicons name="copy-outline" size={22} color="#FFF" />
                                </TouchableOpacity>

                                {String(selectedMessage.senderId) === String(user?._id || user?.id) && (
                                    <TouchableOpacity style={[styles.menuItem, styles.menuBorder, { paddingVertical: 16 }]} onPress={() => { closeMenu(); handleEdit(selectedMessage); }}>
                                        <Text style={[styles.menuItemText, { fontSize: 18 }]}>Tahrirlash</Text>
                                        <Ionicons name="create-outline" size={22} color="#FFF" />
                                    </TouchableOpacity>
                                )}

                                {(String(selectedMessage.senderId) === String(user?._id || user?.id) || user?.role === 'team' || user?.role === 'admin') && (
                                    <TouchableOpacity style={[styles.menuItem, styles.menuBorder, { paddingVertical: 16 }]} onPress={() => { closeMenu(); handleDelete(selectedMessage._id || selectedMessage.id); }}>
                                        <Text style={[styles.menuItemText, { color: Colors.danger, fontSize: 18 }]}>O'chirish</Text>
                                        <Ionicons name="trash-outline" size={22} color={Colors.danger} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </Animated.View>
                    )}
                </TouchableOpacity>
            </Modal>

            {/* Team Members Modal */}
            <Modal
                visible={showMembers}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowMembers(false)}
            >
                <Animated.View 
                    style={[
                        styles.modalOverlay, 
                        { transform: [{ translateY: pan.y.interpolate({ inputRange: [0, height], outputRange: [0, height], extrapolate: 'clamp' }) }] }
                    ]}
                >
                    <AnimatedBackground overlayOpacity={0.85} />
                    
                    <SafeAreaView style={{ flex: 1 }}>
                        <View {...panResponder.panHandlers} style={{ paddingBottom: 20 }}>
                            <View style={styles.dragHandleContainer}>
                                <View style={styles.dragHandle} />
                            </View>

                            <TouchableOpacity 
                                style={styles.closeButton} 
                                onPress={() => {
                                    setShowMembers(false);
                                    pan.setValue({ x: 0, y: 0 });
                                }}
                            >
                                <Ionicons name="close" size={28} color="#FFF" />
                            </TouchableOpacity>

                            <View style={styles.modalHeader}>
                                <SmartImage uri={teamInfo?.logo} style={styles.modalTeamLogo} contentFit="contain" />
                                <Text style={styles.modalTeamName}>{teamInfo?.name?.toUpperCase()}</Text>
                                <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '900', marginTop: 5 }}>JAMOADAGI BARCHA ISHTIROKCHILAR</Text>
                            </View>
                        </View>

                        <FlatList
                            data={teamPlayers}
                            keyExtractor={(item) => item._id || item.id}
                            contentContainerStyle={{ padding: 20 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.memberItem}
                                    onPress={() => {
                                        setShowMembers(false);
                                        navigation.navigate('PlayerStats', { playerId: item._id });
                                    }}
                                >
                                    <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
                                    <SmartImage 
                                        uri={item.photo || item.avatar} 
                                        style={{ width: 50, height: 50, borderRadius: 12 }} 
                                        fallbackIcon="person"
                                    />
                                    <View style={styles.memberInfo}>
                                        <Text style={styles.memberName}>{item.firstName} {item.lastName}</Text>
                                        <Text style={styles.memberPosition}>
                                            {item.role === 'manager' || item.role === 'trainer' ? 'TREYNER' : (item.position || 'O\'YINCHI')}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                                </TouchableOpacity>
                            )}
                        />
                    </SafeAreaView>
                </Animated.View>
            </Modal>
        </AnimatedBackground>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backButton: { padding: 5 },
    headerInfo: { flex: 1, alignItems: 'center', marginLeft: 15 },
    muteButton: { padding: 8, marginRight: 5 },
    headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    headerStatus: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    messageList: { padding: 15, paddingBottom: 20 },
    messageRow: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
    myMessageRow: { justifyContent: 'flex-end' },
    otherMessageRow: { justifyContent: 'flex-start' },
    avatarContainer: { marginRight: 10, marginBottom: 2 },
    avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)' },
    messageWrapper: { maxWidth: '80%' },
    myMessageWrapper: { alignItems: 'flex-end' },
    otherMessageWrapper: { alignItems: 'flex-start' },
    senderName: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', marginBottom: 4, marginLeft: 4, letterSpacing: 0.5 },
    messageBubble: { paddingVertical: 11, paddingHorizontal: 16, borderRadius: 18, overflow: 'hidden', borderWidth: 0 },
    myBubble: { backgroundColor: 'rgba(0, 223, 130, 0.28)', borderBottomRightRadius: 4 },
    otherBubble: { backgroundColor: 'rgba(255,255,255,0.15)', borderBottomLeftRadius: 10 },
    messageText: { fontSize: 18, lineHeight: 24, fontWeight: '500' },
    myText: { color: '#FFF' },
    otherText: { color: '#FFF' },
    messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
    editedLabel: { fontSize: 10, marginRight: 4, fontStyle: 'italic', opacity: 0.7 },
    timestamp: { fontSize: 10, marginTop: 0, fontWeight: '600' },
    myTimestamp: { color: 'rgba(255,255,255,0.5)', textAlign: 'right' },
    otherTimestamp: { color: 'rgba(255,255,255,0.3)', textAlign: 'left' },
    inputContainer: { flexDirection: 'row', padding: 12, paddingBottom: Platform.OS === 'ios' ? 30 : 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 22, paddingHorizontal: 20, paddingVertical: 10, color: '#FFF', fontSize: 17, marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    sendButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: 'rgba(255,255,255,0.6)', marginTop: 20, fontSize: 16, textAlign: 'center' },
    headerLogoContainer: { width: 34, height: 34, borderRadius: 10, overflow: 'hidden', marginLeft: 10, justifyContent: 'center', alignItems: 'center' },
    headerLogo: { width: '100%', height: '100%' },
    modalOverlay: { flex: 1, backgroundColor: '#000' },
    modalHeader: { padding: 40, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    modalTeamLogo: { width: 120, height: 120, marginBottom: 20 },
    modalTeamName: { color: '#FFF', fontSize: 26, fontWeight: '900', textAlign: 'center', letterSpacing: 1.5 },
    memberItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    memberInfo: { flex: 1, marginLeft: 15 },
    memberName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    memberPosition: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '900', marginTop: 4, letterSpacing: 1 },
    closeButton: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 20, right: 15, zIndex: 100, backgroundColor: 'rgba(255,255,255,0.1)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    dragHandleContainer: { width: '100%', height: 40, alignItems: 'center', justifyContent: 'center' },
    dragHandle: { width: 40, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.2)' },
    menuOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
    menuContent: { width: '100%' },
    menuCard: { 
        backgroundColor: 'rgba(255,255,255,0.1)', 
        borderRadius: 20, 
        width: 180, 
        overflow: 'hidden', 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.15)', 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 10 }, 
        shadowOpacity: 0.3, 
        shadowRadius: 20,
        elevation: 10 // Added for Android support
    },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 },
    menuItemText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
    menuBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    editingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
    editingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    editingText: { color: '#FFF', fontSize: 12, marginLeft: 8, opacity: 0.8 },
});

export default TeamChatScreen;

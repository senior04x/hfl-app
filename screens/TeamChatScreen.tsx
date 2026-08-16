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
    Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SmartBlurView as BlurView } from '../components/SmartBlurView';
import Colors from '../constants/Colors';
import { useAuthStore } from '../store/useAuthStore';
import { useSocket } from '../context/SocketContext';
import { apiService, supabase } from '../services/apiService';
import { notificationService } from '../services/notificationService';
import { useTranslation } from 'react-i18next';
import { getLocalizedPosition } from '../utils/localizationUtils';
import SmartImage from '../components/SmartImage';
import ChatSkeleton from '../components/ChatSkeleton';
import AnimatedBackground from '../components/AnimatedBackground';
import backgroundImage from '../assets/images/backroud-image.png';

const CHAT_CACHE_PREFIX = '@team_chat_messages_v2_';
const TEAM_INFO_CACHE_PREFIX = '@team_info_v2_';
const TEAM_PLAYERS_CACHE_PREFIX = '@team_players_v2_';

function TeamChatScreen({ route, navigation }: any) {
    const { t } = useTranslation();
    const { teamId, userId, userName } = route.params || {};
    const { user } = useAuthStore();
    const insets = useSafeAreaInsets();
    
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [teamInfo, setTeamInfo] = useState<any>(null);
    const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
    const [showMembers, setShowMembers] = useState(false);
    const [typingUsers, setTypingUsers] = useState<{ [userId: string]: { name: string; photo?: string } }>({});
    const { socket, isConnected } = useSocket();
    const flatListRef = useRef<any>(null);
    const channelRef = useRef<any>(null);
    const typingTimeoutRef = useRef<any>(null);
    const typingCleanupsRef = useRef<{ [userId: string]: any }>({});
    
    // Animation & Scroll Tracking
    const animatedMessageIds = useRef(new Set<string>());
    const isAtBottomRef = useRef(true);
    const [unreadNewCount, setUnreadNewCount] = useState(0);
    const sendButtonScale = useRef(new Animated.Value(1)).current;

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

    // Bouncing Dots Animation for Placeholder ("Xabar yozing . . .")
    const dot1Y = useRef(new Animated.Value(0)).current;
    const dot2Y = useRef(new Animated.Value(0)).current;
    const dot3Y = useRef(new Animated.Value(0)).current;

    // Dedicated 3-Dot Wave & Pulse Animation for Typing Message Bubble
    const typingDot1Y = useRef(new Animated.Value(0)).current;
    const typingDot2Y = useRef(new Animated.Value(0)).current;
    const typingDot3Y = useRef(new Animated.Value(0)).current;
    const typingDot1Opacity = useRef(new Animated.Value(0.35)).current;
    const typingDot2Opacity = useRef(new Animated.Value(0.35)).current;
    const typingDot3Opacity = useRef(new Animated.Value(0.35)).current;

    useEffect(() => {
        const createBounce = (animVal: Animated.Value, delay: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(animVal, { toValue: -5, duration: 240, useNativeDriver: true }),
                    Animated.timing(animVal, { toValue: 0, duration: 240, useNativeDriver: true }),
                    Animated.delay(480),
                ])
            );
        };

        const b1 = createBounce(dot1Y, 0);
        const b2 = createBounce(dot2Y, 150);
        const b3 = createBounce(dot3Y, 300);

        b1.start();
        b2.start();
        b3.start();

        const createTypingWave = (translateVal: Animated.Value, opacityVal: Animated.Value, delay: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.parallel([
                        Animated.timing(translateVal, { toValue: -6, duration: 240, useNativeDriver: true }),
                        Animated.timing(opacityVal, { toValue: 1, duration: 240, useNativeDriver: true }),
                    ]),
                    Animated.parallel([
                        Animated.timing(translateVal, { toValue: 0, duration: 240, useNativeDriver: true }),
                        Animated.timing(opacityVal, { toValue: 0.35, duration: 240, useNativeDriver: true }),
                    ]),
                    Animated.delay(360),
                ])
            );
        };

        const t1 = createTypingWave(typingDot1Y, typingDot1Opacity, 0);
        const t2 = createTypingWave(typingDot2Y, typingDot2Opacity, 160);
        const t3 = createTypingWave(typingDot3Y, typingDot3Opacity, 320);

        t1.start();
        t2.start();
        t3.start();

        return () => {
            b1.stop();
            b2.stop();
            b3.stop();
            t1.stop();
            t2.stop();
            t3.stop();
        };
    }, []);

    const openMembersModal = () => {
        pan.setValue({ x: 0, y: 0 });
        setShowMembers(true);
    };

    useEffect(() => {
        if (showMembers) {
            pan.setValue({ x: 0, y: 0 });
        }
    }, [showMembers]);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
            onPanResponderMove: Animated.event([null, { dy: pan.y }], { useNativeDriver: false }),
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 150) {
                    setShowMembers(false);
                    pan.setValue({ x: 0, y: 0 });
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
                        <Text style={styles.headerTitle}>{t('chat.access_denied')}</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                        <Ionicons name="lock-closed-outline" size={80} color={Colors.danger} />
                        <Text style={styles.errorText}>{t('chat.not_member')}</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    const saveMessagesCache = async (msgs: any[]) => {
        try {
            if (teamId && msgs && msgs.length > 0) {
                await AsyncStorage.setItem(`${CHAT_CACHE_PREFIX}${teamId}`, JSON.stringify(msgs.slice(0, 100)));
            }
        } catch (e) {}
    };

    const fetchMessages = async (pageNum = 1, force = false, silent = false) => {
        if ((loading || isFetchingMore) && !force) return;
        
        try {
            if (pageNum === 1 && !silent && messages.length === 0) {
                setLoading(true);
            } else if (pageNum > 1) {
                setIsFetchingMore(true);
            }

            const [msgData, tInfo, tPlayers] = await Promise.all([
                apiService.getChatMessages(teamId, pageNum, 30),
                pageNum === 1 ? apiService.getTeamById(teamId) : Promise.resolve(teamInfo),
                pageNum === 1 ? apiService.getPlayersByTeam(teamId) : Promise.resolve(teamPlayers)
            ]);

            // Pre-populate animated IDs so initial load / pagination items never flicker/animate
            if (msgData && Array.isArray(msgData)) {
                msgData.forEach((m: any) => {
                    if (m._id) animatedMessageIds.current.add(String(m._id));
                    if (m.id) animatedMessageIds.current.add(String(m.id));
                    if (m.localId) animatedMessageIds.current.add(String(m.localId));
                    if (m.clientMessageId) animatedMessageIds.current.add(String(m.clientMessageId));
                });
            }

            if (pageNum === 1) {
                setTeamInfo(tInfo);
                setTeamPlayers(tPlayers || []);
                
                setMessages(prev => {
                    if (!msgData || msgData.length === 0) return prev;
                    if (prev.length === 0) return msgData;
                    
                    // Prevent re-rendering if data hasn't changed
                    const isSame = prev.length === msgData.length && prev.every((m, idx) => 
                        (m._id === msgData[idx]._id || m.id === msgData[idx].id) &&
                        m.text === msgData[idx].text &&
                        m.edited === msgData[idx].edited
                    );
                    if (isSame) return prev;
                    return msgData;
                });

                if (msgData && msgData.length > 0) {
                    saveMessagesCache(msgData);
                }
                if (tInfo) {
                    AsyncStorage.setItem(`${TEAM_INFO_CACHE_PREFIX}${teamId}`, JSON.stringify(tInfo)).catch(() => {});
                }
                if (tPlayers) {
                    AsyncStorage.setItem(`${TEAM_PLAYERS_CACHE_PREFIX}${teamId}`, JSON.stringify(tPlayers)).catch(() => {});
                }
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
                        const merged = [...prev, ...newMessages].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                        saveMessagesCache(merged);
                        return merged;
                    });
                }
            }

            if (!msgData || msgData.length < 30) {
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

    // 0. Active chat tracking for suppressing foreground native push banners while inside room
    useEffect(() => {
        if (teamId) {
            notificationService.setActiveTeamChatId(teamId);
        }
        return () => {
            notificationService.setActiveTeamChatId(null);
        };
    }, [teamId]);

    // 1. Initial Cache Load & Silent Refresh
    useEffect(() => {
        let isMounted = true;

        const loadCacheAndSync = async () => {
            try {
                const keys = [
                    `${CHAT_CACHE_PREFIX}${teamId}`,
                    `${TEAM_INFO_CACHE_PREFIX}${teamId}`,
                    `${TEAM_PLAYERS_CACHE_PREFIX}${teamId}`
                ];
                const cachedData = await AsyncStorage.multiGet(keys);
                const cachedMsgs = cachedData[0][1] ? JSON.parse(cachedData[0][1]) : null;
                const cachedInfo = cachedData[1][1] ? JSON.parse(cachedData[1][1]) : null;
                const cachedPlayers = cachedData[2][1] ? JSON.parse(cachedData[2][1]) : null;

                if (isMounted) {
                    if (cachedMsgs && cachedMsgs.length > 0) {
                        // Pre-populate animated IDs so cache load never animates
                        cachedMsgs.forEach((m: any) => {
                            if (m._id) animatedMessageIds.current.add(String(m._id));
                            if (m.id) animatedMessageIds.current.add(String(m.id));
                            if (m.localId) animatedMessageIds.current.add(String(m.localId));
                            if (m.clientMessageId) animatedMessageIds.current.add(String(m.clientMessageId));
                        });
                        setMessages(cachedMsgs);
                        setLoading(false);
                    } else {
                        setLoading(true);
                    }
                    if (cachedInfo) setTeamInfo(cachedInfo);
                    if (cachedPlayers) setTeamPlayers(cachedPlayers);
                }
            } catch (e) {}

            // Silent background sync
            if (isMounted) {
                fetchMessages(1, true, true);
            }
        };

        loadCacheAndSync();
        resetUnreadCount();
        
        if (socket && teamId && isConnected) {
            socket.emit('join-team', teamId);
        }

        // Supabase Realtime Channel for instant team chat (INSERT, UPDATE, DELETE, TYPING)
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
                    const cleanReplyTo = m.reply_to 
                        ? (String(m.reply_to).replace('EDITED_', '').replace('EDITED', '').trim() || null) 
                        : null;
                    const isEdited = Boolean(m.is_edited || m.edited || String(m.reply_to || '').includes('EDITED'));

                    const newMsg = {
                        _id: m.id,
                        id: m.id,
                        teamId: m.team_id,
                        senderId: m.sender_id,
                        senderName: m.sender_name || 'Foydalanuvchi',
                        senderPhoto: m.sender_photo || '',
                        text: m.text,
                        timestamp: m.created_at,
                        replyTo: cleanReplyTo,
                        edited: isEdited
                    };

                    // Dismiss typing indicator for this sender smoothly
                    setTypingUsers(prev => {
                        if (prev[String(newMsg.senderId)]) {
                            const next = { ...prev };
                            delete next[String(newMsg.senderId)];
                            return next;
                        }
                        return prev;
                    });

                    // Auto-scroll or increment unread floating badge
                    if (isAtBottomRef.current) {
                        setTimeout(() => {
                            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                        }, 50);
                    } else {
                        const currentUserId = String(user?._id || user?.id || '');
                        if (String(newMsg.senderId) !== currentUserId) {
                            setUnreadNewCount(prev => prev + 1);
                        }
                    }

                    setMessages((prev) => {
                        // 1. Exact ID match check
                        if (prev.some(old => old._id === newMsg._id || old.id === newMsg.id)) return prev;

                        // 2. Replace optimistic temp message sent by current user
                        const currentUserId = String(user?._id || user?.id || '');
                        const isMyMessage = String(newMsg.senderId) === currentUserId;
                        if (isMyMessage) {
                            const tempIndex = prev.findIndex(old => 
                                (old._id && String(old._id).startsWith('temp-')) || 
                                (old.localId && String(old.localId).startsWith('local-')) ||
                                (old.text === newMsg.text && String(old.senderId) === currentUserId)
                            );
                            if (tempIndex !== -1) {
                                const next = prev.map((old, idx) => idx === tempIndex ? { ...newMsg, localId: old.localId } : old);
                                saveMessagesCache(next);
                                return next;
                            }
                        }

                        // 3. Deduplicate recent message with same text & senderId
                        const isDuplicateRecent = prev.some(old => 
                            old.text === newMsg.text && 
                            String(old.senderId) === String(newMsg.senderId)
                        );
                        if (isDuplicateRecent) return prev;

                        if (Platform.OS === 'ios') {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                        }
                        const next = [newMsg, ...prev];
                        saveMessagesCache(next);
                        return next;
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'team_messages',
                    filter: `team_id=eq.${teamId}`
                },
                (payload) => {
                    const m = payload.new;
                    if (m && m.id) {
                        setMessages(prev => {
                            const next = prev.map(msg => 
                                (msg._id === m.id || msg.id === m.id || String(msg._id) === String(m.id) || String(msg.id) === String(m.id)) 
                                ? { ...msg, text: m.text, edited: true } 
                                : msg
                            );
                            saveMessagesCache(next);
                            return next;
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'team_messages',
                    filter: `team_id=eq.${teamId}`
                },
                (payload) => {
                    const deletedId = payload.old?.id;
                    if (deletedId) {
                        setMessages(prev => {
                            const next = prev.filter(msg => 
                                msg._id !== deletedId && 
                                msg.id !== deletedId && 
                                String(msg._id) !== String(deletedId) && 
                                String(msg.id) !== String(deletedId)
                            );
                            saveMessagesCache(next);
                            return next;
                        });
                    }
                }
            )
            .on('broadcast', { event: 'typing' }, ({ payload }) => {
                const currentUserId = String(user?._id || user?.id || '');
                if (payload && payload.userId && String(payload.userId) !== currentUserId) {
                    onUserTyping(payload);
                }
            })
            .on('broadcast', { event: 'stop-typing' }, ({ payload }) => {
                if (payload && payload.userId) {
                    onUserStopTyping(payload);
                }
            })
            .subscribe();

        channelRef.current = channel;

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [teamId, user?._id, user?.id]);

    // Resync messages when socket reconnects (fixes offline gaps)
    const prevConnectedRef = useRef(isConnected);
    const isFetchingGapRef = useRef(false);
    useEffect(() => {
        if (!prevConnectedRef.current && isConnected) {
            if (!isFetchingGapRef.current) {
                isFetchingGapRef.current = true;
                console.log('🔄 Socket reconnected, fetching missed messages gap safely...');
                fetchMessages(1, true, true).finally(() => {
                    setTimeout(() => isFetchingGapRef.current = false, 2000);
                });
            }
        }
        prevConnectedRef.current = isConnected;
    }, [isConnected]);

    // Typing Event Handlers
    const onUserTyping = (data: { userId: string; userName?: string; userPhoto?: string }) => {
        const currentUserId = String(user?._id || user?.id || '');
        if (!data.userId || String(data.userId) === currentUserId) return;

        setTypingUsers(prev => ({
            ...prev,
            [data.userId]: {
                name: data.userName || 'Foydalanuvchi',
                photo: data.userPhoto || ''
            }
        }));

        if (typingCleanupsRef.current[data.userId]) {
            clearTimeout(typingCleanupsRef.current[data.userId]);
        }
        typingCleanupsRef.current[data.userId] = setTimeout(() => {
            setTypingUsers(prev => {
                const next = { ...prev };
                delete next[data.userId];
                return next;
            });
        }, 3500);
    };

    const onUserStopTyping = (data: { userId: string }) => {
        if (!data.userId) return;
        setTypingUsers(prev => {
            const next = { ...prev };
            delete next[data.userId];
            return next;
        });
    };

    const handleTyping = () => {
        // Do NOT broadcast typing indicator when editing an existing message!
        if (isEditing) return;

        const isTeamAcc = user?.role === 'team' || user?.role === 'admin';
        const currentUserId = String(user?._id || user?.id || '');
        const senderName = isTeamAcc 
            ? (teamInfo?.name || 'TEAM') 
            : ((user?.firstName || user?.name || '') + (user?.lastName ? ` ${user.lastName}` : '') || 'Foydalanuvchi').trim();
        const senderPhoto = isTeamAcc ? (teamInfo?.logo || '') : (user?.photo || user?.avatar || '');

        // 1. Emit via socket
        if (socket && teamId) {
            socket.emit('typing', { teamId, userId: currentUserId, userName: senderName, userPhoto: senderPhoto });
            socket.emit('user-typing', { teamId, userId: currentUserId, userName: senderName, userPhoto: senderPhoto });
        }

        // 2. Emit via Supabase broadcast
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { userId: currentUserId, userName: senderName, userPhoto: senderPhoto }
            });
        }

        // 3. Debounce stop typing after 2.5s
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            if (socket && teamId) {
                socket.emit('stop-typing', { teamId, userId: currentUserId });
                socket.emit('user-stop-typing', { teamId, userId: currentUserId });
            }
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'stop-typing',
                    payload: { userId: currentUserId }
                });
            }
        }, 2500);
    };

    useEffect(() => {
        if (socket && teamId) {
            const messageHandler = (message: any) => {
                setMessages((prev) => {
                    if (prev.some(m => m._id === message._id || m.id === message._id)) return prev;

                    const isMyMessage = String(message.senderId) === String(user?._id || user?.id);
                    if (isMyMessage) {
                        const tempIndex = prev.findIndex(m => 
                            (m.localId && m.localId === message.localId) || 
                            (m._id?.startsWith('temp-') && m.text === message.text)
                        );
                        if (tempIndex !== -1) {
                            const next = prev.map((m, i) => i === tempIndex ? { ...message, localId: m.localId } : m);
                            saveMessagesCache(next);
                            return next;
                        }
                    }

                    const isDuplicateText = prev.some(m => 
                        m.text === message.text && String(m.senderId) === String(message.senderId)
                    );
                    if (isDuplicateText) return prev;

                    if (Platform.OS === 'ios') {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                    }
                    const next = [message, ...prev];
                    saveMessagesCache(next);
                    return next;
                });
            };

            const updateHandler = (data: { messageId: string, text: string, edited: boolean }) => {
                setMessages((prev) => {
                    const next = prev.map(msg => 
                        (msg._id === data.messageId || msg.id === data.messageId || String(msg._id) === String(data.messageId) || String(msg.id) === String(data.messageId))
                        ? { ...msg, text: data.text, edited: data.edited } 
                        : msg
                    );
                    saveMessagesCache(next);
                    return next;
                });
            };

            const deleteHandler = (data: { messageId: string }) => {
                setMessages((prev) => {
                    const next = prev.filter(msg => 
                        msg._id !== data.messageId && 
                        msg.id !== data.messageId && 
                        String(msg._id) !== String(data.messageId) && 
                        String(msg.id) !== String(data.messageId)
                    );
                    saveMessagesCache(next);
                    return next;
                });
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
                    Alert.alert(t('chat.rate_limit_title'), t('chat.rate_limit_msg'));
                    setIsRateLimited(true);
                    setTimeout(() => setIsRateLimited(false), 5000);
                } else if (typeof errStr === 'string') {
                    Alert.alert(t('common.error'), errStr);
                }
            };

            socket.on('new-team-message', messageHandler);
            socket.on('message-updated', updateHandler);
            socket.on('message-deleted', deleteHandler);
            socket.on('message-save-error', errorHandler);
            socket.on('error', generalErrorHandler);
            socket.on('typing', onUserTyping);
            socket.on('user-typing', onUserTyping);
            socket.on('stop-typing', onUserStopTyping);
            socket.on('user-stop-typing', onUserStopTyping);
            
            return () => {
                socket.off('new-team-message', messageHandler);
                socket.off('message-updated', updateHandler);
                socket.off('message-deleted', deleteHandler);
                socket.off('message-save-error', errorHandler);
                socket.off('error', generalErrorHandler);
                socket.off('typing', onUserTyping);
                socket.off('user-typing', onUserTyping);
                socket.off('stop-typing', onUserStopTyping);
                socket.off('user-stop-typing', onUserStopTyping);
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

    const animateSendButton = () => {
        Animated.sequence([
            Animated.timing(sendButtonScale, { toValue: 0.94, duration: 40, useNativeDriver: true }),
            Animated.timing(sendButtonScale, { toValue: 1, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const sendMessage = () => {
        if (!inputText.trim() || !user) return;

        animateSendButton();

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
            const updatedText = inputText.trim();
            const currentUserId = String(user?._id || user?.id || '');

            // Save original text for rollback
            const originalMsg = messages.find(m => 
                m._id === editMessageId || m.id === editMessageId || 
                String(m._id) === String(editMessageId) || String(m.id) === String(editMessageId)
            );
            const originalText = originalMsg?.text || '';

            // 1. Optimistic edit in local state & cache
            setMessages((prev) => {
                const next = prev.map(msg => 
                    (msg._id === editMessageId || msg.id === editMessageId || String(msg._id) === String(editMessageId) || String(msg.id) === String(editMessageId))
                    ? { ...msg, text: updatedText, edited: true, is_edited: true, edited_at: new Date().toISOString() } 
                    : msg
                );
                saveMessagesCache(next);
                return next;
            });
            
            // 2. Persist to Supabase — rollback on failure
            apiService.editChatMessage(editMessageId, updatedText)
                .then(res => {
                    if (!res || !res.success) throw new Error('Edit failed');
                })
                .catch(() => {
                    // Rollback to original text
                    setMessages((prev) => {
                        const next = prev.map(msg => 
                            (msg._id === editMessageId || msg.id === editMessageId || String(msg._id) === String(editMessageId) || String(msg.id) === String(editMessageId))
                            ? { ...msg, text: originalText, edited: originalMsg?.edited || false, is_edited: originalMsg?.is_edited || false } 
                            : msg
                        );
                        saveMessagesCache(next);
                        return next;
                    });
                    Alert.alert(t('common.error'), t('chat.edit_failed') || 'Tahrirlash amalga oshmadi');
                });

            if (socket && teamId) {
                socket.emit('edit-team-message', {
                    messageId: editMessageId,
                    text: updatedText,
                    teamId,
                    edited: true
                });
            }
        } else {
            // Send new message
            const isTeamAcc = user.role === 'team' || user.role === 'admin';
            const clientMessageId = `${user._id || user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const localId = `local-${Date.now()}`;
            const senderName = isTeamAcc 
                ? (teamInfo?.name || 'TEAM') 
                : ((user.firstName || user.name || '') + (user.lastName ? ` ${user.lastName}` : '') || 'Foydalanuvchi').trim();
            
            const messageData = {
                _id: `temp-${Date.now()}`,
                localId,
                clientMessageId,
                teamId,
                senderId: user._id || user.id,
                senderName,
                senderPhoto: isTeamAcc ? teamInfo?.logo : (user.photo || user.avatar),
                text: inputText.trim(),
                timestamp: new Date().toISOString(),
                edited: false,
                is_edited: false,
                edited_at: null,
                role: user.role
            };

            setMessages((prev) => {
                // Idempotency: prevent duplicate if same clientMessageId exists
                if (prev.some(m => m.clientMessageId === clientMessageId)) return prev;
                const next = [messageData, ...prev];
                saveMessagesCache(next);
                return next;
            });

            // Save to Supabase — replace temp ID with real DB ID, or mark error on failure
            apiService.sendChatMessage(messageData).then(res => {
                if (res && res.data && res.data.id) {
                    setMessages(prev => {
                        const next = prev.map(m => (m.localId === localId || m._id === messageData._id) ? { ...m, _id: res.data.id, id: res.data.id } : m);
                        saveMessagesCache(next);
                        return next;
                    });
                }
            }).catch(() => {
                // Mark message as failed with error state
                setMessages(prev => {
                    const next = prev.map(m => (m.localId === localId || m._id === messageData._id) ? { ...m, isError: true, errorMessage: 'Send failed' } : m);
                    saveMessagesCache(next);
                    return next;
                });
            });

            // Server-authoritative push notification with deduplication key
            apiService.sendTeamChatNotification({
                teamId,
                senderId: user._id || user.id,
                messageText: inputText.trim(),
                clientMessageId
            }).catch(() => {});

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

    const handleDelete = (msgId: string | number) => {
        closeMenu();
        Alert.alert(
            t('chat.delete_msg_title'),
            t('chat.delete_msg_confirm'),
            [
                { text: t('common.cancel'), style: "cancel" },
                { 
                    text: t('common.delete'), 
                    style: "destructive", 
                    onPress: () => {
                        if (Platform.OS === 'ios') {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        }

                        // Save snapshot for rollback
                        const deletedMsg = messages.find(m => 
                            String(m._id) === String(msgId) || 
                            String(m.id) === String(msgId) || 
                            String(m.localId) === String(msgId)
                        );

                        // 1. Instant optimistic state removal
                        setMessages(prev => {
                            const next = prev.filter(m => 
                                String(m._id) !== String(msgId) && 
                                String(m.id) !== String(msgId) && 
                                String(m.localId) !== String(msgId)
                            );
                            saveMessagesCache(next);
                            return next;
                        });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

                        // 2. Delete from DB — rollback on failure
                        apiService.deleteChatMessage(msgId)
                            .then(res => {
                                if (!res || !res.success) throw new Error('Delete failed');
                            })
                            .catch(() => {
                                // Rollback: restore deleted message
                                if (deletedMsg) {
                                    setMessages(prev => {
                                        const next = [...prev, deletedMsg].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                                        saveMessagesCache(next);
                                        return next;
                                    });
                                    Alert.alert(t('common.error'), t('chat.delete_failed') || "O'chirish amalga oshmadi");
                                }
                            });

                        if (socket && teamId) {
                            socket.emit('delete-team-message', {
                                messageId: msgId,
                                teamId
                            });
                        }
                    } 
                }
            ]
        );
    };

    const handleEdit = (msg: any) => {
        closeMenu();
        const realId = (msg.id && !String(msg.id).startsWith('temp-') && !String(msg.id).startsWith('local-'))
            ? msg.id 
            : ((msg._id && !String(msg._id).startsWith('temp-') && !String(msg._id).startsWith('local-')) ? msg._id : null);

        if (!realId) {
            Alert.alert(t('common.error'), t('chat.cannot_edit_pending') || "Xabar hali server tomonidan tasdiqlanmagan");
            return;
        }

        // Stop any active typing broadcast immediately when entering edit mode
        const currentUserId = String(user?._id || user?.id || '');
        if (socket && teamId) {
            socket.emit('stop-typing', { teamId, userId: currentUserId });
            socket.emit('user-stop-typing', { teamId, userId: currentUserId });
        }
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'stop-typing',
                payload: { userId: currentUserId }
            });
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        setInputText(msg.text);
        setIsEditing(true);
        setEditMessageId(realId);
    };

    const MessageBubble = React.memo(({ item, isMe, isTeamMsg, senderDisplayName, senderDisplayPhoto, shouldAnimate }: any) => {
        const isItemEdited = Boolean(item.is_edited || item.edited);

        // Natural micro-animations (180-220ms easeOut, bottom-right for me, bottom-left for others)
        const animOpacity = useRef(new Animated.Value(shouldAnimate ? 0 : 1)).current;
        const animScale = useRef(new Animated.Value(shouldAnimate ? 0.94 : 1)).current;
        const animTranslateX = useRef(new Animated.Value(shouldAnimate ? (isMe ? 12 : -12) : 0)).current;
        const animTranslateY = useRef(new Animated.Value(shouldAnimate ? (isMe ? 10 : 8) : 0)).current;

        // Subtle pulse for edits (scale: 1 -> 1.02 -> 1)
        const editPulseAnim = useRef(new Animated.Value(1)).current;

        useEffect(() => {
            if (shouldAnimate) {
                Animated.parallel([
                    Animated.timing(animOpacity, {
                        toValue: 1,
                        duration: 200,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver: true,
                    }),
                    Animated.timing(animScale, {
                        toValue: 1,
                        duration: 200,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver: true,
                    }),
                    Animated.timing(animTranslateX, {
                        toValue: 0,
                        duration: 200,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver: true,
                    }),
                    Animated.timing(animTranslateY, {
                        toValue: 0,
                        duration: 200,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        }, [shouldAnimate]);

        useEffect(() => {
            if (isItemEdited && !shouldAnimate) {
                Animated.sequence([
                    Animated.timing(editPulseAnim, { toValue: 1.02, duration: 80, useNativeDriver: true }),
                    Animated.timing(editPulseAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
                ]).start();
            }
        }, [isItemEdited]);

        return (
            <Animated.View style={[
                styles.messageRow, 
                isMe ? styles.myMessageRow : styles.otherMessageRow,
                {
                    opacity: animOpacity,
                    transform: [
                        { scale: Animated.multiply(animScale, editPulseAnim) },
                        { translateX: animTranslateX },
                        { translateY: animTranslateY },
                    ]
                }
            ]}>
                <TouchableOpacity 
                    activeOpacity={0.9}
                    onLongPress={() => {
                        Keyboard.dismiss();
                        try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        } catch (e) {}
                        setSelectedMessage(item);
                        setIsMenuVisible(true);
                        
                        // Trigger smooth animation
                        menuScaleAnim.setValue(0.85);
                        menuFadeAnim.setValue(0);
                        Animated.parallel([
                            Animated.spring(menuScaleAnim, {
                                toValue: 1,
                                tension: 60,
                                friction: 8,
                                useNativeDriver: true
                            }),
                            Animated.timing(menuFadeAnim, {
                                toValue: 1,
                                duration: 200,
                                useNativeDriver: true
                            })
                        ]).start();
                    }}
                    delayLongPress={250}
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
                                {isItemEdited && (
                                    <Text style={[styles.editedLabel, isMe ? styles.myTimestamp : styles.otherTimestamp]}>
                                        {t('chat.edited')}
                                    </Text>
                                )}
                                <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.otherTimestamp]}>
                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                            {item.isError && (
                                <TouchableOpacity onPress={() => retryMessage(item)} style={{ marginTop: 4, alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ color: Colors.danger, fontSize: 10, fontWeight: 'bold', marginRight: 4 }}>
                                        {t('chat.send_failed_retry')}
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
        const itemKey = String(item._id || item.id || item.localId || item.clientMessageId);
        
        let shouldAnimate = false;
        if (!animatedMessageIds.current.has(itemKey)) {
            shouldAnimate = true;
            animatedMessageIds.current.add(itemKey);
        }
        
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
                shouldAnimate={shouldAnimate}
            />
        );
    }, [user, teamInfo, teamPlayers, t]);

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
                        onPress={openMembersModal}
                    >
                        <Text style={styles.headerTitle} numberOfLines={1}>{(teamInfo?.name || 'JAMOA CHATI').toUpperCase()}</Text>
                        <View style={styles.statusBadge}>
                            <View style={[styles.statusDot, { backgroundColor: Colors.primary }]} />
                            <Text style={[styles.headerStatus, { color: Colors.primary }]}>
                                {teamPlayers.length > 0 ? t('chat.members_count', { count: teamPlayers.length }) : t('chat.online').toUpperCase()}
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

                    <TouchableOpacity 
                        style={styles.headerLogoContainer}
                        onPress={openMembersModal}
                    >
                        {teamInfo?.logo && (
                            <SmartImage uri={teamInfo.logo} style={styles.headerLogo} contentFit="contain" />
                        )}
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
                >
                    {(loading && messages.length === 0) ? (
                        <ChatSkeleton />
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            extraData={[messages, typingUsers]}
                            inverted={true}
                            renderItem={renderMessage}
                            keyExtractor={(item, index) => item.localId || item._id || item.id || `msg-${index}`}
                            contentContainerStyle={styles.messageList}
                            onRefresh={() => fetchMessages(1, true, false)}
                            refreshing={false}
                            onEndReached={handleLoadMore}
                            onEndReachedThreshold={0.1}
                            onScroll={(e) => {
                                const offsetY = e.nativeEvent.contentOffset.y;
                                const atBottom = offsetY <= 40;
                                isAtBottomRef.current = atBottom;
                                if (atBottom && unreadNewCount > 0) {
                                    setUnreadNewCount(0);
                                }
                            }}
                            scrollEventThrottle={16}
                            ListHeaderComponent={
                                Object.keys(typingUsers).length > 0 ? (
                                    <View style={styles.typingMessagesContainer}>
                                        {Object.entries(typingUsers).map(([tUserId, tUserData]) => {
                                            const foundPlayer = teamPlayers.find((p: any) => String(p._id || p.id) === String(tUserId));
                                            const isTeamAccount = foundPlayer?.role === 'team' || String(tUserId).includes('team') || tUserData.name === teamInfo?.name;
                                            const avatarUri = isTeamAccount ? teamInfo?.logo : (tUserData.photo || foundPlayer?.photo || foundPlayer?.photo_url || foundPlayer?.avatar);
                                            const displayName = (isTeamAccount ? (teamInfo?.name || tUserData.name || 'TEAM') : (tUserData.name || (foundPlayer?.firstName ? `${foundPlayer.firstName} ${foundPlayer.lastName || ''}`.trim() : 'O\'yinchi'))).toUpperCase();

                                            return (
                                                <View key={`typing-${tUserId}`} style={styles.typingMessageRow}>
                                                    <View style={styles.avatarContainer}>
                                                        <SmartImage
                                                            uri={avatarUri}
                                                            style={[
                                                                styles.avatar,
                                                                isTeamAccount && { borderRadius: 0, backgroundColor: 'transparent' }
                                                            ]}
                                                            contentFit={isTeamAccount ? "contain" : "cover"}
                                                            fallbackIcon="person"
                                                        />
                                                    </View>
                                                    <View style={styles.otherMessageWrapper}>
                                                        <Text style={styles.senderName}>{displayName}</Text>
                                                        <View style={[styles.messageBubble, styles.otherBubble, styles.typingBubble]}>
                                                            <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                                                            <View style={styles.typingDotsContainer}>
                                                                <Animated.View style={[styles.typingBlinkDot, { transform: [{ translateY: typingDot1Y }], opacity: typingDot1Opacity }]} />
                                                                <Animated.View style={[styles.typingBlinkDot, { transform: [{ translateY: typingDot2Y }], opacity: typingDot2Opacity }]} />
                                                                <Animated.View style={[styles.typingBlinkDot, { transform: [{ translateY: typingDot3Y }], opacity: typingDot3Opacity }]} />
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ) : null
                            }
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

                    {/* Floating Unread New Messages Pill */}
                    {unreadNewCount > 0 && (
                        <View style={styles.newMessagesPillContainer}>
                            <TouchableOpacity
                                style={styles.newMessagesPill}
                                activeOpacity={0.85}
                                onPress={() => {
                                    setUnreadNewCount(0);
                                    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                            >
                                <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
                                <View style={styles.pillDot} />
                                <Text style={styles.pillText}>
                                    {unreadNewCount === 1 
                                        ? (t('chat.one_new_message') || '1 ta yangi xabar') 
                                        : (t('chat.new_messages_count', { count: unreadNewCount }) || `${unreadNewCount} ta yangi xabar`)}
                                </Text>
                                <Ionicons name="arrow-down" size={13} color={Colors.primary} style={{ marginLeft: 4 }} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {isEditing && (
                        <View style={styles.editingBanner}>
                            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                            <View style={styles.editingInfo}>
                                <Ionicons name="create" size={16} color={Colors.primary} />
                                <Text style={styles.editingText} numberOfLines={1}>{t('chat.editing_title')}: {inputText}</Text>
                            </View>
                            <TouchableOpacity onPress={() => { setIsEditing(false); setInputText(''); }}>
                                <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.5)" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={[
                        styles.inputContainer,
                        { paddingBottom: Platform.OS === 'ios' ? 12 : Math.max(insets.bottom ? 6 : 8, 8) }
                    ]}>
                        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
                        
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                value={inputText}
                                onChangeText={(text) => {
                                    setInputText(text);
                                    if (!isEditing) {
                                        handleTyping();
                                    }
                                }}
                                multiline
                            />
                            <View 
                                style={[
                                    styles.animatedPlaceholderContainer,
                                    { opacity: inputText.length > 0 ? 0 : 1 }
                                ]} 
                                pointerEvents="none"
                            >
                                <Text style={styles.placeholderText}>{t('chat.type_message')}</Text>
                                <View style={styles.dotsRow}>
                                    <Animated.Text style={[styles.dotText, { transform: [{ translateY: dot1Y }] }]}>.</Animated.Text>
                                    <Animated.Text style={[styles.dotText, { transform: [{ translateY: dot2Y }] }]}>.</Animated.Text>
                                    <Animated.Text style={[styles.dotText, { transform: [{ translateY: dot3Y }] }]}>.</Animated.Text>
                                </View>
                            </View>
                        </View>

                        <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
                            <TouchableOpacity 
                                style={[styles.sendButton, { backgroundColor: Colors.primary }, (!inputText.trim() || isRateLimited) && { opacity: 0.5 }]} 
                                onPress={sendMessage}
                                disabled={!inputText.trim() || isRateLimited}
                            >
                                <Ionicons name="paper-plane" size={20} color="#000" />
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* Context Menu Modal */}
            <Modal
                visible={isMenuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={closeMenu}
            >
                <View style={styles.menuOverlay}>
                    {/* Deep Blur Backdrop */}
                    <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />

                    <TouchableOpacity 
                        style={StyleSheet.absoluteFill} 
                        activeOpacity={1} 
                        onPress={closeMenu}
                    />

                    {selectedMessage && (() => {
                        const isMe = String(selectedMessage.senderId) === String(user?._id || user?.id);

                        return (
                            <Animated.View
                                style={[
                                    styles.menuCardWrapper,
                                    {
                                        alignItems: isMe ? 'flex-end' : 'flex-start',
                                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                                        opacity: menuFadeAnim,
                                        transform: [{ scale: menuScaleAnim }]
                                    }
                                ]}
                            >
                                {/* Scaled Message Bubble Preview with Larger Font */}
                                <View style={[
                                    styles.messageBubblePreview,
                                    isMe ? styles.myBubble : styles.otherBubble,
                                ]}>
                                    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                                    <Text style={[
                                        styles.messageTextPreview,
                                        isMe ? styles.myText : styles.otherText
                                    ]}>
                                        {selectedMessage.text}
                                    </Text>
                                </View>

                                {/* Glassmorphic Action Menu Card */}
                                <View style={styles.actionMenuGlassCard}>
                                    <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFill} />
                                    <View style={{ paddingVertical: 4 }}>
                                        {/* Copy Action */}
                                        <TouchableOpacity
                                            style={styles.menuActionItem}
                                            onPress={() => copyToClipboard(selectedMessage.text)}
                                            activeOpacity={0.75}
                                        >
                                            <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
                                            <Text style={styles.menuActionText}>{t('chat.copy')}</Text>
                                        </TouchableOpacity>

                                        {/* Edit Action (Only for User's own messages) */}
                                        {isMe && (
                                            <>
                                                <View style={styles.menuDivider} />
                                                <TouchableOpacity
                                                    style={styles.menuActionItem}
                                                    onPress={() => handleEdit(selectedMessage)}
                                                    activeOpacity={0.75}
                                                >
                                                    <Ionicons name="create-outline" size={16} color="#00FF87" />
                                                    <Text style={[styles.menuActionText, { color: '#00FF87' }]}>{t('common.edit')}</Text>
                                                </TouchableOpacity>
                                            </>
                                        )}

                                        {/* Delete Action (Only for User's own messages or Manager/Admin) */}
                                        {(isMe || user?.role === 'manager' || user?.role === 'admin') && (
                                            <>
                                                <View style={styles.menuDivider} />
                                                <TouchableOpacity
                                                    style={styles.menuActionItem}
                                                    onPress={() => handleDelete(selectedMessage._id || selectedMessage.id)}
                                                    activeOpacity={0.75}
                                                >
                                                    <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                                                    <Text style={[styles.menuActionText, { color: '#FF3B30' }]}>{t('chat.delete')}</Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
                                </View>
                            </Animated.View>
                        );
                    })()}
                </View>
            </Modal>

            {/* Members List Modal */}
            <Modal
                visible={showMembers}
                animationType="slide"
                transparent={false}
                presentationStyle="fullScreen"
                statusBarTranslucent={true}
                onRequestClose={() => setShowMembers(false)}
            >
                <AnimatedBackground overlayOpacity={0.92}>
                    <View style={{ flex: 1, paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 28)) }}>
                        {/* Top Header Section */}
                        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', alignItems: 'center', position: 'relative' }}>
                            <TouchableOpacity 
                                style={{ position: 'absolute', top: 10, right: 20, zIndex: 100, backgroundColor: 'rgba(255,255,255,0.1)', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }} 
                                onPress={() => setShowMembers(false)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>

                            <SmartImage uri={teamInfo?.logo} style={{ width: 60, height: 60, marginBottom: 8 }} contentFit="contain" />
                            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900', textAlign: 'center', letterSpacing: 1 }}>{teamInfo?.name?.toUpperCase()}</Text>
                            <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '900', marginTop: 4, letterSpacing: 0.5 }}>
                                {t('chat.all_team_members', { count: teamPlayers.length })}
                            </Text>
                        </View>

                        {/* Full Height Members List */}
                        <FlatList
                            data={teamPlayers}
                            keyExtractor={(item, index) => item._id || item.id || String(index)}
                            style={{ flex: 1 }}
                            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.memberItem}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        setShowMembers(false);
                                        navigation.navigate('PlayerStats', { playerId: item._id || item.id, player: item });
                                    }}
                                >
                                    <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
                                    <SmartImage 
                                        uri={item.photo || item.photo_url || item.avatar} 
                                        style={{ width: 48, height: 48, borderRadius: 12 }} 
                                        fallbackIcon="person"
                                    />
                                    <View style={styles.memberInfo}>
                                        <Text style={styles.memberName}>{(item.firstName || item.name || item.first_name || t('teams.player_fallback'))} {item.lastName || item.last_name || ''}</Text>
                                        <Text style={styles.memberPosition}>
                                            {(item.role === 'manager' || item.role === 'trainer' || item.role === 'coach' ? t('roles.trainer') : getLocalizedPosition(item.position, t)).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </AnimatedBackground>
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
    inputContainer: { 
        flexDirection: 'row', 
        paddingHorizontal: 14, 
        paddingTop: 10,
        alignItems: 'center', 
        borderTopWidth: 1, 
        borderTopColor: 'rgba(255,255,255,0.08)', 
        overflow: 'hidden' 
    },
    inputWrapper: {
        flex: 1,
        marginRight: 10,
        position: 'relative',
        justifyContent: 'center',
    },
    input: { 
        minHeight: 44, 
        maxHeight: 120, 
        backgroundColor: 'rgba(255,255,255,0.06)', 
        borderRadius: 22, 
        paddingHorizontal: 18, 
        paddingVertical: 10, 
        color: '#FFF', 
        fontSize: 16, 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.12)' 
    },
    animatedPlaceholderContainer: {
        position: 'absolute',
        left: 18,
        flexDirection: 'row',
        alignItems: 'center',
    },
    placeholderText: {
        color: 'rgba(255, 255, 255, 0.35)',
        fontSize: 15,
        fontWeight: '500',
    },
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 2,
    },
    dotText: {
        color: 'rgba(255, 255, 255, 0.55)',
        fontSize: 16,
        fontWeight: '900',
        marginLeft: 1.5,
    },
    sendButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: 'rgba(255,255,255,0.6)', marginTop: 20, fontSize: 16, textAlign: 'center' },
    headerLogoContainer: { width: 34, height: 34, borderRadius: 10, overflow: 'hidden', marginLeft: 10, justifyContent: 'center', alignItems: 'center' },
    headerLogo: { width: '100%', height: '100%' },
    modalOverlay: { flex: 1, backgroundColor: '#000' },
    modalHeader: { paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    modalTeamLogo: { width: 70, height: 70, marginBottom: 8 },
    modalTeamName: { color: '#FFF', fontSize: 20, fontWeight: '900', textAlign: 'center', letterSpacing: 1 },
    memberItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    memberInfo: { flex: 1, marginLeft: 15 },
    memberName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    memberPosition: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '900', marginTop: 4, letterSpacing: 1 },
    closeButton: { position: 'absolute', top: 10, right: 15, zIndex: 100, backgroundColor: 'rgba(255,255,255,0.1)', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    dragHandleContainer: { width: '100%', height: 40, alignItems: 'center', justifyContent: 'center' },
    dragHandle: { width: 40, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.2)' },
    menuOverlay: { 
        flex: 1, 
        justifyContent: 'center', 
        paddingHorizontal: 22,
    },
    menuCardWrapper: {
        width: '100%',
        maxWidth: 290,
    },
    messageBubblePreview: {
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 20,
        maxWidth: '100%',
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        overflow: 'hidden',
    },
    messageTextPreview: {
        fontSize: 20,
        lineHeight: 28,
        fontWeight: '600',
    },
    actionMenuGlassCard: {
        width: 165,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.16)',
        backgroundColor: 'rgba(20, 24, 36, 0.65)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    menuActionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        gap: 10,
    },
    menuActionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    menuDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        width: '100%',
    },
    editingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
    editingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    editingText: { color: '#FFF', fontSize: 12, marginLeft: 8, opacity: 0.8 },
    typingMessagesContainer: {
        marginBottom: 8,
        marginTop: 2,
    },
    typingMessageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 8,
    },
    typingBubble: {
        paddingVertical: 14,
        paddingHorizontal: 18,
        minWidth: 70,
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    typingDotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 16,
    },
    typingBlinkDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#00FF87',
        marginHorizontal: 3.5,
        shadowColor: '#00FF87',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 3,
    },
    newMessagesPillContainer: {
        position: 'absolute',
        bottom: 12,
        alignSelf: 'center',
        zIndex: 50,
        elevation: 6,
    },
    newMessagesPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 135, 0.45)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        overflow: 'hidden',
    },
    pillDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#00FF87',
        marginRight: 8,
    },
    pillText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});

export default TeamChatScreen;

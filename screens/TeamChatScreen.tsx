import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from '../context/SocketContext';
import { apiService } from '../services/apiService';
import { useAuthStore } from '../store/useAuthStore';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

const TeamChatScreen = ({ route, navigation }: any) => {
    const { teamId: routeTeamId } = route.params || {};
    const { user, isAuthenticated } = useAuthStore();
    const teamId = routeTeamId || user?.teamId;
    const userId = user?._id || user?.id;
    const userName = user?.firstName || user?.name;
    const userPhoto = user?.photo;

    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const { socket, isConnected } = useSocket();
    const flatListRef = useRef<any>(null);

    // Privacy Check
    if (!user || String(user.teamId) !== String(teamId)) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Ruxsat yo'q</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Ionicons name="lock-closed-outline" size={60} color="#FF4444" />
                    <Text style={{ color: '#FFF', textAlign: 'center', marginTop: 10, fontSize: 16, fontWeight: 'bold' }}>
                        Bu chat faqat jamoa a'zolari uchun!
                    </Text>
                    <Text style={{ color: '#666', textAlign: 'center', marginTop: 5 }}>
                        Siz ushbu jamoada ro'yxatdan o'tmagansiz.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!teamId) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Xatolik</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Ionicons name="alert-circle-outline" size={60} color="#FF4444" />
                    <Text style={{ color: '#FFF', textAlign: 'center', marginTop: 10 }}>Jamoa ma'lumotlari topilmadi</Text>
                </View>
            </SafeAreaView>
        );
    }

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const data = await apiService.getChatMessages(teamId);
            setMessages(data || []);
        } catch (error) {
            console.error('Error fetching chat messages:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();

        if (socket && isConnected) {
            console.log('🔌 Joining team chat room:', teamId);
            socket.emit('join-team', teamId);

            socket.on('new-team-message', (message: any) => {
                setMessages((prev) => [message, ...prev]);
            });

            return () => {
                socket.off('new-team-message');
            };
        }
    }, [socket, isConnected, teamId]);

    const sendMessage = () => {
        if (!inputText.trim() || !socket || !isConnected) return;

        const messageData = {
            teamId,
            senderId: userId,
            senderName: userName || 'O\'yinchi',
            senderPhoto: userPhoto || null,
            text: inputText.trim(),
            timestamp: new Date().toISOString(),
        };

        socket.emit('send-team-message', messageData);
        setInputText('');
    };

    const renderMessage = ({ item }: any) => {
        const isMe = String(item.senderId) === String(userId);
        
        return (
            <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
                {!isMe && (
                    <TouchableOpacity 
                        onPress={() => {
                            if (String(item.senderId) === String(teamId)) {
                                navigation.navigate('TeamProfile', { teamId });
                            } else {
                                navigation.navigate('PlayerStats', { playerId: item.senderId });
                            }
                        }}
                        style={styles.avatarContainer}
                    >
                        {item.senderPhoto ? (
                            <Image source={{ uri: item.senderPhoto }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.placeholderAvatar]}>
                                <Text style={styles.avatarInitial}>{item.senderName?.charAt(0) || '?'}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}
                
                <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
                    {!isMe && <Text style={styles.senderName}>{item.senderName}</Text>}
                    <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
                        <Text style={[styles.messageText, isMe ? styles.myText : styles.otherText]}>{item.text}</Text>
                        <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.otherTimestamp]}>
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>Jamoa Chati</Text>
                    <View style={styles.statusBadge}>
                        <View style={[styles.statusDot, { backgroundColor: isConnected ? '#00FF66' : '#FF4444' }]} />
                        <Text style={[styles.headerStatus, { color: isConnected ? '#00FF66' : '#FF4444' }]}>
                            {isConnected ? 'Online' : 'Oflayn'}
                        </Text>
                    </View>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    inverted={true}
                    renderItem={renderMessage}
                    keyExtractor={(item, index) => item._id || item.id || `msg-${index}`}
                    contentContainerStyle={styles.messageList}
                    onRefresh={fetchMessages}
                    refreshing={loading}
                />

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Xabar yozing..."
                        placeholderTextColor="#666"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                    />
                    <TouchableOpacity 
                        style={[styles.sendButton, (!inputText.trim() || !isConnected) && { opacity: 0.5 }]} 
                        onPress={sendMessage}
                        disabled={!inputText.trim() || !isConnected}
                    >
                        <Ionicons name="send" size={20} color="#000" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1A1A1A',
    },
    backButton: {
        padding: 5,
    },
    headerInfo: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    headerStatus: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    messageList: {
        padding: 15,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 10,
        alignItems: 'flex-end',
    },
    myMessageRow: {
        justifyContent: 'flex-end',
    },
    otherMessageRow: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        marginRight: 8,
        marginBottom: 2,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#333',
    },
    placeholderAvatar: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#444',
    },
    avatarInitial: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    messageWrapper: {
        maxWidth: '75%',
    },
    myMessageWrapper: {
        alignItems: 'flex-end',
    },
    otherMessageWrapper: {
        alignItems: 'flex-start',
    },
    senderName: {
        color: '#666',
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 2,
        marginLeft: 4,
    },
    messageBubble: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 18,
    },
    myBubble: {
        backgroundColor: '#00FF66',
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        backgroundColor: '#262626',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myText: {
        color: '#000',
        fontWeight: '500',
    },
    otherText: {
        color: '#FFF',
    },
    timestamp: {
        fontSize: 9,
        marginTop: 2,
        alignSelf: 'flex-end',
    },
    myTimestamp: {
        color: 'rgba(0,0,0,0.5)',
    },
    otherTimestamp: {
        color: '#666',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#111',
        borderTopWidth: 1,
        borderTopColor: '#1A1A1A',
    },
    input: {
        flex: 1,
        backgroundColor: '#0A0A0A',
        borderRadius: 25,
        color: '#FFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#333',
        maxHeight: 100,
    },
    sendButton: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#00FF66',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default TeamChatScreen;

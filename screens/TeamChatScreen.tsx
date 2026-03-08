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
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from '../context/SocketContext';

const TeamChatScreen = ({ route, navigation }: any) => {
    const { teamId, userId, userName } = route.params || {};
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const { socket, isConnected } = useSocket();
    const flatListRef = useRef<any>(null);

    useEffect(() => {
        if (socket && isConnected) {
            console.log('🔌 Joining team chat room:', teamId);
            socket.emit('join-team', teamId);

            socket.on('new-team-message', (message: any) => {
                setMessages((prev) => [...prev, message]);
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
            senderId: userId || 'guest_id',
            senderName: userName || 'O\'yinchi',
            text: inputText.trim(),
            timestamp: new Date().toISOString(),
        };

        socket.emit('send-team-message', messageData);
        setInputText('');
    };

    const renderMessage = ({ item }: any) => {
        const isMe = item.senderId === userId;
        return (
            <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
                {!isMe && <Text style={styles.senderName}>{item.senderName}</Text>}
                <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
                    <Text style={[styles.messageText, isMe ? styles.myText : styles.otherText]}>{item.text}</Text>
                </View>
                <Text style={styles.timestamp}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>Jamoa Chati</Text>
                    <Text style={styles.headerStatus}>Online</Text>
                </View>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(_, index) => index.toString()}
                contentContainerStyle={styles.messageList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Xabar yozing..."
                        placeholderTextColor="#666"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
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
    headerInfo: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    headerStatus: {
        color: '#00FF66',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    messageList: {
        padding: 20,
    },
    messageWrapper: {
        marginBottom: 20,
        maxWidth: '80%',
    },
    myMessageWrapper: {
        alignSelf: 'flex-end',
    },
    otherMessageWrapper: {
        alignSelf: 'flex-start',
    },
    senderName: {
        color: '#666',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
        marginLeft: 5,
    },
    messageBubble: {
        padding: 12,
        borderRadius: 15,
    },
    myBubble: {
        backgroundColor: '#00FF66',
        borderBottomRightRadius: 2,
    },
    otherBubble: {
        backgroundColor: '#1A1A1A',
        borderBottomLeftRadius: 2,
        borderWidth: 1,
        borderColor: '#333',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myText: {
        color: '#000',
        fontWeight: '600',
    },
    otherText: {
        color: '#FFF',
    },
    timestamp: {
        color: '#444',
        fontSize: 10,
        marginTop: 5,
        alignSelf: 'flex-end',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
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

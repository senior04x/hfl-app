import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import io, { Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';

const SOCKET_URL = 'https://hfl-backend.onrender.com';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const prevTeamIdRef = useRef<string | null>(null);

    // Watch token explicitly to rebuild socket if user changes/logs in
    const userToken = useAuthStore(state => state.user?.token || state.user?.session?.token);
    const userTeamId = useAuthStore(state => state.user?.teamId);

    useEffect(() => {
        if (!userToken) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
            }
            return;
        }

        const socket = io(SOCKET_URL, {
            auth: { token: userToken },
            transports: ['polling', 'websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('🔌 Socket.IO connected securely');
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('🔌 Socket.IO disconnected');
            setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error('🔌 Socket.IO connection error (Likely JWT Auth Failure):', error.message);
            // Token expiry or invalid auth handling
            if (error.message.includes('Authentication') || error.message.includes('token') || error.message.includes('jwt')) {
                console.warn('🔒 Force logging out due to auth failure');
                useAuthStore.getState().logout();
            }
        });

        // Global unread listener
        const messageHandler = (message: any) => {
            const { user, incrementUnreadCount } = useAuthStore.getState();
            const myTeamId = user?.teamId?._id || user?.teamId;
            const msgTeamId = message.teamId?._id || message.teamId;

            if (user && String(message.senderId) !== String(user._id || user.id)) {
                if (String(myTeamId) === String(msgTeamId)) {
                    incrementUnreadCount();
                }
            }
        };

        socket.on('new-team-message', messageHandler);

        return () => {
            if (socket) {
                socket.off('new-team-message', messageHandler);
                socket.disconnect();
            }
        };
    }, [userToken]);

    useEffect(() => {
        // Handle foreground/background reconnection resilience
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active' && socketRef.current && socketRef.current.disconnected) {
                console.log('🔄 Foregrounded: Manually forcing socket reconnect...');
                socketRef.current.connect();
            }
        });
        return () => subscription.remove();
    }, []);

    // Room connection lifecycle
    useEffect(() => {
        if (socketRef.current && isConnected && userTeamId) {
            // Memory leak prevention: Leave previous room if teamId changed
            if (prevTeamIdRef.current && prevTeamIdRef.current !== userTeamId) {
                console.log('🔌 Switching contexts: Leaving previous team room:', prevTeamIdRef.current);
                socketRef.current.emit('leave-team', prevTeamIdRef.current);
            }
            
            console.log('🔌 User team detected, joining room:', userTeamId);
            socketRef.current.emit('join-team', userTeamId);
            prevTeamIdRef.current = String(userTeamId);
        }
    }, [userTeamId, isConnected]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};

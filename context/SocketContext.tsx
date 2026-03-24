import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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

    useEffect(() => {
        const socket = io(SOCKET_URL, {
            transports: ['polling', 'websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('🔌 Socket.IO connected');
            setIsConnected(true);
            
            // Join team room globally if user is logged in
            const { user } = useAuthStore.getState();
            if (user?.teamId) {
                console.log('🔌 Joining team room:', user.teamId);
                socket.emit('join-team', user.teamId);
            }
        });

        socket.on('disconnect', () => {
            console.log('🔌 Socket.IO disconnected');
            setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error('🔌 Socket.IO connection error:', error);
        });

        // Global listeners
        socket.on('new-team-message', (message) => {
            const { user, incrementUnreadCount } = useAuthStore.getState();
            // Increment unread count if it's not my message AND it belongs to my team (extra safety)
            const myTeamId = user?.teamId?._id || user?.teamId;
            const msgTeamId = message.teamId?._id || message.teamId;

            if (user && String(message.senderId) !== String(user._id || user.id)) {
                if (String(myTeamId) === String(msgTeamId)) {
                    incrementUnreadCount();
                }
            }
        });

        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, []);

    // Watch for user login to join room immediately
    const userTeamId = useAuthStore(state => state.user?.teamId);
    useEffect(() => {
        if (socketRef.current && isConnected && userTeamId) {
            console.log('🔌 User team detected, joining room:', userTeamId);
            socketRef.current.emit('join-team', userTeamId);
        }
    }, [userTeamId, isConnected]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};

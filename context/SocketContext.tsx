import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';

const SOCKET_URL = 'http://192.168.0.111:3002';

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
        // Initialize socket with multiple transports for better reliability on Render
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
        });

        socket.on('disconnect', () => {
            console.log('🔌 Socket.IO disconnected');
            setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error('🔌 Socket.IO connection error:', error);
        });

        // Global listeners
        socket.on('match-update', (data) => {
            console.log('🏟️ Match Update Received:', data);
            // We can emit a local event or update a store here if needed
        });

        socket.on('goal-alert', (data) => {
            console.log('⚽ GOAL ALERT:', data);
            // Future: Show a toast or local notification
        });

        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};

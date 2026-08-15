import { io } from 'socket.io-client';
import { useEffect, useRef, useState, useCallback } from 'react';

const SERVER_URL = import.meta.env.PROD 
  ? 'https://clinicflow-backend-8yli.onrender.com' 
  : 'http://localhost:3001';


/**
 * Custom hook for Socket.IO connection management.
 * Provides a stable socket reference and connection state.
 */
export function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  /**
   * Emit an event with acknowledgement callback.
   */
  const emit = useCallback((event, data) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      socketRef.current.emit(event, data, (response) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(new Error(response?.message || 'Unknown error'));
        }
      });
    });
  }, []);

  /**
   * Subscribe to an event. Returns unsubscribe function.
   */
  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    emit,
    on,
  };
}

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@store/useAuthStore';
import { initSocket, getSocket, disconnectSocket } from '@lib/socket';

export const useSocket = () => {
  const { authUser, accessToken } = useAuthStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (accessToken && !socketRef.current) {
      socketRef.current = initSocket(accessToken);
    }

    return () => {
      if (!accessToken) {
        disconnectSocket();
        socketRef.current = null;
      }
    };
  }, [accessToken]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
  };
};

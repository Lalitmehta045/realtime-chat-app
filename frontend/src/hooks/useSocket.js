import { useEffect, useState } from 'react';
import { useAuthStore } from '@store/useAuthStore';
import { initSocket, disconnectSocket } from '@lib/socket';

export const useSocket = () => {
  const { authUser, accessToken } = useAuthStore();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (accessToken && !socket) { // Only initialize if accessToken exists and socket is not yet set
      const newSocket = initSocket(accessToken);
      setSocket(newSocket);

      newSocket.on('connect', () => setIsConnected(true));
      newSocket.on('disconnect', () => setIsConnected(false));
      
      return () => {
        newSocket.off('connect');
        newSocket.off('disconnect');
        disconnectSocket(); // Disconnect socket when component unmounts or accessToken changes
        setSocket(null);
        setIsConnected(false);
      };
    } else if (!accessToken && socket) { // Disconnect if accessToken is removed but socket exists
        disconnectSocket();
        setSocket(null);
        setIsConnected(false);
    }
  }, [accessToken, socket]);

  return {
    socket,
    isConnected,
  };
};

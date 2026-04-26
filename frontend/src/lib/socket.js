import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const initSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    console.warn('Socket not initialized. Call initSocket(token) first.');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Helper functions for emitting events
export const joinConversation = (conversationId) => {
  if (socket) {
    socket.emit('join_conversation', conversationId);
  }
};

export const leaveConversation = (conversationId) => {
  if (socket) {
    socket.emit('leave_conversation', conversationId);
  }
};

export const emitTypingStart = (conversationId) => {
  if (socket) {
    socket.emit('typing_start', { conversationId });
  }
};

export const emitTypingStop = (conversationId) => {
  if (socket) {
    socket.emit('typing_stop', { conversationId });
  }
};

export const emitMessageRead = (messageId, conversationId) => {
  if (socket) {
    socket.emit('message_read', { messageId, conversationId });
  }
};

export const emitAddReaction = (messageId, emoji) => {
  if (socket) {
    socket.emit('add_reaction', { messageId, emoji });
  }
};

import { useCallback, useEffect, useRef } from 'react';
import { useChatStore } from '@store/useChatStore';
import { getSocket, emitMessageRead } from '@lib/socket';

export const useMessages = (conversationId) => {
  const {
    messages,
    getMessages,
    addMessage,
    updateMessage,
    setTyping,
    hasMoreMessages,
    isLoadingMessages,
  } = useChatStore();

  const conversationMessages = messages.filter(
    (m) => (m.conversation || m.conversationId) === conversationId
  );

  const loadMore = useCallback(() => {
    if (hasMoreMessages && !isLoadingMessages) {
      const currentPage = Math.ceil(conversationMessages.length / 20) + 1;
      getMessages(conversationId, currentPage);
    }
  }, [conversationId, hasMoreMessages, isLoadingMessages, conversationMessages.length, getMessages]);

  const markAsRead = useCallback((messageId) => {
    emitMessageRead(messageId, conversationId);
  }, [conversationId]);

  // Socket listeners for this conversation
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversationId) return;

    const handleNewMessage = (data) => {
      // Backend may emit either { message: ... } or the message object directly
      const message = data?.message || data;
      const msgConversationId = message?.conversation || message?.conversationId;

      if (msgConversationId === conversationId) {
        addMessage(message);
        // Auto-mark as read if we're in this conversation
        if (message?._id) markAsRead(message._id);
      }
    };

    const handleTyping = (data) => {
      if (data.conversationId === conversationId) {
        setTyping(conversationId, data.userId, true);
      }
    };

    const handleStopTyping = (data) => {
      if (data.conversationId === conversationId) {
        setTyping(conversationId, data.userId, false);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
    };
  }, [conversationId, addMessage, setTyping, markAsRead]);

  return {
    messages: conversationMessages,
    loadMore,
    markAsRead,
    hasMore: hasMoreMessages,
    isLoading: isLoadingMessages,
  };
};

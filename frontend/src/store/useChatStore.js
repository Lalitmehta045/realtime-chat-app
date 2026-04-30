import { create } from 'zustand';
import axios from '@lib/axios';
import { getSocket } from '@lib/socket';
import { useAuthStore } from '@store/useAuthStore';

const toIdString = (value) => {
  if (!value) return '';

  if (typeof value === 'string' || typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'object') {
    if (value._id) return value._id.toString();
    if (value.id) return value.id.toString();
  }

  return '';
};

const normalizeUserLike = (value) => {
  if (!value) return null;

  if (typeof value === 'object') {
    const normalizedId = toIdString(value);
    return normalizedId ? { ...value, _id: normalizedId } : value;
  }

  return toIdString(value) || null;
};

const normalizeReaction = (reaction) => {
  if (!reaction?.emoji) return null;

  return {
    ...reaction,
    userId: normalizeUserLike(reaction.userId),
    emoji: reaction.emoji,
  };
};

const normalizeMessage = (message) => {
  if (!message) return message;

  const normalizedConversationId =
    toIdString(message.conversationId || message.conversation) ||
    message.conversationId ||
    message.conversation ||
    null;

  return {
    ...message,
    conversationId: normalizedConversationId,
    conversation: normalizedConversationId,
    senderId: normalizeUserLike(message.senderId),
    reactions: Array.isArray(message.reactions)
      ? message.reactions.map(normalizeReaction).filter(Boolean)
      : [],
    readBy: Array.isArray(message.readBy)
      ? message.readBy.map(normalizeUserLike).filter(Boolean)
      : [],
    replyTo: message.replyTo
      ? {
        ...message.replyTo,
        messageId: toIdString(message.replyTo.messageId) || message.replyTo.messageId || null,
        senderId: normalizeUserLike(message.replyTo.senderId),
      }
      : null,
  };
};

const normalizeConversation = (conversation) => {
  if (!conversation) return conversation;

  return {
    ...conversation,
    lastMessage: conversation.lastMessage ? normalizeMessage(conversation.lastMessage) : null,
  };
};

const normalizeMessages = (messages = []) => messages.map(normalizeMessage);

const replaceItemAtIndex = (items, index, nextItem) => {
  if (index < 0 || index >= items.length) return items;
  if (items[index] === nextItem) return items;

  const nextItems = items.slice();
  nextItems[index] = nextItem;
  return nextItems;
};

const sortConversationsByUpdatedAt = (conversations) => (
  [...conversations].sort(
    (left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0),
  )
);

const dedupeMessages = (messages) => {
  const seenMessageIds = new Set();

  return messages.filter((message) => {
    const messageId = message?._id;
    if (!messageId || seenMessageIds.has(messageId)) return false;

    seenMessageIds.add(messageId);
    return true;
  });
};

const updateMessageInArray = (messages, messageId, updater) => {
  const messageIndex = messages.findIndex((message) => message._id === messageId);
  if (messageIndex === -1) {
    return {
      changed: false,
      messages,
    };
  }

  const currentMessage = messages[messageIndex];
  const nextMessage = updater(currentMessage);

  if (nextMessage === currentMessage) {
    return {
      changed: false,
      messages,
    };
  }

  return {
    changed: true,
    messages: replaceItemAtIndex(messages, messageIndex, nextMessage),
  };
};

const reactionKey = (reaction) => `${toIdString(reaction?.userId)}:${reaction?.emoji || ''}`;

const areReactionListsEqual = (currentReactions = [], nextReactions = []) => {
  if (currentReactions.length !== nextReactions.length) return false;

  const currentKeys = currentReactions.map(reactionKey).sort();
  const nextKeys = nextReactions.map(reactionKey).sort();

  return currentKeys.every((key, index) => key === nextKeys[index]);
};

const areIdListsEqual = (currentValues = [], nextValues = []) => {
  if (currentValues.length !== nextValues.length) return false;

  const currentIds = currentValues.map(toIdString).sort();
  const nextIds = nextValues.map(toIdString).sort();

  return currentIds.every((value, index) => value === nextIds[index]);
};

const patchMessageCollections = (state, messageId, updater) => {
  const {
    changed: messagesChanged,
    messages: nextMessages,
  } = updateMessageInArray(state.messages, messageId, updater);

  let conversationsChanged = false;
  const nextConversations = state.conversations.reduce((updatedConversations, conversation, index) => {
    if (conversation.lastMessage?._id !== messageId) return updatedConversations;

    const currentLastMessage = normalizeMessage(conversation.lastMessage);
    const updatedLastMessage = updater(currentLastMessage);

    if (updatedLastMessage === currentLastMessage) return updatedConversations;

    conversationsChanged = true;
    return replaceItemAtIndex(updatedConversations, index, {
      ...conversation,
      lastMessage: updatedLastMessage,
    });
  }, state.conversations);

  let nextSelectedConversation = state.selectedConversation;
  if (state.selectedConversation?.lastMessage?._id === messageId) {
    const currentLastMessage = normalizeMessage(state.selectedConversation.lastMessage);
    const updatedLastMessage = updater(currentLastMessage);

    if (updatedLastMessage !== currentLastMessage) {
      nextSelectedConversation = {
        ...state.selectedConversation,
        lastMessage: updatedLastMessage,
      };
    }
  }

  if (
    !messagesChanged &&
    !conversationsChanged &&
    nextSelectedConversation === state.selectedConversation
  ) {
    return state;
  }

  return {
    ...state,
    messages: messagesChanged ? nextMessages : state.messages,
    conversations: conversationsChanged ? nextConversations : state.conversations,
    selectedConversation: nextSelectedConversation,
  };
};

const toggleReactionList = (reactions, currentUser, emoji) => {
  const currentUserId = toIdString(currentUser);
  const normalizedCurrentUser = normalizeUserLike(currentUser);
  const safeReactions = Array.isArray(reactions)
    ? reactions.map(normalizeReaction).filter(Boolean)
    : [];

  const existingReactionIndex = safeReactions.findIndex(
    (reaction) => toIdString(reaction.userId) === currentUserId,
  );

  if (existingReactionIndex === -1) {
    return [
      ...safeReactions,
      {
        userId: normalizedCurrentUser,
        emoji,
      },
    ];
  }

  const existingReaction = safeReactions[existingReactionIndex];
  if (existingReaction.emoji === emoji) {
    return safeReactions.filter((_, index) => index !== existingReactionIndex);
  }

  return safeReactions.map((reaction, index) => (
    index === existingReactionIndex
      ? {
        ...reaction,
        userId: normalizedCurrentUser,
        emoji,
      }
      : reaction
  ));
};

export const useChatStore = create((set, get) => ({
  conversations: [],
  selectedConversation: null,
  messages: [],
  forwardingMessage: null,
  onlineUsers: [],
  typingUsers: {},
  searchResults: [],
  hasMoreMessages: true,
  isLoadingMessages: false,
  justAddedIds: new Set(),

  bindReactionSocketEvents: () => {
    const socket = getSocket();
    if (!socket) return;

    socket.off('reaction_updated');
    socket.on('reaction_updated', (payload) => {
      get().applyReactionUpdate(payload);
    });
  },

  applyReactionUpdate: (payload) => {
    const normalizedPayload =
      payload?._id || payload?.messageId
        ? normalizeMessage(payload)
        : payload?.message
          ? normalizeMessage(payload.message)
          : null;

    const messageId = normalizedPayload?._id || payload?.messageId;
    const nextReactions = normalizedPayload?.reactions || (
      Array.isArray(payload?.reactions)
        ? payload.reactions.map(normalizeReaction).filter(Boolean)
        : []
    );

    if (!messageId) return;

    set((state) => patchMessageCollections(state, messageId, (message) => {
      if (areReactionListsEqual(message.reactions || [], nextReactions)) {
        return message;
      }

      return {
        ...message,
        reactions: nextReactions,
      };
    }));
  },

  getConversations: async () => {
    try {
      const response = await axios.get('/conversations');
      set({
        conversations: (response.data.conversations || []).map(normalizeConversation),
      });
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  },

  selectConversation: (conversation) => {
    const { selectedConversation } = get();
    get().bindReactionSocketEvents();

    if (selectedConversation?._id) {
      const socket = getSocket();
      socket?.emit('leave_conversation', selectedConversation._id);
    }

    if (conversation?._id) {
      const socket = getSocket();
      socket?.emit('join_conversation', conversation._id);
    }

    set({
      selectedConversation: conversation?._id
        ? { ...normalizeConversation(conversation), unreadCount: 0 }
        : conversation,
      conversations: conversation?._id
        ? get().conversations.map((conv) => (
          conv._id === conversation._id
            ? { ...normalizeConversation(conv), unreadCount: 0 }
            : conv
        ))
        : get().conversations,
      messages: [],
      hasMoreMessages: true,
    });

    if (conversation?._id) {
      get().getMessages(conversation._id, 1);
    }
  },

  setForwardingMessage: (message) => set({ forwardingMessage: message }),

  forwardMessage: async ({ messageId, conversationIds }) => {
    const { data } = await axios.post('/messages/forward', { messageId, conversationIds });
    const currentConversationId = get().selectedConversation?._id;

    if (data?.messages) {
      normalizeMessages(data.messages).forEach((message) => {
        if (toIdString(message.conversationId) === toIdString(currentConversationId)) {
          get().addMessage(message);
        }
      });
    }

    return data;
  },

  getMessages: async (conversationId, page = 1) => {
    if (get().isLoadingMessages) return;

    get().bindReactionSocketEvents();
    set({ isLoadingMessages: true });

    try {
      const response = await axios.get(`/messages/${conversationId}?page=${page}`);
      const normalizedMessages = normalizeMessages(response.data.messages || []);
      const { hasMore } = response.data;

      set((state) => ({
        messages: page === 1
          ? normalizedMessages
          : dedupeMessages([...normalizedMessages, ...state.messages]),
        hasMoreMessages: hasMore,
        isLoadingMessages: false,
      }));
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      set({ isLoadingMessages: false });
    }
  },

  markConversationAsRead: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((conversation) => (
        conversation._id === conversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation
      )),
      selectedConversation:
        state.selectedConversation?._id === conversationId
          ? { ...state.selectedConversation, unreadCount: 0 }
          : state.selectedConversation,
    }));
  },

  sendMessage: async (data) => {
    const { text, image, conversationId, replyTo } = data;
    const tempId = `temp_${Date.now()}`;
    const authUser = useAuthStore.getState().authUser;

    const tempMessage = normalizeMessage({
      _id: tempId,
      conversationId,
      senderId: {
        _id: authUser._id,
        username: authUser.username,
        profilePicture: authUser.profilePicture,
      },
      text: text || null,
      image: image ? URL.createObjectURL(image) : null,
      messageType: image && text ? 'mixed' : image ? 'image' : 'text',
      replyTo: replyTo || null,
      reactions: [],
      isRead: false,
      readBy: [],
      isEdited: false,
      isForwarded: false,
      isDeleted: false,
      isTemp: true,
      isFailed: false,
      createdAt: new Date().toISOString(),
    });

    set((state) => ({
      messages: [...state.messages, tempMessage],
    }));

    try {
      const formData = new FormData();
      if (text) formData.append('text', text);
      if (image) formData.append('image', image);
      formData.append('conversationId', conversationId);
      if (replyTo) formData.append('replyTo', JSON.stringify(replyTo));

      const response = await axios.post('/messages', formData);
      const realMessage = normalizeMessage(response.data.message);

      set((state) => {
        const tempMessageIndex = state.messages.findIndex((message) => message._id === tempId);
        const existingRealMessageIndex = state.messages.findIndex((message) => message._id === realMessage._id);
        const updatedJustAddedIds = new Set(state.justAddedIds);
        updatedJustAddedIds.add(realMessage._id);

        const nextMessages = existingRealMessageIndex !== -1
          ? state.messages
          : tempMessageIndex !== -1
            ? replaceItemAtIndex(state.messages, tempMessageIndex, realMessage)
            : [...state.messages, realMessage];

        return {
          messages: nextMessages,
          conversations: sortConversationsByUpdatedAt(
            state.conversations.map((conversation) => (
              conversation._id === conversationId
                ? {
                  ...conversation,
                  lastMessage: realMessage,
                  unreadCount: 0,
                  updatedAt: realMessage.createdAt || new Date().toISOString(),
                }
                : conversation
            )),
          ),
          selectedConversation:
            state.selectedConversation?._id === conversationId
              ? {
                ...state.selectedConversation,
                lastMessage: realMessage,
                unreadCount: 0,
              }
              : state.selectedConversation,
          justAddedIds: updatedJustAddedIds,
        };
      });

      setTimeout(() => {
        set((state) => {
          const cleanedIds = new Set(state.justAddedIds);
          cleanedIds.delete(realMessage._id);
          return { justAddedIds: cleanedIds };
        });
      }, 1000);

      return { success: true };
    } catch (error) {
      console.error('Send message failed:', error);

      set((state) => {
        const failedMessageIndex = state.messages.findIndex((message) => message._id === tempId);
        if (failedMessageIndex === -1) {
          return state;
        }

        const failedMessage = state.messages[failedMessageIndex];
        return {
          messages: replaceItemAtIndex(state.messages, failedMessageIndex, {
            ...failedMessage,
            isTemp: false,
            isFailed: true,
          }),
        };
      });

      return { success: false };
    }
  },

  addMessage: (message) => {
    const normalizedMessage = normalizeMessage(message);
    const messageConversationId = normalizedMessage?.conversationId;
    const authUser = useAuthStore.getState().authUser;
    const currentUserId = toIdString(authUser);

    if (!normalizedMessage?._id || !messageConversationId) {
      return;
    }

    set((state) => {
      const messageAlreadyExists = state.messages.some(
        (currentMessage) => currentMessage._id === normalizedMessage._id,
      );
      const alreadyHandledInSendFlow = state.justAddedIds.has(normalizedMessage._id);

      if (messageAlreadyExists || alreadyHandledInSendFlow) {
        return state;
      }

      const senderId = toIdString(normalizedMessage.senderId);
      const isOwnMessage = senderId === currentUserId;
      const isSelectedConversation =
        toIdString(state.selectedConversation?._id) === toIdString(messageConversationId);

      const tempMessageIndex = state.messages.findIndex((currentMessage) => (
        currentMessage.isTemp &&
        toIdString(currentMessage.conversationId) === toIdString(messageConversationId) &&
        toIdString(currentMessage.senderId) === senderId &&
        currentMessage.text === normalizedMessage.text &&
        currentMessage.messageType === normalizedMessage.messageType
      ));

      const nextMessages = tempMessageIndex !== -1
        ? replaceItemAtIndex(state.messages, tempMessageIndex, normalizedMessage)
        : [...state.messages, normalizedMessage];

      return {
        messages: nextMessages,
        conversations: sortConversationsByUpdatedAt(
          state.conversations.map((conversation) => (
            conversation._id === messageConversationId
              ? {
                ...conversation,
                lastMessage: normalizedMessage,
                unreadCount:
                  isOwnMessage || isSelectedConversation
                    ? 0
                    : (conversation.unreadCount || 0) + 1,
                updatedAt: normalizedMessage.createdAt || new Date().toISOString(),
              }
              : conversation
          )),
        ),
        selectedConversation:
          toIdString(state.selectedConversation?._id) === toIdString(messageConversationId)
            ? {
              ...state.selectedConversation,
              lastMessage: normalizedMessage,
              unreadCount: 0,
            }
            : state.selectedConversation,
      };
    });
  },

  updateMessage: (messageId, updates) => {
    const normalizedUpdates =
      typeof updates === 'string'
        ? { text: updates, isEdited: true }
        : updates;

    set((state) => patchMessageCollections(state, messageId, (message) => {
      const normalizedNextMessage = normalizeMessage({ ...message, ...normalizedUpdates });
      const updateKeys = Object.keys(normalizedUpdates);

      const hasChanged = updateKeys.some((key) => {
        if (key === 'reactions') {
          return !areReactionListsEqual(message.reactions || [], normalizedNextMessage.reactions || []);
        }

        if (key === 'readBy') {
          return !areIdListsEqual(message.readBy || [], normalizedNextMessage.readBy || []);
        }

        return message[key] !== normalizedNextMessage[key];
      });

      return hasChanged ? normalizedNextMessage : message;
    }));
  },

  addReaction: async (messageId, emoji) => {
    if (!messageId || !emoji) return { success: false };

    const authUser = useAuthStore.getState().authUser;
    if (!authUser?._id) return { success: false };

    get().bindReactionSocketEvents();

    const currentMessage = get().messages.find((message) => message._id === messageId);
    if (!currentMessage) return { success: false };

    const previousReactions = currentMessage.reactions || [];
    const optimisticReactions = toggleReactionList(
      previousReactions,
      {
        _id: authUser._id,
        username: authUser.username,
        profilePicture: authUser.profilePicture,
      },
      emoji,
    );

    get().applyReactionUpdate({
      _id: messageId,
      reactions: optimisticReactions,
    });

    const rollbackReactionUpdate = () => {
      get().applyReactionUpdate({
        _id: messageId,
        reactions: previousReactions,
      });
    };

    const socket = getSocket();
    if (socket?.connected) {
      return new Promise((resolve) => {
        let hasAcknowledged = false;

        socket.emit('add_reaction', { messageId, emoji }, (response) => {
          hasAcknowledged = true;

          if (!response?.success) {
            rollbackReactionUpdate();
            console.error('Failed to sync reaction:', response?.message || 'Unknown socket error');
            resolve({ success: false, error: response?.message || 'Failed to sync reaction' });
            return;
          }

          if (response.message) {
            get().applyReactionUpdate(response.message);
          }

          resolve({ success: true });
        });

        setTimeout(() => {
          if (!hasAcknowledged) {
            resolve({ success: true, pending: true });
          }
        }, 3000);
      });
    }

    try {
      const response = await axios.post(`/messages/${messageId}/react`, { emoji });
      get().applyReactionUpdate(response.data?.message || {
        _id: messageId,
        reactions: response.data?.reactions || optimisticReactions,
      });
      return { success: true };
    } catch (error) {
      rollbackReactionUpdate();
      console.error('Failed to persist reaction:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to persist reaction',
      };
    }
  },

  deleteMessage: (messageId) => {
    set((state) => patchMessageCollections(state, messageId, (message) => ({
      ...message,
      isDeleted: true,
      text: 'This message was deleted',
    })));
  },

  searchMessages: async (query, conversationId) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }

    try {
      const url = conversationId
        ? `/messages/search?conversationId=${conversationId}&q=${encodeURIComponent(query)}`
        : `/messages/search?q=${encodeURIComponent(query)}`;

      const response = await axios.get(url);
      set({ searchResults: normalizeMessages(response.data.messages || []) });
    } catch (error) {
      console.error('Search failed:', error);
      set({ searchResults: [] });
    }
  },

  clearSearchResults: () => set({ searchResults: [] }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  addOnlineUser: (userId) => {
    set((state) => {
      const normalizedUserId = userId?.toString();
      const userAlreadyOnline = state.onlineUsers.some(
        (onlineUserId) => onlineUserId?.toString() === normalizedUserId,
      );

      return {
        onlineUsers: userAlreadyOnline ? state.onlineUsers : [...state.onlineUsers, userId],
      };
    });
  },

  removeOnlineUser: (userId) => {
    set((state) => ({
      onlineUsers: state.onlineUsers.filter(
        (onlineUserId) => onlineUserId?.toString() !== userId?.toString(),
      ),
    }));
  },

  setTyping: (conversationId, userId, isTyping) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: isTyping ? userId : null,
      },
    }));
  },

  createConversation: async (userId) => {
    try {
      const response = await axios.post('/conversations', { participantId: userId });
      const newConversation = normalizeConversation(response.data.conversation);

      set((state) => ({
        conversations: [newConversation, ...state.conversations],
      }));

      return { success: true, conversation: newConversation };
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create conversation',
      };
    }
  },

  createGroup: async (data) => {
    try {
      const { name, members, image } = data;

      const formData = new FormData();
      formData.append('name', name);
      formData.append('participants', JSON.stringify(members));
      if (image) formData.append('image', image);

      const response = await axios.post('/conversations/group', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newConversation = normalizeConversation(response.data.conversation);

      set((state) => ({
        conversations: [newConversation, ...state.conversations],
      }));

      return { success: true, conversation: newConversation };
    } catch (error) {
      console.error('Failed to create group:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create group',
      };
    }
  },

  updateGroup: async (groupId, data) => {
    try {
      const { name, addUsers, removeUsers, image } = data;
      
      const formData = new FormData();
      if (name) formData.append('name', name);
      if (addUsers && addUsers.length > 0) addUsers.forEach(id => formData.append('addUsers[]', id));
      if (removeUsers && removeUsers.length > 0) removeUsers.forEach(id => formData.append('removeUsers[]', id));
      if (image) formData.append('image', image);

      // We use axios directly but the backend controller expects addUsers/removeUsers in req.body
      // However, multer is used on the backend. FormData appending array with '[]' might not parse correctly if the backend expects just 'addUsers' as an array in req.body. 
      // Wait, let's send JSON if there's no image.
      let response;
      if (image) {
        response = await axios.put(`/conversations/${groupId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await axios.put(`/conversations/${groupId}`, { name, addUsers, removeUsers });
      }

      const updatedConversation = normalizeConversation(response.data.conversation);

      set((state) => ({
        conversations: state.conversations.map(conv => 
          conv._id === groupId ? { ...updatedConversation, unreadCount: conv.unreadCount } : conv
        ),
        selectedConversation: state.selectedConversation?._id === groupId 
          ? { ...updatedConversation, unreadCount: state.selectedConversation.unreadCount } 
          : state.selectedConversation,
      }));

      return { success: true, conversation: updatedConversation };
    } catch (error) {
      console.error('Failed to update group:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update group',
      };
    }
  },
}));

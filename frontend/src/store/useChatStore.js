import { create } from 'zustand';
import axios from '@lib/axios';
import { getSocket } from '@lib/socket';

export const useChatStore = create((set, get) => ({
  // State
  conversations: [],
  selectedConversation: null,
  messages: [],
  forwardingMessage: null,
  onlineUsers: [],
  typingUsers: {},
  searchResults: [],
  hasMoreMessages: true,
  isLoadingMessages: false,

  // Actions
  getConversations: async () => {
    try {
      const response = await axios.get('/conversations');
      set({ conversations: response.data.conversations || [] });
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  },

  selectConversation: (conversation) => {
    const { selectedConversation } = get();
    
    // Leave previous conversation room
    if (selectedConversation?._id) {
      const socket = getSocket();
      socket?.emit('leave_conversation', selectedConversation._id);
    }
    
    // Join new conversation room
    if (conversation?._id) {
      const socket = getSocket();
      socket?.emit('join_conversation', conversation._id);
    }
    
    set({ 
      selectedConversation: conversation, 
      messages: [], 
      hasMoreMessages: true 
    });
    
    // Fetch messages for the selected conversation
    if (conversation?._id) {
      get().getMessages(conversation._id, 1);
    }
  },

  setForwardingMessage: (message) => set({ forwardingMessage: message }),

  forwardMessage: async ({ messageId, conversationIds }) => {
    const { data } = await axios.post('/messages/forward', { messageId, conversationIds });

    const currentConvId = get().selectedConversation?._id;
    if (data?.messages) {
      data.messages.forEach((msg) => {
        const msgConvId = msg.conversationId || msg.conversation;
        if (msgConvId?.toString() === currentConvId?.toString()) {
          const normalized = msg.conversation ? msg : { ...msg, conversation: msgConvId };
          get().addMessage(normalized);
        }
      });
    }
    return data;
  },

  getMessages: async (conversationId, page = 1) => {
    if (get().isLoadingMessages) return;
    
    set({ isLoadingMessages: true });
    try {
      const response = await axios.get(`/messages/${conversationId}?page=${page}`);
      const { messages, hasMore } = response.data;
      
      if (page === 1) {
        set({ messages: messages || [] });
      } else {
        set({ messages: [...(messages || []), ...get().messages] });
      }
      
      set({ hasMoreMessages: hasMore, isLoadingMessages: false });
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (data) => {
    try {
      const { text, image, conversationId, replyTo } = data;
      
      const formData = new FormData();
      if (text) formData.append('text', text);
      if (image) formData.append('image', image);
      formData.append('conversationId', conversationId);
      if (replyTo) formData.append('replyTo', JSON.stringify(replyTo));

      const response = await axios.post('/messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Optimistically add message to UI
      get().addMessage(response.data.message);
      
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Failed to send message:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to send message' 
      };
    }
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
    
    // Update last message in conversation list
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv._id === message.conversation
          ? { ...conv, lastMessage: message, updatedAt: new Date().toISOString() }
          : conv
      ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    }));
  },

  updateMessage: (messageId, updates) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg._id === messageId ? { ...msg, ...updates } : msg
      ),
    }));
  },

  deleteMessage: (messageId) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg._id === messageId 
          ? { ...msg, isDeleted: true, text: 'This message was deleted' } 
          : msg
      ),
    }));
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
      set({ searchResults: response.data.messages || [] });
    } catch (error) {
      console.error('Search failed:', error);
      set({ searchResults: [] });
    }
  },

  clearSearchResults: () => set({ searchResults: [] }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  addOnlineUser: (userId) => {
    set((state) => {
      const userIdStr = userId?.toString();
      const exists = state.onlineUsers.some(id => id?.toString() === userIdStr);
      return {
        onlineUsers: exists 
          ? state.onlineUsers 
          : [...state.onlineUsers, userId],
      };
    });
  },

  removeOnlineUser: (userId) => {
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((id) => id?.toString() !== userId?.toString()),
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
      const newConversation = response.data.conversation;
      
      set((state) => ({
        conversations: [newConversation, ...state.conversations],
      }));
      
      return { success: true, conversation: newConversation };
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to create conversation' 
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

      const newConversation = response.data.conversation;
      
      set((state) => ({
        conversations: [newConversation, ...state.conversations],
      }));
      
      return { success: true, conversation: newConversation };
    } catch (error) {
      console.error('Failed to create group:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to create group' 
      };
    }
  },
}));

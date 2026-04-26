import { useState, useEffect, useCallback } from 'react';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { ImageLightbox } from './ImageLightbox';
import { ForwardModal } from './ForwardModal';
import { useChatStore } from '@store/useChatStore';
import { useAuthStore } from '@store/useAuthStore';
import { getSocket, emitMessageRead } from '@lib/socket';
import axios from '@lib/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronLeft } from 'lucide-react';

export const ChatWindow = ({ onBack }) => {
  const { 
    selectedConversation, 
    messages,
    sendMessage,
    updateMessage,
    deleteMessage,
    searchMessages,
    searchResults,
    clearSearchResults,
    addMessage,
    setTyping,
    addOnlineUser,
    removeOnlineUser,
    updateMessage: updateMessageInStore,
    forwardingMessage: storeForwardingMessage,
    setForwardingMessage
  } = useChatStore();
  const { authUser } = useAuthStore();
  const [replyingTo, setReplyingTo] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [forwardingMessage, setForwardingMessageLocal] = useState(null);

  useEffect(() => {
    if (storeForwardingMessage && !forwardingMessage) {
      setForwardingMessageLocal(storeForwardingMessage);
    }
  }, [storeForwardingMessage, forwardingMessage]);

  // Escape clears reply state
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && replyingTo) {
        setReplyingTo(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [replyingTo]);

  // Socket event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !selectedConversation) return;

    const handleNewMessage = (data) => {
      if (data.message.conversation === selectedConversation._id) {
        addMessage(data.message);
        
        const isOwnMessage = data.message.senderId?._id?.toString() === authUser?._id?.toString();
        
        // Mark as read if in current conversation
        if (!isOwnMessage) {
          emitMessageRead(data.message._id, selectedConversation._id);
        }
        
        // Show notification if not in this conversation
        if (document.hidden && !isOwnMessage) {
          showNotification(data.message);
        }
      }
    };

    const handleTyping = (data) => {
      if (data.conversationId === selectedConversation._id) {
        setTyping(data.conversationId, data.userId, true);
      }
    };

    const handleStopTyping = (data) => {
      if (data.conversationId === selectedConversation._id) {
        setTyping(data.conversationId, data.userId, false);
      }
    };

    const handleMessageSeen = (data) => {
      updateMessageInStore(data.messageId, { readBy: data.readBy });
    };

    const handleReactionUpdated = (data) => {
      console.log('Reaction updated:', data);
      updateMessageInStore(data.messageId, { reactions: data.reactions });
    };

    const handleUserOnline = (data) => {
      console.log('User online event received:', data);
      addOnlineUser(data.userId);
    };

    const handleUserOffline = (data) => {
      console.log('User offline event received:', data);
      removeOnlineUser(data.userId);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);
    socket.on('message_seen', handleMessageSeen);
    socket.on('reaction_updated', handleReactionUpdated);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('message_seen', handleMessageSeen);
      socket.off('reaction_updated', handleReactionUpdated);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
    };
  }, [selectedConversation, authUser, addMessage, setTyping, addOnlineUser, removeOnlineUser, updateMessageInStore]);

  // Mark unread messages as read when opening conversation
  useEffect(() => {
    if (!selectedConversation || !messages.length) return;

    messages.forEach(message => {
      const isOwn = message.senderId?._id?.toString() === authUser?._id?.toString();
      const isRead = message.readBy?.some(id => id?.toString() === authUser?._id?.toString());
      if (!isOwn && !isRead) {
        emitMessageRead(message._id, selectedConversation._id);
      }
    });
  }, [selectedConversation, messages, authUser]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const showNotification = (message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(message.sender?.username || 'New message', {
        body: message.text || 'Sent an image',
        icon: message.sender?.avatar,
        tag: message.conversation,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  const handleSendMessage = useCallback(async (data) => {
    if (!selectedConversation) return { success: false };

    const result = await sendMessage({
      ...data,
      conversationId: selectedConversation._id,
    });

    return result;
  }, [selectedConversation, sendMessage]);

  const handleEditMessage = useCallback(async (messageId, newText) => {
    try {
      const response = await axios.put(`/messages/${messageId}`, { text: newText });
      updateMessage(messageId, { text: newText, isEdited: true });
      toast.success('Message updated');
    } catch (error) {
      toast.error('Failed to update message');
    }
  }, [updateMessage]);

  const handleDeleteMessage = useCallback(async (messageId) => {
    try {
      await axios.delete(`/messages/${messageId}`);
      deleteMessage(messageId);
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
    }
  }, [deleteMessage]);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      await searchMessages(query, selectedConversation?._id);
    } else {
      clearSearchResults();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-base)]">
      <ChatHeader
        conversation={selectedConversation}
        onBack={onBack}
        onToggleSearch={() => setIsSearching(!isSearching)}
        isSearching={isSearching}
      />

      {/* Search bar */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-[var(--border-glass)]"
          >
            <div className="p-3 flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-glass)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  autoFocus
                />
              </div>
              <button
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery('');
                  clearSearchResults();
                }}
                className="p-2 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto px-3 pb-3 space-y-1">
                {searchResults.map((result) => (
                  <button
                    key={result._id}
                    onClick={() => {
                      // Scroll to message logic would go here
                      setIsSearching(false);
                      clearSearchResults();
                    }}
                    className="w-full px-3 py-2 text-left rounded-lg hover:bg-[var(--bg-surface)] transition-colors"
                  >
                    <p className="text-xs text-[var(--text-muted)]">
                      {result.sender?.username} • {new Date(result.createdAt).toLocaleDateString()}
                    </p>
                    <p 
                      className="text-sm text-[var(--text-primary)]"
                      dangerouslySetInnerHTML={{
                        __html: result.text?.replace(
                          new RegExp(searchQuery, 'gi'),
                          match => `<mark class="bg-violet-500/30 text-violet-300">${match}</mark>`
                        ) || ''
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message list */}
      <MessageList
        onReply={setReplyingTo}
        onForward={(msg) => setForwardingMessageLocal(msg)}
        onEdit={handleEditMessage}
        onDelete={handleDeleteMessage}
        onImageClick={setLightboxImage}
      />

      {/* Typing indicator */}
      {selectedConversation && (
        <TypingIndicator conversationId={selectedConversation._id} />
      )}

      {/* Message input */}
      <MessageInput
        conversationId={selectedConversation?._id}
        onSendMessage={handleSendMessage}
        replyTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />

      {/* Image lightbox */}
      <ImageLightbox
        imageUrl={lightboxImage}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      {/* Forward modal */}
      {forwardingMessage && (
        <ForwardModal
          message={forwardingMessage}
          onClose={() => {
            setForwardingMessageLocal(null);
            setForwardingMessage?.(null);
          }}
        />
      )}
    </div>
  );
};

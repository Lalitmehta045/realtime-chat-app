import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { useChatStore } from '@store/useChatStore';
import { useAuthStore } from '@store/useAuthStore';
import { formatDateSeparator } from '@utils/formatTime';
import { Loader2 } from 'lucide-react';

export const MessageList = ({ 
  onReply, 
  onEdit, 
  onDelete,
  onImageClick 
}) => {
  const { 
    messages, 
    selectedConversation, 
    hasMoreMessages, 
    isLoadingMessages,
    getMessages 
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const sentinelRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMoreMessages && !isLoadingMessages && selectedConversation) {
          // Save scroll position before loading
          const container = messagesContainerRef.current;
          if (container) {
            prevScrollHeightRef.current = container.scrollHeight;
          }
          
          const currentPage = Math.ceil(messages.length / 20) + 1;
          getMessages(selectedConversation._id, currentPage);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasMoreMessages, isLoadingMessages, selectedConversation, messages.length, getMessages]);

  // Restore scroll position after loading older messages
  useEffect(() => {
    if (prevScrollHeightRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const newScrollHeight = container.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
      container.scrollTop = scrollDiff;
      prevScrollHeightRef.current = 0;
    }
  }, [messages.length]);

  // Scroll to bottom on new messages (when at bottom)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (isAtBottom || messages.length <= 20) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Group messages by date and sender
  const groupedMessages = useCallback(() => {
    const groups = [];
    let currentDate = null;
    let currentSender = null;
    let currentGroup = [];

    messages.forEach((message, index) => {
      const messageDate = new Date(message.createdAt).toDateString();
      
      // Add date separator if date changed
      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ type: 'messages', messages: currentGroup });
        }
        groups.push({ type: 'date', date: message.createdAt });
        currentDate = messageDate;
        currentGroup = [];
        currentSender = null;
      }

      // Check if this is a new group (different sender or > 5 min gap)
      const prevMessage = messages[index - 1];
      const currentSenderStr = message.senderId?._id?.toString();
      const isNewSender = currentSenderStr !== currentSender;
      const isTimeGap = prevMessage && new Date(message.createdAt) - new Date(prevMessage.createdAt) > 5 * 60 * 1000;
      const isNewGroup = isNewSender || isTimeGap;

      // Add spacing class for different sender transitions
      const spacingClass = isNewSender ? 'mt-3' : 'mt-0.5';

      currentGroup.push({ ...message, isFirstInGroup: isNewGroup, spacingClass });
      currentSender = currentSenderStr;
    });

    if (currentGroup.length > 0) {
      groups.push({ type: 'messages', messages: currentGroup });
    }

    return groups;
  }, [messages]);

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-[var(--text-muted)]">
          <p className="text-lg font-medium mb-2">Select a conversation</p>
          <p className="text-sm">Choose a chat from the sidebar to start messaging</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0 && !isLoadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-[var(--text-muted)]">
          <p className="text-lg font-medium mb-2">No messages yet</p>
          <p className="text-sm">Send a message to start the conversation</p>
        </div>
      </div>
    );
  }

  const groups = groupedMessages();

  return (
    <div 
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin"
    >
      {/* Loading indicator at top */}
      <div ref={sentinelRef} className="h-4 flex items-center justify-center">
        {isLoadingMessages && (
          <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
        )}
      </div>

      {/* Messages */}
      {groups.map((group, groupIndex) => {
        if (group.type === 'date') {
          return (
            <div key={`date-${groupIndex}`} className="flex items-center justify-center my-4">
              <span className="px-3 py-1.5 rounded-lg bg-[#1f2937]/80 text-xs text-gray-400 shadow-sm">
                {formatDateSeparator(group.date)}
              </span>
            </div>
          );
        }

        return group.messages.map((message) => (
          <MessageBubble
            key={message._id}
            message={message}
            isFirstInGroup={message.isFirstInGroup}
            spacingClass={message.spacingClass}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            onImageClick={onImageClick}
          />
        ));
      })}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

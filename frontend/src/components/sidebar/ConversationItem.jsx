import { motion } from 'framer-motion';
import { Avatar } from '@components/shared/Avatar';
import { formatTime } from '@utils/formatTime';
import { Users } from 'lucide-react';

export const ConversationItem = ({ 
  conversation, 
  isActive, 
  onClick,
  currentUserId 
}) => {
  const isGroup = conversation.isGroup;
  
  // Get other participant for 1-on-1 chats
  const otherParticipant = !isGroup && conversation.participants?.find(
    p => p._id !== currentUserId
  );
  
  const displayName = isGroup 
    ? conversation.name 
    : otherParticipant?.username || 'Unknown';
  
  const avatar = isGroup 
    ? conversation.groupImage 
    : otherParticipant?.profilePicture;
  
  const isOnline = !isGroup && otherParticipant && conversation.onlineUsers?.includes(otherParticipant._id);
  
  const lastMessage = conversation.lastMessage;
  const unreadCount = conversation.unreadCount || 0;
  
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all text-left relative overflow-hidden ${
        isActive 
          ? 'bg-[var(--bg-surface-2)] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 gradient-primary' 
          : 'hover:bg-[var(--bg-surface)]'
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar 
          src={avatar} 
          alt={displayName}
          size="md"
          isOnline={isOnline}
        />
        {isGroup && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
            <Users className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-[var(--text-primary)] truncate text-sm">
            {displayName}
          </h3>
          {lastMessage && (
            <span className="text-xs text-[var(--text-muted)] shrink-0">
              {formatTime(lastMessage.createdAt)}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={`text-xs truncate ${
            unreadCount > 0 
              ? 'text-[var(--text-primary)] font-medium' 
              : 'text-[var(--text-muted)]'
          }`}>
            {lastMessage ? (
              <>
                {lastMessage.senderId?._id?.toString() === currentUserId?.toString() && (
                  <span className="text-[var(--text-muted)]">You: </span>
                )}
                {lastMessage.isDeleted 
                  ? 'This message was deleted'
                  : lastMessage.text || (lastMessage.image ? '📷 Photo' : 'No message')
                }
              </>
            ) : (
              <span className="italic">No messages yet</span>
            )}
          </p>
          
          {unreadCount > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1.5 text-xs font-semibold text-white gradient-primary rounded-full flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
};

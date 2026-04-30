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
    (participant) => participant._id !== currentUserId
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
      layout="position"
      onClick={onClick}
      whileHover={{ scale: 1.01, x: 2 }}
      whileTap={{ scale: 0.988 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28, mass: 0.55 }}
      className={`relative flex w-full items-center gap-3 overflow-hidden rounded-xl p-3 text-left transition-all ${
        isActive
          ? 'bg-[var(--bg-surface-2)] shadow-lg'
          : 'hover:bg-[var(--bg-surface)]'
      }`}
    >
      {isActive && (
        <motion.div 
          layoutId="active-indicator"
          className="absolute left-0 top-0 bottom-0 w-1 bg-[image:var(--message-sent)]"
        />
      )}
      <div className="relative shrink-0">
        <Avatar
          src={avatar}
          alt={displayName}
          size="md"
          isOnline={isOnline}
        />
        {isGroup && (
          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500">
            <Users className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-[var(--text-primary)] flex-1 min-w-0">
            {displayName}
          </h3>
          {lastMessage && (
            <span className="shrink-0 text-xs text-[var(--text-muted)]">
              {formatTime(lastMessage.createdAt)}
            </span>
          )}
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className={`truncate text-xs flex-1 min-w-0 ${
            unreadCount > 0
              ? 'font-medium text-[var(--text-primary)]'
              : 'text-[var(--text-muted)]'
          }`}>
            {lastMessage ? (
              <>
                {lastMessage.senderId?._id?.toString() === currentUserId?.toString() && (
                  <span className="text-[var(--text-muted)]">You: </span>
                )}
                {lastMessage.isDeleted
                  ? 'This message was deleted'
                  : lastMessage.text || (lastMessage.image ? 'Photo' : 'No message')}
              </>
            ) : (
              <span className="italic">No messages yet</span>
            )}
          </p>

          {unreadCount > 0 && (
            <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full gradient-primary px-1.5 text-xs font-semibold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
};

import { motion } from 'framer-motion';
import { Avatar } from '@components/shared/Avatar';
import { useChatStore } from '@store/useChatStore';

export const OnlineUsers = ({ onSelectUser, currentUserId }) => {
  const { onlineUsers, conversations } = useChatStore();

  // Get user details from conversations - check both socket state and DB isOnline
  const onlineUserList = [];
  conversations.forEach(conv => {
    if (!conv.isGroup) {
      const otherParticipant = conv.participants?.find(p => p._id?.toString() !== currentUserId?.toString());
      if (otherParticipant) {
        // Check if online from socket OR database
        const isOnlineFromSocket = onlineUsers.some(id => id?.toString() === otherParticipant._id?.toString());
        const isOnlineFromDB = otherParticipant.isOnline;
        
        if (isOnlineFromSocket || isOnlineFromDB) {
          onlineUserList.push({
            ...otherParticipant,
            conversationId: conv._id,
          });
        }
      }
    }
  });

  if (onlineUserList.length === 0) return null;

  return (
    <div className="px-4 py-3 border-b border-[var(--border-glass)]">
      <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
        Online — {onlineUserList.length}
      </h3>
      
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {onlineUserList.map((user, index) => (
          <motion.button
            key={user._id}
            onClick={() => onSelectUser(user)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <Avatar
              src={user.profilePicture}
              alt={user.username}
              size="lg"
              isOnline={true}
            />
            <span className="text-xs text-[var(--text-muted)] truncate max-w-[60px]">
              {user.username}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

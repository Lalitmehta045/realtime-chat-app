import { motion } from 'framer-motion';
import { Avatar } from '@components/shared/Avatar';
import { useChatStore } from '@store/useChatStore';

export const OnlineUsers = ({ onSelectUser, currentUserId }) => {
  const { onlineUsers, conversations } = useChatStore();

  // Get user details from conversations - check both socket state and DB isOnline
  const onlineUserList = [];
  conversations.forEach((conv) => {
    if (!conv.isGroup) {
      const otherParticipant = conv.participants?.find(
        (participant) => participant._id?.toString() !== currentUserId?.toString()
      );

      if (otherParticipant) {
        const isOnlineFromSocket = onlineUsers.some(
          (id) => id?.toString() === otherParticipant._id?.toString()
        );
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
    <div className="border-b border-[var(--border-glass)] px-3 py-3 sm:px-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Online - {onlineUserList.length}
      </h3>

      <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-1">
        {onlineUserList.map((user, index) => (
          <motion.button
            key={user._id}
            onClick={() => onSelectUser(user)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="flex shrink-0 flex-col items-center gap-1.5"
          >
            <Avatar
              src={user.profilePicture}
              alt={user.username}
              size="lg"
              isOnline={true}
            />
            <span className="max-w-[60px] truncate text-xs text-[var(--text-muted)]">
              {user.username}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

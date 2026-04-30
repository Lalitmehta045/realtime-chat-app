import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { useChatStore } from '@store/useChatStore';
import { useAuthStore } from '@store/useAuthStore';

const dotTransition = (delay) => ({
  duration: 1.05,
  ease: 'easeInOut',
  repeat: Infinity,
  repeatType: 'loop',
  delay,
});

export const TypingIndicator = memo(({ conversationId }) => {
  const { typingUsers, conversations } = useChatStore(
    useShallow((state) => ({
      typingUsers: state.typingUsers,
      conversations: state.conversations,
    }))
  );
  const { authUser } = useAuthStore();

  const typingUserId = typingUsers[conversationId];
  if (!typingUserId || typingUserId === authUser?._id) return null;

  const conversation = conversations.find((item) => item._id === conversationId);
  const typingUser = conversation?.participants?.find((participant) => participant._id === typingUserId);

  if (!typingUser) return null;

  return (
    <AnimatePresence initial={false}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="pointer-events-none px-3 pb-2 sm:px-4"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 backdrop-blur-xl">
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((index) => (
              <motion.span
                key={index}
                className="h-2 w-2 rounded-full bg-violet-300"
                animate={{
                  opacity: [0.35, 1, 0.35],
                  y: [0, -2, 0],
                  scale: [0.9, 1.08, 0.9],
                }}
                transition={dotTransition(index * 0.12)}
              />
            ))}
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {typingUser.username} is typing
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

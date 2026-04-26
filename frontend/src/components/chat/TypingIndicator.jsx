import { useChatStore } from '@store/useChatStore';
import { useAuthStore } from '@store/useAuthStore';

export const TypingIndicator = ({ conversationId }) => {
  const { typingUsers, conversations } = useChatStore();
  const { authUser } = useAuthStore();

  const typingUserId = typingUsers[conversationId];
  
  if (!typingUserId) return null;

  // Get typing user details
  const conversation = conversations.find(c => c._id === conversationId);
  const typingUser = conversation?.participants?.find(p => p._id === typingUserId);
  
  if (!typingUser || typingUserId === authUser?._id) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex items-center gap-1">
        <div className="flex gap-0.5">
          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full typing-dot" />
          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full typing-dot" />
          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full typing-dot" />
        </div>
      </div>
      <span className="text-xs text-[var(--text-muted)]">
        {typingUser.username} is typing...
      </span>
    </div>
  );
};

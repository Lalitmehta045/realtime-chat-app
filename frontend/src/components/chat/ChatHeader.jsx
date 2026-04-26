import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MoreVertical, 
  Search, 
  Phone, 
  Video, 
  Info, 
  X,
  ChevronLeft,
  Users
} from 'lucide-react';
import { Avatar } from '@components/shared/Avatar';
import { useChatStore } from '@store/useChatStore';
import { useAuthStore } from '@store/useAuthStore';

export const ChatHeader = ({ 
  conversation, 
  onBack,
  onToggleSearch,
  isSearching 
}) => {
  const { onlineUsers } = useChatStore();
  const { authUser } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);

  if (!conversation) return null;

  const isGroup = conversation.isGroup;
  
  // Get display info
  let displayName, avatar, isOnline, status;
  
  if (isGroup) {
    displayName = conversation.name;
    avatar = conversation.groupImage;
    const memberCount = conversation.participants?.length || 0;
    status = `${memberCount} members`;
  } else {
    const otherParticipant = conversation.participants?.find(
      p => p._id !== authUser?._id
    );
    displayName = otherParticipant?.username || 'Unknown';
    avatar = otherParticipant?.profilePicture;
    // Check online status from both socket state and database
    const isOnlineFromSocket = onlineUsers.some(id => id?.toString() === otherParticipant?._id?.toString());
    const isOnlineFromDB = otherParticipant?.isOnline;
    isOnline = isOnlineFromSocket || isOnlineFromDB;
    status = isOnline ? 'Online' : 'Offline';
  }

  return (
    <div className="px-4 py-3 glass border-b border-[var(--border-glass)] flex items-center gap-3">
      {/* Back button (mobile) */}
      {onBack && (
        <button
          onClick={onBack}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar
          src={avatar}
          alt={displayName}
          size="md"
          isOnline={!isGroup && isOnline}
        />
        {isGroup && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
            <Users className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-[var(--text-primary)] truncate">
          {displayName}
        </h2>
        <p className={`text-xs ${isOnline ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
          {status}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleSearch}
          className={`p-2 rounded-lg transition-colors ${
            isSearching 
              ? 'bg-violet-500/20 text-violet-400' 
              : 'hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          {isSearching ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
        </button>
        
        <button className="hidden sm:flex p-2 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <Phone className="w-5 h-5" />
        </button>
        
        <button className="hidden sm:flex p-2 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <Video className="w-5 h-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-48 glass rounded-xl shadow-xl z-50 py-1"
                >
                  <button className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    {isGroup ? 'Group info' : 'View profile'}
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Search in chat
                  </button>
                  <hr className="my-1 border-[var(--border-glass)]" />
                  <button className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                    {isGroup ? 'Leave group' : 'Block user'}
                  </button>
                </motion.div>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMenu(false)}
                />
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

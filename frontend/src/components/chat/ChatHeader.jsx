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
import { ProfileModal } from '@components/shared/ProfileModal';
import { GroupInfoModal } from '@components/shared/GroupInfoModal';
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState(null);
  const [isGroupInfoModalOpen, setIsGroupInfoModalOpen] = useState(false);

  if (!conversation) return null;

  const isGroup = conversation.isGroup;
  
  // Get display info
  let displayName, avatar, isOnline, status;
  let otherParticipant = null;
  
  if (isGroup) {
    displayName = conversation.name;
    avatar = conversation.groupImage;
    const memberCount = conversation.participants?.length || 0;
    status = `${memberCount} members`;
  } else {
    otherParticipant = conversation.participants?.find(
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

  const handleViewProfile = () => {
    if (otherParticipant) {
      setSelectedProfileUserId(otherParticipant._id);
      setIsProfileModalOpen(true);
      setShowMenu(false); // Close the dropdown menu
    }
  };

  return (
    <div className="flex items-center gap-2 border-b border-[var(--border-glass)] bg-transparent backdrop-blur-md px-3 py-3 sm:gap-3 sm:px-4">
      {/* Back button (mobile) */}
      {onBack && (
        <button
          onClick={onBack}
          className="-ml-2 rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] lg:hidden"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Avatar and Info - Clickable to open profile */}
      <div 
        className="flex items-center gap-2 cursor-pointer" 
        onClick={isGroup ? () => setIsGroupInfoModalOpen(true) : handleViewProfile}
      >
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
          <h2 className="truncate font-semibold text-[var(--text-primary)]">
            {displayName}
          </h2>
          <p className={`truncate text-xs ${isOnline ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
            {status}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1 ml-auto"> {/* Added ml-auto to push actions to right */}
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
                  className="absolute right-0 top-full z-50 mt-2 w-48 max-w-[calc(100vw-1.5rem)] rounded-xl glass py-1 shadow-xl"
                >
                  <button 
                    onClick={() => {
                      if (isGroup) {
                        setIsGroupInfoModalOpen(true);
                      } else {
                        handleViewProfile();
                      }
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] flex items-center gap-2"
                  >
                    <Info className="w-4 h-4" />
                    {isGroup ? 'Group info' : 'View profile'}
                  </button>
                  <button 
                    onClick={() => {
                      onToggleSearch?.();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] flex items-center gap-2"
                  >
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
      
      <ProfileModal 
        userId={selectedProfileUserId} 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />

      {/* Group Info Modal */}
      {isGroup && (
        <GroupInfoModal
          conversation={conversation}
          isOpen={isGroupInfoModalOpen}
          onClose={() => setIsGroupInfoModalOpen(false)}
        />
      )}
    </div>
  );
};


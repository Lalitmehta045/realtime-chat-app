import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { 
  MessageCircle, 
  Settings, 
  Plus, 
  Users, 
  LogOut,
  Moon,
  Sun,
  Search,
  Menu
} from 'lucide-react';
import { useAuthStore } from '@store/useAuthStore';
import { useChatStore } from '@store/useChatStore';
import { useResponsive } from '@hooks/useResponsive';
import { Avatar } from '@components/shared/Avatar';
import { ConversationItem } from './ConversationItem';
import { OnlineUsers } from './OnlineUsers';
import { UserSearch } from './UserSearch';
import { GroupCreateModal } from './GroupCreateModal';
import toast from 'react-hot-toast';

export const Sidebar = ({ 
  onSelectConversation, 
  selectedConversationId,
  onOpenSettings 
}) => {
  const { authUser, logout } = useAuthStore();
  const { conversations, getConversations, selectConversation } = useChatStore();
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return !document.documentElement.classList.contains('light');
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getConversations();
  }, [getConversations]);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle('light', !newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
  };

  const handleSelectConversation = (conversation) => {
    selectConversation(conversation);
    onSelectConversation?.(conversation);
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    if (conv.isGroup) {
      return conv.name?.toLowerCase().includes(query);
    } else {
      const otherParticipant = conv.participants?.find(p => p._id !== authUser?._id);
      return otherParticipant?.username?.toLowerCase().includes(query);
    }
  });

  // Sort by last message time
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-transparent">
      {/* Header */}
      <div className="border-b border-[var(--border-glass)] px-3 py-3 sm:px-4 sm:py-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-lg shadow-violet-500/25">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-bold text-gradient sm:text-lg">ChatApp</span>
          </div>
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        {/* Search / New Chat */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 rounded-full bg-[var(--bg-surface)] border border-[var(--border-glass)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
            />
          </div>
          <button
            onClick={() => setShowUserSearch(!showUserSearch)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)] transition-all hover:bg-[var(--bg-surface-2)] hover:text-violet-400"
            title="New chat"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowGroupModal(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)] transition-all hover:bg-[var(--bg-surface-2)] hover:text-violet-400"
            title="New group"
          >
            <Users className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* User Search Dropdown */}
      {showUserSearch && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-b border-[var(--border-glass)] px-3 pb-3 sm:px-4"
        >
          <UserSearch 
            onClose={() => setShowUserSearch(false)}
            onSelectUser={(conversation) => {
              handleSelectConversation(conversation);
              setShowUserSearch(false);
            }}
          />
        </motion.div>
      )}

      {/* Online Users */}
      <OnlineUsers 
        onSelectUser={(user) => {
          // Find or create conversation with this user
          const existingConv = conversations.find(c => 
            !c.isGroup && c.participants?.some(p => p._id === user._id)
          );
          if (existingConv) {
            handleSelectConversation(existingConv);
          }
        }}
        currentUserId={authUser?._id}
      />

      {/* Conversations List */}
      <div className="flex-1 space-y-1 overflow-y-auto px-2 py-2 sm:px-3">
        {sortedConversations.length > 0 ? (
          sortedConversations.map((conversation) => (
            <ConversationItem
              key={conversation._id}
              conversation={conversation}
              isActive={selectedConversationId === conversation._id}
              onClick={() => handleSelectConversation(conversation)}
              currentUserId={authUser?._id}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-[var(--text-muted)]">
            <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start a new chat to begin</p>
          </div>
        )}
      </div>

      {/* User Profile */}
      <div className="border-t border-[var(--border-glass)] px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-4">
        <div className="flex items-center gap-3">
          <Avatar
            src={authUser?.profilePicture}
            alt={authUser?.username}
            size="md"
            isOnline={true}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--text-primary)] text-sm truncate">
              {authUser?.username}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Online</p>
          </div>
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Group Create Modal */}
      <GroupCreateModal 
        isOpen={showGroupModal} 
        onClose={() => setShowGroupModal(false)} 
      />
    </div>
  );
};

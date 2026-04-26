import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Settings, 
  Plus, 
  Users, 
  LogOut,
  Moon,
  Sun,
  Search
} from 'lucide-react';
import { useAuthStore } from '@store/useAuthStore';
import { useChatStore } from '@store/useChatStore';
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
    return document.documentElement.classList.contains('dark');
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
    <div className="w-72 shrink-0 h-full glass border-r border-[var(--border-glass)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-glass)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gradient">ChatApp</span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        {/* Search / New Chat */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
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
            className="p-2 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-violet-400 transition-all"
            title="New chat"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowGroupModal(true)}
            className="p-2 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-violet-400 transition-all"
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
          className="px-4 pb-3 border-b border-[var(--border-glass)]"
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
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
      <div className="p-4 border-t border-[var(--border-glass)]">
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

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, UserPlus, Loader2 } from 'lucide-react';
import { Avatar } from '@components/shared/Avatar';
import axios from '@lib/axios';
import toast from 'react-hot-toast';
import { useChatStore } from '@store/useChatStore';

export const UserSearch = ({ onClose, onSelectUser }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef(null);
  const { createConversation } = useChatStore();

  const searchUsers = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
      setResults(response.data.users || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setShowResults(true);
    
    // Debounce search
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      searchUsers(value);
    }, 300);
  };

  const handleSelectUser = async (user) => {
    const result = await createConversation(user._id);
    if (result.success) {
      onSelectUser(result.conversation);
      toast.success(`Started conversation with ${user.username}`);
    } else {
      toast.error(result.error || 'Failed to create conversation');
    }
    onClose();
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowResults(true)}
          placeholder="Search users..."
          className="w-full pl-10 pr-10 py-2.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-glass)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search results */}
      <AnimatePresence>
        {showResults && (query || results.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 glass rounded-xl overflow-hidden shadow-xl z-50 max-h-64 overflow-y-auto"
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
              </div>
            ) : results.length > 0 ? (
              <div className="py-2">
                {results.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => handleSelectUser(user)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--bg-surface-2)] transition-colors text-left"
                  >
                    <Avatar
                      src={user.avatar}
                      alt={user.username}
                      size="md"
                      isOnline={user.isOnline}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-[var(--text-primary)] text-sm">
                        {user.username}
                      </h4>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {user.email}
                      </p>
                    </div>
                    <UserPlus className="w-4 h-4 text-violet-400" />
                  </button>
                ))}
              </div>
            ) : query ? (
              <div className="px-4 py-8 text-center text-[var(--text-muted)] text-sm">
                No users found
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

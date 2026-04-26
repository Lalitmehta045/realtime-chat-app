import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Camera, Search, Check, Loader2 } from 'lucide-react';
import { Avatar } from '@components/shared/Avatar';
import { useChatStore } from '@store/useChatStore';
import axios from '@lib/axios';
import toast from 'react-hot-toast';

export const GroupCreateModal = ({ isOpen, onClose }) => {
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef(null);
  const { createGroup } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setGroupImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get(`/users/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.users || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleMember = (user) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m._id === user._id);
      if (exists) {
        return prev.filter(m => m._id !== user._id);
      }
      return [...prev, user];
    });
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (selectedMembers.length < 2) {
      toast.error('Please select at least 2 members');
      return;
    }

    setIsCreating(true);
    const result = await createGroup({
      name: groupName,
      members: selectedMembers.map(m => m._id),
      image: groupImage,
    });
    setIsCreating(false);

    if (result.success) {
      toast.success('Group created successfully!');
      onClose();
      // Reset form
      setGroupName('');
      setGroupImage(null);
      setImagePreview(null);
      setSelectedMembers([]);
      setSearchQuery('');
      setSearchResults([]);
    } else {
      toast.error(result.error || 'Failed to create group');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md glass rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-glass)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-400" />
              Create Group
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Group image & name */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative w-16 h-16 rounded-full overflow-hidden bg-[var(--bg-surface-2)] border-2 border-dashed border-[var(--border-glass)] flex items-center justify-center hover:border-violet-500/50 transition-colors shrink-0"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Group" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-[var(--text-muted)]" />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </button>
              <div className="flex-1">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-glass)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm"
                />
              </div>
            </div>

            {/* Search members */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Add Members ({selectedMembers.length} selected)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    clearTimeout(window.searchTimeout);
                    window.searchTimeout = setTimeout(() => searchUsers(e.target.value), 300);
                  }}
                  placeholder="Search users to add..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-glass)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                />
              </div>
            </div>

            {/* Selected members */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map(member => (
                  <button
                    key={member._id}
                    onClick={() => toggleMember(member)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-medium hover:bg-violet-500/30 transition-colors"
                  >
                    <Avatar src={member.avatar} alt={member.username} size="sm" />
                    <span>{member.username}</span>
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}

            {/* Search results */}
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults
                  .filter(user => !selectedMembers.find(m => m._id === user._id))
                  .map(user => (
                    <button
                      key={user._id}
                      onClick={() => toggleMember(user)}
                      className="w-full px-3 py-2 flex items-center gap-3 hover:bg-[var(--bg-surface)] rounded-lg transition-colors text-left"
                    >
                      <Avatar src={user.avatar} alt={user.username} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--text-primary)] text-sm">{user.username}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 border-[var(--border-glass)] flex items-center justify-center">
                        {selectedMembers.find(m => m._id === user._id) && (
                          <Check className="w-3 h-3 text-violet-400" />
                        )}
                      </div>
                    </button>
                  ))
              ) : searchQuery ? (
                <p className="text-center text-sm text-[var(--text-muted)] py-4">
                  No users found
                </p>
              ) : null}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--border-glass)] flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium hover:bg-[var(--bg-surface-2)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating || selectedMembers.length < 2 || !groupName.trim()}
              className="flex-1 px-4 py-2 rounded-lg gradient-primary text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Create Group'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, UserPlus, UserMinus, Search, Loader2 } from 'lucide-react';
import { Avatar } from './Avatar';
import { useAuthStore } from '@store/useAuthStore';
import { useChatStore } from '@store/useChatStore';
import axios from '@lib/axios';
import toast from 'react-hot-toast';

export const GroupInfoModal = ({ conversation, isOpen, onClose }) => {
  const { authUser } = useAuthStore();
  const { updateGroup } = useChatStore();

  const [isAddingMember, setIsAddingMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !conversation) return null;

  const { name, groupImage, participants, admin } = conversation;
  const memberCount = participants?.length || 0;

  const adminId = admin?._id || admin;
  const isAdmin = adminId === authUser?._id;

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

  const handleRemoveMember = async (memberId) => {
    setIsUpdating(true);
    const result = await updateGroup(conversation._id, { removeUsers: [memberId] });
    if (result.success) {
      toast.success('Member removed');
    } else {
      toast.error(result.error);
    }
    setIsUpdating(false);
  };

  const handleAddMember = async (memberId) => {
    setIsUpdating(true);
    const result = await updateGroup(conversation._id, { addUsers: [memberId] });
    if (result.success) {
      toast.success('Member added');
      setIsAddingMember(false);
      setSearchQuery('');
      setSearchResults([]);
    } else {
      toast.error(result.error);
    }
    setIsUpdating(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_.2s_ease]">
      {/* BACKDROP CLICK */}
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      {/* MODAL */}
      <div
        className="
          relative w-full 
          max-w-md sm:max-w-lg
          bg-[var(--bg-surface)]
          rounded-2xl
          border border-[var(--border-glass)]
          shadow-2xl
          max-h-[90vh]
          flex flex-col
          overflow-hidden
        "
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-glass)] bg-[var(--bg-surface)] z-10 shrink-0">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Group Info
          </h2>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-base)] transition"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col items-center">
            {/* AVATAR */}
            <div className="relative mb-4">
              <Avatar
                src={groupImage}
                alt={name}
                size="xl"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center border-2 border-[var(--bg-surface)]">
                <Users className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            {/* NAME */}
            <h3 className="text-2xl font-bold text-[var(--text-primary)] text-center">
              {name}
            </h3>

            {/* STATUS */}
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Group • {memberCount} members
            </p>

            {/* MEMBERS LIST */}
            <div className="w-full">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                  Members
                </h4>
                {isAdmin && !isAddingMember && (
                  <button 
                    onClick={() => setIsAddingMember(true)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors rounded-lg text-sm font-medium"
                  >
                    <UserPlus className="w-4 h-4" /> Add
                  </button>
                )}
              </div>

              {isAddingMember && (
                <div className="mb-4 p-3 bg-[var(--bg-surface-2)] rounded-xl border border-[var(--border-glass)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">Add new member</span>
                    <button onClick={() => setIsAddingMember(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        clearTimeout(window.searchTimeout);
                        window.searchTimeout = setTimeout(() => searchUsers(e.target.value), 300);
                      }}
                      placeholder="Search users..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-glass)] text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {isSearching ? (
                      <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" /></div>
                    ) : searchResults.length > 0 ? (
                      searchResults
                        .filter(u => !participants.find(p => p._id === u._id))
                        .map(user => (
                        <div key={user._id} className="flex items-center justify-between p-2 hover:bg-[var(--bg-base)] rounded-lg">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Avatar src={user.avatar} size="xs" />
                            <span className="text-sm text-[var(--text-primary)] truncate">{user.username}</span>
                          </div>
                          <button 
                            onClick={() => handleAddMember(user._id)}
                            disabled={isUpdating}
                            className="text-xs px-2 py-1 bg-violet-500 text-white rounded-md hover:bg-violet-600 disabled:opacity-50 shrink-0"
                          >
                            Add
                          </button>
                        </div>
                      ))
                    ) : searchQuery ? (
                      <p className="text-xs text-center text-[var(--text-muted)] py-2">No users found</p>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {participants?.map((member) => (
                  <div key={member._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg-base)] transition-colors">
                    <Avatar
                      src={member.profilePicture || member.avatar}
                      alt={member.username}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {member.username} {member._id === authUser?._id ? '(You)' : ''}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {member.email}
                      </p>
                    </div>
                    {adminId === member._id && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        Admin
                      </span>
                    )}
                    {isAdmin && member._id !== authUser?._id && (
                      <button 
                        onClick={() => handleRemoveMember(member._id)}
                        disabled={isUpdating}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

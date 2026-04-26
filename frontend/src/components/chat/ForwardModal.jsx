import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, Send, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar } from '@components/shared/Avatar';
import { useAuthStore } from '@store/useAuthStore';
import { useChatStore } from '@store/useChatStore';

export const ForwardModal = ({ message, onClose }) => {
  const { authUser } = useAuthStore();
  const { conversations, forwardMessage } = useChatStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const sourceConversationId = message?.conversationId || message?.conversation;

  const preview = useMemo(() => {
    if (!message) return '';
    if (message.image && !message.text) return 'Photo';
    const t = message.text || (message.image ? 'Photo' : '');
    if (!t) return '';
    return t.length > 40 ? `${t.slice(0, 40)}…` : t;
  }, [message]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (conversations || []).filter((c) => c?._id?.toString() !== sourceConversationId?.toString());

    if (!q) return list;

    return list.filter((c) => {
      const isGroup = c.isGroup;
      const other = !isGroup && c.participants?.find((p) => p._id !== authUser?._id);
      const displayName = isGroup ? c.name : other?.username;
      const participantNames = (c.participants || [])
        .map((p) => p?.username)
        .filter(Boolean)
        .join(' ');
      const hay = `${displayName || ''} ${participantNames}`.toLowerCase();
      return hay.includes(q);
    });
  }, [conversations, search, sourceConversationId, authUser?._id]);

  const toggleConversation = (conversationId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(conversationId)) {
        next.delete(conversationId);
        return next;
      }
      if (next.size >= 5) {
        toast('Maximum 5 conversations', { icon: '⚠️' });
        return next;
      }
      next.add(conversationId);
      return next;
    });
  };

  const handleForward = async () => {
    if (!message?._id) return;
    if (message.isDeleted) {
      toast.error('Cannot forward a deleted message');
      return;
    }
    if (selected.size === 0) return;

    try {
      setLoading(true);
      const data = await forwardMessage({
        messageId: message._id,
        conversationIds: [...selected],
      });
      const count = data?.forwardedCount ?? selected.size;
      toast.success(`Message forwarded to ${count} conversation(s)`);
      onClose?.();
    } catch (e) {
      toast.error('Failed to forward message');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-[420px] rounded-2xl p-4 shadow-2xl border"
          style={{
            background: 'rgba(255,255,255,0.06)',
            borderColor: 'rgba(255,255,255,0.10)',
            borderWidth: '0.5px',
            backdropFilter: 'blur(20px)',
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-violet-300" />
                <h3 className="text-base font-semibold text-white">Forward message</h3>
                {selected.size > 0 && (
                  <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-200 border border-violet-500/30">
                    {selected.size} selected
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-white/70 truncate max-w-[320px]">
                {preview}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-violet-500/40"
              autoFocus
            />
          </div>

          {/* List */}
          <div className="mt-3 max-h-[320px] overflow-y-auto rounded-xl border border-white/10">
            {filteredConversations.length === 0 ? (
              <div className="p-6 flex flex-col items-center justify-center text-center text-white/60">
                <Inbox className="w-6 h-6 mb-2 text-white/40" />
                <p className="text-sm font-medium">No conversations found</p>
                <p className="text-xs text-white/40 mt-1">Try a different search.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredConversations.map((conv) => {
                  const isGroup = conv.isGroup;
                  const other = !isGroup && conv.participants?.find((p) => p._id !== authUser?._id);
                  const displayName = isGroup ? conv.name : other?.username || 'Unknown';
                  const avatar = isGroup ? conv.groupImage : other?.profilePicture;
                  const last = conv.lastMessage;
                  const lastPreview = last?.isDeleted
                    ? 'This message was deleted'
                    : last?.text || (last?.image ? 'Photo' : 'No message');

                  const isSelected = selected.has(conv._id);

                  return (
                    <button
                      key={conv._id}
                      type="button"
                      onClick={() => toggleConversation(conv._id)}
                      className={`w-full px-3 py-3 flex items-center gap-3 text-left transition-colors ${
                        isSelected ? 'bg-violet-500/15' : 'hover:bg-white/5'
                      }`}
                      style={isSelected ? { borderLeft: '3px solid #7C3AED' } : undefined}
                    >
                      <Avatar src={avatar} alt={displayName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                        </div>
                        <p className="text-xs text-white/55 truncate">{lastPreview}</p>
                      </div>
                      <div className="shrink-0">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                            isSelected ? 'bg-violet-500/40 border-violet-400/60' : 'bg-white/5 border-white/15'
                          }`}
                          title={selected.size >= 5 && !isSelected ? 'Maximum 5 conversations' : ''}
                        >
                          {isSelected && <div className="w-2.5 h-2.5 rounded-sm bg-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={handleForward}
              disabled={selected.size === 0 || loading}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-all ${
                selected.size === 0 || loading
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] hover:brightness-110 active:scale-[0.99]'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Forward
              </span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};


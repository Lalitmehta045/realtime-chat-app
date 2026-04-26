import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  CheckCheck, 
  Smile, 
  MoreHorizontal,
  Reply,
  Forward,
  Edit3,
  Trash2,
  Copy,
  X,
  Check as CheckIcon
} from 'lucide-react';
import { Avatar } from '@components/shared/Avatar';
import { formatMessageTime } from '@utils/formatTime';
import { useAuthStore } from '@store/useAuthStore';
import { useChatStore } from '@store/useChatStore';
import { emitAddReaction } from '@lib/socket';
import EmojiPicker from 'emoji-picker-react';
import toast from 'react-hot-toast';
import { ForwardedLabel } from './ForwardedLabel';
import { QuotedMessage } from './QuotedMessage';

export const MessageBubble = ({ 
  message, 
  isFirstInGroup,
  spacingClass = '',
  onReply,
  onForward,
  onEdit,
  onDelete,
  onImageClick 
}) => {
  const { authUser } = useAuthStore();
  const { selectedConversation, setForwardingMessage } = useChatStore();
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  // Use senderId instead of sender (backend field name)
  const isOwn = message.senderId?._id?.toString() === authUser?._id?.toString();
  
  const isDeleted = message.isDeleted;
  const bubbleRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const [swipeX, setSwipeX] = useState(0);

  const reactions = message.reactions || [];
  const groupedReactions = reactions.reduce((acc, reaction) => {
    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
    return acc;
  }, {});

  const hasUserReacted = (emoji) => {
    return reactions.some(r => r.emoji === emoji && r.userId?._id?.toString() === authUser?._id?.toString());
  };

  const handleReaction = (emoji) => {
    console.log('Adding reaction:', { messageId: message._id, emoji });
    emitAddReaction(message._id, emoji);
    setShowReactionPicker(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    toast.success('Message copied');
    setShowContextMenu(false);
  };

  const handleEditSubmit = () => {
    if (editText.trim() && editText !== message.text) {
      onEdit?.(message._id, editText);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete?.(message._id);
    setShowContextMenu(false);
  };

  const handleReply = () => {
    onReply?.(message);
    setShowContextMenu(false);
  };

  const handleForward = () => {
    if (message.isDeleted) {
      toast.error('Cannot forward a deleted message');
      setShowContextMenu(false);
      return;
    }
    if (onForward) onForward(message);
    else setForwardingMessage?.(message);
    setShowContextMenu(false);
  };

  // Context menu on right click
  const handleContextMenu = (e) => {
    e.preventDefault();
    setShowContextMenu(true);
  };

  const handleTouchStart = (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    setSwipeX(0);
  };

  const handleTouchMove = (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    if (Math.abs(dy) > Math.abs(dx)) return; // treat as scroll
    if (dx <= 0) {
      setSwipeX(0);
      return;
    }
    setSwipeX(Math.min(dx, 72));
  };

  const handleTouchEnd = () => {
    if (swipeX > 60) {
      onReply?.(message);
    }
    setSwipeX(0);
  };

  if (isDeleted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex w-full mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`min-w-[120px] px-3 py-2 rounded-lg italic text-sm ${
          isOwn 
            ? 'bg-[#005c4b]/70 text-gray-300 rounded-tr-sm' 
            : 'bg-[#1f2937]/70 text-gray-400 rounded-tl-sm'
        }`}>
          This message was deleted
          <span className={`text-[10px] ml-2 ${isOwn ? 'text-gray-400' : 'text-gray-500'}`}>
            {formatMessageTime(message.createdAt)}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={bubbleRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full mb-1 ${isOwn ? 'justify-end' : 'justify-start'} group ${spacingClass}`}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`flex items-end gap-2 max-w-[85%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar (only for first in group) */}
        {!isOwn && isFirstInGroup && (
          <Avatar
            src={message.senderId?.profilePicture}
            alt={message.senderId?.username}
            size="sm"
          />
        )}
        {!isOwn && !isFirstInGroup && <div className="w-8" />}

        {/* Message content */}
        <div className="relative flex flex-col">
          {/* Reply preview */}
          {message.replyTo && (
            <div className={`mb-1 px-3 py-1.5 rounded-lg border-l-2 ${
              isOwn ? 'border-violet-400 bg-violet-500/10' : 'border-[var(--border-glass)] bg-[var(--bg-surface)]'
            }`}>
              <p className="text-xs text-[var(--text-muted)]">
                {message.replyTo.senderId?.username}
              </p>
              <p className="text-xs truncate text-[var(--text-primary)]">
                {message.replyTo.isDeleted ? 'This message was deleted' : message.replyTo.text}
              </p>
            </div>
          )}

          {/* Sender name for received messages */}
          {!isOwn && isFirstInGroup && message.senderId?.username && (
            <span className="text-xs text-[var(--text-muted)] mb-1 ml-1">
              {message.senderId.username}
            </span>
          )}

          {/* Message bubble */}
          <div className={`relative flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
            {/* Swipe indicator (mobile) */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 pointer-events-none opacity-0 md:opacity-0 ${
                swipeX > 0 ? 'opacity-100' : ''
              } transition-opacity`}
              style={{
                transform: `translateX(${(isOwn ? -1 : 1) * Math.min(swipeX, 60)}px) translateY(-50%)`,
                [isOwn ? 'right' : 'left']: '-34px',
              }}
            >
              <div className="w-8 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--border-glass)] flex items-center justify-center text-[var(--text-muted)]">
                <Reply className="w-4 h-4" />
              </div>
            </div>

            {/* Reaction picker button - always visible on mobile, hover on desktop */}
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className={`absolute top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 ${
                isOwn ? '-left-10' : '-right-10'
              } p-2 rounded-full bg-[var(--bg-surface)] shadow-md text-[var(--text-muted)] hover:text-yellow-400 active:scale-95 transition-colors`}
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Reply button - hover actions */}
            <button
              onClick={handleReply}
              title="Reply"
              className={`absolute top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 ${
                isOwn ? '-left-[7.5rem]' : '-right-[7.5rem]'
              } p-2 rounded-full bg-[var(--bg-surface)] shadow-md text-[var(--text-muted)] hover:text-violet-400 active:scale-95 transition-colors`}
            >
              <Reply className="w-5 h-5" />
            </button>

            {/* Forward button - hover actions */}
            <button
              onClick={handleForward}
              title="Forward"
              className={`absolute top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 ${
                isOwn ? '-left-20' : '-right-20'
              } p-2 rounded-full bg-[var(--bg-surface)] shadow-md text-[var(--text-muted)] hover:text-violet-400 active:scale-95 transition-colors`}
            >
              <Forward className="w-5 h-5" />
            </button>

            <div className={`min-w-[80px] max-w-[100%] px-3 pt-2 pb-6 rounded-lg relative shadow-sm ${
              isOwn 
                ? 'bg-[#005c4b] text-white rounded-tr-sm' 
                : 'bg-[#1f2937] text-white rounded-tl-sm border border-gray-700/50'
            }`}>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSubmit();
                      if (e.key === 'Escape') setIsEditing(false);
                    }}
                    className={`flex-1 px-2 py-1 rounded bg-black/20 text-sm outline-none ${
                      isOwn ? 'text-white placeholder-white/50' : 'text-[var(--text-primary)]'
                    }`}
                    autoFocus
                  />
                  <button onClick={handleEditSubmit} className="text-emerald-400">
                    <CheckIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => setIsEditing(false)} className="text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  {/* Forwarded label */}
                  {message.isForwarded && (
                    <ForwardedLabel isSent={isOwn} />
                  )}

                  {/* Quoted message */}
                  {message.replyTo?.messageId && (
                    <QuotedMessage replyTo={message.replyTo} isSent={isOwn} />
                  )}

                  {/* Image */}
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Message attachment"
                      className="max-w-[260px] w-full rounded-md cursor-pointer mb-3"
                      onClick={() => onImageClick?.(message.image)}
                    />
                  )}
                  
                  {/* Text */}
                  {message.text && (
                    <p className="text-[15px] break-words leading-snug pr-20 md:pr-16">
                      {message.text}
                    </p>
                  )}
                </>
              )}

              {/* Timestamp & read receipt - WhatsApp style bottom-right */}
              <div className={`absolute bottom-1 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/20 backdrop-blur-sm ${isOwn ? 'text-gray-200' : 'text-gray-300'}`}>
                <span className="text-[11px]">
                  {formatMessageTime(message.createdAt)}
                  {message.isEdited && <span className="ml-1">(edited)</span>}
                </span>
                
                {isOwn && (
                  <span className="ml-0.5">
                    {message.readBy?.length > 0 ? (
                      <CheckCheck className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Reactions */}
            {Object.keys(groupedReactions).length > 0 && (
              <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                {Object.entries(groupedReactions).map(([emoji, count]) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition-colors ${
                      hasUserReacted(emoji)
                        ? 'bg-violet-500/30 text-violet-300 border border-violet-500/50'
                        : 'bg-[var(--bg-surface)] border border-[var(--border-glass)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span>{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Emoji Picker */}
          {showReactionPicker && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowReactionPicker(false)}
              />
              <div className={`fixed md:absolute z-50 ${isOwn ? 'right-2 md:right-0' : 'left-2 md:left-0'} bottom-20 md:bottom-full md:mb-2`}>
                <div className="glass rounded-xl overflow-hidden shadow-2xl">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => handleReaction(emojiData.emoji)}
                    width={300}
                    height={400}
                    theme="dark"
                    lazyLoadEmojis={true}
                  />
                </div>
              </div>
            </>
          )}

          {/* Context Menu */}
          {showContextMenu && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowContextMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute z-50 right-0 top-full mt-1 w-40 glass rounded-xl shadow-xl py-1"
              >
                <button
                  onClick={handleReply}
                  className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] flex items-center gap-2"
                >
                  <Reply className="w-4 h-4" />
                  Reply
                </button>
                  <button
                    onClick={handleForward}
                    className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] flex items-center gap-2"
                  >
                    <Forward className="w-4 h-4" />
                    Forward
                  </button>
                <button
                  onClick={() => setShowReactionPicker(true)}
                  className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] flex items-center gap-2"
                >
                  <Smile className="w-4 h-4" />
                  React
                </button>
                {isOwn && (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowContextMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                )}
                {message.text && (
                  <button
                    onClick={handleCopy}
                    className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                )}
              </motion.div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

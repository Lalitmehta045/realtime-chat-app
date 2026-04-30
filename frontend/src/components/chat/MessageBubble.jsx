import { memo, useMemo, useRef, useState, useEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import gsap from 'gsap';
import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
  Copy,
  Edit3,
  Forward,
  Reply,
  Smile,
  Trash2,
  X,
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import toast from 'react-hot-toast';
import { Avatar } from '@components/shared/Avatar';
import { useAuthStore } from '@store/useAuthStore';
import { useChatStore } from '@store/useChatStore';
import { useResponsive } from '@hooks/useResponsive';
import { formatMessageTime } from '@utils/formatTime';
import { ForwardedLabel } from './ForwardedLabel';
import { QuotedMessage } from './QuotedMessage';

const bubbleMotion = {
  initial: { opacity: 0, y: 12, scale: 0.92 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.18, ease: 'easeOut' },
};

const toIdString = (value) => {
  if (!value) return '';

  if (typeof value === 'string' || typeof value === 'number') {
    return value.toString();
  }

  return value._id?.toString?.() || value.id?.toString?.() || '';
};

const normalizeReaction = (reaction) => {
  if (!reaction?.emoji) return null;

  return {
    ...reaction,
    userId: reaction.userId ?? null,
    emoji: reaction.emoji,
  };
};

const serializeReactionList = (reactions = []) => (
  reactions
    .map((reaction) => `${toIdString(reaction?.userId)}:${reaction?.emoji || ''}`)
    .sort()
    .join('|')
);

const serializeReadBy = (readBy = []) => (
  readBy
    .map((entry) => toIdString(entry))
    .sort()
    .join('|')
);

const areReplyTargetsEqual = (leftReply, rightReply) => (
  toIdString(leftReply?.messageId) === toIdString(rightReply?.messageId) &&
  toIdString(leftReply?.senderId) === toIdString(rightReply?.senderId) &&
  leftReply?.senderName === rightReply?.senderName &&
  leftReply?.text === rightReply?.text &&
  leftReply?.image === rightReply?.image &&
  leftReply?.messageType === rightReply?.messageType
);

const messageBubblePropsEqual = (previousProps, nextProps) => {
  const previousMessage = previousProps.message;
  const nextMessage = nextProps.message;

  return (
    previousMessage._id === nextMessage._id &&
    previousMessage.text === nextMessage.text &&
    previousMessage.image === nextMessage.image &&
    previousMessage.createdAt === nextMessage.createdAt &&
    previousMessage.isDeleted === nextMessage.isDeleted &&
    previousMessage.isEdited === nextMessage.isEdited &&
    previousMessage.isTemp === nextMessage.isTemp &&
    previousMessage.isFailed === nextMessage.isFailed &&
    previousMessage.isForwarded === nextMessage.isForwarded &&
    previousMessage.messageType === nextMessage.messageType &&
    toIdString(previousMessage.senderId) === toIdString(nextMessage.senderId) &&
    previousMessage.senderId?.username === nextMessage.senderId?.username &&
    previousMessage.senderId?.profilePicture === nextMessage.senderId?.profilePicture &&
    serializeReactionList(previousMessage.reactions) === serializeReactionList(nextMessage.reactions) &&
    serializeReadBy(previousMessage.readBy) === serializeReadBy(nextMessage.readBy) &&
    areReplyTargetsEqual(previousMessage.replyTo, nextMessage.replyTo) &&
    previousProps.isFirstInGroup === nextProps.isFirstInGroup &&
    previousProps.spacingClass === nextProps.spacingClass
  );
};

const MessageBubbleComponent = ({
  message,
  isFirstInGroup,
  spacingClass = '',
  onReply,
  onForward,
  onEdit,
  onDelete,
  onImageClick,
}) => {
  const { authUser } = useAuthStore();
  const setForwardingMessage = useChatStore((state) => state.setForwardingMessage);
  const addReaction = useChatStore((state) => state.addReaction);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const currentUserId = toIdString(authUser);
  const isOwn = toIdString(message.senderId) === currentUserId;
  const isDeleted = message.isDeleted;
  const isTemp = message.isTemp;
  const isFailed = message.isFailed;
  const reactions = useMemo(
    () => (Array.isArray(message.reactions) ? message.reactions.map(normalizeReaction).filter(Boolean) : []),
    [message.reactions],
  );
  const prefersReducedMotion = useReducedMotion();
  const swipeX = useMotionValue(0);
  const replyCueOpacity = useTransform(swipeX, [0, 18, 64], [0, 0.48, 1]);
  const replyCueScale = useTransform(swipeX, [0, 64], [0.82, 1]);
  const replyCueX = useTransform(swipeX, (value) => (isOwn ? -1 : 1) * Math.min(value, 60));
  const bubbleOffsetX = useTransform(swipeX, (value) => value * 0.18);
  const bubbleLift = useTransform(swipeX, [0, 72], [0, -2]);
  const touchStartRef = useRef({
    x: 0,
    y: 0,
    edgeLocked: false,
    axisLocked: false,
    lastX: 0,
    lastTime: 0,
    velocityX: 0,
  });

  const groupedReactions = useMemo(() => {
    const grouped = new Map();

    reactions.forEach((reaction) => {
      if (!reaction?.emoji) return;

      const currentGroup = grouped.get(reaction.emoji) || {
        emoji: reaction.emoji,
        count: 0,
        hasCurrentUser: false,
      };

      currentGroup.count += 1;
      currentGroup.hasCurrentUser ||= toIdString(reaction.userId) === currentUserId;
      grouped.set(reaction.emoji, currentGroup);
    });

    return Array.from(grouped.values());
  }, [currentUserId, reactions]);

  const hasUserReacted = (emoji) => reactions.some(
    (reaction) => (
      reaction.emoji === emoji &&
      toIdString(reaction.userId) === currentUserId
    )
  );

  const handleReaction = (emoji) => {
    addReaction(message._id, emoji);
    setShowReactionPicker(false);
  };

  const handleCopy = () => {
    if (!message.text) return;

    navigator.clipboard.writeText(message.text);
    toast.success('Message copied');
    setShowContextMenu(false);
  };

  const handleEditSubmit = () => {
    const nextText = editText.trim();
    if (nextText && nextText !== message.text) {
      onEdit?.(message._id, nextText);
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
    else setForwardingMessage(message);
    setShowContextMenu(false);
  };

  const handleRetry = () => {
    if (!isFailed) return;
    toast.error('Please type and resend the message');
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    if (isTemp || isFailed) return;
    setShowContextMenu(true);
  };

  const handleTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;

    const now = performance.now();
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      edgeLocked: touch.clientX <= 32,
      axisLocked: false,
      lastX: touch.clientX,
      lastTime: now,
      velocityX: 0,
    };
    swipeX.set(0);
  };

  const handleTouchMove = (event) => {
    const touch = event.touches?.[0];
    if (!touch || touchStartRef.current.edgeLocked) return;

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const now = performance.now();
    const elapsed = Math.max(now - touchStartRef.current.lastTime, 1);
    const velocityX = (touch.clientX - touchStartRef.current.lastX) / elapsed;

    if (!touchStartRef.current.axisLocked) {
      if (Math.abs(deltaX) <= 8 && Math.abs(deltaY) <= 8) return;
      touchStartRef.current.axisLocked = Math.abs(deltaX) > Math.abs(deltaY);
    }

    if (!touchStartRef.current.axisLocked) return;
    if (deltaX <= 0) {
      swipeX.set(0);
      return;
    }

    touchStartRef.current.lastX = touch.clientX;
    touchStartRef.current.lastTime = now;
    touchStartRef.current.velocityX = velocityX;

    const dampedX = deltaX < 56 ? deltaX : 56 + (deltaX - 56) * 0.2;
    swipeX.set(Math.min(dampedX, 76));
  };

  const handleTouchEnd = () => {
    const currentX = swipeX.get();
    const shouldReply = currentX > 58 || touchStartRef.current.velocityX > 0.65;

    if (shouldReply) {
      onReply?.(message);
    }

    touchStartRef.current = {
      x: 0,
      y: 0,
      edgeLocked: false,
      axisLocked: false,
      lastX: 0,
      lastTime: 0,
      velocityX: 0,
    };

    animate(swipeX, 0, prefersReducedMotion
      ? { duration: 0.12, ease: 'easeOut' }
      : { type: 'spring', stiffness: 520, damping: 38, mass: 0.34 });
  };

  if (isDeleted) {
    return (
      <motion.div
        {...bubbleMotion}
        className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} ${spacingClass}`}
      >
        <div className="max-w-[85%] lg:max-w-[65%]">
          <div
            className={`rounded-2xl px-3.5 py-2.5 text-sm italic ${
              isOwn
                ? 'rounded-tr-md bg-emerald-900/40 text-gray-200'
                : 'rounded-tl-md border border-white/8 bg-white/6 text-gray-400'
            }`}
          >
            This message was deleted
            <span className={`ml-2 text-[10px] ${isOwn ? 'text-gray-400' : 'text-gray-500'}`}>
              {formatMessageTime(message.createdAt)}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      {...bubbleMotion}
      className={`group flex w-full ${isOwn ? 'justify-end' : 'justify-start'} ${spacingClass}`}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-swipe-reply="true"
    >
      <div className={`flex max-w-[88%] items-end gap-2 sm:max-w-[84%] xl:max-w-[72%] 2xl:max-w-[65%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isOwn && isFirstInGroup && (
          <Avatar
            src={message.senderId?.profilePicture}
            alt={message.senderId?.username}
            size="sm"
          />
        )}
        {!isOwn && !isFirstInGroup && <div className="w-8 shrink-0" />}

        <div className={`relative flex min-w-0 flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {!isOwn && isFirstInGroup && message.senderId?.username && (
            <div className="flex items-center gap-2 mb-1 ml-1">
              <span className="text-[11px] font-medium text-[var(--text-muted)]">
                {message.senderId.username}
              </span>
              {message.text?.includes(`@${authUser?.username}`) && (
                <span className="px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[9px] font-bold uppercase tracking-wider border border-violet-500/30">
                  Mentioned you
                </span>
              )}
            </div>
          )}
          {!isOwn && !isFirstInGroup && message.text?.includes(`@${authUser?.username}`) && (
            <div className="flex items-center gap-2 mb-1 ml-1">
              <span className="px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[9px] font-bold uppercase tracking-wider border border-violet-500/30">
                Mentioned you
              </span>
            </div>
          )}

          <div className={`relative flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
            <motion.div
              className="pointer-events-none absolute top-1/2 z-10 -translate-y-1/2"
              style={{
                opacity: replyCueOpacity,
                scale: replyCueScale,
                x: replyCueX,
                [isOwn ? 'right' : 'left']: '-34px',
              }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-[var(--text-muted)] backdrop-blur-xl">
                <Reply className="h-4 w-4" />
              </div>
            </motion.div>

            {!isTemp && !isFailed && (
              <div
                className={`absolute top-1/2 z-10 hidden -translate-y-1/2 items-center gap-1 opacity-0 transition md:flex md:group-hover:opacity-100 ${
                  isOwn ? '-left-[7.9rem]' : '-right-[7.9rem]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setShowReactionPicker((currentValue) => !currentValue)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-[var(--text-muted)] backdrop-blur-xl transition hover:text-yellow-300"
                >
                  <Smile className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleReply}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-[var(--text-muted)] backdrop-blur-xl transition hover:text-violet-300"
                >
                  <Reply className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleForward}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-[var(--text-muted)] backdrop-blur-xl transition hover:text-sky-300"
                >
                  <Forward className="h-4 w-4" />
                </button>
              </div>
            )}

            <motion.div
              className={`relative min-w-[88px] max-w-full overflow-hidden rounded-3xl px-3.5 pb-7 pt-2.5 transition duration-150 ${
                isTemp ? 'opacity-65' : 'opacity-100'
              } ${
                isFailed
                  ? 'rounded-tr-lg border border-red-400/30 bg-red-950/50 text-white'
                  : isOwn
                    ? 'rounded-tr-lg'
                    : 'rounded-tl-lg border border-[var(--border-glass)]'
              }`}
              style={{
                x: bubbleOffsetX,
                y: bubbleLift,
                willChange: 'transform',
                background: !isFailed ? (isOwn ? 'var(--message-sent)' : 'var(--message-received)') : undefined,
                color: !isFailed ? (isOwn ? 'var(--message-sent-text)' : 'var(--message-received-text)') : undefined,
                boxShadow: !isFailed ? (
                  message.text?.includes(`@${authUser?.username}`) 
                    ? '0 0 20px rgba(139, 92, 246, 0.3), var(--glass-shadow)' 
                    : 'var(--glass-shadow)'
                ) : undefined,
                border: !isFailed && !isOwn && message.text?.includes(`@${authUser?.username}`)
                  ? '1px solid rgba(139, 92, 246, 0.5)'
                  : undefined,
              }}
            >
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editText}
                    onChange={(event) => setEditText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleEditSubmit();
                      if (event.key === 'Escape') setIsEditing(false);
                    }}
                    className={`min-w-0 flex-1 rounded-xl bg-black/20 px-3 py-2 text-sm outline-none ${
                      isOwn ? 'text-white placeholder:text-white/50' : 'text-[var(--text-primary)]'
                    }`}
                    autoFocus
                  />
                  <button type="button" onClick={handleEditSubmit} className="text-emerald-300">
                    <Check className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)} className="text-red-300">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  {message.isForwarded && <ForwardedLabel isSent={isOwn} />}

                  {message.replyTo?.messageId && (
                    <QuotedMessage replyTo={message.replyTo} isSent={isOwn} />
                  )}

                  {message.image && (
                    <img
                      src={message.image}
                      alt="Message attachment"
                      className="mb-3 max-h-72 w-full max-w-[260px] rounded-2xl object-cover"
                      onClick={() => !isTemp && onImageClick?.(message.image)}
                    />
                  )}

                  {message.text && (
                    <p className="break-words pr-20 text-[15px] leading-6 text-inherit">
                      {message.text.split(/(@\w+)/g).map((part, i) => {
                        if (part.startsWith('@')) {
                          return (
                            <span key={i} className={`font-bold transition-colors ${isOwn ? 'text-sky-200' : 'text-sky-400'}`}>
                              {part}
                            </span>
                          );
                        }
                        return part;
                      })}
                    </p>
                  )}
                </>
              )}

              <div
                className={`absolute bottom-1.5 right-2 flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5 text-[11px] backdrop-blur-md ${
                  isOwn ? 'text-white/80' : 'text-[var(--text-muted)]'
                }`}
              >
                <span>
                  {formatMessageTime(message.createdAt)}
                  {message.isEdited && <span className="ml-1">(edited)</span>}
                </span>

                {isOwn && (
                  <span className="ml-0.5 flex items-center">
                    {isTemp && !isFailed && (
                      <Clock className="h-3 w-3 animate-pulse text-gray-300" />
                    )}

                    {isFailed && (
                      <button
                        type="button"
                        onClick={handleRetry}
                        title="Failed to send. Tap to retry."
                        className="flex items-center text-red-300 transition hover:text-red-200"
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {!isTemp && !isFailed && (
                      message.readBy?.length > 0 ? (
                        <CheckCheck className="h-4 w-4 text-sky-300" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )
                    )}
                  </span>
                )}
              </div>
            </motion.div>

            {groupedReactions.length > 0 && (
              <div className={`mt-1 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                {groupedReactions.map(({ emoji, count, hasCurrentUser }) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleReaction(emoji)}
                    className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
                      hasCurrentUser || hasUserReacted(emoji)
                        ? 'border-violet-400/40 bg-violet-500/20 text-violet-200'
                        : 'border-white/10 bg-white/6 text-[var(--text-primary)] hover:bg-white/10'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span>{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {showReactionPicker && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowReactionPicker(false)}
              />
              <div
                className={`fixed bottom-20 z-50 md:absolute md:bottom-full md:mb-2 ${
                  isOwn ? 'right-2 md:right-0' : 'left-2 md:left-0'
                }`}
              >
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#11131a] shadow-2xl">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => handleReaction(emojiData.emoji)}
                    width={typeof window !== 'undefined' ? Math.min(320, Math.max(window.innerWidth - 24, 240)) : 300}
                    height={typeof window !== 'undefined' && window.innerWidth < 420 ? 340 : 400}
                    theme="dark"
                    lazyLoadEmojis={true}
                  />
                </div>
              </div>
            </>
          )}

          {showContextMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowContextMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#11131a]/96 py-1 shadow-2xl backdrop-blur-xl"
              >
                <button
                  type="button"
                  onClick={handleReply}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[var(--text-primary)] transition hover:bg-white/6"
                >
                  <Reply className="h-4 w-4" />
                  Reply
                </button>
                <button
                  type="button"
                  onClick={handleForward}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[var(--text-primary)] transition hover:bg-white/6"
                >
                  <Forward className="h-4 w-4" />
                  Forward
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReactionPicker(true);
                    setShowContextMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[var(--text-primary)] transition hover:bg-white/6"
                >
                  <Smile className="h-4 w-4" />
                  React
                </button>
                {isOwn && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditText(message.text || '');
                        setIsEditing(true);
                        setShowContextMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[var(--text-primary)] transition hover:bg-white/6"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-300 transition hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </>
                )}
                {message.text && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[var(--text-primary)] transition hover:bg-white/6"
                  >
                    <Copy className="h-4 w-4" />
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

export const MessageBubble = memo(MessageBubbleComponent, messageBubblePropsEqual);
MessageBubble.displayName = 'MessageBubble';

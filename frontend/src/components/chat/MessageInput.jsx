import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Send,
  Paperclip,
  Smile,
  X,
  Loader2,
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { emitTypingStart, emitTypingStop } from '@lib/socket';
import toast from 'react-hot-toast';
import { ReplyPreviewBar } from './ReplyPreviewBar';
import { Loader } from '@components/shared/Loader';

export const MessageInput = ({
  conversationId,
  onSendMessage,
  replyTo,
  onCancelReply,
}) => {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiPickerWidth = typeof window !== 'undefined'
    ? Math.min(320, Math.max(window.innerWidth - 24, 240))
    : 300;
  const emojiPickerHeight = typeof window !== 'undefined' && window.innerWidth < 420 ? 340 : 380;

  const syncTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
  }, []);

  useEffect(() => {
    syncTextareaHeight();
  }, [text, syncTextareaHeight]);

  useEffect(() => () => {
    clearTimeout(typingTimeoutRef.current);
    if (conversationId) {
      emitTypingStop(conversationId);
    }
  }, [conversationId]);

  useEffect(() => () => {
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
  }, [imagePreview]);

  const handleTyping = useCallback(() => {
    if (!conversationId) return;

    emitTypingStart(conversationId);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop(conversationId);
    }, 1800);
  }, [conversationId]);

  const handleTextChange = useCallback((event) => {
    setText(event.target.value);
    handleTyping();
  }, [handleTyping]);

  const handleImageSelect = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setImage(file);
    setImagePreview((currentPreview) => {
      if (currentPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreview);
      }

      return URL.createObjectURL(file);
    });
  }, []);

  const removeImage = useCallback(() => {
    setImage(null);
    setImagePreview((currentPreview) => {
      if (currentPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreview);
      }

      return null;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const replyToPayload = useMemo(() => {
    if (!replyTo?._id) return null;

    return {
      messageId: replyTo._id,
      senderId: replyTo.senderId?._id ?? replyTo.senderId,
      senderName: replyTo.senderId?.username ?? replyTo.senderName,
      text: replyTo.text || null,
      image: replyTo.image || null,
      messageType: replyTo.messageType,
    };
  }, [replyTo]);

  const handleSend = useCallback(async () => {
    if ((!text.trim() && !image) || isSending) return;

    setIsSending(true);

    const result = await onSendMessage({
      text: text.trim(),
      image,
      replyTo: replyToPayload,
    });

    setIsSending(false);

    if (!result.success) {
      toast.error(result.error || 'Failed to send message');
      return;
    }

    clearTimeout(typingTimeoutRef.current);
    if (conversationId) {
      emitTypingStop(conversationId);
    }

    setText('');
    removeImage();
    onCancelReply?.();

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [conversationId, image, isSending, onCancelReply, onSendMessage, removeImage, replyToPayload, text]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleEmojiSelect = useCallback((emojiData) => {
    setText((currentText) => `${currentText}${emojiData.emoji}`);
    handleTyping();
    setShowEmojiPicker(false);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      syncTextareaHeight();
    });
  }, [handleTyping, syncTextareaHeight]);

  const canSend = Boolean(text.trim() || image);

  return (
    <div
      className="sticky bottom-0 z-20 border-t border-[var(--border-glass)] bg-[color:var(--bg-base)]/92 px-2.5 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-2xl sm:px-4"
      data-no-swipe-back="true"
    >
      <AnimatePresence initial={false}>
        {replyToPayload && (
          <div className="overflow-hidden rounded-t-2xl">
            <ReplyPreviewBar replyTo={replyToPayload} onCancel={onCancelReply} />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="mb-3 mt-2 flex w-full max-w-md items-center gap-3 rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-surface)] p-2"
          >
            <img
              src={imagePreview}
              alt="Preview"
              className="h-16 w-16 rounded-xl object-cover"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">Image attached</p>
              <p className="text-xs text-[var(--text-muted)]">Ready to send</p>
            </div>
            <button
              type="button"
              onClick={removeImage}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-surface-2)] text-[var(--text-muted)] transition-colors hover:bg-red-500/20 hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2 sm:gap-3 max-w-5xl mx-auto w-full">
        <div className="flex flex-1 relative items-end gap-1 bg-[var(--bg-surface)] p-1.5 rounded-[1.75rem] border border-[var(--border-glass)] shadow-[var(--glass-shadow)] transition-all focus-within:border-[var(--accent-purple)] focus-within:ring-1 focus-within:ring-[var(--accent-purple)]/30">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((currentValue) => !currentValue)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface-2)] hover:text-yellow-500 sm:h-11 sm:w-11"
            >
              <Smile className="h-5 w-5" />
            </button>

            {showEmojiPicker && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowEmojiPicker(false)}
                />
                <div className="absolute bottom-full left-0 z-50 mb-2 overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-surface)] shadow-2xl max-sm:left-[-0.25rem]">
                  <EmojiPicker
                    onEmojiClick={handleEmojiSelect}
                    width={emojiPickerWidth}
                    height={emojiPickerHeight}
                    theme="dark"
                    lazyLoadEmojis={true}
                    searchPlaceholder="Search emojis..."
                  />
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface-2)] hover:text-sky-500 sm:h-11 sm:w-11"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          <div className="relative min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full resize-none bg-transparent px-2 py-2.5 pr-10 text-[15px] leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              style={{ minHeight: '44px', maxHeight: '132px' }}
            />

            {text.length > 0 && (
              <div className="pointer-events-none absolute bottom-3 right-3 text-[10px] font-medium text-[var(--text-muted)]">
                {text.length}
              </div>
            )}
          </div>
        </div>

        <motion.button
          type="button"
          onClick={handleSend}
          disabled={!canSend || isSending}
          whileTap={canSend ? { scale: 0.96 } : undefined}
          whileHover={canSend ? { scale: 1.03 } : undefined}
          transition={{ duration: 0.16 }}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition duration-150 sm:h-14 sm:w-14 ${
            canSend
              ? 'gradient-primary shadow-[var(--glass-shadow)] shadow-[var(--accent-purple)]/30'
              : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-glass)]'
          } ${!canSend || isSending ? 'cursor-not-allowed' : 'hover:opacity-90'}`}
        >
          {isSending ? (
            <Loader size="sm" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </motion.button>
      </div>
    </div>
  );
};

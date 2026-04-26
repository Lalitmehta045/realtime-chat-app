import { useMemo, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Paperclip, 
  Smile, 
  X,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { emitTypingStart, emitTypingStop } from '@lib/socket';
import toast from 'react-hot-toast';
import { ReplyPreviewBar } from './ReplyPreviewBar';

let typingTimeout = null;

export const MessageInput = ({ 
  conversationId, 
  onSendMessage, 
  replyTo,
  onCancelReply 
}) => {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleTyping = useCallback(() => {
    emitTypingStart(conversationId);
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      emitTypingStop(conversationId);
    }, 2000);
  }, [conversationId]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    handleTyping();
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const replyToPayload = useMemo(() => {
    if (!replyTo?._id) return null;
    const senderId = replyTo.senderId?._id ?? replyTo.senderId;
    const senderName = replyTo.senderId?.username ?? replyTo.senderName;

    return {
      messageId: replyTo._id,
      senderId,
      senderName,
      text: replyTo.text || null,
      image: replyTo.image || null,
      messageType: replyTo.messageType,
    };
  }, [replyTo]);

  const handleSend = async () => {
    if ((!text.trim() && !image) || isSending) return;

    setIsSending(true);
    
    const result = await onSendMessage({
      text: text.trim(),
      image,
      replyTo: replyToPayload,
    });

    setIsSending(false);

    if (result.success) {
      setText('');
      removeImage();
      onCancelReply?.();
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } else {
      toast.error(result.error || 'Failed to send message');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emojiData) => {
    setText(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  // Auto-resize textarea
  const handleTextareaInput = (e) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const canSend = text.trim() || image;

  return (
    <div className="p-3 glass border-t border-[var(--border-glass)]">
      {/* Reply preview */}
      <AnimatePresence>
        {replyToPayload && (
          <div className="mb-3">
            <ReplyPreviewBar replyTo={replyToPayload} onCancel={onCancelReply} />
          </div>
        )}
      </AnimatePresence>

      {/* Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mb-3 relative inline-block"
          >
            <img
              src={imagePreview}
              alt="Preview"
              className="h-20 rounded-lg object-cover"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="flex items-end gap-2">
        {/* Emoji picker */}
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-3 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-yellow-400 transition-colors"
          >
            <Smile className="w-5 h-5" />
          </button>
          
          {showEmojiPicker && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowEmojiPicker(false)}
              />
              <div className="absolute bottom-full left-0 mb-2 z-50">
                <div className="glass rounded-xl overflow-hidden shadow-xl">
                  <EmojiPicker
                    onEmojiClick={handleEmojiSelect}
                    width={300}
                    height={400}
                    theme="dark"
                    lazyLoadEmojis={true}
                    searchPlaceholder="Search emojis..."
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Attach file */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-violet-400 transition-colors"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onInput={handleTextareaInput}
            placeholder="Type a message..."
            rows={1}
            className="w-full px-4 py-3 pr-12 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-glass)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none max-h-[120px]"
            style={{ minHeight: '48px' }}
          />
          
          {/* Character count / hint */}
          <div className="absolute right-3 bottom-3 text-xs text-[var(--text-muted)] pointer-events-none">
            {text.length > 0 && `${text.length}`}
          </div>
        </div>

        {/* Send button */}
        <motion.button
          onClick={handleSend}
          disabled={!canSend || isSending}
          whileHover={canSend ? { scale: 1.05 } : {}}
          whileTap={canSend ? { scale: 0.95 } : {}}
          className={`p-3 rounded-full gradient-primary text-white shadow-lg shadow-violet-500/25 transition-all ${
            canSend 
              ? 'opacity-100 hover:shadow-violet-500/40' 
              : 'opacity-50 cursor-not-allowed'
          }`}
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </motion.button>
      </div>
    </div>
  );
};

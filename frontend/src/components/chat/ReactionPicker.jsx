import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { emitAddReaction } from '@lib/socket';

export const ReactionPicker = ({ messageId, onReact }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEmojiClick = (emojiData) => {
    emitAddReaction(messageId, emojiData.emoji);
    onReact?.(emojiData.emoji);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-full hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-yellow-400 transition-colors"
      >
        <Smile className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2"
          >
            <div className="glass rounded-xl overflow-hidden shadow-xl">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                width={280}
                height={350}
                theme="dark"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

import { X } from 'lucide-react';
import { motion } from 'framer-motion';

export const ReplyPreviewBar = ({ replyTo, onCancel }) => {
  const isImage = replyTo?.messageType === 'image' && replyTo?.image;
  const previewText = isImage
    ? 'Photo'
    : (replyTo?.text || '').trim();

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-3 px-[14px] py-[10px] overflow-hidden"
      style={{
        background: 'rgba(124,58,237,0.08)',
        borderTop: '0.5px solid rgba(124,58,237,0.25)',
        borderLeft: '3px solid #7C3AED',
        borderRadius: 0,
      }}
    >
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div
          className="text-[12px] font-medium mb-[2px] truncate"
          style={{ color: '#A78BFA' }}
        >
          Replying to {replyTo?.senderName || 'Unknown'}
        </div>

        <div className="flex items-center gap-2 min-w-0">
          {isImage && (
            <img
              src={replyTo.image}
              alt="Reply thumbnail"
              className="w-8 h-8 rounded object-cover shrink-0"
            />
          )}
          <div
            className="text-[12px] min-w-0 truncate"
            style={{
              color: 'var(--color-text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {previewText || (isImage ? 'Photo' : '')}
          </div>
        </div>
      </div>

      <button
        onClick={onCancel}
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: 'var(--color-background-secondary)',
          border: '0.5px solid var(--color-border-tertiary)',
        }}
        aria-label="Cancel reply"
        title="Cancel"
        type="button"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};


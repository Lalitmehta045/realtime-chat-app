import { useMemo } from 'react';
import { useAuthStore } from '@store/useAuthStore';

export const QuotedMessage = ({ replyTo, isSent }) => {
  const { authUser } = useAuthStore();

  const senderLabel = useMemo(() => {
    if (!replyTo) return '';
    const replySenderId = replyTo.senderId?._id ?? replyTo.senderId;
    if (replySenderId && authUser?._id && replySenderId.toString() === authUser._id.toString()) {
      return 'You';
    }
    return replyTo.senderName || 'Unknown';
  }, [replyTo, authUser?._id]);

  const isDeletedSnapshot = !!replyTo && !replyTo.text && !replyTo.image;
  const showImage = replyTo?.messageType === 'image' && replyTo?.image;
  const showMixed = replyTo?.messageType === 'mixed';
  const previewText = useMemo(() => {
    if (!replyTo) return '';
    if (isDeletedSnapshot) return '[Message deleted]';
    if (showImage) return 'Photo';
    const t = replyTo.text || '';
    if (!t) return '';
    return t.length > 60 ? `${t.slice(0, 60)}…` : t;
  }, [replyTo, isDeletedSnapshot, showImage]);

  const styles = isSent
    ? {
        background: 'rgba(0,0,0,0.15)',
        borderLeftColor: 'rgba(255,255,255,0.6)',
        senderColor: 'rgba(255,255,255,0.9)',
        textColor: 'rgba(255,255,255,0.65)',
      }
    : {
        background: 'rgba(124,58,237,0.10)',
        borderLeftColor: '#7C3AED',
        senderColor: '#A78BFA',
        textColor: 'var(--color-text-secondary)',
      };

  return (
    <div
      className="w-full max-w-full mb-1.5 px-2.5 py-1.5"
      style={{
        borderLeft: '3px solid',
        borderLeftColor: styles.borderLeftColor,
        background: styles.background,
      }}
    >
      <div className="text-[11px] font-medium truncate" style={{ color: styles.senderColor }}>
        {senderLabel}
      </div>

      {showImage && !showMixed ? (
        <div className="flex items-center gap-2 mt-0.5 min-w-0">
          <img
            src={replyTo.image}
            alt="Quoted"
            className="w-10 h-10 rounded object-cover shrink-0"
          />
          <div
            className={`text-[12px] truncate ${isDeletedSnapshot ? 'italic' : ''}`}
            style={{ color: styles.textColor }}
          >
            {previewText}
          </div>
        </div>
      ) : (
        <div
          className={`text-[12px] truncate mt-0.5 ${isDeletedSnapshot ? 'italic' : ''}`}
          style={{ color: styles.textColor }}
        >
          {previewText}
        </div>
      )}
    </div>
  );
};


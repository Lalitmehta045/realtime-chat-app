import { useState, useEffect, useCallback, useRef } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ChevronLeft, Menu, Search } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useResponsive } from '@hooks/useResponsive';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { ImageLightbox } from './ImageLightbox';
import { ForwardModal } from './ForwardModal';
import { useChatStore } from '@store/useChatStore';
import { useAuthStore } from '@store/useAuthStore';
import { getSocket, emitMessageRead } from '@lib/socket';

export const ChatWindow = ({ onBack }) => {
  const {
    selectedConversation,
    messages,
    sendMessage,
    updateMessage,
    deleteMessage,
    addMessage,
    markConversationAsRead,
    updateMessageInStore,
    forwardingMessage,
    setForwardingMessage,
  } = useChatStore(
    useShallow((state) => ({
      selectedConversation: state.selectedConversation,
      messages: state.messages,
      sendMessage: state.sendMessage,
      updateMessage: state.updateMessage,
      deleteMessage: state.deleteMessage,
      addMessage: state.addMessage,
      markConversationAsRead: state.markConversationAsRead,
      updateMessageInStore: state.updateMessage,
      forwardingMessage: state.forwardingMessage,
      setForwardingMessage: state.setForwardingMessage,
    }))
  );
  const { authUser } = useAuthStore();

  const [replyingTo, setReplyingTo] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const prefersReducedMotion = useReducedMotion();
  const swipeX = useMotionValue(0);
  const swipeGlowOpacity = useTransform(swipeX, [0, 80, 220], [0, 0.38, 1]);
  const swipeHintOpacity = useTransform(swipeX, [0, 42, 120], [0, 0.55, 1]);
  const swipeHintX = useTransform(swipeX, [0, 180], [-14, 8]);
  const contentScale = useTransform(swipeX, [0, 220], [1, 0.988]);
  const contentShadowOpacity = useTransform(swipeX, [0, 220], [0, 0.24]);
  const swipeStateRef = useRef({
    eligible: false,
    active: false,
    axisLocked: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastTime: 0,
    velocityX: 0,
  });

  // Auto-mark as read effect
  useEffect(() => {
    if (!selectedConversation) return;

    const unread = messages.filter((message) => {
      const isOwn =
        message.senderId?._id?.toString() === authUser?._id?.toString();

      const isRead = message.readBy?.some(
        (id) => id?.toString() === authUser?._id?.toString()
      );

      return !isOwn && !isRead;
    });

    unread.forEach((message) => {
      emitMessageRead(message._id, selectedConversation._id);
    });

    markConversationAsRead(selectedConversation._id);
  }, [selectedConversation?._id, authUser?._id, markConversationAsRead, messages]);

  useEffect(() => {
    swipeX.set(0);
  }, [selectedConversation?._id, swipeX]);

  const handleSendMessage = useCallback(async (data) => {
    if (!selectedConversation) return { success: false };

    return sendMessage({
      ...data,
      conversationId: selectedConversation._id,
    });
  }, [selectedConversation, sendMessage]);

  const handleForwardMessage = useCallback((message) => {
    setForwardingMessage(message);
  }, [setForwardingMessage]);

  const handleTouchStart = useCallback((event) => {
    if (!onBack) return;

    const touch = event.touches?.[0];
    if (!touch) return;

    if (event.target.closest('[data-no-swipe-back="true"]')) {
      swipeStateRef.current = {
        eligible: false,
        active: false,
        axisLocked: false,
        startX: 0,
        startY: 0,
        lastX: 0,
        lastTime: 0,
        velocityX: 0,
      };
      return;
    }

    const now = performance.now();

    swipeStateRef.current = {
      eligible: touch.clientX <= 28,
      active: false,
      axisLocked: false,
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastTime: now,
      velocityX: 0,
    };
  }, [onBack]);

  const handleTouchMove = useCallback((event) => {
    if (!onBack) return;

    const touch = event.touches?.[0];
    const swipeState = swipeStateRef.current;
    if (!touch || !swipeState.eligible) return;

    const deltaX = touch.clientX - swipeState.startX;
    const deltaY = touch.clientY - swipeState.startY;
    const now = performance.now();
    const elapsed = Math.max(now - swipeState.lastTime, 1);
    const velocityX = (touch.clientX - swipeState.lastX) / elapsed;

    if (!swipeState.axisLocked) {
      if (Math.abs(deltaY) > 12 && Math.abs(deltaY) > Math.abs(deltaX)) {
        swipeStateRef.current.eligible = false;
        return;
      }

      if (Math.abs(deltaX) <= 8 && Math.abs(deltaY) <= 8) {
        return;
      }

      swipeStateRef.current.axisLocked = Math.abs(deltaX) > Math.abs(deltaY);
      if (!swipeStateRef.current.axisLocked) return;
    }

    if (!swipeState.active) {
      if (deltaX <= 12 || Math.abs(deltaX) <= Math.abs(deltaY)) {
        return;
      }

      swipeStateRef.current.active = true;
    }

    if (deltaX <= 0) {
      swipeX.set(0);
      return;
    }

    event.preventDefault();
    swipeStateRef.current.lastX = touch.clientX;
    swipeStateRef.current.lastTime = now;
    swipeStateRef.current.velocityX = velocityX;

    const maxTravel = Math.max(window.innerWidth * 0.82, 220);
    const dampedX = deltaX < 180 ? deltaX : 180 + (deltaX - 180) * 0.24;
    swipeX.set(Math.min(dampedX, maxTravel));
  }, [onBack, swipeX]);

  const handleTouchEnd = useCallback(() => {
    if (!onBack) return;

    const swipeState = swipeStateRef.current;
    const currentX = swipeX.get();
    const threshold = Math.min(window.innerWidth * 0.28, 120);
    const shouldComplete = currentX >= threshold || swipeState.velocityX > 0.62;

    swipeStateRef.current = {
      eligible: false,
      active: false,
      axisLocked: false,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastTime: 0,
      velocityX: 0,
    };

    if (!swipeState.active) {
      animate(swipeX, 0, prefersReducedMotion
        ? { duration: 0.14, ease: 'easeOut' }
        : { type: 'spring', stiffness: 420, damping: 40, mass: 0.4 });
      return;
    }

    if (shouldComplete) {
      animate(swipeX, window.innerWidth, prefersReducedMotion
        ? { duration: 0.16, ease: 'easeOut' }
        : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }).then(() => {
        swipeX.set(0);
        onBack?.();
      });
      return;
    }

    animate(swipeX, 0, prefersReducedMotion
      ? { duration: 0.14, ease: 'easeOut' }
      : {
        type: 'spring',
        stiffness: 430,
        damping: 38,
        mass: 0.45,
      });
  }, [onBack, prefersReducedMotion, swipeX]);

  return (
    <motion.section
      className="relative flex h-full min-h-0 flex-1 overflow-hidden bg-[var(--bg-base)]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ x: swipeX, touchAction: onBack ? 'pan-y' : 'auto', willChange: 'transform' }}
    >
      <motion.div
        className="pointer-events-none absolute inset-y-0 left-0 z-20 w-28 bg-gradient-to-r from-white/10 via-white/5 to-transparent"
        style={{ opacity: swipeGlowOpacity }}
      />

      {onBack && (
        <motion.div
          className="pointer-events-none absolute inset-y-0 left-0 z-20 flex w-24 items-center justify-center"
          style={{ opacity: swipeHintOpacity, x: swipeHintX }}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 shadow-lg shadow-black/15 backdrop-blur-xl">
            <ChevronLeft className="h-5 w-5" />
          </div>
        </motion.div>
      )}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(124,58,237,0.12),_transparent_42%)]" />
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 bg-black/20"
        style={{ opacity: contentShadowOpacity }}
      />

      <motion.div
        className="relative flex h-full min-h-0 flex-1 flex-col"
        style={{
          scale: contentScale,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        <ChatHeader 
          conversation={selectedConversation} 
          onBack={onBack}
          isSearching={isSearching}
          onToggleSearch={() => {
            setIsSearching(!isSearching);
            if (isSearching) setSearchQuery('');
          }}
        />

        <AnimatePresence>
          {isSearching && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[var(--bg-surface)] border-b border-[var(--border-glass)] px-4 py-2 shrink-0 z-10"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search in chat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-glass)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-purple)] transition-colors"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <MessageList
          searchQuery={searchQuery}
          onReply={setReplyingTo}
          onForward={handleForwardMessage}
          onEdit={updateMessage}
          onDelete={deleteMessage}
          onImageClick={setLightboxImage}
        />

        {selectedConversation && (
          <div className="relative z-10">
            <MessageInput
              conversationId={selectedConversation._id}
              onSendMessage={handleSendMessage}
              replyTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
          </div>
        )}
      </motion.div>

      <ImageLightbox
        imageUrl={lightboxImage}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      {forwardingMessage && (
        <ForwardModal
          message={forwardingMessage}
          onClose={() => setForwardingMessage(null)}
        />
      )}
    </motion.section>
  );
};

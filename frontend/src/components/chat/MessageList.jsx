import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Loader2, MessageCircleMore } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { MessageBubble } from './MessageBubble';
import { useChatStore } from '@store/useChatStore';
import { formatDateSeparator } from '@utils/formatTime';

const SCROLL_BOTTOM_THRESHOLD = 100;

const captureScrollState = (container) => {
  if (!container) {
    return {
      scrollTop: 0,
      scrollHeight: 0,
      clientHeight: 0,
      isNearBottom: true,
    };
  }

  const { scrollTop, scrollHeight, clientHeight } = container;

  return {
    scrollTop,
    scrollHeight,
    clientHeight,
    isNearBottom: scrollHeight - scrollTop - clientHeight < SCROLL_BOTTOM_THRESHOLD,
  };
};

const clampScrollTop = (container, scrollTop) => {
  if (!container) return scrollTop;

  const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0);
  return Math.min(Math.max(scrollTop, 0), maxScrollTop);
};

export const MessageList = memo(({
  onReply,
  onForward,
  onEdit,
  onDelete,
  onImageClick,
  searchQuery = '',
}) => {
  const {
    messages,
    selectedConversation,
    hasMoreMessages,
    isLoadingMessages,
    getMessages,
  } = useChatStore(
    useShallow((state) => ({
      messages: state.messages,
      selectedConversation: state.selectedConversation,
      hasMoreMessages: state.hasMoreMessages,
      isLoadingMessages: state.isLoadingMessages,
      getMessages: state.getMessages,
    }))
  );
  const messagesContainerRef = useRef(null);
  const sentinelRef = useRef(null);
  const nextPageRef = useRef(2);
  const pendingPrependRef = useRef(null);
  const scrollStateRef = useRef({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
    isNearBottom: true,
  });
  const previousSnapshotRef = useRef({
    conversationId: null,
    firstMessageId: null,
    lastMessageId: null,
    length: 0,
  });

  useEffect(() => {
    nextPageRef.current = 2;
    pendingPrependRef.current = null;
    scrollStateRef.current = {
      scrollTop: 0,
      scrollHeight: 0,
      clientHeight: 0,
      isNearBottom: true,
    };
    previousSnapshotRef.current = {
      conversationId: selectedConversation?._id ?? null,
      firstMessageId: null,
      lastMessageId: null,
      length: 0,
    };
  }, [selectedConversation?._id]);

  const handleScroll = useCallback((event) => {
    scrollStateRef.current = captureScrollState(event.currentTarget);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    const sentinel = sentinelRef.current;

    if (!container || !sentinel || !selectedConversation?._id) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (!entry.isIntersecting || !hasMoreMessages || isLoadingMessages) return;

        pendingPrependRef.current = captureScrollState(container);

        const requestedPage = nextPageRef.current;
        nextPageRef.current += 1;
        getMessages(selectedConversation._id, requestedPage);
      },
      {
        root: container,
        threshold: 0.02,
        rootMargin: '120px 0px 0px 0px',
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [getMessages, hasMoreMessages, isLoadingMessages, selectedConversation?._id]);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const previousSnapshot = previousSnapshotRef.current;
    const previousScrollState = scrollStateRef.current;
    const conversationId = selectedConversation?._id ?? null;
    const firstMessageId = messages[0]?._id ?? null;
    const lastMessageId = messages[messages.length - 1]?._id ?? null;
    const previousLength = previousSnapshot.length;
    const nextLength = messages.length;
    const lengthIncreased = nextLength > previousLength;
    const conversationChanged = previousSnapshot.conversationId !== conversationId;
    const prependedMessages =
      !!pendingPrependRef.current &&
      previousSnapshot.firstMessageId &&
      previousSnapshot.firstMessageId !== firstMessageId &&
      previousSnapshot.conversationId === conversationId;
    const appendedMessage =
      lengthIncreased &&
      !prependedMessages &&
      previousSnapshot.conversationId === conversationId &&
      (
        previousLength === 0 ||
        previousSnapshot.lastMessageId !== lastMessageId
      );
    const previousScrollTop = previousScrollState.scrollTop;
    const nextScrollHeight = container.scrollHeight;

    if (conversationChanged) {
      container.scrollTop = nextScrollHeight;
    } else if (prependedMessages) {
      const { scrollHeight, scrollTop } = pendingPrependRef.current;
      const heightDelta = nextScrollHeight - scrollHeight;
      container.scrollTop = scrollTop + heightDelta;
      pendingPrependRef.current = null;
    } else if (appendedMessage) {
      container.scrollTop = nextScrollHeight;
    } else {
      container.scrollTop = clampScrollTop(container, previousScrollTop);
    }

    scrollStateRef.current = captureScrollState(container);
    previousSnapshotRef.current = {
      conversationId,
      firstMessageId,
      lastMessageId,
      length: nextLength,
    };
  }, [messages, selectedConversation?._id]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const query = searchQuery.toLowerCase();
    return messages.filter(m => m.text?.toLowerCase().includes(query));
  }, [messages, searchQuery]);

  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = null;
    let currentSender = null;
    let currentGroup = [];

    filteredMessages.forEach((message, index) => {
      const messageDate = new Date(message.createdAt).toDateString();

      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ type: 'messages', messages: currentGroup });
        }

        groups.push({ type: 'date', date: message.createdAt });
        currentDate = messageDate;
        currentGroup = [];
        currentSender = null;
      }

      const previousMessage = filteredMessages[index - 1];
      const senderId = message.senderId?._id?.toString() ?? message.senderId?.toString();
      const isNewSender = senderId !== currentSender;
      const isTimeGap =
        previousMessage &&
        new Date(message.createdAt) - new Date(previousMessage.createdAt) > 5 * 60 * 1000;
      const isFirstInGroup = isNewSender || isTimeGap;

      currentGroup.push({
        message,
        isFirstInGroup,
        spacingClass: isFirstInGroup ? 'mt-3' : 'mt-1',
      });
      currentSender = senderId;
    });

    if (currentGroup.length > 0) {
      groups.push({ type: 'messages', messages: currentGroup });
    }

    return groups;
  }, [filteredMessages]);

  if (!selectedConversation) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/5 ring-1 ring-white/10">
            <MessageCircleMore className="h-7 w-7 text-sky-300" />
          </div>
          <p className="text-lg font-semibold text-[var(--text-primary)]">Your chats, tuned for mobile</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Open a conversation from the list to jump into the full-screen chat view.
          </p>
        </div>
      </div>
    );
  }

  if (messages.length === 0 && !isLoadingMessages) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/5 ring-1 ring-white/10">
            <MessageCircleMore className="h-7 w-7 text-violet-300" />
          </div>
          <p className="text-lg font-semibold text-[var(--text-primary)]">No messages yet</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Send the first message to start the conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={messagesContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-2.5 pb-4 pt-3 sm:px-4 lg:px-6"
      style={{ overscrollBehaviorY: 'contain' }}
      data-no-swipe-back="true"
    >
      <div ref={sentinelRef} className="flex h-7 items-center justify-center">
        {isLoadingMessages && (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
        )}
      </div>

      <div className="space-y-1">
        {groupedMessages.map((group, groupIndex) => {
          if (group.type === 'date') {
            return (
              <div key={`date-${group.date}-${groupIndex}`} className="sticky top-2 z-10 flex justify-center py-2">
                <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] font-medium text-gray-300 backdrop-blur-xl">
                  {formatDateSeparator(group.date)}
                </span>
              </div>
            );
          }

          return group.messages.map(({ message, isFirstInGroup, spacingClass }) => (
            <MessageBubble
              key={message._id}
              message={message}
              isFirstInGroup={isFirstInGroup}
              spacingClass={spacingClass}
              onReply={onReply}
              onForward={onForward}
              onEdit={onEdit}
              onDelete={onDelete}
              onImageClick={onImageClick}
            />
          ));
        })}
      </div>
    </div>
  );
});

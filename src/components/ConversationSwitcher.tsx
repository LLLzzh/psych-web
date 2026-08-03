import {
  useEffect,
  useLayoutEffect,
  useRef,
  type MutableRefObject,
} from "react";
import type { ConversationListItem } from "../types/conversation";
import { CURRENT_CONVERSATION_KEY } from "../hooks/useConversationSwitcher";

type ThemeMode = "light" | "dark";

interface ConversationSwitcherProps {
  theme: ThemeMode;
  conversations: ConversationListItem[];
  activeConversationId: string;
  currentTitle: string;
  hasUnreadCurrent: boolean;
  isListLoading: boolean;
  listError: string | null;
  hasMore: boolean;
  pendingConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onSelectCurrent: () => void;
  onLoadMore: () => void;
  onRetryList: () => void;
}

interface ConversationSwitcherItemProps {
  conversationKey: string;
  title: string;
  active: boolean;
  pending: boolean;
  unread?: boolean;
  theme: ThemeMode;
  itemRefs: MutableRefObject<Map<string, HTMLButtonElement>>;
  onClick: () => void;
}

function ConversationSwitcherItem({
  conversationKey,
  title,
  active,
  pending,
  unread = false,
  theme,
  itemRefs,
  onClick,
}: ConversationSwitcherItemProps) {
  const isDark = theme === "dark";
  const textClassName = active
    ? "bg-[linear-gradient(90deg,#86B9FF_0%,#8185FF_100%)] bg-clip-text text-transparent"
    : isDark
      ? "text-white/45 group-hover:text-white/65"
      : "text-[#C9C9C9] group-hover:text-[#B5B5B5]";
  const markerClassName = active
    ? "bg-[linear-gradient(90deg,#96C0FF_0%,#8686FF_100%)]"
    : unread
      ? "bg-[#AAB9FF] animate-pulse"
      : pending
        ? "bg-[linear-gradient(90deg,#D0D0D0_0%,#8EA8FF_50%,#D0D0D0_100%)] bg-[length:200%_100%] animate-[conversation-marker-loading_1s_ease-in-out_infinite]"
        : "bg-[#C5C5C5]";
  const markerWidthClassName = active ? "w-[21px]" : "w-[15px]";

  return (
    <button
      ref={(element) => {
        if (element) {
          itemRefs.current.set(conversationKey, element);
        } else {
          itemRefs.current.delete(conversationKey);
        }
      }}
      type="button"
      onClick={onClick}
      aria-current={active ? "location" : undefined}
      aria-label={`${title}${unread ? "，有新消息" : ""}`}
      className="group flex min-h-[30px] w-full items-center justify-end gap-3 rounded-[10px] px-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#8CA4FF] focus-visible:ring-inset"
    >
      <span
        className={`conversation-switcher-title min-w-0 flex-1 truncate text-[15px] font-normal leading-[1.25] tracking-[-0.01em] transition-colors duration-200 ${textClassName}`}
      >
        {title}
      </span>
      <span
        aria-hidden="true"
        className={`h-[6px] shrink-0 transition-all duration-300 ${markerWidthClassName} ${markerClassName}`}
      />
    </button>
  );
}

export function ConversationSwitcher({
  theme,
  conversations,
  activeConversationId,
  currentTitle,
  hasUnreadCurrent,
  isListLoading,
  listError,
  hasMore,
  pendingConversationId,
  onSelectConversation,
  onSelectCurrent,
  onLoadMore,
  onRetryList,
}: ConversationSwitcherProps) {
  const scrollRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const previousLoadingRef = useRef(false);
  const scrollHeightBeforeLoadRef = useRef(0);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMoreRef.current();
        }
      },
      {
        root,
        rootMargin: "80px 0px 0px 0px",
        threshold: 0,
      }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, conversations.length]);

  useLayoutEffect(() => {
    const root = scrollRef.current;
    if (!root) {
      return;
    }

    if (
      isListLoading &&
      !previousLoadingRef.current &&
      conversations.length > 0
    ) {
      scrollHeightBeforeLoadRef.current = root.scrollHeight;
    }

    if (
      !isListLoading &&
      previousLoadingRef.current &&
      scrollHeightBeforeLoadRef.current > 0
    ) {
      root.scrollTop +=
        root.scrollHeight - scrollHeightBeforeLoadRef.current;
      scrollHeightBeforeLoadRef.current = 0;
    }

    previousLoadingRef.current = isListLoading;
  }, [conversations.length, isListLoading]);

  useEffect(() => {
    const root = scrollRef.current;
    const activeItem = itemRefs.current.get(activeConversationId);
    if (!root || !activeItem) {
      return;
    }

    const itemTop = activeItem.offsetTop;
    const itemBottom = itemTop + activeItem.offsetHeight;
    if (itemTop < root.scrollTop) {
      root.scrollTo({ top: itemTop, behavior: "smooth" });
    } else if (itemBottom > root.scrollTop + root.clientHeight) {
      root.scrollTo({
        top: itemBottom - root.clientHeight,
        behavior: "smooth",
      });
    }
  }, [activeConversationId, conversations.length]);

  const isDark = theme === "dark";

  return (
    <aside
      className={`conversation-switcher ${
        isDark
          ? "conversation-switcher-dark"
          : "conversation-switcher-light"
      }`}
      aria-label="对话记录浮窗"
    >
      <nav
        ref={scrollRef}
        aria-label="切换对话记录"
        aria-busy={isListLoading}
        className="conversation-switcher-scroll max-h-[min(300px,58vh)] overflow-y-auto"
      >
        {hasMore && (
          <div ref={sentinelRef} className="h-px" aria-hidden="true" />
        )}

        {isListLoading && conversations.length > 0 && (
          <div
            className={`mx-auto my-1 h-1 w-10 animate-pulse rounded-full ${
              isDark ? "bg-white/25" : "bg-[#D2D2D2]"
            }`}
            aria-label="正在加载更多对话"
          />
        )}

        {listError && conversations.length === 0 && (
          <button
            type="button"
            onClick={onRetryList}
            className={`mx-auto flex min-h-14 w-full items-center justify-center rounded-xl text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#8CA4FF] ${
              isDark ? "text-white/60" : "text-[#AAAAAA]"
            }`}
          >
            记录加载失败，点击重试
          </button>
        )}

        {conversations.map((conversation) => (
          <ConversationSwitcherItem
            key={conversation.conversationId}
            conversationKey={conversation.conversationId}
            title={conversation.brief?.trim() || "未命名对话"}
            active={activeConversationId === conversation.conversationId}
            pending={pendingConversationId === conversation.conversationId}
            theme={theme}
            itemRefs={itemRefs}
            onClick={() => onSelectConversation(conversation.conversationId)}
          />
        ))}

        <ConversationSwitcherItem
          conversationKey={CURRENT_CONVERSATION_KEY}
          title={currentTitle}
          active={activeConversationId === CURRENT_CONVERSATION_KEY}
          pending={false}
          unread={hasUnreadCurrent}
          theme={theme}
          itemRefs={itemRefs}
          onClick={onSelectCurrent}
        />
      </nav>
    </aside>
  );
}

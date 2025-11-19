"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowUp,
  Copy,
  Menu,
  Pencil,
  Plus,
  RefreshCcw,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";

type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  liked?: boolean;
  disliked?: boolean;
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  isCustomTitle?: boolean;
};

const STORAGE_KEY = "dadgpt-chats";
const ASSISTANT_REPLY = "ok 👍";
const DEFAULT_CHAT_TITLE = "New chat";

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36);
};

const createAssistantMessage = (): Message => ({
  id: createId(),
  role: "assistant",
  content: ASSISTANT_REPLY,
  createdAt: Date.now(),
  liked: false,
  disliked: false,
});

const createChat = (): Chat => ({
  id: createId(),
  title: DEFAULT_CHAT_TITLE,
  messages: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isCustomTitle: false,
});

const buildTitleFromMessage = (content: string) => {
  const cleaned = content.trim();
  if (!cleaned) return DEFAULT_CHAT_TITLE;
  const words = cleaned.split(/\s+/).slice(0, 3);
  const isTruncated = cleaned.split(/\s+/).length > 3;
  return isTruncated ? `${words.join(" ")}…` : words.join(" ");
};

const loadChats = (): Chat[] => {
  if (typeof window === "undefined") return [createChat()];
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return [createChat()];
    const parsed = JSON.parse(saved) as Chat[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [createChat()];
    return parsed.map((chat) => ({
      ...chat,
      isCustomTitle: chat.isCustomTitle ?? false,
    }));
  } catch {
    return [createChat()];
  }
};

const persistChats = (chats: Chat[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
};

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  const currentChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? chats[0],
    [activeChatId, chats],
  );

  useEffect(() => {
    const initialChats = loadChats();
    setChats(initialChats);
    setActiveChatId(initialChats[0]?.id ?? null);
    setHydrated(true);
  }, []);

  useEffect(() => {
    const updateViewport = () => {
      if (typeof window === "undefined") return;
      setIsDesktop(window.innerWidth >= 1024);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    setSidebarOpen(isDesktop);
  }, [isDesktop]);

  useEffect(() => {
    if (hydrated) {
      persistChats(chats);
    }
  }, [chats, hydrated]);

  useEffect(() => {
    if (!currentChat) return;
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat?.messages.length]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(
      textareaRef.current.scrollHeight,
      240,
    )}px`;
  }, [input]);

  const handleSubmit = () => {
    if (!currentChat || !input.trim()) return;
    const trimmed = input.trim();
    const userMessage: Message = {
      id: createId(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };

    const assistantMessage = createAssistantMessage();

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChat.id) return chat;
        const nextMessages = [...chat.messages, userMessage, assistantMessage];
        let nextTitle = chat.title;
        if (!chat.isCustomTitle) {
          const firstUser = nextMessages.find((msg) => msg.role === "user");
          if (firstUser) {
            nextTitle = buildTitleFromMessage(firstUser.content);
          }
        }
        return {
          ...chat,
          title: nextTitle,
          messages: nextMessages,
          updatedAt: Date.now(),
        };
      }),
    );
    setInput("");
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleNewChat = () => {
    const newChat = createChat();
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setInput("");
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const startRename = (chat: Chat) => {
    setEditingChatId(chat.id);
    setRenameValue(chat.title);
  };

  const commitRename = (chatId: string) => {
    if (!editingChatId || editingChatId !== chatId) return;
    const nextTitle = renameValue.trim() || DEFAULT_CHAT_TITLE;
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === editingChatId
          ? { ...chat, title: nextTitle, isCustomTitle: true }
          : chat,
      ),
    );
    setEditingChatId(null);
    setRenameValue("");
  };

  const cancelRename = () => {
    setEditingChatId(null);
    setRenameValue("");
  };

  const handleCopy = async (messageId: string) => {
    try {
      await navigator.clipboard.writeText(ASSISTANT_REPLY);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 1500);
    } catch (error) {
      console.error("Copy failed", error);
    }
  };

  const toggleReaction = (messageId: string, type: "like" | "dislike") => {
    if (!currentChat) return;
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChat.id) return chat;
        const updatedMessages = chat.messages.map((message) => {
          if (message.id !== messageId || message.role !== "assistant") {
            return message;
          }
          if (type === "like") {
            const liked = !message.liked;
            return {
              ...message,
              liked,
              disliked: liked ? false : message.disliked,
            };
          }
          const disliked = !message.disliked;
          return {
            ...message,
            disliked,
            liked: disliked ? false : message.liked,
          };
        });
        return { ...chat, messages: updatedMessages };
      }),
    );
  };

  const handleRegenerate = (messageId: string) => {
    if (!currentChat) return;
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChat.id) return chat;
        const index = chat.messages.findIndex(
          (message) => message.id === messageId,
        );
        if (index === -1) return chat;
        const duplicated = createAssistantMessage();
        const updatedMessages = [...chat.messages];
        updatedMessages.splice(index + 1, 0, duplicated);
        return { ...chat, messages: updatedMessages, updatedAt: Date.now() };
      }),
    );
  };

  const renderMessage = (message: Message) => {
    const isAssistant = message.role === "assistant";
    const backgroundClass = isAssistant ? "bg-surface-muted" : "bg-surface";
    return (
      <div
        key={message.id}
        className={`rounded-3xl border border-border ${backgroundClass} px-6 py-6 shadow-card`}
      >
        <div className="text-xs uppercase tracking-[0.2em] text-muted">
          {isAssistant ? "DadGPT" : "You"}
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-white">
          {message.content}
        </p>
        {isAssistant && (
          <div className="mt-4 flex items-center gap-2 text-muted">
            <IconButton
              label="Copy"
              onClick={() => handleCopy(message.id)}
              active={copiedMessageId === message.id}
            >
              <Copy
                size={16}
                className="transition-colors"
                strokeWidth={1.6}
              />
            </IconButton>
            <IconButton
              label="Like"
              onClick={() => toggleReaction(message.id, "like")}
              active={Boolean(message.liked)}
            >
              <ThumbsUp
                size={16}
                strokeWidth={1.6}
                fill={message.liked ? "currentColor" : "none"}
              />
            </IconButton>
            <IconButton
              label="Dislike"
              onClick={() => toggleReaction(message.id, "dislike")}
              active={Boolean(message.disliked)}
            >
              <ThumbsDown
                size={16}
                strokeWidth={1.6}
                fill={message.disliked ? "currentColor" : "none"}
              />
            </IconButton>
            <IconButton
              label="Regenerate"
              onClick={() => handleRegenerate(message.id)}
            >
              <RefreshCcw size={16} strokeWidth={1.6} />
            </IconButton>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[100svh] min-h-screen bg-base text-white">
      {(isDesktop ? sidebarOpen : true) && (
        <Sidebar
          chats={chats}
          activeChatId={currentChat?.id ?? null}
          isDesktop={isDesktop}
          isOpen={sidebarOpen}
          editingChatId={editingChatId}
          renameValue={renameValue}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onToggleRename={startRename}
          onRenameChange={setRenameValue}
          onRenameConfirm={commitRename}
          onRenameCancel={cancelRename}
        />
      )}

      {!isDesktop && sidebarOpen && (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="relative flex flex-1 flex-col bg-[#050509]">
        <header className="relative flex h-16 items-center justify-center border-b border-border bg-surface text-white">
          <button
            type="button"
            onClick={toggleSidebar}
            className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-muted text-white transition hover:border-white/30 hover:bg-surface-highlight"
          >
            {sidebarOpen && !isDesktop ? (
              <X size={18} strokeWidth={1.5} />
            ) : (
              <Menu size={18} strokeWidth={1.5} />
            )}
          </button>
          <span className="text-sm font-semibold tracking-[0.3em] text-white">
            DadGPT
          </span>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex h-full w-full max-w-content flex-col gap-6 px-4 pb-32 pt-8 lg:px-8">
            {currentChat && currentChat.messages.length > 0 ? (
              currentChat.messages.map(renderMessage)
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-2xl font-semibold text-white/85">
                  What can I help with?
                </p>
              </div>
            )}
            <div ref={scrollAnchorRef} />
          </div>
        </div>

        <div className="border-t border-border bg-gradient-to-t from-[#050509] via-[#050509] to-transparent px-4 pb-8 pt-4">
          <form
            className="mx-auto w-full max-w-content space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            <div className="flex rounded-3xl border border-border-strong bg-surface-muted/90 px-4 py-3 shadow-input focus-within:border-white/30 focus-within:shadow-[0_0_0_1px_rgba(255,255,255,0.25)]">
              <textarea
                ref={textareaRef}
                className="max-h-60 flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-white placeholder:text-muted focus:outline-none"
                placeholder="Ask anything"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleTextareaKeyDown}
                rows={1}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="ml-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-white/30"
                aria-label="Send message"
              >
                <ArrowUp size={18} strokeWidth={1.6} />
              </button>
            </div>
            <p className="text-center text-[11px] leading-tight text-muted">
              Press Enter to send • Shift + Enter for a newline
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

type SidebarProps = {
  chats: Chat[];
  activeChatId: string | null;
  isDesktop: boolean;
  isOpen: boolean;
  editingChatId: string | null;
  renameValue: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onToggleRename: (chat: Chat) => void;
  onRenameChange: (value: string) => void;
  onRenameConfirm: (chatId: string) => void;
  onRenameCancel: () => void;
};

const Sidebar = ({
  chats,
  activeChatId,
  isDesktop,
  isOpen,
  editingChatId,
  renameValue,
  onSelectChat,
  onNewChat,
  onToggleRename,
  onRenameChange,
  onRenameConfirm,
  onRenameCancel,
}: SidebarProps) => {
  const positionClasses = isDesktop
    ? "relative border-r border-border"
    : "fixed inset-y-0 left-0 z-40 border-r border-border shadow-2xl";
  const translateClasses =
    isDesktop || isOpen ? "translate-x-0" : "-translate-x-full";

  const sidebarContent = (
    <div className="flex h-full flex-col bg-surface px-3 py-4 text-white">
      <div className="mb-4 flex items-center justify-between px-2">
        <p className="text-sm font-semibold tracking-wide text-white/80">
          Chats
        </p>
      </div>
      <button
        type="button"
        onClick={onNewChat}
        className="mb-3 flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface-muted px-4 py-3 text-sm font-medium text-white transition hover:border-white/30 hover:bg-surface-highlight"
      >
        <Plus size={16} strokeWidth={1.6} />
        New chat
      </button>
      <div className="flex-1 overflow-y-auto pr-1">
        {chats.map((chat) => {
          const isActive = chat.id === activeChatId;
          const isEditing = chat.id === editingChatId;
          return (
            <div
              key={chat.id}
              className={`group relative mb-2 rounded-2xl border ${
                isActive
                  ? "border-white/30 bg-surface-highlight"
                  : "border-transparent hover:bg-surface-muted"
              }`}
            >
              {isEditing ? (
                <div className="px-4 py-3">
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(event) => onRenameChange(event.target.value)}
                    onBlur={() => onRenameConfirm(chat.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onRenameConfirm(chat.id);
                      } else if (event.key === "Escape") {
                        event.preventDefault();
                        onRenameCancel();
                      }
                    }}
                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                  />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectChat(chat.id)}
                    className="block w-full px-4 py-3 text-left text-sm text-white/80"
                  >
                    <span className="block truncate pr-6">{chat.title}</span>
                  </button>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full p-1 text-muted transition hover:text-white group-hover:flex"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleRename(chat);
                    }}
                    aria-label="Rename chat"
                  >
                    <Pencil size={14} strokeWidth={1.6} />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-2xl border border-border bg-surface-muted p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-base font-semibold text-white">
            A
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Child</p>
            <span className="mt-1 inline-flex items-center rounded-full bg-badge-gray px-2 py-0.5 text-[11px] font-medium text-muted">
              Free
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`${positionClasses} w-72 transform bg-surface transition-transform duration-300 ${translateClasses}`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

type IconButtonProps = {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
};

const IconButton = ({ label, onClick, children, active }: IconButtonProps) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs transition ${
      active
        ? "border-white/40 bg-white/15 text-white"
        : "border-transparent text-muted hover:border-white/20 hover:bg-white/5 hover:text-white"
    }`}
  >
    {children}
  </button>
);

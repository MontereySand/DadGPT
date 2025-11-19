"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Copy,
  Menu,
  Pencil,
  Plus,
  RefreshCcw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Role = "user" | "assistant";
type ThemeName = "dark" | "light";

type ThemePalette = {
  background: string;
  textPrimary: string;
  textSecondary: string;
  sidebar: string;
  sidebarCollapsed: string;
  sidebarHover: string;
  userBubble: string;
  assistantBubble: string;
  input: string;
  inputFocus: string;
  inputBorder: string;
  divider: string;
  iconMuted: string;
  iconActive: string;
  footer: string;
};

type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  liked: boolean;
  disliked: boolean;
  status: "thinking" | "done";
  version: number;
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  isCustomTitle: boolean;
};

const CHATS_STORAGE_KEY = "dadgpt-chats";
const THEME_STORAGE_KEY = "dadgpt-theme";
const ASSISTANT_REPLY = "ok 👍";
const DEFAULT_CHAT_TITLE = "New chat";
const THEME_PALETTES: Record<ThemeName, ThemePalette> = {
  dark: {
    background: "#343541",
    textPrimary: "#ececf1",
    textSecondary: "#aca8b6",
    sidebar: "#202123",
    sidebarCollapsed: "#202123",
    sidebarHover: "#343541",
    userBubble: "#202123",
    assistantBubble: "#444654",
    input: "#343541",
    inputFocus: "#40414f",
    inputBorder: "#565869",
    divider: "#565869",
    iconMuted: "#d9d9e3",
    iconActive: "#ececf1",
    footer: "#aca8b6",
  },
  light: {
    background: "#ffffff",
    textPrimary: "#0d0d0f",
    textSecondary: "#6f6c7a",
    sidebar: "#f9f9f9",
    sidebarCollapsed: "#f0f0f0",
    sidebarHover: "#ececec",
    userBubble: "#ececec",
    assistantBubble: "#f1f1f1",
    input: "#ffffff",
    inputFocus: "#f5f5f5",
    inputBorder: "#d4d4d8",
    divider: "#e4e4e7",
    iconMuted: "#6f6c7a",
    iconActive: "#0d0d0f",
    footer: "#6f6c7a",
  },
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36);
};

const createAssistantMessage = (): Message => ({
  id: createId(),
  role: "assistant",
  content: "",
  createdAt: Date.now(),
  liked: false,
  disliked: false,
  status: "thinking",
  version: 0,
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
  const words = cleaned.split(/\s+/);
  const firstThree = words.slice(0, 3).join(" ");
  return words.length > 3 ? `${firstThree}…` : firstThree;
};

const loadChats = (): Chat[] => {
  if (typeof window === "undefined") return [createChat()];
  try {
    const saved = window.localStorage.getItem(CHATS_STORAGE_KEY);
    if (!saved) return [createChat()];
    const parsed = JSON.parse(saved) as Chat[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [createChat()];
    return parsed.map((chat) => ({
      ...chat,
      isCustomTitle: chat.isCustomTitle ?? false,
      messages: chat.messages.map((message) => ({
        ...message,
        liked: message.liked ?? false,
        disliked: message.disliked ?? false,
        status: message.status ?? "done",
        version: message.version ?? 0,
      })),
    }));
  } catch {
    return [createChat()];
  }
};

const persistChats = (chats: Chat[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
};

const thinkingDelay = () => 1800 + Math.random() * 1000;

const splitTokens = (content: string) =>
  content.trim().split(/\s+/).filter(Boolean);

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<ThemeName>("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const currentChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? chats[0],
    [activeChatId, chats],
  );

  const palette = THEME_PALETTES[theme];

  useEffect(() => {
    const storedChats = loadChats();
    setChats(storedChats);
    setActiveChatId(storedChats[0]?.id ?? null);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTheme = window.localStorage.getItem(
      THEME_STORAGE_KEY,
    ) as ThemeName | null;
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistChats(chats);
  }, [chats, hydrated]);

  useEffect(() => {
    document.body.style.backgroundColor = palette.background;
    document.body.style.color = palette.textPrimary;
  }, [palette]);

  useEffect(() => {
    if (!currentChat) return;
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat?.messages.length]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const computed = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(computed.lineHeight) || 24;
    const maxHeight = lineHeight * 6;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [input]);

  useEffect(
    () => () => {
      Object.values(timersRef.current).forEach((timer) => clearTimeout(timer));
    },
    [],
  );

  const startAssistantResponse = (chatId: string, messageId: string) => {
    const timer = setTimeout(() => {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== chatId) return chat;
          return {
            ...chat,
            messages: chat.messages.map((message) =>
              message.id === messageId
                ? {
                    ...message,
                    content: ASSISTANT_REPLY,
                    status: "done",
                    version: message.version + 1,
                  }
                : message,
            ),
            updatedAt: Date.now(),
          };
        }),
      );
      delete timersRef.current[messageId];
    }, thinkingDelay());

    timersRef.current[messageId] = timer;
  };

  const handleSubmit = () => {
    if (!currentChat || !input.trim()) return;
    const trimmed = input.trim();
    const userMessage: Message = {
      id: createId(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
      liked: false,
      disliked: false,
      status: "done",
      version: 0,
    };
    const assistantMessage = createAssistantMessage();

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChat.id) return chat;
        const nextMessages = [...chat.messages, userMessage, assistantMessage];
        let title = chat.title;
        if (!chat.isCustomTitle) {
          const firstUser = nextMessages.find((msg) => msg.role === "user");
          if (firstUser) {
            title = buildTitleFromMessage(firstUser.content);
          }
        }
        return {
          ...chat,
          title,
          messages: nextMessages,
          updatedAt: Date.now(),
        };
      }),
    );
    setInput("");
    startAssistantResponse(currentChat.id, assistantMessage.id);
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
    if (isMobile) {
      setMobileSidebarOpen(false);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    if (isMobile) {
      setMobileSidebarOpen(false);
    }
  };

  const startRename = (chat: Chat) => {
    if (sidebarCollapsed && !isMobile) {
      setSidebarCollapsed(false);
    }
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

  const toggleReaction = (messageId: string, type: "like" | "dislike") => {
    if (!currentChat) return;
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChat.id) return chat;
        return {
          ...chat,
          messages: chat.messages.map((message) => {
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
          }),
        };
      }),
    );
  };

  const handleRegenerate = (messageId: string) => {
    if (!currentChat) return;
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChat.id) return chat;
        return {
          ...chat,
          messages: chat.messages.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  content: "",
                  status: "thinking",
                  liked: false,
                  disliked: false,
                  version: message.version + 1,
                }
              : message,
          ),
        };
      }),
    );
    startAssistantResponse(currentChat.id, messageId);
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      }
      return next;
    });
  };

  const handleCopy = async (messageId: string) => {
    try {
      await navigator.clipboard.writeText(ASSISTANT_REPLY);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="flex h-[100svh] min-h-screen"
      style={{ backgroundColor: palette.background, color: palette.textPrimary }}
    >
      <Sidebar
        palette={palette}
        chats={chats}
        activeChatId={currentChat?.id ?? null}
        collapsed={!isMobile && sidebarCollapsed}
        isMobile={isMobile}
        visible={isMobile ? mobileSidebarOpen : true}
        editingChatId={editingChatId}
        renameValue={renameValue}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onToggleRename={startRename}
        onRenameChange={setRenameValue}
        onRenameConfirm={commitRename}
        onRenameCancel={cancelRename}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onToggleTheme={toggleTheme}
      />

      {isMobile && mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/60"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col">
        <header
          className="flex items-center justify-between border-b px-4 py-3 md:px-6"
          style={{ borderColor: palette.divider }}
        >
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={() => {
              if (isMobile) {
                setMobileSidebarOpen((prev) => !prev);
              } else {
                setSidebarCollapsed((prev) => !prev);
              }
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full transition hover:brightness-110"
            style={{
              backgroundColor: palette.sidebar,
              color: palette.textPrimary,
            }}
          >
            <Menu size={16} strokeWidth={1.5} />
          </button>
          <span className="flex-1 text-center text-sm font-semibold tracking-[0.3em] uppercase">
            DadGPT
          </span>
          <div className="w-10" />
        </header>

        <div className="flex-1 overflow-y-auto px-3 sm:px-6">
          <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-6 py-6 pb-32">
            <AnimatePresence initial={false}>
              {currentChat && currentChat.messages.length > 0 ? (
                currentChat.messages.map((message) => {
                  const isAssistant = message.role === "assistant";
                  const bubbleBg = isAssistant
                    ? palette.assistantBubble
                    : palette.userBubble;
                  return (
                    <motion.div
                      key={`${message.id}-${message.version}`}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className={`flex w-full ${
                        isAssistant ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-2xl px-4 py-3 text-[15px] leading-6 shadow-sm ${
                          isAssistant
                            ? "rounded-2xl rounded-tl-none"
                            : "rounded-2xl rounded-tr-none"
                        }`}
                        style={{
                          backgroundColor: bubbleBg,
                          color: "#ececf1",
                        }}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          {message.status === "thinking" ? (
                            <motion.div
                              key={`thinking-${message.id}-${message.version}`}
                              initial={{ opacity: 0.4, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ThinkingDots color={palette.textSecondary} />
                            </motion.div>
                          ) : isAssistant ? (
                            <motion.div
                              key={`content-${message.id}-${message.version}`}
                              className="flex flex-wrap items-center gap-[6px]"
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.25 }}
                            >
                              {splitTokens(message.content || ASSISTANT_REPLY).map(
                                (token, tokenIndex, arr) => (
                                  <motion.span
                                    key={`${message.id}-${token}-${tokenIndex}`}
                                    className={
                                      token.includes("👍") ? "text-[18px]" : undefined
                                    }
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                      delay: tokenIndex * 0.15,
                                      duration: 0.2,
                                    }}
                                  >
                                    {token}
                                    {tokenIndex < arr.length - 1 ? "\u00A0" : ""}
                                  </motion.span>
                                ),
                              )}
                            </motion.div>
                          ) : (
                            <motion.p
                              key={`user-${message.id}-${message.version}`}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.2 }}
                            >
                              {message.content}
                            </motion.p>
                          )}
                        </AnimatePresence>

                        {message.role === "assistant" &&
                          message.status === "done" && (
                            <div className="mt-3 flex items-center gap-6">
                              <IconButton
                                palette={palette}
                                label="Copy"
                                active={copiedMessageId === message.id}
                                onClick={() => handleCopy(message.id)}
                              >
                                <Copy size={16} strokeWidth={0} fill="currentColor" />
                              </IconButton>
                              <IconButton
                                palette={palette}
                                label="Like"
                                active={message.liked}
                                onClick={() => toggleReaction(message.id, "like")}
                              >
                                <ThumbsUp size={16} strokeWidth={0} fill="currentColor" />
                              </IconButton>
                              <IconButton
                                palette={palette}
                                label="Dislike"
                                active={message.disliked}
                                onClick={() => toggleReaction(message.id, "dislike")}
                              >
                                <ThumbsDown
                                  size={16}
                                  strokeWidth={0}
                                  fill="currentColor"
                                />
                              </IconButton>
                              <IconButton
                                palette={palette}
                                label="Regenerate"
                                onClick={() => handleRegenerate(message.id)}
                              >
                                <RefreshCcw
                                  size={16}
                                  strokeWidth={0}
                                  fill="currentColor"
                                />
                              </IconButton>
                            </div>
                          )}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <motion.div
                  key="empty-state"
                  className="flex flex-1 items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <p className="text-[20px]" style={{ color: "#aca8b6" }}>
                    What can I help with?
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={scrollAnchorRef} />
          </div>
        </div>

        <div
          className="w-full border-t px-3 pb-6 pt-4 sm:px-6"
          style={{ borderColor: palette.divider }}
        >
          <form
            className="mx-auto flex w-full max-w-3xl items-end gap-3 rounded-xl border px-4"
            style={{
              backgroundColor: inputFocused ? palette.inputFocus : palette.input,
              borderColor: palette.inputBorder,
            }}
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Ask anything"
              className="max-h-60 flex-1 resize-none bg-transparent px-0 py-3 text-base leading-6 placeholder-[#8e8e9e] focus:outline-none"
              style={{ color: palette.textPrimary }}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
            />
            <button
              type="submit"
              aria-label="Send message"
              className="mb-2 flex h-9 w-9 items-center justify-center rounded-full transition hover:brightness-110"
              style={{
                backgroundColor: palette.inputFocus,
                color: palette.textPrimary,
                opacity: input.trim() ? 1 : 0,
                pointerEvents: input.trim() ? "auto" : "none",
              }}
            >
              <ArrowUp size={16} strokeWidth={1.5} />
            </button>
          </form>
          <p
            className="mt-3 text-center text-xs"
            style={{ color: palette.footer }}
          >
            DadGPT can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
}

type SidebarProps = {
  palette: ThemePalette;
  chats: Chat[];
  activeChatId: string | null;
  collapsed: boolean;
  isMobile: boolean;
  visible: boolean;
  editingChatId: string | null;
  renameValue: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onToggleRename: (chat: Chat) => void;
  onRenameChange: (value: string) => void;
  onRenameConfirm: (chatId: string) => void;
  onRenameCancel: () => void;
  onCloseMobile: () => void;
  onToggleTheme: () => void;
};

const Sidebar = ({
  palette,
  chats,
  activeChatId,
  collapsed,
  isMobile,
  visible,
  editingChatId,
  renameValue,
  onSelectChat,
  onNewChat,
  onToggleRename,
  onRenameChange,
  onRenameConfirm,
  onRenameCancel,
  onCloseMobile,
  onToggleTheme,
}: SidebarProps) => {
  const width = collapsed ? 60 : 260;
  const baseClasses = isMobile
    ? `fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ${
        visible ? "translate-x-0" : "-translate-x-full"
      }`
    : "relative";

  return (
    <aside
      className={`${baseClasses} flex-shrink-0 border-r`}
      style={{
        width,
        transition: "width 0.3s ease",
        borderColor: palette.divider,
        backgroundColor: collapsed ? palette.sidebarCollapsed : palette.sidebar,
        color: palette.textPrimary,
      }}
    >
      <div className="flex h-full flex-col px-4 py-4">
        {!collapsed && (
          <p className="mb-4 text-sm font-semibold tracking-wide text-[#ececf1]">
            Chats
          </p>
        )}
        <button
          type="button"
          onClick={onNewChat}
          className={`mb-4 flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-[#40414f] ${
            collapsed ? "px-0" : ""
          }`}
          style={{
            backgroundColor: "#343541",
            borderColor: "#565869",
            color: "#ececf1",
          }}
        >
          <Plus size={16} strokeWidth={1.6} />
          {!collapsed && <span>New chat</span>}
        </button>
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {chats.map((chat) => {
            const isActive = chat.id === activeChatId;
            const isEditing = chat.id === editingChatId;
            return (
              <div
                key={chat.id}
                className="group rounded-lg transition-colors"
                style={{
                  backgroundColor: isActive
                    ? palette.sidebarHover
                    : "transparent",
                }}
              >
                {isEditing && !collapsed ? (
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
                    className="w-full rounded-md bg-transparent px-3 py-2 text-sm focus:outline-none"
                    style={{ color: palette.textPrimary }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectChat(chat.id)}
                    className="relative flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[#343541]"
                    style={{
                      color: "#ececf1",
                      backgroundColor: isActive ? "#343541" : "transparent",
                    }}
                  >
                    {collapsed ? (
                      <span className="text-sm font-medium">
                        {(chat.title || DEFAULT_CHAT_TITLE).slice(0, 1).toUpperCase()}
                      </span>
                    ) : (
                      <>
                        <span className="truncate pr-6" title={chat.title}>
                          {chat.title}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="Rename chat"
                          className="absolute right-3 hidden rounded-full p-1 opacity-60 transition hover:opacity-100 group-hover:flex"
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleRename(chat);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              onToggleRename(chat);
                            }
                          }}
                        >
                          <Pencil size={14} strokeWidth={1.4} />
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            onToggleTheme();
            if (isMobile) onCloseMobile();
          }}
          className="mt-4 flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-[#343541]"
          style={{ backgroundColor: "#2f2f35", color: palette.textPrimary }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3a8bff] text-base font-semibold text-white">
            A
          </div>
          {!collapsed && (
            <div className="space-y-1">
              <p className="text-sm font-semibold">Child</p>
              <span className="inline-flex items-center rounded-full bg-[#3b3c45] px-2 py-[2px] text-[11px] text-[#d9d9e3]">
                Free
              </span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};

type IconButtonProps = {
  palette: ThemePalette;
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
};

const IconButton = ({ palette, label, onClick, children, active }: IconButtonProps) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className="flex h-6 w-6 items-center justify-center transition hover:opacity-100"
    style={{
      color: active ? palette.iconActive : palette.iconMuted,
      opacity: active ? 1 : 0.5,
    }}
  >
    {children}
  </button>
);

const ThinkingDots = ({ color }: { color: string }) => (
  <div className="flex items-center gap-2">
    {[0, 1, 2].map((index) => (
      <motion.span
        key={`dot-${index}`}
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
        animate={{
          scale: [0.8, 1, 0.8],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 0.9,
          repeat: Infinity,
          delay: index * 0.3,
        }}
      />
    ))}
  </div>
);


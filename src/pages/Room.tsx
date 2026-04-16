import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useChatStore } from "../store/useChatStore";
import type { Participant, Message } from "../store/useChatStore";
import EmojiPicker from "emoji-picker-react";
import { ThemeToggle } from "../components/theme-toggle";
import { fetchOnlineParticipants, fetchMessages, joinRoom, kickUser, muteUser, unmuteUser, deleteMessage, lockRoom, unlockRoom, clearChat, extendRoom, uploadFile, updateMaxUsers } from "../services/api";
import { Send, Trash2, Lock, Unlock, Loader2, Copy, Check, Clock, ChevronLeft, Smile, Paperclip, TimerReset, VolumeX, Volume2, Users, UserX, Download } from "lucide-react";
import { Button } from "../components/ui/button";
import { BASE_URL } from "../config";

export const Room: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const {
    participant,
    messages,
    participants,
    isConnected,
    stompClient,
    setMessages,
    addMessage,
    deleteMessage: removeMsgFromStore, 
    setParticipants,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setConnected,
    setStompClient,
    typingParticipants,
    setTyping,
    setAdminId,
    setRoom
  } = useChatStore();

  const [inputMessage, setInputMessage] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomPassword, setRoomPassword] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [maxUsers, setMaxUsers] = useState(50);
  const [limitError, setLimitError] = useState<string | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  
  // Timer state
  const rawStoredExpiresAt = code ? localStorage.getItem(`expiresAt_${code}`) : null;
  // Normalize server-provided LocalDateTime (no timezone) as UTC to avoid instant-expiry issues across timezones
  const normalizeExpiry = (value: string | null) => {
    if (!value) return null;
    // If the string already includes a timezone (Z or +/- offset), keep as-is
    if (/Z$|[+-]\d{2}:\d{2}$/.test(value)) return value;
    return `${value}Z`;
  };
  const [expiresAtTarget, setExpiresAtTarget] = useState<string | null>(normalizeExpiry(rawStoredExpiresAt));
  const [timeLeft, setTimeLeft] = useState<string>("");

  const participantRef = useRef(participant);
  const expiresAtRef = useRef<string | null>(null);
  const stompClientRef = useRef<Client | null>(null);
  const isConnectedRef = useRef(isConnected);

  useEffect(() => {
    participantRef.current = participant;
    // Also ensure adminId is synced if we are the host
    if (participant?.isHost && participant?.id) {
       setAdminId(participant.id);
    }
  }, [participant, setAdminId]);
  useEffect(() => { expiresAtRef.current = expiresAtTarget; }, [expiresAtTarget]);
  useEffect(() => { stompClientRef.current = stompClient; }, [stompClient]);
  useEffect(() => { isConnectedRef.current = isConnected; }, [isConnected]);

  const sendTypingStatus = (typing: boolean) => {
    if (!stompClient || !isConnected || !participant || !code) return;
    stompClient.publish({
      destination: "/app/chat.typing",
      body: JSON.stringify({
        roomCode: code,
        participantId: participant.id,
        nickName: participant.nickName,
        typing: typing
      })
    });
  };

  const handleTyping = () => {
    if (participant?.isMuted) return;
    if (!isTyping) {
      setIsTyping(true);
      sendTypingStatus(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingStatus(false);
    }, 3000);
  };

  // Handle click outside for Emoji Picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking the toggle button itself (to avoid double-toggle issues)
      const target = event.target as HTMLElement;
      const isEmojiButton = target.closest('button[title="Insert Emoji"]');
      
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node) && !isEmojiButton) {
        setShowEmojis(false);
      }
    };
    
    if (showEmojis) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojis]);

  // Use a ref for the handler itself to ensure subscription callbacks always use the latest logic
  const handleIncomingMessageRef = useRef<any>(null);

  // Retrieve states safely from local storage if memory is wiped
  useEffect(() => {
    if (!code) return;

    const initializeRoom = async () => {
      try {
        const sessionId = localStorage.getItem("sessionId") || Math.random().toString(36).substring(7);
        localStorage.setItem("sessionId", sessionId); // CRITICAL: Persist session ID to avoid 'ghost' resets on reload
        
        // Read hostToken — check the correct per-room key first, then fall back to the legacy 'hostToken' key
        // (rooms created before the key-naming fix were stored under the generic key)
        const hostTokenRaw = localStorage.getItem(`hostToken_${code}`)
          || localStorage.getItem("hostToken") || null;
        // Migrate: if found under the old key, save it under the correct key for future reloads
        if (hostTokenRaw && !localStorage.getItem(`hostToken_${code}`)) {
          localStorage.setItem(`hostToken_${code}`, hostTokenRaw);
        }
        const password = localStorage.getItem(`roomPassword_${code}`) || undefined;

        // Call join to sync official status and credentials from backend
        const res = await joinRoom(code!, sessionId, password, hostTokenRaw || undefined);

        // Persist identity to local storage to maintain session stability
        localStorage.setItem("participantId", res.participantId.toString());
        localStorage.setItem("nickname", res.nickName);
        localStorage.setItem("avatarColor", res.avatarColor);
        localStorage.setItem("lastRoomCode", code!);

        // DEBUG: Uncomment to see exact backend response in Browser DevTools Console
        console.log("Backend Join Response:", res);

        const currentUser = {
          id: res.participantId,
          nickName: res.nickName,
          avatarColor: res.avatarColor,
          // Trust backend host status purely (do not fall back to local token existence)
          isHost: !!(res.isHost || res.host),
          // Super-defensive check to handle isMuted, muted, or is_muted variations
          isMuted: !!(res.isMuted === true || res.muted === true || res.is_muted === true)
        };

        // Always sync store with the backend source of truth
        setRoom(code!, currentUser);

        // Restore lock state, privacy info and host password from backend response
        setIsLocked(!!(res.isLocked));
        setIsPrivate(!!(res.isPrivate));
        if (res.maxUsers) setMaxUsers(res.maxUsers);
        if (res.roomPassword) setRoomPassword(res.roomPassword);

        // Fetch participants and history concurrently to speed up recovery
        const [onlineUsers, history] = await Promise.all([
          fetchOnlineParticipants(code!),
          fetchMessages(code!)
        ]);

        setParticipants(onlineUsers.map((p: any) => ({ 
          ...p, 
          isMuted: !!(p.isMuted || p.muted),
          // Hardened Admin check: check for isHost OR host for total reliability across reloads
          isHost: !!(p.isHost || p.host)
        })));
        setMessages([...history].reverse());
      } catch (err) {
        console.error("Room Initialization Error:", err);
        // Recover by taking them back to the lobby if the session is invalid
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    initializeRoom();
  }, [code]); // Only re-run if the room code changes, NOT when the participant is muted/updated

  // STOMP Setup
  useEffect(() => {
    if (!code || !participant?.id) return;

    const socketUrl = `${BASE_URL}/ws?roomCode=${code}&participantId=${participant.id}`;

    const client = new Client({
      webSocketFactory: () => new SockJS(socketUrl),
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        isConnectedRef.current = true;
        
        client.subscribe(`/topic/rooms/${code}`, (message) => {
          const payload = JSON.parse(message.body);
          if (handleIncomingMessageRef.current) {
            handleIncomingMessageRef.current(payload);
          }
        });

        // Sync Timer Logic: Once connected, standard users politely request the current expiry from the Host
        if (!participantRef.current?.isHost) {
           client.publish({ destination: "/app/chat.control", body: JSON.stringify({ type: "TIMER_REQUEST", roomCode: code }) });
        }
        // Force notify our join to immediately populate peers
        if (participantRef.current) {
          client.publish({ 
                destination: "/app/chat.control", 
                body: JSON.stringify({ 
                    type: "SYNC_JOINED", 
                    data: { 
                        ...participantRef.current, 
                        isHost: !!participantRef.current.isHost
                    }, 
                    roomCode: code 
                }) 
          });
        }
      },
      onDisconnect: () => {
        setConnected(false);
        isConnectedRef.current = false;
      },
      onWebSocketError: (err) => console.error("Websocket Error", err)
    });

    client.activate();
    stompClientRef.current = client;
    setStompClient(client);

    // Broadcast exit on tab close / refresh
    const handleBeforeUnload = () => {
      if (client.connected && participantRef.current) {
        client.publish({
          destination: "/app/chat.control",
          body: JSON.stringify({ type: "USER_LEFT", data: { participantId: participantRef.current.id }, roomCode: code })
        });
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      handleBeforeUnload(); // Send one last time on unmount
      window.removeEventListener("beforeunload", handleBeforeUnload);
      client.deactivate();
      // REMOVED clearChatStore() here to keep messages during minor reconnects/renders
    };
  }, [code, participant?.id]);

  // 1. The Real Message Handler
  const handleIncomingMessage = (payload: any) => {
    // 1. Unified Message Detection (Handles P2P / Server / File)
    const msgData = payload.type === "MESSAGE" ? payload.data : payload;
    const isControl = !!payload.type && payload.type !== "MESSAGE";

    if (!isControl && (msgData.content || msgData.senderName)) {
        setMessages((prev: Message[]) => {
          // Check if this message (by content/sender/time) is already in UI
          const exists = prev.find(m => 
            m.content === msgData.content && 
            m.senderName === msgData.senderName && 
            Math.abs(new Date(m.createdAt || 0).getTime() - new Date(msgData.createdAt || 0).getTime()) < 3000
          );
          
          if (exists) {
            // Replace with server-side DB ID if the current one is just a temp Date.now() ID
            // Simple check: DB IDs are typically small increments, Date.now() is massive
            const isDbId = msgData.id && msgData.id < 1000000000;
            return prev.map(m => (m === exists && isDbId) ? { ...m, id: msgData.id } : m);
          }
          return [...prev, msgData];
        });
        return;
    }

    switch (payload.type) {
      case "MESSAGE":
        addMessage(payload.data);
        break;
      case "CHAT_CLEARED":
        setMessages([]);
        break;
      case "MESSAGE_DELETED":
        removeMsgFromStore(payload.data.messageId);
        break;
      case "USER_JOINED":
      case "SYNC_JOINED":
        addParticipant(payload.data);
        // Track the Admin ID locally for total UI persistence
        if (payload.data.isHost || payload.data.host) {
           setAdminId(payload.data.id || payload.data.participantId);
        }
        // Proactive Host Sync: The Admin responds to newcomers immediately
        if (!!(code ? localStorage.getItem(`hostToken_${code}`) : "") && expiresAtRef.current && stompClientRef.current && isConnectedRef.current) {
           stompClientRef.current.publish({ 
             destination: "/app/chat.control", 
             body: JSON.stringify({ 
               type: "ROOM_EXTENDED", 
               data: { 
                 expiresAt: expiresAtRef.current,
                 isHost: true,
                 id: participantRef.current?.id
               }, 
               roomCode: code 
             }) 
           });
        }
        break;
      case "USER_LEFT":
        removeParticipant(payload.data.participantId);
        break;
      case "USER_KICKED":
        if (payload.data.participantId === participantRef.current?.id) {
          alert("You have been kicked out of the room.");
          handleExit();
        } else {
          removeParticipant(payload.data.participantId);
        }
        break;
      case "USER_MUTED":
        updateParticipant(payload.data.participantId, { isMuted: true });
        break;
      case "USER_UNMUTED":
        updateParticipant(payload.data.participantId, { isMuted: false });
        break;
      case "TIMER_REQUEST":
        // Only the host responds to this with the current local storage expiry to seamlessly sync newcomers!
        if (!!(code ? localStorage.getItem(`hostToken_${code}`) : "") && expiresAtRef.current && stompClientRef.current && isConnectedRef.current) {
           stompClientRef.current.publish({ 
             destination: "/app/chat.control", 
             body: JSON.stringify({ type: "ROOM_EXTENDED", data: { expiresAt: expiresAtRef.current }, roomCode: code }) 
           });
        }
        break;
      case "ROOM_EXTENDED":
        if (payload.data.isHost && payload.data.id) {
           setAdminId(payload.data.id);
        }
        if (payload.data.expiresAt) {
          const normalized = normalizeExpiry(payload.data.expiresAt);
          setExpiresAtTarget(normalized);
          if (code) localStorage.setItem(`expiresAt_${code}`, payload.data.expiresAt);
        }
        break;
      case "TYPING":
        const typingData = payload.data;
        if (typingData.participantId !== participantRef.current?.id) {
          setTyping(typingData.participantId, typingData.nickName, typingData.typing);
        }
        break;
      default:
        break;
    }
  };

  // 2. Keep the handler ref updated
  useEffect(() => {
    handleIncomingMessageRef.current = handleIncomingMessage;
  }, [handleIncomingMessage]);

  // 3. Countdown Hook
  useEffect(() => {
    if (!expiresAtTarget) {
      setTimeLeft("");
      // Polling Sync logic
      if (!!!(code ? localStorage.getItem(`hostToken_${code}`) : "") && isConnected && stompClientRef.current) {
        const interval = setInterval(() => {
          if (expiresAtRef.current) {
            clearInterval(interval);
          } else if (stompClientRef.current?.connected) {
            stompClientRef.current.publish({ 
              destination: "/app/chat.control", 
              body: JSON.stringify({ type: "TIMER_REQUEST", roomCode: code }) 
            });
          }
        }, 2000);
        return () => clearInterval(interval);
      }
      return;
    }

    const tick = () => {
      const diff = new Date(expiresAtTarget).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("00:00:00");
        alert("The room has expired and now closed.");
        handleExit();
        return;
      }
      const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      setTimeLeft(`${h}:${m}:${s}`);
    };
    
    tick(); // immediate calculation
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [expiresAtTarget, isConnected, code]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || !stompClient || !isConnected || participant?.isMuted) return;

    // 1. Instant P2P Sync for 'Real Time' feel
    stompClient.publish({
      destination: "/app/chat.control",
      body: JSON.stringify({
        type: "MESSAGE",
        roomCode: code,
        data: {
          id: Date.now(), // Temp frontend ID
          content: inputMessage.trim(),
          senderName: participant?.nickName,
          senderId: participant?.id,
          roomCode: code,
          createdAt: new Date().toISOString()
        }
      })
    });

    // 2. Persistent Backend storage
    stompClient.publish({
      destination: "/app/chat.send",
      body: JSON.stringify({
        participantId: participant?.id,
        roomCode: code,
        content: inputMessage.trim()
      })
    });

    setInputMessage("");
    setShowEmojis(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !participant?.id || !code || participant?.isMuted) return;

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB limit
    if (file.size > MAX_SIZE) {
        alert("This file is too large! Maximum allowed size is 10MB to ensure fast and secure transfers.");
        if (e.target) e.target.value = '';
        return;
    }
    
    setIsUploading(true);
    try {
      const res = await uploadFile(participant.id, file);
      const attachmentMarkdown = `[FILE: ${res.originalName}](${res.fileUrl})`;
      
      // Send to backend only.
      // The backend will broadcast the message with a real ID to everyone.
      if (stompClient && isConnected) {
        stompClient.publish({
          destination: "/app/chat.send",
          body: JSON.stringify({ participantId: participant.id, roomCode: code, content: attachmentMarkdown })
        });
      }
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload file. Please ensure it's a valid format.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExit = () => {
    if (stompClient && isConnected && participant) {
      stompClient.publish({
        destination: "/app/chat.control",
        body: JSON.stringify({ type: "USER_LEFT", data: { participantId: participant.id }, roomCode: code })
      });
    }
    navigate("/");
  };

  const handleCopyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadAttachment = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download fail:", err);
      window.open(url, "_blank"); // Fallback
    }
  };

  // Host Action Handlers
  const hostToken = (code ? localStorage.getItem(`hostToken_${code}`) : "") || "";
  const isHost = !!participant?.isHost;

  const handleUpdateUsersCount = async (delta: number) => {
    if (!isHost || !code) return;
    const newVal = Math.min(Math.max(2, maxUsers + delta), 50);
    if (newVal === maxUsers) return;
    
    const prevVal = maxUsers;
    setMaxUsers(newVal);
    setLimitError(null);
    try {
      await updateMaxUsers(code, hostToken, newVal);
    } catch (err: any) {
      console.error("Failed to update max users:", err);
      setMaxUsers(prevVal);
      const errorMsg = err.response?.data?.message || err.response?.data || "Cannot set below current participant count";
      setLimitError(typeof errorMsg === 'string' ? errorMsg : "Error updating limit");
      setTimeout(() => setLimitError(null), 3000);
    }
  };

  const handleKick = async (id: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!isHost || !code) return;
    try {
      await kickUser(code, id, hostToken);
      removeParticipant(id);
      if (stompClient && isConnected) {
        stompClient.publish({ 
          destination: "/app/chat.control", 
          body: JSON.stringify({ type: "USER_KICKED", data: { participantId: id }, roomCode: code }) 
        });
      }
    } catch (e: any) {
      console.error(e);
      const msg = e.response?.data?.message || e.message || "Invalid connection";
      alert(`Failed to kick participant: ${msg}`);
    }
  };

  const handleToggleMute = async (p: Participant, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!isHost || !code) return;
    try { 
      if (p.isMuted) {
        await unmuteUser(code, p.id, hostToken);
        updateParticipant(p.id, { isMuted: false });
        stompClient?.publish({ destination: "/app/chat.control", body: JSON.stringify({ type: "USER_UNMUTED", data: { participantId: p.id }, roomCode: code }) });
      } else {
        await muteUser(code, p.id, hostToken, 60); 
        updateParticipant(p.id, { isMuted: true });
        stompClient?.publish({ destination: "/app/chat.control", body: JSON.stringify({ type: "USER_MUTED", data: { participantId: p.id }, roomCode: code }) });
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteMsg = async (msgId: number) => {
    if (!isHost || !code) return;
    try { 
      await deleteMessage(code, msgId, hostToken); 
      removeMsgFromStore(msgId);
      if (stompClient && isConnected) {
        stompClient.publish({ destination: "/app/chat.control", body: JSON.stringify({ type: "MESSAGE_DELETED", data: { messageId: msgId }, roomCode: code }) });
      }
    } catch (e) { console.error(e); }
  };

  const handleClearChat = async () => {
    if (!isHost || !code) return;
    try { 
      await clearChat(code, hostToken); 
      setMessages([]);
      if (stompClient && isConnected) {
        stompClient.publish({ destination: "/app/chat.control", body: JSON.stringify({ type: "CHAT_CLEARED", roomCode: code }) });
      }
    } catch (e) { console.error(e); }
  };

  const toggleLock = async () => {
    if (!isHost || !code) return;
    try {
      if (isLocked) {
        await unlockRoom(code, hostToken);
        setIsLocked(false);
      } else {
        await lockRoom(code, hostToken);
        setIsLocked(true);
      }
    } catch (e) { console.error(e); }
  };

  const handleExtendRoom = async () => {
    if (!isHost || !code) return;
    try {
      const newExpiry = await extendRoom(code, hostToken, 15);
      setExpiresAtTarget(newExpiry);
      localStorage.setItem(`expiresAt_${code}`, newExpiry);
      if (stompClient && isConnected) {
        stompClient.publish({ destination: "/app/chat.control", body: JSON.stringify({ type: "ROOM_EXTENDED", data: { expiresAt: newExpiry }, roomCode: code }) });
      }
    } catch (e) { console.error(e); }
  };
  
  const getAvatarColor = (name: string) => {
    const p = participants.find(part => part.nickName === name);
    return p?.avatarColor || "#404040";
  };

  if (isLoading || !participant) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--text-secondary)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans overflow-hidden">
      
      {/* 1. Top Navigation Bar (Room Info) */}
      <header className={`${isHost && roomPassword ? 'h-24' : 'h-20'} border-b border-[var(--border-color)] px-6 flex items-center shadow-sm z-20 shrink-0 bg-[var(--bg-primary)] relative transition-all duration-300`}>
        {/* Left Side: Exit button strictly pointing left */}
        <div className="absolute left-4 sm:left-6 flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleExit} className="flex items-center gap-2 border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] px-2 sm:px-3 shadow-sm h-9 sm:h-10" title="Exit Room">
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline font-bold">Exit</span>
            </Button>
        </div>
        
        {/* Center: Room Code + Privacy Badge + Host Password */}
        <div className="mx-auto flex flex-col items-center justify-center pt-1 md:pr-12">
          
          {/* Main Row: Room Code + Copy + Private Badge */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="font-mono font-black text-xl sm:text-3xl tracking-widest text-[var(--text-primary)] leading-none">{code}</span>
            <button onClick={handleCopyCode} className="text-[var(--text-secondary)] hover:text-[#4ade80] transition-colors p-1.5 rounded-lg hover:bg-[var(--bg-secondary)]" title="Copy Code">
              {copied ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#4ade80]" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            {isPrivate && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-100 dark:bg-amber-400/10 border border-orange-500/30 dark:border-amber-400/30 text-orange-600 dark:text-amber-400 text-[9px] sm:text-xs font-bold uppercase tracking-widest shadow-sm">
                <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden xs:inline">Private</span>
              </span>
            )}
          </div>

          {/* Reserved Space for Host Password */}
          <div className="h-6 flex items-center justify-center mt-1">
            {isHost && roomPassword && (
              <div className="flex items-center gap-2 px-3 py-0.5 rounded-md border border-orange-500/30 dark:border-amber-400/30 bg-orange-50 dark:bg-amber-400/10 shadow-sm transition-all duration-200">
                <span className="text-[9px] text-orange-600/80 dark:text-amber-400/80 font-bold uppercase tracking-widest mt-[1px]">Pass:</span>
                <span className="font-mono text-xs sm:text-sm font-bold text-orange-600 dark:text-amber-400 tracking-wider bg-transparent">{roomPassword}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(roomPassword); setCopiedPwd(true); setTimeout(() => setCopiedPwd(false), 2000); }}
                  className="text-orange-600/60 dark:text-amber-400/60 hover:text-orange-600 dark:hover:text-amber-400 transition-colors ml-1"
                  title="Copy Password"
                >
                  {copiedPwd ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Right Sidebar (Participants) with Mobile Drawer Support */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:hidden transition-all duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Right Side: Host Controls & Room Timer shown to all */}
        <div className="absolute right-4 sm:right-6 flex items-center gap-3">
          {!isConnected && <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest animate-pulse">Lost Link</span>}

          {/* Hidden on mobile, shown in Drawer instead */}
          <div className="hidden md:flex items-center gap-4">
              {expiresAtTarget && (
                <div className="flex flex-col items-end mr-2">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-secondary)] mb-0.5">Expires In</span>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm">
                     <Clock className="w-4 h-4 text-[var(--text-primary)]" />
                     <span className="font-mono font-black text-sm tabular-nums tracking-widest text-[var(--text-primary)]">{timeLeft || "--:--:--"}</span>
                  </div>
                </div>
              )}
              <ThemeToggle />
          </div>

          <Button variant="ghost" size="sm" onClick={() => setIsSidebarOpen(true)} className="flex md:hidden items-center gap-2 border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] px-2 h-9"
            title="Room Settings & Participants">
                <Users className="w-5 h-5" /> 
          </Button>
        </div>
      </header>

      {/* Split Body Layout */}
      <div className="flex flex-1 min-h-0 relative">
        
        {/* 2. Main Chat Area (Center) */}
        <main className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)]">
          {/* Chat Feed */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
            {[...messages].map((msg, index) => {
              const safeSenderName = msg.senderName || "Unknown";
              const isOwn = msg.senderId && participant?.id 
                ? msg.senderId === participant.id 
                : safeSenderName === participant?.nickName;
              const avatarColor = getAvatarColor(safeSenderName);
              
              return (
                <div key={msg.id || `msg-${index}`} className={`flex flex-col group ${isOwn ? "items-end" : "items-start"}`}>
                  <div className={`flex items-end gap-3 max-w-[85%] md:max-w-[70%] relative ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                    
                    {/* User Avatar Placed strictly next to message bubble */}
                    <div 
                        className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-md border-2 border-[var(--bg-primary)] z-10"
                        style={{ backgroundColor: avatarColor }}
                    >
                        {safeSenderName.charAt(0).toUpperCase()}
                    </div>
                    
                    {/* Message Bubble Column */}
                    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                        <span className={`text-[12px] font-bold text-[var(--text-secondary)] opacity-80 mb-1.5 ${isOwn ? "mr-1" : "ml-1"}`}>
                            {isOwn ? "You" : safeSenderName} 
                            <span className="text-[10px] font-medium ml-2 opacity-50">
                                {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </span>
                        
                        <div className="relative">
                            {/* Delete Button (Host Only) */}
                            {isHost && msg.id && (
                            <button 
                                onClick={() => handleDeleteMsg(msg.id!)}
                                className={`absolute top-1/2 -translate-y-1/2 p-2 text-[var(--text-secondary)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-[var(--bg-primary)] rounded-full shadow-sm border border-[var(--border-color)] ${isOwn ? "-left-12" : "-right-12"} scale-90 hover:scale-100`}
                                title="Delete Database Entry"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            )}

                            <div 
                            className={`px-5 py-3 rounded-2xl text-[15px] leading-relaxed break-words shadow-sm ${
                                isOwn 
                                ? "bg-[#262626] text-[#ffffff] rounded-br-[4px]" 
                                : "bg-[#f5f5f5] dark:bg-[var(--bg-secondary)] text-[#171717] dark:text-[var(--text-primary)] rounded-bl-[4px] border border-[var(--border-color)]"
                            }`}
                            >
                            {msg.content.startsWith("[FILE:") ? (
                              <div className="flex items-center gap-2 px-1">
                                <button 
                                  onClick={() => {
                                    const url = msg.content.match(/\((.*?)\)/)?.[1];
                                    const name = msg.content.match(/\[FILE: (.*?)\]/)?.[1] || "Download";
                                    if (url) handleDownloadAttachment(url, name);
                                  }}
                                  className="flex items-center gap-2 group/link cursor-pointer bg-transparent border-none p-0 outline-none"
                                >
                                  <div className="p-2 bg-[var(--bg-primary)] rounded-lg text-[var(--text-secondary)] group-hover/link:text-[#4ade80] transition-colors shadow-sm border border-[var(--border-color)]">
                                     <Download className="w-4 h-4" />
                                  </div>
                                  <span className="underline decoration-1 underline-offset-4 opacity-80 group-hover/link:opacity-100 transition-opacity font-semibold text-left">
                                     {msg.content.match(/\[FILE: (.*?)\]/)?.[1] || "Download Attachment"}
                                  </span>
                                </button>
                              </div>
                            ) : (
                              <>{msg.content}</>
                            )}
                            </div>
                        </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator */}
          <div className="px-6 h-6 flex items-center">
            {Object.keys(typingParticipants).length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-bounce" />
                </div>
                <p className="text-[11px] font-bold text-[var(--text-secondary)] italic">
                  {Object.values(typingParticipants).length === 1 
                    ? `${Object.values(typingParticipants)[0]} is typing...`
                    : "Several people are typing..."}
                </p>
              </div>
            )}
          </div>

          {/* Input Area strictly docked to bottom */}
          <div className="p-3 sm:p-4 md:p-6 bg-[var(--bg-primary)] border-t border-[var(--border-color)] shrink-0 px-4 sm:px-6">
            <form onSubmit={handleSend} className="relative flex items-center w-full max-w-5xl mx-auto border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded-2xl p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-[#4ade80]/20 focus-within:border-[#4ade80]/50 transition-all">
              
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

              {/* Added Emoji & Upload Layout Buttons strictly integrated */}
              <div className="flex items-center pl-2 gap-1.5 relative">
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className={`p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] rounded-xl transition-all ${isUploading ? 'bg-[#4ade80]/10 text-[#4ade80]' : ''}`} title="Upload File (Max 10MB)">
                      {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                  </button>
                  <button type="button" onClick={() => setShowEmojis(!showEmojis)} className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] rounded-xl transition-all" title="Insert Emoji">
                      <Smile className="w-5 h-5" />
                  </button>

                  {/* Contextual Emoji Popup */}
                  {showEmojis && (
                    <div ref={emojiPickerRef} className="absolute bottom-[110%] left-0 shadow-2xl z-50 rounded-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                      <EmojiPicker 
                        onEmojiClick={(emojiData) => setInputMessage((prev) => prev + emojiData.emoji)} 
                        theme={document.documentElement.classList.contains("dark") ? "dark" : "light" as any}
                      />
                    </div>
                  )}
              </div>

              <div className="flex-1 relative flex items-center">
                <textarea
                  value={participant?.isMuted ? "" : inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={participant?.isMuted ? "You have been muted by the host" : "Message securely..."}
                  disabled={!isConnected || participant?.isMuted || isUploading}
                  className={`w-full bg-transparent border-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] py-3 px-4 focus:outline-none resize-none h-12 flex items-center overflow-hidden leading-tight font-medium ${participant?.isMuted || isUploading ? "cursor-not-allowed italic opacity-50" : ""}`}
                  rows={1}
                />
                {isUploading && (
                  <div className="absolute inset-0 bg-[var(--bg-secondary)]/80 backdrop-blur-[2px] flex items-center px-4 animate-in fade-in duration-300">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#4ade80] animate-pulse">
                      Sending Secure File...
                    </span>
                  </div>
                )}
              </div>
              
              <Button 
                type="submit" 
                size="icon" 
                className="h-12 w-12 rounded-xl bg-[#262626] dark:bg-[#e5e5e5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity shadow-md disabled:opacity-50 shrink-0 ml-2"
                disabled={!inputMessage.trim() || !isConnected || participant?.isMuted}
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </main>

        <aside className={`
          fixed inset-y-0 right-0 z-[70] w-72 sm:w-80 bg-[hsl(var(--card))] border-l border-[var(--border-color)]
          transition-transform duration-300 transform flex flex-col md:relative md:translate-x-0 md:z-1
          ${isSidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
        `}>
          <div className="p-4 border-b border-[var(--border-color)] flex flex-col justify-center sticky top-0 bg-[hsl(var(--card))] z-10 shrink-0">
            {/* Mobile-Only Header for Drawer */}
            <div className="flex md:hidden items-center justify-between mb-4 pb-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="h-8 w-8">
                       <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <span className="font-bold text-sm uppercase tracking-wider">Room Controls</span>
                </div>
                <ThemeToggle />
            </div>
            
            <div className="hidden md:flex mb-2">
               {/* Desktop Header placeholder if needed */}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-[hsl(var(--foreground))]">
                  Participants ({participants.length})
                </h2>
              </div>
              {isHost && (
                <span className="px-1.5 py-0.5 rounded border border-[hsl(var(--border))] text-[10px] font-mono uppercase text-[hsl(var(--muted-foreground))]">
                  Admin
                </span>
              )}
            </div>
            
            {/* Admin Controls embedded strictly below header */}
            {isHost && (
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))] text-xs font-medium py-1">
                  <div className="flex items-center gap-2 text-[var(--text-primary)]">
                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>Lock Room</span>
                  </div>
                  <button
                    role="switch"
                    aria-checked={isLocked}
                    onClick={toggleLock}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                      isLocked ? 'bg-[var(--text-primary)]' : 'bg-gray-200 dark:bg-zinc-700'
                    }`}
                  >
                    <span 
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[var(--bg-primary)] shadow-sm transition-transform ${
                        isLocked ? 'translate-x-[18px]' : 'translate-x-[2px]'
                      }`} 
                    />
                  </button>
                </div>

                <div className="flex flex-col gap-1 py-0.5">
                  <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))] text-xs font-medium">
                    <div className="flex items-center gap-2 text-[var(--text-primary)]">
                      <Users className="w-3.5 h-3.5" />
                      <span>User Limit</span>
                    </div>
                    <div className="flex items-center gap-1 bg-[var(--bg-primary)] px-1 py-0.5 rounded-lg border border-[var(--border-color)]">
                      <button 
                        onClick={() => handleUpdateUsersCount(-1)} 
                        disabled={maxUsers <= 2}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-secondary)] disabled:opacity-30 text-[var(--text-primary)] font-bold transition-colors"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-mono text-[var(--text-primary)] font-bold text-xs">{maxUsers}</span>
                      <button 
                        onClick={() => handleUpdateUsersCount(1)} 
                        disabled={maxUsers >= 50}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-secondary)] disabled:opacity-30 text-[var(--text-primary)] font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {limitError && (
                    <span className="text-right text-[10px] text-red-500 font-semibold animate-in slide-in-from-top-1 fade-in">
                      {limitError}
                    </span>
                  )}
                </div>
                
                <Button variant="outline" onClick={handleClearChat} className="w-full h-10 text-xs font-bold border-2 hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--muted))] group transition-all">
                   <Trash2 className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                   CLEAR ALL MESSAGES
                </Button>
                
                <Button variant="outline" size="sm" onClick={handleExtendRoom} className="w-full text-xs h-8 flex items-center gap-1.5 justify-center shadow-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]">
                  <TimerReset className="w-3.5 h-3.5" />
                  Extend +15 min
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex-1 p-2 space-y-1 overflow-y-auto bg-[hsl(var(--card))]">
            {[...participants].sort((a,b) => {
              if (a.id === participant?.id) return -1;
              if (b.id === participant?.id) return 1;
              if (a.isHost || a.host) return -1;
              if (b.isHost || b.host) return 1;
              return 0;
            }).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-[hsl(var(--muted))]/60 group transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs border border-[var(--border-color)] shadow-sm"
                      style={{ backgroundColor: p.avatarColor || '#333' }}
                    >
                      {p.nickName?.substring(0, 2).toUpperCase()}
                    </div>
                    {/* Online Dot strictly matched to semantic --online */}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-[hsl(var(--card))] bg-[hsl(var(--online))]" />
                  </div>
                  
                  <div className="flex flex-col truncate">
                    <span className="text-[14px] font-medium truncate leading-tight flex items-center gap-1.5 text-[hsl(var(--foreground))]">
                      {p.nickName} {p.id === participant.id && <span className="opacity-60 text-[11px] font-bold">(You)</span>}
                      {p.isMuted && <VolumeX className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />}
                    </span>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-[10px] tracking-wider font-medium truncate text-[hsl(var(--muted-foreground))]/80">
                        {(p.isHost || p.host) ? "Admin" : "Participant"}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Admin Actions strictly mapping to VolumeX/Volume2/UserX */}
                {isHost && p.id !== participant?.id && (
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                    <button 
                      onClick={(e) => handleToggleMute(p, e)} 
                      type="button"
                      className="p-1 hover:bg-[hsl(var(--background))] rounded transition-colors text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                      title={p.isMuted ? "Unmute Participant" : "Mute Participant"}
                    >
                      {p.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    <button 
                      onClick={(e) => handleKick(p.id, e)} 
                      type="button"
                      className="p-1 hover:bg-[hsl(var(--background))] hover:text-[hsl(var(--destructive))] text-[hsl(var(--muted-foreground))] rounded transition-colors"
                      title="Kick from Room"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>

    </div>
  );
};

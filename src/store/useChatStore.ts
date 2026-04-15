import { create } from 'zustand';
import { Client } from '@stomp/stompjs';


export interface Message {
  id?: number;
  roomCode: string;
  senderName?: string;
  senderId?: number;
  content: string;
  createdAt?: string;
}

export interface Participant {
  id: number;
  nickName: string;
  avatarColor: string;
  isHost: boolean;
  host?: boolean;
  isMuted?: boolean;
  muted?: boolean;
  status?: string;
}

interface ChatState {
  roomCode: string | null;
  participant: Participant | null;
  messages: Message[];
  participants: Participant[];
  isConnected: boolean;
  stompClient: Client | null;
  adminId: number | null;
  setRoom: (code: string, p: Participant) => void;
  setAdminId: (id: number | null) => void;
  setMessages: (msgsOrFn: Message[] | ((prev: Message[]) => Message[])) => void;
  addMessage: (msg: Message) => void;
  deleteMessage: (msgId: number) => void;
  setParticipants: (ps: any[]) => void;
  addParticipant: (p: any) => void;
  removeParticipant: (id: number) => void;
  updateParticipant: (id: number, updates: Partial<Participant>) => void;
  typingParticipants: Record<number, string>;
  setTyping: (id: number, name: string, isTyping: boolean) => void;
  setConnected: (status: boolean) => void;
  setStompClient: (client: Client | null) => void;
  clearChatStore: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  roomCode: null,
  participant: null,
  messages: [],
  participants: [],
  isConnected: false,
  stompClient: null,
  adminId: null,
  typingParticipants: {},
  
  setRoom: (code, p) => set({ roomCode: code, participant: p, adminId: p.isHost ? p.id : null }),
  setAdminId: (id) => set({ adminId: id }),
  setMessages: (msgsOrFn) => set((state) => ({ 
    messages: typeof msgsOrFn === 'function' ? msgsOrFn(state.messages) : msgsOrFn 
  })),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  deleteMessage: (msgId) => set((state) => ({ messages: state.messages.filter(m => m.id !== msgId) })),
  
  setParticipants: (ps: any[]) => set((state) => ({ 
    participants: ps.reduce((acc: Participant[], curr: any) => {
      const pId = curr.id ?? curr.participantId;
      const p: Participant = {
        id: pId,
        nickName: curr.nickName ?? curr.nickname ?? "Unknown",
        avatarColor: curr.avatarColor ?? "#333",
        // Force isHost if it matches our remembered Admin ID
        isHost: !!(curr.isHost || curr.host || (state.adminId && state.adminId === pId)),
        isMuted: !!(curr.isMuted || curr.muted)
      };
      if (!acc.some(existing => existing.id === p.id || existing.nickName === p.nickName)) {
        acc.push(p);
      }
      return acc;
    }, [])
  })),
  
  addParticipant: (rawP) => set((state) => {
    const pId = rawP.id ?? rawP.participantId;
    const p: Participant = {
      id: pId,
      nickName: rawP.nickName ?? rawP.nickname ?? "Unknown",
      avatarColor: rawP.avatarColor ?? "#333",
      // Force isHost if it matches our remembered Admin ID
      isHost: !!(rawP.isHost || rawP.host || (state.adminId && state.adminId === pId)),
      isMuted: !!(rawP.isMuted || rawP.muted)
    };
    
    if (!p.id) return state;

    const exists = state.participants.find(existing => existing.id === p.id);
    if (exists) {
      // Merge updates for existing participants (like status changes on reload)
      return { 
        participants: state.participants.map(item => item.id === p.id ? { ...item, ...p } : item) 
      };
    }
    
    return { participants: [...state.participants, p] };
  }),
  
  removeParticipant: (id) => set((state) => ({ 
    participants: state.participants.filter(p => p.id !== id) 
  })),

  updateParticipant: (id: number, updates: Partial<Participant>) => set((state) => {
    const updatedParticipants = state.participants.map(p => p.id === id ? { ...p, ...updates } : p);
    const updatedLocalParticipant = state.participant?.id === id 
      ? { ...state.participant, ...updates } 
      : state.participant;
    
    return { 
      participants: updatedParticipants,
      participant: updatedLocalParticipant
    };
  }),
  
  setTyping: (id: number, name: string, isTyping: boolean) => set((state) => {
    const newTyping = { ...state.typingParticipants };
    if (isTyping) {
      newTyping[id] = name;
    } else {
      delete newTyping[id];
    }
    return { typingParticipants: newTyping };
  }),
  
  setConnected: (status) => set({ isConnected: status }),
  setStompClient: (client) => set({ stompClient: client }),
  
  clearChatStore: () => set({ 
    roomCode: null, 
    participant: null, 
    messages: [], 
    participants: [],
    isConnected: false,
    stompClient: null,
    adminId: null,
    typingParticipants: {} 
  }),
}));

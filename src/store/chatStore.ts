import { create } from "zustand";
import { type RespPayload, RespType } from "../protocol/message";

export interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: number;
  audioUrl?: string; // 音频URL（如果有的话）
}

interface ChatState {
  messages: ChatMessage[];
  currentCmdId: number;
  isConnected: boolean;
  isAuthenticated: boolean;
  error: string | null;
  
  // Actions
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  addAudioToLastMessage: (audioUrl: string) => void;
  nextCmdId: () => number;
  setConnected: (connected: boolean) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentCmdId: 0,
  isConnected: false,
  isAuthenticated: false,
  error: null,
  
  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message]
    }));
  },
  
  updateLastMessage: (content) => {
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content: messages[messages.length - 1].content + content
        };
      }
      return { messages };
    });
  },
  
  addAudioToLastMessage: (audioUrl) => {
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          audioUrl
        };
      }
      return { messages };
    });
  },
  
  nextCmdId: () => {
    const id = get().currentCmdId;
    set((state) => ({ currentCmdId: state.currentCmdId + 1 }));
    return id;
  },
  
  setConnected: (connected) => set({ isConnected: connected }),
  setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
  setError: (error) => set({ error }),
  clearMessages: () => set({ messages: [] }),
  clearError: () => set({ error: null }),
}));

// 处理响应的辅助函数
export function handleResponse(response: RespPayload): void {
  const { addMessage, updateLastMessage, addAudioToLastMessage } = useChatStore.getState();
  console.log('handleResponse',response)
  switch (response.type) {
    case RespType.UserText:
      // 用户语音识别结果
      if (typeof response.content === "string") {
        addMessage({
          id: `user-${Date.now()}`,
          type: "user",
          content: response.content,
          timestamp: Date.now(),
        });
      }
      break;
      
    case RespType.ModelText:
      // 模型文字输出
      if (typeof response.content.content === "string") {
        // 检查是否已有助手的消息
        const messages = useChatStore.getState().messages;
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage && lastMessage.type === "assistant") {
          // 追加到现有消息
          updateLastMessage(response.content.content);
        } else {
          // 创建新消息
          addMessage({
            id: `assistant-${Date.now()}`,
            type: "assistant",
            content: response.content.content,
            timestamp: Date.now(),
          });
        }
      }
      break;
      
    case RespType.ModelAudio:
      // 模型音频输出
      if (response.content instanceof Uint8Array) {
        // 将音频数据转换为Blob URL
        const blob = new Blob([response.content], { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(blob);
        
        // 添加到最后一条助手消息
        addAudioToLastMessage(audioUrl);
      }
      break;
  }
}

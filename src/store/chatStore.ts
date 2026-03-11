import { create } from "zustand";
import { base64ToArrayBuffer, getRespContentData, getRespContentFinish, type RespPayload, RespType } from "../protocol/message";
import { useConfigStore } from "./configStore";

export interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: number;
  audioUrl?: string; // 音频URL（如果有的话）
  isThinking?: boolean;
  isStreamingASR?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  currentCmdId: number;
  isConnected: boolean;
  isAuthenticated: boolean;
  error: string | null;
  asrFinalTick: number;
  asrResultHandler: ((text: string) => void) | null;
  
  // Actions
  addMessage: (message: ChatMessage) => void;
  upsertStreamingUserMessage: (content: string) => void;
  finalizeStreamingUserMessage: () => void;
  notifyASRFinalized: () => void;
  addThinkingMessage: () => void;
  updateLastMessage: (content: string) => void;
  addAudioToLastMessage: (audioUrl: string) => void;
  clearLastThinkingMessage: () => void;
  nextCmdId: () => number;
  setConnected: (connected: boolean) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setError: (error: string | null) => void;
  setASRResultHandler: (handler: (text: string) => void) => void;
  clearMessages: () => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentCmdId: 0,
  isConnected: false,
  isAuthenticated: false,
  error: null,
  asrFinalTick: 0,
  asrResultHandler: null,
  
  addMessage: (message: ChatMessage) => {
    set((state) => ({
      messages: [...state.messages, message]
    }));
  },

  upsertStreamingUserMessage: (content: string) => {
    set((state) => {
      const messages = [...state.messages];
      const lastMessage = messages[messages.length - 1];

      if (lastMessage?.type === "user" && lastMessage.isStreamingASR) {
        messages[messages.length - 1] = {
          ...lastMessage,
          content,
          timestamp: Date.now(),
        };
        return { messages };
      }

      messages.push({
        id: `user-asr-${Date.now()}`,
        type: "user",
        content,
        timestamp: Date.now(),
        isStreamingASR: true,
      });

      return { messages };
    });
  },

  finalizeStreamingUserMessage: () => {
    set((state) => {
      const messages = [...state.messages];
      const lastMessage = messages[messages.length - 1];

      if (lastMessage?.type === "user" && lastMessage.isStreamingASR) {
        const normalizedContent = lastMessage.content.trim();
        if (!normalizedContent) {
          messages.pop();
          return { messages };
        }

        messages[messages.length - 1] = {
          ...lastMessage,
          content: normalizedContent,
          isStreamingASR: false,
        };
      }

      return { messages };
    });
  },

  notifyASRFinalized: () => {
    set((state) => ({ asrFinalTick: state.asrFinalTick + 1 }));
  },

  addThinkingMessage: () => {
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: `assistant-thinking-${Date.now()}`,
          type: "assistant",
          content: "...",
          timestamp: Date.now(),
          isThinking: true,
        },
      ],
    }));
  },
  
  updateLastMessage: (content: string) => {
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        messages[messages.length - 1] = {
          ...lastMessage,
          content:
            lastMessage.type === "assistant" && lastMessage.isThinking
              ? content
              : lastMessage.content + content,
          isThinking: false,
        };
      }
      return { messages };
    });
  },
  
  addAudioToLastMessage: (audioUrl: string) => {
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

  clearLastThinkingMessage: () => {
    set((state) => {
      const messages = [...state.messages];
      const lastMessage = messages[messages.length - 1];

      if (lastMessage?.type === "assistant" && lastMessage.isThinking) {
        messages.pop();
      }

      return { messages };
    });
  },
  
  nextCmdId: () => {
    const id = get().currentCmdId;
    set((state) => ({ currentCmdId: state.currentCmdId + 1 }));
    return id;
  },
  
  setConnected: (connected: boolean) => set({ isConnected: connected }),
  setAuthenticated: (authenticated: boolean) => set({ isAuthenticated: authenticated }),
  setError: (error: string | null) => set({ error }),
  setASRResultHandler: (handler: (text: string) => void) => set({ asrResultHandler: handler }),
  clearMessages: () => set({ messages: [] }),
  clearError: () => set({ error: null }),
}));

function formatFinalASRText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  const hasTerminalPunctuation = /[。！？!?]$/.test(normalized);
  if (hasTerminalPunctuation || normalized.length < 6) {
    return normalized;
  }

  return `${normalized}。`;
}

const BUFFER_THRESHOLD = 20;
const PCM_FLUSH_DELAY_MS = 250;
const PCM_IDLE_MS = 2000;

let pcmAudioContext: AudioContext | null = null;
let pcmQueue: ArrayBuffer[] = [];
let pcmIsPlaying = false;
let pcmFlushTimer: number | null = null;
let pcmIdleTimer: number | null = null;

function clearPcmFlushTimer(): void {
  if (pcmFlushTimer !== null) {
    window.clearTimeout(pcmFlushTimer);
    pcmFlushTimer = null;
  }
}

function clearPcmIdleTimer(): void {
  if (pcmIdleTimer !== null) {
    window.clearTimeout(pcmIdleTimer);
    pcmIdleTimer = null;
  }
}

function getSafeArrayBuffer(uint8: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(uint8.byteLength);
  copy.set(uint8);
  return copy.buffer;
}

async function ensurePcmAudioContext(): Promise<AudioContext | null> {
  try {
    if (!pcmAudioContext) {
      pcmAudioContext = new AudioContext();
    }
    if (pcmAudioContext.state === "suspended") {
      await pcmAudioContext.resume();
    }
    return pcmAudioContext;
  } catch (error) {
    console.error("无法创建或恢复AudioContext:", error);
    return null;
  }
}

function schedulePcmFlush(): void {
  if (pcmIsPlaying || pcmFlushTimer !== null) {
    return;
  }
  pcmFlushTimer = window.setTimeout(() => {
    pcmFlushTimer = null;
    if (!pcmIsPlaying && pcmQueue.length > 0) {
      void playNextPcmChunk();
    }
  }, PCM_FLUSH_DELAY_MS);
}

function enqueuePcmChunk(chunk: ArrayBuffer): void {
  if (chunk.byteLength === 0) {
    return;
  }
  clearPcmIdleTimer();
  pcmQueue.push(chunk);
  if (!pcmIsPlaying && pcmQueue.length >= BUFFER_THRESHOLD) {
    clearPcmFlushTimer();
    void playNextPcmChunk();
    return;
  }
  schedulePcmFlush();
}

async function playNextPcmChunk(): Promise<void> {
  const audioContext = await ensurePcmAudioContext();
  if (!audioContext || pcmQueue.length === 0) {
    pcmIsPlaying = false;
    return;
  }

  pcmIsPlaying = true;
  clearPcmFlushTimer();

  const ttsConfig = useConfigStore.getState().config?.ttsConfig;
  const channels = Math.max(1, ttsConfig?.channels ?? 1);
  const sampleRate = ttsConfig?.rate ?? 16000;
  const bitsPerSample = ttsConfig?.bits ?? 16;
  const bytesPerSample = bitsPerSample / 8;

  if (bytesPerSample !== 2) {
    console.warn(`暂不支持 ${bitsPerSample} 位PCM，当前仅支持16位PCM`);
    pcmIsPlaying = false;
    pcmQueue = [];
    return;
  }

  const bufferCount = Math.min(pcmQueue.length, BUFFER_THRESHOLD);
  const buffersToProcess = pcmQueue.splice(0, bufferCount);
  const totalBytes = buffersToProcess.reduce((sum, buffer) => sum + buffer.byteLength, 0);
  const merged = new Uint8Array(totalBytes);

  let byteOffset = 0;
  for (const buffer of buffersToProcess) {
    merged.set(new Uint8Array(buffer), byteOffset);
    byteOffset += buffer.byteLength;
  }

  const totalFrames = Math.floor(merged.byteLength / (channels * bytesPerSample));
  if (totalFrames <= 0) {
    pcmIsPlaying = false;
    return;
  }

  const audioBuffer = audioContext.createBuffer(channels, totalFrames, sampleRate);
  const dataView = new DataView(merged.buffer, merged.byteOffset, merged.byteLength);

  for (let frame = 0; frame < totalFrames; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      const sampleOffset = (frame * channels + channel) * bytesPerSample;
      const sample = dataView.getInt16(sampleOffset, true);
      audioBuffer.getChannelData(channel)[frame] = sample / 32768;
    }
  }

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  const gainNode = audioContext.createGain();
  gainNode.gain.value = 1;

  source.connect(gainNode);
  gainNode.connect(audioContext.destination);

  source.onended = () => {
    if (pcmQueue.length > 0) {
      void playNextPcmChunk();
      return;
    }
    pcmIsPlaying = false;
    clearPcmIdleTimer();
    pcmIdleTimer = window.setTimeout(() => {
      if (pcmQueue.length === 0 && !pcmIsPlaying) {
        pcmIsPlaying = false;
      }
    }, PCM_IDLE_MS);
  };

  source.start(0);
}

// 处理响应的辅助函数
export function handleResponse(response: RespPayload): void {
  const {
    addMessage,
    updateLastMessage,
    finalizeStreamingUserMessage,
    notifyASRFinalized,
    upsertStreamingUserMessage,
  } = useChatStore.getState();
  const contentData = getRespContentData(response.content);
  const finish = getRespContentFinish(response.content);

  switch (response.type) {
    case RespType.UserText:
      // 用户语音识别结果
      if (typeof contentData === "string") {
        const isFinal = finish === "stop";
        const displayText = isFinal ? formatFinalASRText(contentData) : contentData;
        upsertStreamingUserMessage(displayText);
        if (isFinal) {
          finalizeStreamingUserMessage();
          notifyASRFinalized();
        }
      }
      break;
      
    case RespType.ModelText:
      // 模型文字输出
      if (typeof contentData === "string") {
        finalizeStreamingUserMessage();
        // 检查是否已有助手的消息
        const messages = useChatStore.getState().messages;
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage && lastMessage.type === "assistant") {
          // 追加到现有消息
          updateLastMessage(contentData);
        } else {
          // 创建新消息
          addMessage({
            id: `assistant-${Date.now()}`,
            type: "assistant",
            content: contentData,
            timestamp: Date.now(),
          });
        }
      }
      break;
      
    case RespType.ModelAudio:
      // 模型音频输出
      {
        finalizeStreamingUserMessage();

        let audioData: Uint8Array | null = null;

        if (contentData instanceof Uint8Array) {
          audioData = contentData;
        } else if (typeof contentData === "string") {
          // 后端返回base64时进行解码
          audioData = new Uint8Array(base64ToArrayBuffer(contentData));
        }

        if (!audioData) {
          break;
        }

        const ttsConfig = useConfigStore.getState().config?.ttsConfig;
        const ttsFormat = ttsConfig?.format?.toLowerCase();
        const ttsCodec = ttsConfig?.codec?.toLowerCase();

        if (ttsFormat === "pcm" && ttsCodec === "raw") {
          // PCM/raw走缓冲队列播放，减少卡顿和爆音
          enqueuePcmChunk(getSafeArrayBuffer(audioData));
          break;
        }

        // 非PCM/raw场景按原先方式回退
        const blob = new Blob([audioData as unknown as BlobPart], { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(blob);

        // 直接自动播放，不在UI里渲染可见播放器
        const audio = new Audio(audioUrl);
        audio.autoplay = true;
        audio.onended = () => URL.revokeObjectURL(audioUrl);
        audio.onerror = () => URL.revokeObjectURL(audioUrl);
        void audio.play().catch((error) => {
          console.warn("自动播放语音失败:", error);
          URL.revokeObjectURL(audioUrl);
        });
      }
      break;
  }
}

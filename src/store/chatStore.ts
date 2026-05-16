import { create } from "zustand";
import { base64ToArrayBuffer, getRespContentData, type RespPayload, RespType } from "../protocol/message";
import { useConfigStore } from "./configStore";

export interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: number;
  audioUrl?: string;
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
  isTTSPlaying: boolean;
  volumeLevel: number;
  isAcceptingASR: boolean;
  isSpeaking: boolean;

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
  setTTSPlaying: (playing: boolean) => void;
  setVolumeLevel: (level: number) => void;
  setAcceptingASR: (accepting: boolean) => void;
  setIsSpeaking: (speaking: boolean) => void;
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
  isTTSPlaying: false,
  volumeLevel: 0,
  isAcceptingASR: false,
  isSpeaking: false,

  addMessage: (message: ChatMessage) => {
    set((state) => ({
      messages: [...state.messages, message]
    }));
  },

  upsertStreamingUserMessage: (content: string) => {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      return;
    }

    set((state) => {
      const messages = [...state.messages];
      const lastMessage = messages[messages.length - 1];

      if (lastMessage?.type === "user" && lastMessage.isStreamingASR) {
        messages[messages.length - 1] = {
          ...lastMessage,
          content: normalizedContent,
          timestamp: Date.now(),
        };
        return { messages };
      }

      messages.push({
        id: `user-asr-${Date.now()}`,
        type: "user",
        content: normalizedContent,
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
  setTTSPlaying: (playing: boolean) => set({ isTTSPlaying: playing }),
  setVolumeLevel: (level: number) => set({ volumeLevel: level }),
  setAcceptingASR: (accepting: boolean) => set({ isAcceptingASR: accepting }),
  setIsSpeaking: (speaking: boolean) => set({ isSpeaking: speaking }),
  clearMessages: () => set({ messages: [], isAcceptingASR: false, isSpeaking: false }),
  clearError: () => set({ error: null }),
}));

// ---------------------------------------------------------------------------
// TTS PCM playback – gapless scheduling via AudioContext.currentTime
// ---------------------------------------------------------------------------

const BUFFER_THRESHOLD = 20;
const PCM_FLUSH_DELAY_MS = 250;
const TTS_END_DELAY_MS = 500;

let pcmAudioContext: AudioContext | null = null;
let pcmQueue: ArrayBuffer[] = [];
let pcmFlushTimer: number | null = null;
let pcmIdleTimer: number | null = null;
let pcmScheduledEndTime = 0;
let pcmActiveSources: AudioBufferSourceNode[] = [];
let currentTTSAudioElement: HTMLAudioElement | null = null;

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
  if (pcmFlushTimer !== null) {
    return;
  }
  pcmFlushTimer = window.setTimeout(() => {
    pcmFlushTimer = null;
    if (pcmQueue.length > 0) {
      void scheduleNextPcmBatch();
    }
  }, PCM_FLUSH_DELAY_MS);
}

function enqueuePcmChunk(chunk: ArrayBuffer): void {
  if (chunk.byteLength === 0) {
    return;
  }
  clearPcmIdleTimer();
  pcmQueue.push(chunk);
  useChatStore.getState().setTTSPlaying(true);
  if (pcmQueue.length >= BUFFER_THRESHOLD) {
    clearPcmFlushTimer();
    void scheduleNextPcmBatch();
    return;
  }
  schedulePcmFlush();
}

async function scheduleNextPcmBatch(): Promise<void> {
  const audioContext = await ensurePcmAudioContext();
  if (!audioContext || pcmQueue.length === 0) {
    return;
  }

  clearPcmFlushTimer();

  const ttsConfig = useConfigStore.getState().config?.ttsConfig;
  const channels = Math.max(1, ttsConfig?.channels ?? 1);
  const sampleRate = ttsConfig?.rate ?? 16000;
  const bitsPerSample = ttsConfig?.bits ?? 16;
  const bytesPerSample = bitsPerSample / 8;

  if (bytesPerSample !== 2) {
    console.warn("[TTS] 暂不支持当前位数的 PCM，当前仅支持16位PCM");
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
    console.warn("[TTS] totalFrames <= 0，跳过播放");
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

  const startTime = Math.max(audioContext.currentTime + 0.005, pcmScheduledEndTime);
  source.start(startTime);
  pcmScheduledEndTime = startTime + audioBuffer.duration;
  pcmActiveSources.push(source);

  source.onended = () => {
    pcmActiveSources = pcmActiveSources.filter(s => s !== source);

    if (pcmQueue.length > 0) {
      void scheduleNextPcmBatch();
    } else if (pcmActiveSources.length === 0) {
      clearPcmIdleTimer();
      pcmIdleTimer = window.setTimeout(() => {
        if (pcmQueue.length === 0 && pcmActiveSources.length === 0) {
          useChatStore.getState().setTTSPlaying(false);
        }
      }, TTS_END_DELAY_MS);
    }
  };
}

export function stopTTSPlayback(): void {
  for (const source of pcmActiveSources) {
    try { source.stop(); } catch { /* already stopped */ }
  }
  pcmActiveSources = [];
  pcmQueue = [];
  pcmScheduledEndTime = 0;
  clearPcmFlushTimer();
  clearPcmIdleTimer();

  if (currentTTSAudioElement) {
    currentTTSAudioElement.pause();
    currentTTSAudioElement.src = '';
    currentTTSAudioElement = null;
  }

  useChatStore.getState().setTTSPlaying(false);
}

// ---------------------------------------------------------------------------
// Response handler
// ---------------------------------------------------------------------------

export function handleResponse(response: RespPayload): void {
  const {
    addMessage,
    updateLastMessage,
    finalizeStreamingUserMessage,
    upsertStreamingUserMessage,
  } = useChatStore.getState();
  const contentData = getRespContentData(response.content);

  switch (response.type) {
    case RespType.UserText:
      if (typeof contentData === "string" && useChatStore.getState().isAcceptingASR) {
        upsertStreamingUserMessage(contentData);
      }
      break;

    case RespType.ModelText:
      if (typeof contentData === "string") {
        finalizeStreamingUserMessage();
        const messages = useChatStore.getState().messages;
        const lastMessage = messages[messages.length - 1];

        if (lastMessage && lastMessage.type === "assistant") {
          updateLastMessage(contentData);
        } else {
          addMessage({
            id: `assistant-${Date.now()}`,
            type: "assistant",
            content: contentData,
            timestamp: Date.now(),
          });
        }
      } else {
        console.warn("[Chat] ModelText 内容不是字符串");
      }
      break;

    case RespType.ASRStop:
      // Backend detected silence; actual stop logic handled in useChat via engine response listener
      break;

    case RespType.ModelAudio:
      {
        finalizeStreamingUserMessage();

        let audioData: Uint8Array | null = null;

        if (contentData instanceof Uint8Array) {
          audioData = contentData;
        } else if (typeof contentData === "string") {
          audioData = new Uint8Array(base64ToArrayBuffer(contentData));
        } else {
          console.warn("[TTS] 收到未知类型的音频数据");
        }

        if (!audioData) {
          console.warn("[TTS] audioData 为空，跳过");
          break;
        }

        const ttsConfig = useConfigStore.getState().config?.ttsConfig;
        const ttsFormat = ttsConfig?.format?.toLowerCase();
        const ttsCodec = ttsConfig?.codec?.toLowerCase();

        if (ttsFormat === "pcm" && ttsCodec === "raw") {
          enqueuePcmChunk(getSafeArrayBuffer(audioData));
          break;
        }

        const blob = new Blob([audioData as unknown as BlobPart], { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.autoplay = true;

        currentTTSAudioElement = audio;
        useChatStore.getState().setTTSPlaying(true);

        const cleanupAudio = () => {
          URL.revokeObjectURL(audioUrl);
          if (currentTTSAudioElement === audio) {
            currentTTSAudioElement = null;
            useChatStore.getState().setTTSPlaying(false);
          }
        };

        audio.onended = cleanupAudio;
        audio.onerror = cleanupAudio;
        void audio.play().catch((error) => {
          console.warn("自动播放语音失败:", error);
          cleanupAudio();
        });
      }
      break;
  }
}

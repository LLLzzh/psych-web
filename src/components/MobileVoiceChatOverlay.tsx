import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/chatStore";
import { Background } from "./Background";
import { CONFIG } from "../config";
import teacherImage from "../assets/teacher.png";
import user from "../assets/user.svg";
import recordsIcon from "../assets/records-dark.svg";
import switchIcon from "../assets/switch.svg";
import closeIcon from "../assets/sidebar.png";
import microphoneIcon from "../assets/microphone.svg";

const MOCK_REPLIES = [
  "考试没考好确实会让人挺失落的，就像努力准备了很久的事情，结果却没达到预期，心里难免会有点空落落的，甚至可能会自责或者难过吧……",
  "你能把这些感受说出来，说明你其实很在意自己的表现，这本身就是一种积极的态度。",
  "每个人都有遇到挫折的时候，重要的是我们怎么看待这些经历，以及从中学到什么。",
];

interface MobileVoiceChatOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  onViewConversationRecords: () => void;
  onToggleTheme: () => void;
  isSpeaking: boolean;
  onStartASR: () => Promise<boolean>;
  onStopASR: () => Promise<void>;
  isRecording: boolean;
}

export function MobileVoiceChatOverlay({
  isVisible,
  onClose,
  onViewConversationRecords,
  onToggleTheme,
  isSpeaking: externalIsSpeaking,
  onStartASR,
  onStopASR,
  isRecording,
}: MobileVoiceChatOverlayProps) {
  const messages = useChatStore((state) => state.messages);
  const addMessage = useChatStore((state) => state.addMessage);
  const volumeLevel = useChatStore((state) => state.volumeLevel);
  const isUserSpeaking = useChatStore((state) => state.isSpeaking);

  const [mockSpeaking, setMockSpeaking] = useState(false);
  const mockTimerRef = useRef<number | null>(null);
  const mockIndexRef = useRef(0);
  const isMockRunning = useRef(false);

  const isSpeaking = CONFIG.USE_MOCK ? mockSpeaking : externalIsSpeaking;

  useEffect(() => {
    if (!isVisible || !CONFIG.USE_MOCK || isMockRunning.current) return;
    isMockRunning.current = true;
    mockIndexRef.current = 0;

    const runMockCycle = () => {
      if (!isVisible) return;
      const idx = mockIndexRef.current % MOCK_REPLIES.length;
      const text = MOCK_REPLIES[idx];

      setMockSpeaking(true);
      addMessage({
        id: `mock-assistant-${Date.now()}`,
        type: "assistant",
        content: text,
        timestamp: Date.now(),
      });

      mockTimerRef.current = window.setTimeout(() => {
        setMockSpeaking(false);
        mockIndexRef.current += 1;
        mockTimerRef.current = window.setTimeout(runMockCycle, 2000);
      }, 4000);
    };

    mockTimerRef.current = window.setTimeout(runMockCycle, 1500);

    return () => {
      if (mockTimerRef.current !== null) {
        window.clearTimeout(mockTimerRef.current);
        mockTimerRef.current = null;
      }
      isMockRunning.current = false;
      setMockSpeaking(false);
    };
  }, [isVisible, addMessage]);

  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.type === "assistant");

  const displayText = lastAssistantMessage?.isThinking
    ? ""
    : lastAssistantMessage?.content || "";

  const waveHeights = [8, 12, 18, 24, 20, 16, 10, 14, 22, 18, 26, 20, 14, 18, 10, 16, 22, 12, 18, 24];

  const handleToggleRecording = async () => {
    if (isRecording) {
      await onStopASR();
    } else {
      await onStartASR();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:hidden">
      <Background themeOverride="dark" mobileOnly />

      <div className="absolute inset-4 rounded-[20px] overflow-hidden">
        <div className="absolute inset-0 bg-[rgba(0,0,0,0.35)] backdrop-blur-[5px]" />

        <div className="relative z-10 flex flex-col h-full px-5 pt-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 bg-[rgba(0,0,0,0.35)] rounded-full flex items-center justify-center shadow-[0px_11.4894px_15.3191px_-3.82979px_rgba(28,25,23,0.08),0px_3.82979px_5.74468px_-1.91489px_rgba(28,25,23,0.03)]"
            >
              <img src={closeIcon} alt="关闭" className="w-6.5 h-6.5 object-contain" />
            </button>
            <button
              type="button"
              className="w-10 h10 rounded-full overflow-hidden flex items-center justify-center"
            >
              <img src={user} alt="用户" className="w-10 h-10 object-cover" />
            </button>
          </div>

          <h1 className="text-white text-base font-bold text-center mb-3">
            张老师的心灵树洞
          </h1>

          <div className="flex-1 flex flex-col items-center min-h-0">
            <div className="relative w-[90%] max-h-[467px] rounded-2xl overflow-hidden shadow-lg">
              <img
                src={teacherImage}
                alt="张老师"  
                className="w-full h-full object-cover"
              />
              <div className="absolute rounded-2xl backdrop-blur-xs bg-[rgba(0,0,0,0.2)] inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent py-4 px-3">
                <div className="flex items-center justify-center gap-1 h-8">
                  {waveHeights.map((height, i) => (
                    <div
                      key={i}
                      className={`w-[3px] rounded-full bg-white ${
                        isSpeaking ? "voice-wave-bar" : "opacity-50"
                      }`}
                      style={{
                        height: isSpeaking ? `${height}px` : "4px",
                        animationDelay: `${i * 0.06}s`,
                        transition: "height 0.2s ease",
                      }}
                    />
                  ))}
                </div>
                <p className="text-white text-sm text-center mt-2">
                  {isSpeaking ? "正在讲话" : isRecording && isUserSpeaking ? "正在说话" : isRecording ? "聆听中..." : "点击下方按钮开始说话"}
                </p>
              </div>
            </div>
          </div>

          <div className="px-2 py-3 min-h-[80px] flex items-start justify-center">
            {lastAssistantMessage?.isThinking ? (
              <div className="flex items-center justify-center gap-1" aria-label="老师正在思考">
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:0ms]" />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:120ms]" />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:240ms]" />
              </div>
            ) : (
              <p className="text-white text-[14px] leading-relaxed text-center">
                {displayText}
              </p>
            )}
          </div>

          <div className="flex items-center justify-around px-4 pb-2">
            <button
              type="button"
              onClick={onViewConversationRecords}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-12.5 h-12.5 bg-[rgba(0,0,0,0.35)] rounded-full flex items-center justify-center shadow-[0px_11.4894px_15.3191px_-3.82979px_rgba(28,25,23,0.08),0px_3.82979px_5.74468px_-1.91489px_rgba(28,25,23,0.03)]">
                <img src={recordsIcon} alt="" className="w-5 h-5 object-contain" />
              </div>
              <span className="text-white text-[11px]">对话记录</span>
            </button>

            <button
              type="button"
              onClick={() => void handleToggleRecording()}
              className="flex flex-col items-center gap-1.5"
            >
              <div className={`w-[105px] h-[105px] rounded-full flex items-center justify-center transition-all duration-300 ${
                isRecording && isUserSpeaking
                  ? "bg-[linear-gradient(135deg,rgba(255,100,100,0.6)_0%,rgba(255,60,60,0.6)_100%)] shadow-[0_0_30px_rgba(255,100,100,0.5)]"
                  : isRecording
                    ? "bg-[linear-gradient(135deg,rgba(150,192,255,0.4)_0%,rgba(134,134,255,0.4)_100%)] shadow-[0_0_20px_rgba(150,192,255,0.3)]"
                    : "bg-[linear-gradient(135deg,rgba(150,192,255,0.6)_0%,rgba(134,134,255,0.6)_100%)] shadow-[0_0_30px_rgba(150,192,255,0.5)]"
              }`}>
                <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  {isRecording && isUserSpeaking ? (
                    <div className="flex items-center justify-center gap-[2px]">
                      {[0, 1, 2, 3, 4].map((i) => {
                        const vScale = Math.min(1, volumeLevel / 0.12);
                        const listeningHeight = 6 + vScale * 18;
                        return (
                          <div
                            key={i}
                            className="w-[3px] rounded-full bg-white"
                            style={{
                              height: `${listeningHeight}px`,
                              transition: 'height 80ms ease-out',
                            }}
                          />
                        );
                      })}
                    </div>
                  ) : isRecording ? (
                    <div className="flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                    </div>
                  ) : (
                    <img className="w-8 h-8 object-contain brightness-0 invert" src={microphoneIcon} alt="" />
                  )}
                </div>
              </div>
              <span className="text-white text-[11px]">
                {isRecording && isUserSpeaking ? "说话中" : isRecording ? "聆听中" : "点击说话"}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-12.5 h-12.5 bg-[rgba(0,0,0,0.35)] rounded-full flex items-center justify-center shadow-[0px_11.4894px_15.3191px_-3.82979px_rgba(28,25,23,0.08),0px_3.82979px_5.74468px_-1.91489px_rgba(28,25,23,0.03)]">
                <img src={switchIcon} alt="" className="w-5 h-5 object-contain" />
              </div>
              <span className="text-white text-[11px]">模式切换</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

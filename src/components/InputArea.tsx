import { useTextInput } from "../hooks/useTextInput";
import { useVoiceRecording } from "../hooks/useVoiceRecording";
import { useTestRecording } from "../hooks/useTestRecording";
import { useConfigStore } from "../store/configStore";
import { useChatStore } from "../store/chatStore";
import { useEffect, useRef, useState } from "react";
import microphoneIcon from "../assets/microphone.svg";
import sendIcon from "../assets/send.svg";
import { CONFIG } from "../config";



interface InputAreaProps {
  onSendText: (text: string) => void;
  onStartASR: () => Promise<boolean>;
  onStopASR: () => Promise<void>;
  onGetASRState: () => boolean;
  endConversationSignal: number;
  enterVoiceModeSignal: number;
  onVoiceModeChange?: (isVoiceMode: boolean) => void;
  isDesktopLayout: boolean;
}

export function InputArea({
  onSendText,
  onStartASR,
  onStopASR,
  onGetASRState,
  endConversationSignal,
  enterVoiceModeSignal,
  onVoiceModeChange,
  isDesktopLayout,
}: InputAreaProps) {
  const { theme } = useConfigStore();
  const volumeLevel = useChatStore((state) => state.volumeLevel);
  const isSpeaking = useChatStore((state) => state.isSpeaking);
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const lastEndConversationSignalRef = useRef(endConversationSignal);
  const lastEnterVoiceModeSignalRef = useRef(enterVoiceModeSignal);

  const {
    inputText,
    setInputText,
    handleSend,
    canSend,
  } = useTextInput({
    onSend: onSendText,
    enabled: true,
  });

  const { isRecording, startRecording, stopRecording } = useVoiceRecording({
    onStartRecording: onStartASR,
    onStopRecording: onStopASR,
    getRecordingState: onGetASRState,
    enabled: true,
  });

  const { isRecording: isTestRecording, toggleRecording: toggleTestRecording } = useTestRecording();

  const handleEnterVoiceMode = () => {
    setInputMode("voice");
    onVoiceModeChange?.(true);
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleSendClick = async () => {
    await handleSend();
  };

  const handleKeyPressGuard = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendClick();
    }
  };

  useEffect(() => {
    if (endConversationSignal === lastEndConversationSignalRef.current) {
      return;
    }
    lastEndConversationSignalRef.current = endConversationSignal;
    if (inputMode !== "voice") {
      return;
    }
    void stopRecording();
    setInputMode("text");
    onVoiceModeChange?.(false);
  }, [endConversationSignal, inputMode, stopRecording, onVoiceModeChange]);

  useEffect(() => {
    if (enterVoiceModeSignal === lastEnterVoiceModeSignalRef.current) {
      return;
    }
    lastEnterVoiceModeSignalRef.current = enterVoiceModeSignal;
    if (inputMode === "voice") {
      return;
    }
    void handleEnterVoiceMode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enterVoiceModeSignal]);

  const waveHeights = [12, 18, 26, 34, 28, 20, 14, 24, 30, 18, 26, 34, 20, 28, 12, 22, 30, 16, 24, 32];

  const isMobileVoiceMode = inputMode === "voice";
  const outerClassName = isDesktopLayout
    ? "px-8 pb-8 pt-4 h-44 mb-24 mx-[clamp(2rem,10vw,10rem)]"
    : `px-4 pb-4 pt-2 h-18 mb-16 mx-4 ${isMobileVoiceMode ? "hidden" : ""}`;
  const panelClassName = isDesktopLayout
    ? `w-full h-44 rounded-[20px] pl-11 pr-[clamp(1rem,5.2vw,5.75rem)] pt-3 flex items-start bg-[rgba(255,255,255,0.3)] border-2 border-white drop-shadow-[0_0_30px_rgba(0,0,0,0.02)] backdrop-blur-[10px] ${
        theme === "dark"
          ? "bg-gray-800/50 border border-gray-700 drop-shadow-none backdrop-blur-sm"
          : ""
      }`
    : "w-full h-18 rounded-[20px] pl-6 pr-[clamp(0.75rem,3.2vw,1.8rem)] pt-2 flex items-start bg-[rgba(255,255,255,0.3)] border-2 border-white drop-shadow-[0_0_30px_rgba(0,0,0,0.02)] backdrop-blur-[10px]";
  const actionGapClassName = isDesktopLayout ? "gap-9" : "gap-4";
  const actionButtonSizeClassName = isDesktopLayout
    ? "w-18 h-18"
    : "w-[30px] h-[30px]";
  const iconSizeClassName = isDesktopLayout
    ? "w-7.5 h-7.5"
    : "w-4 h-4";

  return (
    <div className={outerClassName}>
      {CONFIG.USE_MOCK && (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={toggleTestRecording}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isTestRecording
                ? "bg-red-500 text-white"
                : theme === "light"
                ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                : "bg-gray-600 text-gray-200 hover:bg-gray-500"
            }`}
          >
            {isTestRecording ? "停止并播放" : "测试录音"}
          </button>
        </div>
      )}
      <div
          className={panelClassName}
        >

        
      {inputMode === "text" ? (
        <>
        <textarea
            className={`flex-1 h-full bg-transparent outline-none ${isDesktopLayout ? "text-[15px]" : "text-[11px] sm:text-[15px]"} resize-none pt-1 text-gray-700 placeholder-gray-400 ${
              theme === "dark" && isDesktopLayout ? "text-gray-100" : ""
            }`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPressGuard}
            placeholder="输入文字发送或点击麦克风对话..."
          />
          <div className={`flex items-center h-full ${actionGapClassName} pt-1`}>
            <button
              onClick={handleEnterVoiceMode}
              className={`${actionButtonSizeClassName} hover:cursor-pointer hover:scale-110 border ${isDesktopLayout ? "border-[3px]" : ""} border-solid border-[#96C0FF] flex items-center justify-center rounded-full duration-200 transition-all text-gray-500 ${
                theme === "dark" && isDesktopLayout ? "text-gray-400" : ""
              }`}
              type="button"
            >
              <img className={`${iconSizeClassName} object-contain`} src={microphoneIcon} alt="" />
            </button>
            <button
              onClick={handleSendClick}
              className={`${actionButtonSizeClassName} hover:cursor-pointer hover:scale-110 flex items-center justify-center rounded-full transition-all duration-200 shadow-[0px_13.5px_18px_-4.5px_rgba(28,25,23,0.08),0px_4.5px_6.75px_-2.25px_rgba(28,25,23,0.03)] ${
                canSend
                  ? "text-white bg-[linear-gradient(303.86deg,#8686FF_6.61%,#96C0FF_93.39%)]"
                  : `bg-gray-200 text-gray-400 ${theme === "dark" && isDesktopLayout ? "bg-gray-600 text-gray-500" : ""}`
              }`}
              type="button"
            >
              <img className={`${iconSizeClassName} object-contain`} src={sendIcon} alt="" />
            </button>
          </div>
        </>
          
      ) : (
        <div className="flex items-center w-full h-full">
          <div className={`flex-1 ${isDesktopLayout ? "h-16" : "h-10"} flex items-center gap-1.5`}>
            {isRecording && isSpeaking ? (
              waveHeights.map((height, i) => {
                const vScale = Math.min(1, volumeLevel / 0.12);
                const activeScale = 0.15 + vScale * 0.85;
                return (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full bg-blue-500 ${theme === "dark" && isDesktopLayout ? "bg-blue-300" : ""}`}
                    style={{
                      height: `${height * activeScale}px`,
                      transition: 'height 80ms ease-out',
                    }}
                  />
                );
              })
            ) : isRecording ? (
              <span className={`${isDesktopLayout ? "text-sm" : "text-[11px]"} animate-pulse ${theme === "dark" && isDesktopLayout ? "text-gray-300" : "text-gray-500"}`}>
                聆听中...
              </span>
            ) : (
              <span className={`${isDesktopLayout ? "text-sm" : "text-[11px]"} ${theme === "dark" && isDesktopLayout ? "text-gray-300" : "text-gray-500"}`}>
                点击麦克风开始说话
              </span>
            )}
          </div>
          <div className={`flex items-center h-full ${actionGapClassName} pt-1`}>
            <button
              onClick={handleToggleRecording}
              className={`${actionButtonSizeClassName} hover:cursor-pointer hover:scale-110 border ${isDesktopLayout ? "border-[3px]" : ""} border-solid flex items-center justify-center rounded-full duration-200 transition-all ${
                isRecording
                  ? `border-red-400 ${isDesktopLayout ? "bg-red-500/10" : "bg-red-50"}`
                  : "border-[#96C0FF]"
              }`}
              type="button"
            >
              {isRecording ? (
                <div className={`${isDesktopLayout ? "w-5 h-5" : "w-3 h-3"} rounded-sm bg-red-500`} />
              ) : (
                <img className={`${iconSizeClassName} object-contain`} src={microphoneIcon} alt="" />
              )}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

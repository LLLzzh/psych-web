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
}

export function InputArea({
  onSendText,
  onStartASR,
  onStopASR,
  onGetASRState,
  endConversationSignal,
  enterVoiceModeSignal,
  onVoiceModeChange,
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

  return (
    <div className={`px-4 pb-4 pt-2 h-18 mb-16 mx-4 md:px-8 md:pb-8 md:pt-4 md:h-44 md:mb-24 md:mx-[clamp(2rem,10vw,10rem)] ${isMobileVoiceMode ? "hidden md:block" : ""}`}>
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
          className={`w-full h-18 rounded-[20px] pl-6 pr-[clamp(0.75rem,3.2vw,1.8rem)] pt-2 flex items-start md:h-44 md:pl-11 md:pr-[clamp(1rem,5.2vw,5.75rem)] md:pt-3 bg-[rgba(255,255,255,0.3)] border-2 border-white drop-shadow-[0_0_30px_rgba(0,0,0,0.02)] backdrop-blur-[10px] ${
            theme === "dark"
              ? "md:bg-gray-800/50 md:border md:border-gray-700 md:drop-shadow-none md:backdrop-blur-sm"
              : ""
          }`}
        >

        
      {inputMode === "text" ? (
        <>
        <textarea
            className={`flex-1 h-full bg-transparent outline-none text-[11px] sm:text-[15px] resize-none pt-1 text-gray-700 placeholder-gray-400 ${
              theme === "dark" ? "md:text-gray-100" : ""
            }`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPressGuard}
            placeholder="输入文字发送或点击麦克风对话..."
          />
          <div className="flex items-center h-full gap-4 pt-1 md:gap-9">
            <button
              onClick={handleEnterVoiceMode}
              className={`w-[30px] h-[30px] hover:cursor-pointer hover:scale-110 border md:border-[3px] border-solid border-[#96C0FF] flex items-center justify-center rounded-full duration-200 transition-all md:w-18 md:h-18 text-gray-500 ${
                theme === "dark" ? "md:text-gray-400" : ""
              }`}
              type="button"
            >
              <img className="w-4 h-4 object-contain md:w-7.5 md:h-7.5" src={microphoneIcon} alt="" />
            </button>
            <button
              onClick={handleSendClick}
              className={`w-[30px] h-[30px] hover:cursor-pointer hover:scale-110 flex items-center justify-center rounded-full transition-all duration-200 shadow-[0px_13.5px_18px_-4.5px_rgba(28,25,23,0.08),0px_4.5px_6.75px_-2.25px_rgba(28,25,23,0.03)] md:w-18 md:h-18 ${
                canSend
                  ? "text-white bg-[linear-gradient(303.86deg,#8686FF_6.61%,#96C0FF_93.39%)]"
                  : `bg-gray-200 text-gray-400 ${theme === "dark" ? "md:bg-gray-600 md:text-gray-500" : ""}`
              }`}
              type="button"
            >
              <img className="w-4 h-4 object-contain md:w-7.5 md:h-7.5" src={sendIcon} alt="" />
            </button>
          </div>
        </>
          
      ) : (
        <div className="flex items-center w-full h-full">
          <div className="flex-1 h-10 flex items-center gap-1.5 md:h-16">
            {isRecording && isSpeaking ? (
              waveHeights.map((height, i) => {
                const vScale = Math.min(1, volumeLevel / 0.12);
                const activeScale = 0.15 + vScale * 0.85;
                return (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full bg-blue-500 ${theme === "dark" ? "md:bg-blue-300" : ""}`}
                    style={{
                      height: `${height * activeScale}px`,
                      transition: 'height 80ms ease-out',
                    }}
                  />
                );
              })
            ) : isRecording ? (
              <span className={`text-[11px] md:text-sm animate-pulse ${theme === "dark" ? "md:text-gray-300" : "text-gray-500"}`}>
                聆听中...
              </span>
            ) : (
              <span className={`text-[11px] md:text-sm ${theme === "dark" ? "md:text-gray-300" : "text-gray-500"}`}>
                点击麦克风开始说话
              </span>
            )}
          </div>
          <div className="flex items-center h-full gap-4 pt-1 md:gap-9">
            <button
              onClick={handleToggleRecording}
              className={`w-[30px] h-[30px] hover:cursor-pointer hover:scale-110 border md:border-[3px] border-solid flex items-center justify-center rounded-full duration-200 transition-all md:w-18 md:h-18 ${
                isRecording
                  ? "border-red-400 bg-red-50 md:bg-red-500/10"
                  : "border-[#96C0FF]"
              }`}
              type="button"
            >
              {isRecording ? (
                <div className="w-3 h-3 rounded-sm bg-red-500 md:w-5 md:h-5" />
              ) : (
                <img className="w-4 h-4 object-contain md:w-7.5 md:h-7.5" src={microphoneIcon} alt="" />
              )}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

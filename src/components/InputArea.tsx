import { useTextInput } from "../hooks/useTextInput";
import { useVoiceRecording } from "../hooks/useVoiceRecording";
import { useTestRecording } from "../hooks/useTestRecording";
import { useConfigStore } from "../store/configStore";
import { useChatStore } from "../store/chatStore";
import { useEffect, useState } from "react";
import { message } from "antd";
import microphoneIcon from "../assets/microphone.svg";
import endSpeechIcon from "../assets/end-speech.svg";
import sendIcon from "../assets/send.svg";
import { CONFIG } from "../config";



interface InputAreaProps {
  isConnected: boolean;
  isAuthenticated: boolean;
  onSendText: (text: string) => void;
  onStartASR: () => Promise<boolean>;
  onStopASR: () => Promise<void>;
}

export function InputArea({
  isConnected,
  isAuthenticated,
  onSendText,
  onStartASR,
  onStopASR,
}: InputAreaProps) {
  const isEnabled = isConnected && isAuthenticated;
  const allowActions = isEnabled || CONFIG.USE_MOCK;
  const { theme } = useConfigStore();
  const setASRResultHandler = useChatStore((state) => state.setASRResultHandler);
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");

  // 文本输入逻辑
  const {
    inputText,
    setInputText,
    handleSend,
    canSend,
  } = useTextInput({
    onSend: onSendText,
    enabled: true,
  });

  // 语音录制逻辑
  const { isRecording, startRecording, stopRecording } = useVoiceRecording({
    onStartRecording: onStartASR,
    onStopRecording: onStopASR,
    enabled: allowActions,
  });

  // 测试录音（仅 USE_MOCK 时显示）
  const { isRecording: isTestRecording, toggleRecording: toggleTestRecording } = useTestRecording();

  useEffect(() => {
    setASRResultHandler((text) => {
      setInputText(text);
      setInputMode("text");
    });
  }, [setASRResultHandler, setInputText]);

  const handleEnterVoiceMode = async () => {
    if (!allowActions) {
      message.warning("连接未建立，无法录音");
      return;
    }
    setInputMode("voice");
    if (!CONFIG.USE_MOCK) {
      await startRecording();
    }
  };

  const handleSendClick = async () => {
    if (!allowActions) {
      message.warning("连接未建立，无法发送");
      return;
    }
    await handleSend();
  };

  const handleKeyPressGuard = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendClick();
    }
  };

  const handleStopRecording = async () => {
    if (isRecording) {
      await stopRecording();
    }
    setInputMode("text");
  };

  const waveHeights = [12, 18, 26, 34, 28, 20, 14, 24, 30, 18, 26, 34, 20, 28, 12, 22, 30, 16, 24, 32];

  return (
    <div className={`px-4 pb-4 pt-2 h-18 mb-16 mx-4 md:px-8 md:pb-8 md:pt-4 md:h-44 md:mb-24 md:mx-40`}>
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
          className={`w-full h-18 rounded-[20px] pl-6 pr-8 pt-2 flex items-start md:h-44 md:pl-11 md:pr-23 md:pt-3 ${
            theme === "light"
              ? "bg-[rgba(255,255,255,0.3)] border-2 border-white drop-shadow-[0_0_30px_rgba(0,0,0,0.02)] backdrop-blur-[10px]"
              : "bg-gray-800/50 border border-gray-700 backdrop-blur-sm"
          }`}
        >

        
      {inputMode === "text" ? (
        <>
        <textarea
            className={`flex-1 h-full bg-transparent outline-none text-[11px] sm:text-[15px] resize-none pt-1 ${
              theme === "light"
                ? "text-gray-700 placeholder-gray-400"
                : "text-gray-100 placeholder-gray-400"
            }`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPressGuard}
            placeholder="输入文字发送或点击麦克风对话..."
          />
          <div className="flex items-center h-full gap-4 pt-1 md:gap-9">
            <button
              onClick={handleEnterVoiceMode}
              className={`w-[30px] h-[30px] hover:cursor-pointer hover:scale-110 border md:border-[3px] border-solid border-[#96C0FF] flex items-center justify-center rounded-full duration-200 transition-all md:w-18 md:h-18  ${
                theme === "light"
                  ? "text-gray-500 hover:cursor-pointer"
                  : "text-gray-400 hover:cursor-pointer"
              }`}
              type="button"
            >
              <img className="w-4 h-4 object-contain md:w-7.5 md:h-7.5" src={microphoneIcon} alt="" />
            </button>
            <button
              onClick={handleSendClick}
              className={`w-[30px] h-[30px] hover:cursor-pointer hover:scale-110 flex items-center justify-center rounded-full transition-all duration-200 shadow-[0px_13.5px_18px_-4.5px_rgba(28,25,23,0.08),0px_4.5px_6.75px_-2.25px_rgba(28,25,23,0.03)] md:w-18 md:h-18 ${
                canSend
                  ?  "text-white bg-[linear-gradient(303.86deg,#8686FF_6.61%,#96C0FF_93.39%)]"
                  : theme === "light"
                  ? "bg-gray-200 text-gray-400"
                  : "bg-gray-600 text-gray-500"
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
            {waveHeights.map((height, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full ${theme === "light" ? "bg-blue-500" : "bg-blue-300"} ${
                  isRecording || (CONFIG.USE_MOCK && inputMode === "voice") ? "voice-wave-bar" : ""
                }`}
                style={{
                  height: `${height}px`,
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
          <button
            onClick={handleStopRecording}
            className={`hover:cursor-pointer hover:scale-105 w-[30px] h-[30px] bg-[linear-gradient(303.86deg,#8686FF_6.61%,#96C0FF_93.39%)] flex items-center justify-center rounded-full transition-all duration-200 shadow-[0px_13.5px_18px_-4.5px_rgba(28,25,23,0.08),0px_4.5px_6.75px_-2.25px_rgba(28,25,23,0.03)]
          md:w-18 md:h-18`}
            type="button"
          >
            <img className="w-4 h-4 object-contain md:w-7.5 md:h-7.5" src={endSpeechIcon} alt="" />
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

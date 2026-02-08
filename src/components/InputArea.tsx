import { useTextInput } from "../hooks/useTextInput";
import { useVoiceRecording } from "../hooks/useVoiceRecording";
import { useState } from "react";
import { AudioOutlined, SendOutlined, EditOutlined } from "@ant-design/icons";

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
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');

  // 文本输入逻辑
  const {
    inputText,
    setInputText,
    handleSend,
    handleKeyPress,
    canSend,
  } = useTextInput({
    onSend: onSendText,
    enabled: isEnabled,
  });

  // 语音录制逻辑
  const { isRecording, toggleRecording } = useVoiceRecording({
    onStartRecording: onStartASR,
    onStopRecording: onStopASR,
    enabled: isEnabled,
  });

  // 切换模式处理
  const handleToggleMode = () => {
    if (inputMode === 'text') {
      setInputMode('voice');
    } else {
      // 如果正在录音，先停止
      if (isRecording) {
        toggleRecording();
      }
      setInputMode('text');
    }
  };

  return (
    <div className="px-8 pb-8 pt-4 bg-white/50 backdrop-blur-sm">
      {inputMode === 'text' ? (
        <div className="relative flex items-center gap-3">
            <div className="flex-1 relative">
                <input
                    type="text"
                    className="w-full h-14 pl-6 pr-14 bg-white rounded-full border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 placeholder-gray-400 text-[15px]"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="输入文字发送或点击麦克风对话..."
                    disabled={!isEnabled}
                />
                {/* 语音切换按钮 - 在输入框右侧内部 */}
                <button
                    onClick={handleToggleMode}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                >
                    <AudioOutlined className="text-xl" />
                </button>
            </div>
          
          {/* 发送按钮 */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-200 ${
                canSend 
                ? "bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg hover:scale-105" 
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <SendOutlined className="text-xl" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4 bg-white rounded-[30px] border border-gray-100 shadow-sm relative overflow-hidden">
            {/* 顶部文字 */}
            <div className="text-sm text-gray-500 mb-6 font-medium tracking-wide">
                {isRecording ? "正在讲话..." : "点击开始说话"}
            </div>

            {/* 波形动画区域 */}
            <div className="h-16 flex items-center justify-center gap-1.5 mb-6">
                {isRecording ? (
                    // 模拟波形动画
                    Array.from({ length: 20 }).map((_, i) => (
                        <div 
                            key={i} 
                            className="w-1.5 bg-blue-500 rounded-full animate-pulse"
                            style={{
                                height: `${Math.random() * 20 + 10}px`,
                                opacity: Math.random() * 0.5 + 0.5,
                                animationDuration: `${Math.random() * 0.5 + 0.5}s`
                            }}
                        />
                    ))
                ) : (
                    // 静止状态
                    <div className="w-full h-[1px] bg-gray-200 w-64" />
                )}
            </div>

            {/* 底部按钮组 */}
            <div className="flex items-center gap-8">
                 {/* 切换回文字 */}
                <button
                    onClick={handleToggleMode}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    title="切换到文字输入"
                >
                    <EditOutlined />
                </button>

                {/* 录音控制主按钮 */}
                <button
                    onClick={toggleRecording}
                    className={`w-16 h-16 flex items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
                        isRecording 
                        ? "bg-red-500 text-white hover:bg-red-600 scale-110 ring-4 ring-red-100" 
                        : "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105"
                    }`}
                >
                    <AudioOutlined className="text-2xl" />
                </button>

                 {/* 占位，保持平衡，或者放置其他功能 */}
                <div className="w-10 h-10" />
            </div>
        </div>
      )}
    </div>
  );
}

import { useTextInput } from "../hooks/useTextInput";
import { useVoiceRecording } from "../hooks/useVoiceRecording";

interface InputAreaProps {
  isConnected: boolean;
  isAuthenticated: boolean;
  onSendText: (text: string) => void;
  onStartASR: () => Promise<boolean>;
  onStopASR: () => Promise<void>;
  onClearMessages: () => void;
}

export function InputArea({
  isConnected,
  isAuthenticated,
  onSendText,
  onStartASR,
  onStopASR,
  onClearMessages,
}: InputAreaProps) {
  const isEnabled = isConnected && isAuthenticated;

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

  return (
    <div className="p-5 bg-white border-t border-gray-200">
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2.5">
          <textarea
            className="flex-1 px-3 py-3 border border-gray-300 rounded text-sm font-inherit resize-y min-h-[60px] disabled:bg-gray-100 disabled:text-gray-500"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            disabled={!isEnabled}
            rows={3}
          />
          <button
            onClick={toggleRecording}
            disabled={!isEnabled}
            className={`px-4 py-2 rounded text-sm cursor-pointer transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed ${
              isRecording
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
            title={isRecording ? "停止录音" : "开始录音"}
          >
            {isRecording ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
        <div className="flex gap-2.5 justify-end">
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="px-4 py-2 bg-blue-600 text-white border-none rounded text-sm cursor-pointer transition-colors duration-200 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            发送
          </button>
          <button
            onClick={onClearMessages}
            className="px-4 py-2 bg-gray-600 text-white border-none rounded text-sm cursor-pointer transition-colors duration-200 hover:bg-gray-700"
          >
            清空消息
          </button>
        </div>
      </div>
    </div>
  );
}

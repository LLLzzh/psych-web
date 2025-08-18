import { useState } from "react";
import { useChat } from "./hooks/useChat";

export default function App() {
  // echo.websocket.events 是一个公开的 echo WebSocket 测试服务
  const { messages, sendText } = useChat("wss://echo.websocket.events","demo_user","demo_token");
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim()) {
      sendText(input);
      setInput("");
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">WebSocket Demo</h1>
      <div className="border p-2 h-64 overflow-y-auto mb-2 rounded">
        {messages.map((m, idx) => (
          <div key={idx} className="mb-1">
            <span className="font-mono text-gray-500 text-sm mr-2">
              [{m.Timestamp}]
            </span>
            <span>{m.Payload as string}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border flex-1 p-2 rounded"
          placeholder="输入消息"
        />
        <button
          onClick={handleSend}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          发送
        </button>
      </div>
    </div>
  );
}
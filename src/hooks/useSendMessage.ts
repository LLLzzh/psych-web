import { useCallback } from "react";
import { useChatStore } from "../store/chatStore";

interface UseSendMessageOptions {
  sendText: (text: string) => Promise<void>;
}

export function useSendMessage({ sendText }: UseSendMessageOptions) {
  const { addMessage } = useChatStore();

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        return;
      }

      // 发送消息到服务器
      await sendText(text);

      // 添加到本地消息列表
      addMessage({
        id: Date.now().toString(),
        type: "user",
        content: text,
        timestamp: Date.now(),
      });
    },
    [sendText, addMessage]
  );

  return {
    sendMessage,
  };
}

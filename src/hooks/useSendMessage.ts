import { useCallback } from "react";
import { useChatStore } from "../store/chatStore";
import { CONFIG } from "../config";

const mockReplies = [
  "我明白你的感受，可以多说一点吗？",
  "听起来你最近压力有点大，我们可以一起梳理一下。",
  "如果愿意，可以描述一下让你最困扰的部分。",
  "谢谢你愿意分享，我们可以从最重要的一点开始。",
];

const requestMockReply = async (input: string) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const index = Math.abs(input.length) % mockReplies.length;
  return mockReplies[index];
};

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

      if (CONFIG.USE_MOCK) {
        addMessage({
          id: Date.now().toString(),
          type: "user",
          content: text,
          timestamp: Date.now(),
        });
        const reply = await requestMockReply(text);
        addMessage({
          id: `assistant-${Date.now()}`,
          type: "assistant",
          content: reply,
          timestamp: Date.now(),
        });
        return;
      }

      await sendText(text);
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

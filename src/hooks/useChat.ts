import { useEffect, useRef, useState } from "react";
import { Engine } from "../engine/Engine";
import { encodeMessage, decodeMessage, type Message } from "../protocol/message";
import { useConfigStore } from "../store/configStore";
import { buildAuthMessage } from "../protocol/auth";

export function useChat(url: string, userId: string, token: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const engineRef = useRef<Engine | null>(null);
  const setConfig = useConfigStore((state) => state.setConfig);

  useEffect(() => {
    const engine = new Engine(url);
    engineRef.current = engine;

    engine.emitter.on("open", () => {
      console.log("WebSocket 已连接");
      const authMsg = buildAuthMessage(userId, token);
      engine.sendText(new TextDecoder().decode(authMsg));
    });

    engine.emitter.on("text", (txt) => {
      try {
        const msg = JSON.parse(txt) as Message;
        if (msg.Type === "Config") {
          console.log("Config", msg.Payload);
          setConfig(msg.Payload);
        }
        else if (msg.Type === "Text") {
          console.log("Text", msg.Payload);
          setMessages((prev) => [...prev, msg]);
        }
      } catch (error) {
        console.warn("Failed to parse text message as JSON:", error);
        // 如果不是JSON格式，直接显示原始文本
        setMessages((prev) => [...prev, {
          Type: "Text",
          Payload: txt,
          Timestamp: Math.floor(Date.now() / 1000),
        }]);
      }
    });

    engine.emitter.on("binary", (buffer) => {
      try {
        const msg = decodeMessage(buffer);
        if (msg) {
          if (msg.Type === "Config") {
            console.log("Config (binary)", msg.Payload);
            setConfig(msg.Payload);
          }
          else if (msg.Type === "Text") {
            console.log("Text (binary)", msg.Payload);
            setMessages((prev) => [...prev, msg]);
          }
        } else {
          console.warn("Failed to decode binary message");
        }
      } catch (error) {
        console.error("Error processing binary message:", error);
      }
    });

    engine.connect();

    return () => engine.close();
  }, [url, userId, token, setConfig]);

  const sendText = (text: string) => {
    const encoded = encodeMessage({
      Type: "Text",
      Payload: text,
      Timestamp: Math.floor(Date.now() / 1000),
    });
    engineRef.current?.sendText(encoded);
  };

  return { messages, sendText };
}
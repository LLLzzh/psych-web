import { useState, useCallback } from "react";

interface UseTextInputOptions {
  onSend: (text: string) => void | Promise<void>;
  enabled?: boolean;
}

export function useTextInput({ onSend, enabled = true }: UseTextInputOptions) {
  const [inputText, setInputText] = useState("");

  const handleSend = useCallback(async () => {
    if (!enabled || !inputText.trim()) {
      return;
    }

    await onSend(inputText.trim());
    setInputText("");
  }, [inputText, onSend, enabled]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleChange = useCallback((value: string) => {
    setInputText(value);
  }, []);

  const clearInput = useCallback(() => {
    setInputText("");
  }, []);

  return {
    inputText,
    setInputText: handleChange,
    handleSend,
    handleKeyPress,
    clearInput,
    canSend: enabled && inputText.trim().length > 0,
  };
}

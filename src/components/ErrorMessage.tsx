import { message as antMessage } from "antd";
import { useEffect } from "react";

interface ErrorMessageProps {
  message: string;
  onClose: () => void;
}

export function ErrorMessage({ message, onClose }: ErrorMessageProps) {
  useEffect(() => {
    antMessage.error({
      content: message,
      key: "global-error",
      onClose,
    });
  }, [message, onClose]);

  return null;
}

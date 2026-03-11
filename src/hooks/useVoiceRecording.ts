import { useState, useCallback, useEffect } from "react";

interface UseVoiceRecordingOptions {
  onStartRecording: () => Promise<boolean>;
  onStopRecording: () => Promise<void>;
  getRecordingState?: () => boolean;
  enabled?: boolean;
}

export function useVoiceRecording({
  onStartRecording,
  onStopRecording,
  getRecordingState,
  enabled = true,
}: UseVoiceRecordingOptions) {
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(async () => {
    if (!enabled || isRecording) {
      return false;
    }

    const success = await onStartRecording();
    if (success) {
      setIsRecording(true);
    }
    return success;
  }, [enabled, isRecording, onStartRecording]);

  const stopRecording = useCallback(async () => {
    if (!isRecording) {
      return;
    }

    await onStopRecording();
    setIsRecording(false);
  }, [isRecording, onStopRecording]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  useEffect(() => {
    if (!isRecording || !getRecordingState) {
      return;
    }

    const timer = window.setInterval(() => {
      if (!getRecordingState()) {
        setIsRecording(false);
      }
    }, 200);

    return () => {
      window.clearInterval(timer);
    };
  }, [getRecordingState, isRecording]);

  useEffect(() => {
    if (!enabled || !isRecording) {
      return;
    }
    void stopRecording();
  }, [enabled, isRecording, stopRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    toggleRecording,
    canRecord: enabled,
  };
}

import { useCallback, useEffect, useState } from "react";

export type DeviceLayoutMode = "auto" | "mobile" | "desktop";
export type EffectiveDeviceLayout = "mobile" | "desktop";

const STORAGE_KEY = "xhpolaris-device-layout-mode";
const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";
const MODES: DeviceLayoutMode[] = ["auto", "mobile", "desktop"];

function isDeviceLayoutMode(value: string | null): value is DeviceLayoutMode {
  return value === "auto" || value === "mobile" || value === "desktop";
}

function getStoredMode(): DeviceLayoutMode {
  if (typeof window === "undefined") {
    return "auto";
  }

  const storedMode = window.localStorage.getItem(STORAGE_KEY);
  return isDeviceLayoutMode(storedMode) ? storedMode : "auto";
}

function isDesktopViewport() {
  return typeof window !== "undefined"
    ? window.matchMedia(DESKTOP_MEDIA_QUERY).matches
    : true;
}

function persistMode(mode: DeviceLayoutMode) {
  if (mode === "auto") {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, mode);
}

export function useDeviceLayoutOverride() {
  const [mode, setMode] = useState<DeviceLayoutMode>(getStoredMode);
  const [isViewportDesktop, setIsViewportDesktop] = useState(isDesktopViewport);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const handleChange = () => setIsViewportDesktop(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      setMode(isDeviceLayoutMode(event.newValue) ? event.newValue : "auto");
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const cycleMode = useCallback(() => {
    const currentIndex = MODES.indexOf(mode);
    const nextMode = MODES[(currentIndex + 1) % MODES.length];
    persistMode(nextMode);
    setMode(nextMode);
    return nextMode;
  }, [mode]);

  const effectiveLayout: EffectiveDeviceLayout =
    mode === "auto" ? (isViewportDesktop ? "desktop" : "mobile") : mode;

  return {
    mode,
    effectiveLayout,
    isDesktopLayout: effectiveLayout === "desktop",
    isMobileLayout: effectiveLayout === "mobile",
    cycleMode,
  };
}

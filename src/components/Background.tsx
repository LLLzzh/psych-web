import { useConfigStore } from "../store/configStore";
import defaultBackgroundImage from "../assets/background1.jpg";
import defaultBackgroundImageAlt from "../assets/background2.jpg";
import defaultMobileBackground from "../assets/mobile-bg.jpg";

type ThemeMode = "light" | "dark";

function getMobileOnlyClass(isDesktopLayout?: boolean) {
  if (isDesktopLayout === undefined) return "md:hidden";
  return isDesktopLayout ? "hidden" : "";
}

function getDesktopOnlyClass(isDesktopLayout?: boolean) {
  if (isDesktopLayout === undefined) return "hidden md:block";
  return isDesktopLayout ? "block" : "hidden";
}

function GradientGlow({
  dark = false,
  isDesktopLayout,
}: {
  dark?: boolean;
  isDesktopLayout?: boolean;
}) {
  return (
    <div
      className={`pointer-events-none absolute right-0 bottom-0 w-[52rem] h-[36rem] rounded-full blur-3xl ${getDesktopOnlyClass(isDesktopLayout)} ${
        dark ? "opacity-75" : "opacity-40"
      }`}
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(150,192,255,0.55) 0%, rgba(134,134,255,0.35) 42%, rgba(134,134,255,0.12) 68%, rgba(134,134,255,0) 100%)",
      }}
      aria-hidden="true"
    />
  );
}

interface BackgroundProps {
  themeOverride?: ThemeMode;
  hideDarkOverlay?: boolean;
  mobileOnly?: boolean;
  mobileLightOnly?: boolean;
  isDesktopLayout?: boolean;
}

export function Background({
  themeOverride,
  hideDarkOverlay = false,
  mobileOnly = false,
  mobileLightOnly = false,
  isDesktopLayout,
}: BackgroundProps) {
  const { theme, backgroundImage: customBg } = useConfigStore();

  const effectiveTheme = themeOverride ?? theme;
  const isLight = effectiveTheme === "light";

  const backgroundImage = customBg || defaultBackgroundImage;
  const backgroundImageAlt = customBg || defaultBackgroundImageAlt;
  const mobileBackground = customBg || defaultMobileBackground;
  const mobileOnlyClass = getMobileOnlyClass(isDesktopLayout);
  const desktopOnlyClass = getDesktopOnlyClass(isDesktopLayout);

  if (mobileLightOnly) {
    return (
      <div className="absolute inset-0" aria-hidden="true">
        <div
          className={`absolute inset-0 bg-center bg-cover bg-no-repeat ${mobileOnlyClass}`}
          style={{ backgroundImage: `url(${mobileBackground})` }}
        />
        {isLight ? (
          <>
            <div className={`absolute inset-0 ${desktopOnlyClass} bg-[linear-gradient(63.63deg,#FAFCFF_66.08%,rgba(250,252,255,0.01)_87.44%,#FAFCFF_97.55%)]`} />
            <GradientGlow isDesktopLayout={isDesktopLayout} />
          </>
        ) : (
          <>
            <div
              className={`absolute inset-0 bg-center bg-no-repeat bg-cover background-rotate-1 ${desktopOnlyClass}`}
              style={{ backgroundImage: `url(${backgroundImage})` }}
            />
            <div
              className={`absolute inset-0 bg-center bg-no-repeat bg-cover background-rotate-2 ${desktopOnlyClass}`}
              style={{ backgroundImage: `url(${backgroundImageAlt})` }}
            />
            <GradientGlow dark isDesktopLayout={isDesktopLayout} />
            {!hideDarkOverlay && (
              <div className={`absolute inset-0 bg-[rgba(105,105,105,0.6)] backdrop-blur-[2px] ${desktopOnlyClass}`} />
            )}
          </>
        )}
      </div>
    );
  }

  if (mobileOnly) {
    if (isLight) {
      return (
        <div className="absolute inset-0" aria-hidden="true">
          <div
            className="absolute inset-0 bg-center bg-cover bg-no-repeat"
            style={{ backgroundImage: `url(${mobileBackground})` }}
          />
        </div>
      );
    }
    return (
      <div className="absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-cover background-rotate-1"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-cover background-rotate-2"
          style={{ backgroundImage: `url(${backgroundImageAlt})` }}
        />
      </div>
    );
  }

  if (isLight) {
    return (
      <div className="absolute inset-0" aria-hidden="true">
        <div
          className={`absolute inset-0 bg-center bg-cover bg-no-repeat ${mobileOnlyClass}`}
          style={{ backgroundImage: `url(${mobileBackground})` }}
        />
        <div className={`absolute inset-0 ${desktopOnlyClass} bg-[linear-gradient(63.63deg,#FAFCFF_66.08%,rgba(250,252,255,0.01)_87.44%,#FAFCFF_97.55%)]`} />
        <GradientGlow isDesktopLayout={isDesktopLayout} />
      </div>
    );
  }

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div
        className={`absolute inset-0 bg-center bg-cover bg-no-repeat ${mobileOnlyClass}`}
        style={{ backgroundImage: `url(${mobileBackground})` }}
      />
      <div
        className={`absolute inset-0 bg-center bg-no-repeat bg-cover background-rotate-1 ${desktopOnlyClass}`}
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div
        className={`absolute inset-0 bg-center bg-no-repeat bg-cover background-rotate-2 ${desktopOnlyClass}`}
        style={{ backgroundImage: `url(${backgroundImageAlt})` }}
      />
      <GradientGlow dark isDesktopLayout={isDesktopLayout} />
      {!hideDarkOverlay && (
        <div className={`absolute inset-0 bg-[rgba(105,105,105,0.6)] backdrop-blur-[2px] ${desktopOnlyClass}`} />
      )}
    </div>
  );
}

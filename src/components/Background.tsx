import { useConfigStore } from "../store/configStore";
import backgroundImage from "../assets/background1.jpg";
import backgroundImageAlt from "../assets/background2.jpg";
import mobileBackground from "../assets/mobile-bg.jpg";

type ThemeMode = "light" | "dark";

function GradientGlow({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute right-0 bottom-0 w-[52rem] h-[36rem] rounded-full blur-3xl hidden md:block ${
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
}

export function Background({
  themeOverride,
  hideDarkOverlay = false,
  mobileOnly = false,
  mobileLightOnly = false,
}: BackgroundProps) {
  const { theme } = useConfigStore();

  const effectiveTheme = themeOverride ?? theme;
  const isLight = effectiveTheme === "light";

  if (mobileLightOnly) {
    return (
      <div className="absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0 bg-center bg-cover bg-no-repeat md:hidden"
          style={{ backgroundImage: `url(${mobileBackground})` }}
        />
        {isLight ? (
          <>
            <div className="absolute inset-0 hidden md:block bg-[linear-gradient(63.63deg,#FAFCFF_66.08%,rgba(250,252,255,0.01)_87.44%,#FAFCFF_97.55%)]" />
            <GradientGlow />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0 bg-center bg-no-repeat bg-cover background-rotate-1 hidden md:block"
              style={{ backgroundImage: `url(${backgroundImage})` }}
            />
            <div
              className="absolute inset-0 bg-center bg-no-repeat bg-cover background-rotate-2 hidden md:block"
              style={{ backgroundImage: `url(${backgroundImageAlt})` }}
            />
            <GradientGlow dark />
            {!hideDarkOverlay && (
              <div className="absolute inset-0 bg-[rgba(105,105,105,0.6)] backdrop-blur-[2px] hidden md:block" />
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
          className="absolute inset-0 bg-center bg-cover bg-no-repeat md:hidden"
          style={{ backgroundImage: `url(${mobileBackground})` }}
        />
        <div className="absolute inset-0 hidden md:block bg-[linear-gradient(63.63deg,#FAFCFF_66.08%,rgba(250,252,255,0.01)_87.44%,#FAFCFF_97.55%)]" />
        <GradientGlow />
      </div>
    );
  }

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div
        className="absolute inset-0 bg-center bg-cover bg-no-repeat md:hidden"
        style={{ backgroundImage: `url(${mobileBackground})` }}
      />
      <div
        className="absolute inset-0 bg-center bg-no-repeat bg-cover background-rotate-1 hidden md:block"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div
        className="absolute inset-0 bg-center bg-no-repeat bg-cover background-rotate-2 hidden md:block"
        style={{ backgroundImage: `url(${backgroundImageAlt})` }}
      />
      <GradientGlow dark />
      {!hideDarkOverlay && (
        <div className="absolute inset-0 bg-[rgba(105,105,105,0.6)] backdrop-blur-[2px] hidden md:block" />
      )}
    </div>
  );
}

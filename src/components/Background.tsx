import { useConfigStore } from "../store/configStore";
import backgroundImage from "../assets/background1.png";
import backgroundImageAlt from "../assets/background2.png";
import backgroundGradient from "../assets/background.png";

type ThemeMode = "light" | "dark";

interface BackgroundProps {
  themeOverride?: ThemeMode;
}

export function Background({ themeOverride }: BackgroundProps) {
  const { theme } = useConfigStore();

  const isLight = (themeOverride ?? theme) === "light";

  if (isLight) {
    return (
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(63.63deg,#FAFCFF_66.08%,rgba(250,252,255,0.01)_87.44%,#FAFCFF_97.55%)]" />
        <img
          src={backgroundGradient}
          alt=""
          className="absolute right-61 w-262 bottom-0 pointer-events-none select-none opacity-33"
          aria-hidden="true"
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
      <img
        src={backgroundGradient}
        alt=""
        className="absolute right-61 w-262 bottom-0 pointer-events-none select-none opacity-60"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[rgba(105,105,105,0.4)] backdrop-blur-[1px]" />
    </div>
  );
}

import endIcon from "../assets/end.svg";
import recordsLightIcon from "../assets/records-light.svg";
import recordsDarkIcon from "../assets/records-dark.svg";

type ButtonTheme = "light" | "dark";
type ButtonVariant = "red" | "gray";

interface SidebarActionButtonProps {
  collapsed: boolean;
  label: string;
  onClick?: () => void;
  className: string;
  theme: ButtonTheme;
  variant: ButtonVariant;
}

export function SidebarActionButton({
  collapsed,
  label,
  onClick,
  className,
  theme,
  variant,
}: SidebarActionButtonProps) {
  const iconSrc = variant === "red" ? endIcon : theme === "light" ? recordsLightIcon : recordsDarkIcon;
  const themeClassName =
    variant === "red"
      ? theme === "light"
        ? "bg-[#FAA3A5] text-white hover:bg-[#F5BABA]"
        : "bg-[linear-gradient(90deg,#96C0FF_16.35%,#6843EC_100%)] text-white hover:opacity-90"
      : theme === "light"
      ? "bg-[#F6F6F6] text-[#3B3B53] hover:bg-gray-200"
      : "bg-[linear-gradient(90deg,#96C0FF_16.35%,#6843EC_100%)] text-white hover:opacity-90";


  return (
    <button onClick={onClick} className={`hover:scale-105 mx-3 flex items-center justify-center py-3 rounded-full transition-all duration-200 ${className} ${themeClassName}`} type="button">
        <div className="flex mx-auto gap-2">
          <img src={iconSrc} alt={label} className={`w-6 h-6`} />
      {!collapsed && <span className="text-l">{label}</span>}
        </div>
        
    </button>
  );
}

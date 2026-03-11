import logo from "../assets/logo.png";
import logoDark from "../assets/logo-dark.png";
import sidebarIcon from "../assets/sidebar.png";
import sidebarDarkIcon from "../assets/sidebar-dark.png";

type ThemeMode = "light" | "dark";

interface SidebarDesktopHeaderProps {
  collapsed: boolean;
  theme: ThemeMode;
  onLogout: () => void;
}

export function SidebarDesktopHeader({
  collapsed,
  theme,
  onLogout,
}: SidebarDesktopHeaderProps) {
  return collapsed ? (
    <div className="flex items-center justify-between md:flex-col md:items-center gap-3">
      <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
        <img src={theme === "light" ? logo : logoDark} alt="花狮心理logo" className="w-6 h-6 object-contain" />
      </div>
      <button
        onClick={onLogout}
        className={`p-2 rounded-full transition-colors ${
          theme === "light"
            ? "bg-[#DBDBDB] shadow-[0px_13.5px_18px_-4.5px_rgba(28,25,23,0.08),0px_4.5px_6.75px_-2.25px_rgba(28,25,23,0.03)] hover:bg-[#D3D3D3]"
            : "bg-[rgba(0,0,0,0.3)] shadow-[0px_13.5px_18px_-4.5px_rgba(28,25,23,0.08),0px_4.5px_6.75px_-2.25px_rgba(28,25,23,0.03)] hover:bg-[rgba(0,0,0,0.6)]"
        }`}
        title="退出登录"
        type="button"
      >
        <img
          src={theme === "light" ? sidebarIcon : sidebarDarkIcon}
          alt="退出登录"
          className="w-4 h-4 object-contain"
        />
      </button>
    </div>
  ) : (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full  flex items-center justify-center overflow-hidden">
          <img src={theme === "light" ? logo : logoDark} alt="花狮心理logo" className="w-full h-full object-contain" />
        </div>
        <div className={`text-[27px]  tracking-wide whitespace-nowrap ${theme === "light" ? "text-black" : "text-white"}`}>
          花狮心理
        </div>
      </div>
      <button
        onClick={onLogout}
        className={`p-3 rounded-full transition-colors ${
          theme === "light"
            ? "bg-[#DBDBDB] shadow-[0px_13.5px_18px_-4.5px_rgba(28,25,23,0.08),0px_4.5px_6.75px_-2.25px_rgba(28,25,23,0.03)] hover:bg-[#D3D3D3]"
            : "bg-[rgba(0,0,0,0.3)] shadow-[0px_13.5px_18px_-4.5px_rgba(28,25,23,0.08),0px_4.5px_6.75px_-2.25px_rgba(28,25,23,0.03)] hover:bg-[rgba(0,0,0,0.6)]"
        }`}
        title="退出登录"
        type="button"
      >
        <img
          src={theme === "light" ? sidebarIcon : sidebarDarkIcon}
          alt="退出登录"
          className="w-6.5 h-6.5 object-contain"
        />
      </button>
    </div>
  );
}

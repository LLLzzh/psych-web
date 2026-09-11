import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import setting from "../assets/setting.png";
import settingDark from "../assets/setting-dark.svg";
import user from "../assets/user.svg";

type ThemeMode = "light" | "dark";

interface SidebarDesktopFooterProps {
  theme: ThemeMode;
  settingsMenuItems: MenuProps["items"];
  onSettingsClick: MenuProps["onClick"];
  userAvatar?: string;
  onEditProfile: () => void;
}

export function SidebarDesktopFooter({
  theme,
  settingsMenuItems,
  onSettingsClick,
  userAvatar,
  onEditProfile,
}: SidebarDesktopFooterProps) {
  return (
    <div className="mt-4 shrink-0 border-t border-solid border-[#C1C1C9] pb-4 pt-4 w-full">
      <div className="flex items-center justify-between">
        <Dropdown
          menu={{ items: settingsMenuItems, onClick: onSettingsClick }}
          trigger={["click"]}
          placement="topRight"
        >
          <button
            className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors ${
              theme === "light"
                ? "bg-[#DBDBDB] shadow-[0px_13.5px_18px_-4.5px_rgba(28,25,23,0.08),0px_4.5px_6.75px_-2.25px_rgba(28,25,23,0.03)] hover:bg-[#D3D3D3]"
                : "bg-[rgba(0,0,0,0.3)] shadow-[0px_13.5px_18px_-4.5px_rgba(28,25,23,0.08),0px_4.5px_6.75px_-2.25px_rgba(28,25,23,0.03)] hover:bg-[rgba(0,0,0,0.6)]"
            }`}
            title="设置"
            type="button"
          >
            <img src={theme === "light" ? setting : settingDark} alt="设置" className="w-6.5 h-6.5 object-contain" />
          </button>
        </Dropdown>
        <button type="button" onClick={onEditProfile} className="w-11 h-11 rounded-full overflow-hidden border-2 border-white/60 shadow-sm" title="编辑个人资料">
          <img src={userAvatar || user} alt="用户头像" className="w-full h-full object-cover block" />
        </button>
      </div>
    </div>
  );
}

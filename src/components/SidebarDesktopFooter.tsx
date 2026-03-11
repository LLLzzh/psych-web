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
}

export function SidebarDesktopFooter({
  theme,
  settingsMenuItems,
  onSettingsClick,
}: SidebarDesktopFooterProps) {
  return (
    <div className="mt-auto border-t border-solid border-[#C1C1C9] pb-12 w-full ">
      <div className="flex items-center justify-between mt-4">
        <Dropdown
          menu={{ items: settingsMenuItems, onClick: onSettingsClick }}
          trigger={["click"]}
          placement="topRight"
        >
          <button
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors ${
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
        <div className="w-12 h-12 rounded-full overflow-hidden">
          <img src={user} alt="用户头像" className="w-full h-full object-cover block" />
        </div>
      </div>
    </div>
  );
}

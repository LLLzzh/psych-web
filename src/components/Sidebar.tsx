import { useConfigStore } from "../store/configStore";
import { message } from "antd";
import type { MenuProps } from "antd";
import { SidebarMobileHeader } from "./SidebarMobileHeader";
import { SidebarDesktopHeader } from "./SidebarDesktopHeader";
import { SidebarDesktopContent } from "./SidebarDesktopContent";
import { SidebarDesktopFooter } from "./SidebarDesktopFooter";
interface SidebarProps {
  isConnected: boolean;
  isAuthenticated: boolean;
  onLogout: () => void;
  onEndConversation: () => void;
  onViewConversationRecords: () => void;
  onEnterVoiceMode: () => void;
  onClearMessages: () => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({
  onLogout,
  onEndConversation,
  onViewConversationRecords,
  onEnterVoiceMode,
  collapsed,
}: SidebarProps) {
  const { theme, toggleTheme } = useConfigStore();

  const handleLogout = () => {
    onLogout();
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    toggleTheme();
    message.success(nextTheme === "light" ? "已切换为浅色模式" : "已切换为深色模式");
  };

  const settingsMenuItems: MenuProps["items"] = [
    {
      key: "toggle-theme",
      label: theme === "light" ? "切换到深色模式" : "切换到浅色模式",
    },
  ];

  const handleSettingsClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "toggle-theme") {
      handleToggleTheme();
    }
  };

  return (
    <div className={`${collapsed ? "px-4" : "px-6"} h-16 w-full md:h-full ${theme === "light" ? "bg-[rgba(255,255,255,0.35)] shadow-[8px_0px_20px_rgba(233,241,252,0.6)]" : "bg-[rgba(0,0,0,0.4)]"} opacity-80 filter-[drop-shadow(0px_4px_5px_rgba(134,141,187,0.05))_drop-shadow(0px_0px_30px_rgba(0,0,0,0.02))] [backdrop-filter:blur(10px)] md:opacity-100 md:[filter:none] md:[backdrop-filter:none] rounded-b-[10px] md:rounded-bl-[0px]  md:rounded-tr-[20px] md:rounded-br-[20px] flex flex-row md:flex-col items-center py-2 md:pt-12 transition-all duration-300 ease-in-out ${
      collapsed
        ? "md:w-20"
        : "md:w-76"
    }`}>
      <div className="w-full h-full flex items-center justify-between md:flex-col md:items-stretch md:justify-start md:h-full ">
        <SidebarMobileHeader
          onEnterVoiceMode={onEnterVoiceMode}
          onEndConversation={onEndConversation}
          onViewConversationRecords={onViewConversationRecords}
          onLogout={handleLogout}
        />

        <div className="hidden md:block w-full md:shrink-0">
          <div className={`w-full mb-0 md:mb-6`}>
            <SidebarDesktopHeader
              collapsed={collapsed}
              theme={theme}
              onLogout={handleLogout}
            />
          </div>
        </div>

        {!collapsed && (
          <div className="hidden md:flex md:flex-col md:flex-1 w-full">
            <SidebarDesktopContent
              collapsed={collapsed}
              theme={theme}
              onEndConversation={onEndConversation}
              onViewConversationRecords={onViewConversationRecords}
            />
            <SidebarDesktopFooter
              theme={theme}
              settingsMenuItems={settingsMenuItems}
              onSettingsClick={handleSettingsClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}

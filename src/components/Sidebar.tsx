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
  canEndConversation: boolean;
  isConnecting: boolean;
  onLogout: () => void;
  onEndConversation: () => void;
  onViewConversationRecords: () => void;
  onEnterVoiceMode: () => void;
  onClearMessages: () => void;
  collapsed: boolean;
  onToggle: () => void;
  isDesktopLayout: boolean;
  userAvatar?: string;
  onEditProfile: () => void;
}

export function Sidebar({
  canEndConversation,
  isConnecting,
  onLogout,
  onEndConversation,
  onViewConversationRecords,
  onEnterVoiceMode,
  collapsed,
  isDesktopLayout,
  userAvatar,
  onEditProfile,
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

  const layoutClassName = isDesktopLayout
    ? `h-full min-h-0 opacity-100 [filter:none] [backdrop-filter:none] rounded-bl-[0px] rounded-tr-[20px] rounded-br-[20px] flex-col items-center pt-[clamp(1rem,4vh,3rem)] pb-2 ${
        collapsed ? "w-20" : "w-76"
      }`
    : "h-16 w-full opacity-80 filter-[drop-shadow(0px_4px_5px_rgba(134,141,187,0.05))_drop-shadow(0px_0px_30px_rgba(0,0,0,0.02))] [backdrop-filter:blur(10px)] rounded-b-[10px] flex-row items-center py-2";

  return (
    <div className={`${collapsed ? "px-4" : "px-6"} ${layoutClassName} ${theme === "light" ? "bg-[rgba(255,255,255,0.35)] shadow-[8px_0px_20px_rgba(233,241,252,0.6)]" : "bg-[rgba(0,0,0,0.4)]"} flex transition-all duration-300 ease-in-out`}>
      <div
        className={`w-full h-full flex ${
          isDesktopLayout
            ? "flex-col items-stretch justify-start"
            : "items-center justify-between"
        }`}
      >
        {!isDesktopLayout && (
          <SidebarMobileHeader
            onEnterVoiceMode={onEnterVoiceMode}
            canEndConversation={canEndConversation}
            isConnecting={isConnecting}
            onEndConversation={onEndConversation}
            onViewConversationRecords={onViewConversationRecords}
            userAvatar={userAvatar}
            onEditProfile={onEditProfile}
          />
        )}

        {isDesktopLayout && (
          <>
            <div className="w-full shrink-0">
              <div className="w-full mb-6">
                <SidebarDesktopHeader
                  collapsed={collapsed}
                  theme={theme}
                  onLogout={handleLogout}
                />
              </div>
            </div>

            {!collapsed && (
              <div className="flex flex-col flex-1 w-full">
                <SidebarDesktopContent
                  collapsed={collapsed}
                  theme={theme}
                  canEndConversation={canEndConversation}
                  onEndConversation={onEndConversation}
                  onViewConversationRecords={onViewConversationRecords}
                />
                <SidebarDesktopFooter
                  theme={theme}
                  settingsMenuItems={settingsMenuItems}
                  onSettingsClick={handleSettingsClick}
                  userAvatar={userAvatar}
                  onEditProfile={onEditProfile}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

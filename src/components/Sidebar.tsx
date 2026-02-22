import logo from "../assets/logo.png";
import logoDark from "../assets/logo-dark.png";
import sidebarIcon from "../assets/sidebar.png";
import sidebarDarkIcon from "../assets/sidebar-dark.png";
import teacherImage from "../assets/teacher.png";
import { SidebarActionButton } from "./SidebarActionButton";
import { useConfigStore } from "../store/configStore";
import setting from "../assets/setting.svg";
import settingDark from "../assets/setting-dark.svg";
import user from "../assets/user.svg";
import switchIcon from "../assets/switch.svg";
import conversationsIcon from "../assets/conversations.svg";
import { Dropdown, message } from "antd";
import type { MenuProps } from "antd";
interface SidebarProps {
  isConnected: boolean;
  isAuthenticated: boolean;
  onLogout: () => void;
  onClearMessages: () => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({
  onLogout,
  collapsed,
  onToggle,
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
    <div className={`${collapsed ? "px-4" : "px-6"} h-16 w-full md:h-full ${theme === "light" ? "bg-[rgba(255,255,255,0.35)] shadow-[8px_0px_20px_rgba(233,241,252,0.6)]" : "bg-[rgba(0,0,0,0.4)]"} opacity-80 [filter:drop-shadow(0px_4px_5px_rgba(134,141,187,0.05))_drop-shadow(0px_0px_30px_rgba(0,0,0,0.02))] [backdrop-filter:blur(10px)] [transform:matrix(1,0,0,-1,0,0)] md:opacity-100 md:[filter:none] md:[backdrop-filter:none] md:[transform:none] rounded-t-[10px] md:rounded-[20px] md:rounded-tr-[20px] md:rounded-br-[20px] flex flex-row md:flex-col items-center py-2 md:pt-12 transition-all duration-300 ease-in-out ${
      collapsed
        ? "md:w-20"
        : "md:w-76"
    }`}>
      <div className="w-full h-full flex items-center justify-between md:flex-col md:items-stretch md:justify-start md:h-full transform-[matrix(1,0,0,-1,0,0)] md:transform:none">
        <div className="w-full flex items-center justify-between md:hidden">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.2)]"
            >
              <img src={conversationsIcon} alt="对话记录" className="w-5 h-5 object-contain" />
            </button>
            <button
              type="button"
              onClick={handleToggleTheme}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.2)]"
            >
              <img src={switchIcon} alt="切换主题" className="w-5 h-5 object-contain" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 h-10 rounded-full text-[12px] text-white bg-[rgba(0,0,0,0.25)]"
            >
              退出
            </button>
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <img src={user} alt="用户头像" className="w-full h-full object-cover block" />
            </div>
          </div>
        </div>

        <div className="hidden md:block w-full md:shrink-0">
          <div className={`w-full mb-0 md:mb-6`}>
            {collapsed ? (
              <div className="flex items-center justify-between md:flex-col md:items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
                   <img src={theme === "light" ? logo : logoDark} alt="花狮心理logo" className="w-6 h-6 object-contain" />
              </div>
              <button
                onClick={onToggle}
                className={`p-2 rounded-full transition-colors ${
                  theme === "light"
                    ? "hover:bg-gray-200"
                    : "bg-[rgba(0,0,0,0.3)] shadow-[0px_13.5px_18px_-4.5px_rgba(28,25,23,0.08),0px_4.5px_6.75px_-2.25px_rgba(28,25,23,0.03)] hover:bg-[rgba(0,0,0,0.6)]"
                }`}
                title="展开侧边栏"
              >
                <img 
                  src={theme === "light" ? sidebarIcon : sidebarDarkIcon} 
                  alt="展开侧边栏" 
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
                <h1 className={`text-[27px]  tracking-wide whitespace-nowrap ${
                  theme === "light"
                    ? "text-black"
                    : "text-white"
                }`}>花狮心理</h1>
              </div>
              <button
                onClick={onToggle}
                className={`p-3 rounded-full transition-colors ${
                  theme === "light"
                    ? "hover:bg-gray-200"
                    : "bg-[rgba(0,0,0,0.3)] shadow-[0px_13.5px_18px_-4.5px_rgba(28,25,23,0.08),0px_4.5px_6.75px_-2.25px_rgba(28,25,23,0.03)] hover:bg-[rgba(0,0,0,0.6)]"
                }`}
                title="收起侧边栏"
              >
                <img 
                  src={theme === "light" ? sidebarIcon : sidebarDarkIcon} 
                  alt="收起侧边栏" 
                  className="w-4 h-4 object-contain"
                />
              </button>
            </div>
            )}
          </div>
        </div>

        {!collapsed && (
          <div className="hidden md:flex md:flex-col md:flex-1 w-full">
            <div className="mx-2 flex-1 mt-6">
              <div className="flex flex-col gap-3">
                <div className={`rounded-[10px] overflow-hidden shadow-sm ${
                  theme === "light"
                    ? "bg-gray-100"
                    : "bg-gray-700"
                }`}>
                  <img
                    src={teacherImage}
                    alt="教师形象"
                    className="w-full h-100 object-cover"
                  />
                </div>
                <SidebarActionButton
                  collapsed={collapsed}
                  label="结束对话"
                  onClick={handleLogout}
                  theme={theme}
                  variant="red"
                  className="mt-12 gap-3 px-5"
                />
                <SidebarActionButton
                  collapsed={collapsed}
                  label="对话记录"
                  theme={theme}
                  variant="gray"
                  className="gap-3 px-5"
                />
              </div>
            </div>
            
            <div className="mt-auto border-t border-solid border-[#C1C1C9] pb-12 w-full ">
              <div className="flex items-center justify-between mt-4">
                <Dropdown
                  menu={{ items: settingsMenuItems, onClick: handleSettingsClick }}
                  trigger={["click"]}
                  placement="topRight"
                >
                  <button
                    className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors ${
                      theme === "light"
                        ? "hover:bg-gray-200"
                        : "bg-[rgba(0,0,0,0.3)] shadow-[0px_13.5px_18px_-4.5px_rgba(28,25,23,0.08),0px_4.5px_6.75px_-2.25px_rgba(28,25,23,0.03)] hover:bg-[rgba(0,0,0,0.6)]"
                    }`}
                    title="设置"
                  >
                    <img src={theme === "light" ? setting : settingDark} alt="设置" className="w-6 h-6 object-contain" />
                  </button>
                </Dropdown>
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <img src={user} alt="用户头像" className="w-full h-full object-cover block" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

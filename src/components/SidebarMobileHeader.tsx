import user from "../assets/user.svg";
import switchIcon from "../assets/switch.svg";
import conversationsIcon from "../assets/conversations.svg";
import sidebarIcon from "../assets/sidebar.png";

interface SidebarMobileHeaderProps {
  onEnterVoiceMode: () => void;
  onEndConversation: () => void;
  onViewConversationRecords: () => void;
  onLogout: () => void;
}

export function SidebarMobileHeader({
  onEnterVoiceMode,
  onEndConversation,
  onViewConversationRecords,
  onLogout,
}: SidebarMobileHeaderProps) {
  return (
    <div className="w-full flex items-center justify-between md:hidden">
      <div className="flex items-center gap-4">
      <button
          type="button"
          onClick={onEndConversation}
          className="px-3 h-10 w-10 rounded-full text-[12px] text-white bg-[rgba(0,0,0,0.25)]"
        >
          <img src={sidebarIcon} alt="结束对话" className="w-6" />
        </button>
        <button
          type="button"
          onClick={onViewConversationRecords}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.2)]"
          title="对话记录"
        >
          <img src={conversationsIcon} alt="对话记录" className="w-5 h-5 object-contain" />
        </button>
        <button
          type="button"
          onClick={onEnterVoiceMode}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.2)]"
          title="切换到语音模式"
        >
          <img src={switchIcon} alt="切换主题" className="w-5 h-5 object-contain" />
        </button>
        
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onLogout}
          className="w-10 h-10 rounded-full overflow-hidden"
          title="退出登录"
        >
          <img src={user} alt="用户头像" className="w-full h-full object-cover block" />
        </button>
      </div>
    </div>
  );
}

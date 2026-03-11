import teacherImage from "../assets/teacher.png";
import { SidebarActionButton } from "./SidebarActionButton";

type ThemeMode = "light" | "dark";

interface SidebarDesktopContentProps {
  collapsed: boolean;
  theme: ThemeMode;
  onEndConversation: () => void;
  onViewConversationRecords: () => void;
}

export function SidebarDesktopContent({
  collapsed,
  theme,
  onEndConversation,
  onViewConversationRecords,
}: SidebarDesktopContentProps) {
  return (
    <div className="mx-2 flex-1 mt-6">
      <div className="flex flex-col gap-3">
        <div
          className={`rounded-[10px] overflow-hidden shadow-sm ${
            theme === "light" ? "bg-gray-100" : "bg-gray-700"
          }`}
        >
          <img
            src={teacherImage}
            alt="教师形象"
            className="w-full h-100 object-cover"
          />
        </div>
        <SidebarActionButton
          collapsed={collapsed}
          label="结束对话"
          onClick={onEndConversation}
          theme={theme}
          variant="red"
          className="mt-12 gap-3 px-5"
        />
        <SidebarActionButton
          collapsed={collapsed}
          label="对话记录"
          onClick={onViewConversationRecords}
          theme={theme}
          variant="gray"
          className="gap-3 px-5"
        />
      </div>
    </div>
  );
}

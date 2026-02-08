import logo from "../assets/logo.png";
import { MessageOutlined, PoweroffOutlined } from "@ant-design/icons";

interface SidebarProps {
  isConnected: boolean;
  isAuthenticated: boolean;
  onLogout: () => void;
  onClearMessages: () => void;
}

export function Sidebar({
  onLogout,
}: SidebarProps) {

  const handleLogout = () => {
    onLogout();
  };

  return (
    <div className="w-64 h-full bg-white border-r border-gray-100 flex flex-col items-center py-8">
      {/* Logo区域 */}
      <div className="flex flex-col items-center mb-12">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4 overflow-hidden">
             <img src={logo} alt="花狮心理logo" className="w-10 h-10 object-contain" />
        </div>
        <h1 className="text-xl font-bold text-gray-800 tracking-wide">花狮心理</h1>
      </div>

      {/* 菜单区域 */}
      <div className="w-full px-6 flex-1">
        <div className="flex flex-col gap-4">
            {/* 对话记录按钮 - 样式仅作展示 */}
          <button 
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                <MessageOutlined className="text-lg" />
            </div>
            <span className="font-medium">对话记录</span>
          </button>

          {/* 结束对话按钮 */}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                <PoweroffOutlined className="text-lg" />
            </div>
            <span className="font-medium">结束对话</span>
          </button>
        </div>
      </div>
      
      {/* 底部版权或其他信息 */}
      <div className="mt-auto text-xs text-gray-300 pb-4">
        © 2024 花狮心理
      </div>
    </div>
  );
}

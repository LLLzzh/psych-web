import logo from "../assets/logo.png";
import { useConfigStore } from "../store/configStore";

interface SidebarProps {
  isConnected: boolean;
  isAuthenticated: boolean;
  onLogout: () => void;
  onClearMessages: () => void;
}

export function Sidebar({
  isConnected,
  isAuthenticated,
  onLogout,
  onClearMessages,
}: SidebarProps) {
  const { config } = useConfigStore();

  const handleLogout = () => {
    onClearMessages();
    onLogout();
  };

  return (
    <div className="w-90 p-4 h-full bg-white/35 shadow-[8px_0px_20px_rgba(233,241,252,0.6)] backdrop-blur-sm rounded-r-[20px]">
      <header className="flex justify-between items-center mb-5 pb-5 border-b border-gray-200">
        <img src={logo} alt="花狮心理logo" className="w-10 h-10 object-contain" />
        <h1 className="m-0 text-gray-800 text-2xl font-semibold">花狮心理</h1>
        <div className="flex gap-2.5">
          <span
            className={`px-3 py-1 rounded-2xl text-xs font-medium ${
              isConnected
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {isConnected ? "已连接" : "未连接"}
          </span>
          <span
            className={`px-3 py-1 rounded-2xl text-xs font-medium ${
              isAuthenticated
                ? "bg-blue-100 text-blue-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {isAuthenticated ? "已认证" : "未认证"}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white border-none rounded text-sm cursor-pointer transition-colors duration-200 hover:bg-red-700"
        >
          登出
        </button>
      </header>

      <h3 className="m-0 mb-2.5 text-base text-gray-800">配置信息</h3>
      <pre className="m-0 text-xs text-gray-600 whitespace-pre-wrap break-all">
        {config && JSON.stringify(config, null, 2)}
      </pre>
    </div>
  );
}

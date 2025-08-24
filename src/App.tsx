import { useState, useEffect } from "react";
import Login from "./components/Login";
import ChatPage from "./components/ChatPage";
import { getUserInfo, type UserInfo } from "./apis/login";

// 定义页面类型
type Page = 'login' | 'chat';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [url, setUrl] = useState("wss://api.xhpolaris.com/psych/chat");
  const [userId, setUserId] = useState("");
  const [token, setToken] = useState("");
  const [info, setInfo] = useState<UserInfo>({
    userId: "",
    strong: false,
    unitId: "",
    studentId: ""
  });

  // 检查本地存储的登录状态
  useEffect(() => {
    const savedUserId = localStorage.getItem('chat_userId');
    const savedToken = localStorage.getItem('chat_token');
    const savedInfo = localStorage.getItem('chat_info');
    
    if (savedUserId && savedToken && savedInfo) {
      setUserId(savedUserId);
      setToken(savedToken);
      setInfo(JSON.parse(savedInfo));
      setCurrentPage('chat');
    }
  }, []);

  const handleLoginSuccess = async (newUserId: string, newToken: string, newInfo: UserInfo) => {
    setUserId(newUserId);
    setToken(newToken);
    setInfo(newInfo);
    
    // 保存到本地存储
    localStorage.setItem('chat_userId', newUserId);
    localStorage.setItem('chat_token', newToken);
    localStorage.setItem('chat_info', JSON.stringify(newInfo));

    const res = await getUserInfo()
    console.log('userInfo',res)
    
    setCurrentPage('chat');
  };

  const handleLogout = () => {
    // 清除本地存储
    localStorage.removeItem('chat_userId');
    localStorage.removeItem('chat_token');
    localStorage.removeItem('chat_info');

    
    setUserId("");
    setToken("");
    setCurrentPage('login');
  };

  // 根据当前页面渲染对应组件
  if (currentPage === 'login') {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <ChatPage 
      url={url}
      userId={userId}
      token={token}
      info={info}
      onLogout={handleLogout}
      onConfigChange={(newUrl: string) => setUrl(newUrl)}
    />
  );
}

export default App;
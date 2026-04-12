import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { message as antMessage } from "antd";
import { login, type LoginRequset, type LoginResponse } from "../apis/login"
import { useAuthStore } from "../store/authStore"
import logoDark from "../assets/logo-dark.png"
import { CONFIG } from "../config"
import { getUnitIdByUri } from "../apis/config"
import { pathChat } from "../paths"
import { Background } from "./Background"

function Login() {
    const navigate = useNavigate();
    const { unitUri: unitUriParam } = useParams<{ unitUri: string }>();
    const unitUri = unitUriParam ?? CONFIG.DEFAULT_UNIT_URI;
    const setAuth = useAuthStore((state) => state.setAuth);
    const [authId, setAuthId] = useState("");
    const [verifyCode, setVerifyCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [resolvedUnitId, setResolvedUnitId] = useState<string | null>(null);
    const [resolvingUnit, setResolvingUnit] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setResolvingUnit(true);
        setResolvedUnitId(null);
        void getUnitIdByUri(unitUri)
            .then((id) => {
                if (!cancelled) setResolvedUnitId(id);
            })
            .catch((err: unknown) => {
                console.error("解析机构失败:", err);
                const msg =
                    err instanceof Error ? err.message : "无法加载机构信息，请稍后重试";
                antMessage.error(msg);
            })
            .finally(() => {
                if (!cancelled) setResolvingUnit(false);
            });
        return () => {
            cancelled = true;
        };
    }, [unitUri]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // 表单验证
        if (!authId.trim()) {
            antMessage.error("请输入账号");
            return;
        }
        if (!verifyCode.trim()) {
            antMessage.error("请输入密码");
            return;
        }
        if (!resolvedUnitId) {
            antMessage.error("机构信息未就绪，请刷新页面重试");
            return;
        }

        setLoading(true);
        try {
            const loginParams: LoginRequset = {
                unitId: resolvedUnitId,
                authType: 'AuthStudentIdAndPwd',
                authId: authId.trim(),
                verifyCode: verifyCode.trim()
            }
            const response = await login(loginParams) as LoginResponse;
            
            // 登录成功后的处理
            if (response && response.data) {
                const { token, ...info } = response.data;


                if (info.userId && token) {
                    setAuth(info.userId, token, info);
                    navigate(pathChat(unitUri));
                } else {
                    antMessage.error("登录成功但返回数据格式异常");
                }
            } else {
                antMessage.error("登录成功但返回数据格式异常");
            }
        } catch (error: unknown) {
            console.error("登录失败:", error);
            let errorMessage = "登录失败，请检查输入信息";
            
            if (error && typeof error === 'object' && 'response' in error) {
                const response = (error as { response?: { data?: { message?: string } } }).response;
                if (response?.data?.message) {
                    errorMessage = response.data.message;
                }
            }
            
            antMessage.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="relative w-full h-screen overflow-hidden font-sans">
            <Background themeOverride="dark" mobileOnly />
            <div className="relative z-10 min-h-screen w-screen flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">
                    <div className="rounded-[24px] p-8 backdrop-blur-[10px] shadow-[0px_20px_50px_rgba(45,43,81,0.12)] bg-[rgba(0,0,0,0.35)] text-white">
                        <div className="text-center mb-8">
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <img src={logoDark} alt="花狮心理" className="w-12 h-12 object-contain" />
                                <h1 className="text-3xl font-bold text-white">花狮心理</h1>
                            </div>
                            <p className="text-lg font-medium mb-2 text-white">欢迎回来</p>
                            <p className="text-gray-300">请登录您的账户开始对话</p>
                        </div>
                    
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium mb-2 text-gray-300">
                                    账号
                                </label>
                                <input 
                                    type="text" 
                                    id="phone" 
                                    value={authId}
                                    onChange={(e) => setAuthId(e.target.value)}
                                    disabled={loading || resolvingUnit}
                                    placeholder="请输入账号"
                                    autoComplete="tel"
                                    className="w-full px-4 py-3 rounded-lg transition-colors border focus:ring-2 focus:ring-[#96C0FF] focus:border-transparent disabled:opacity-60 bg-[rgba(0,0,0,0.3)] text-white border-[rgba(255,255,255,0.2)] placeholder:text-gray-400"
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium mb-2 text-gray-300">
                                    密码
                                </label>
                                <input 
                                    type="password" 
                                    id="password" 
                                    value={verifyCode}
                                    onChange={(e) => setVerifyCode(e.target.value)}
                                    disabled={loading || resolvingUnit}
                                    placeholder="请输入密码"
                                    autoComplete="current-password"
                                    className="w-full px-4 py-3 rounded-lg transition-colors border focus:ring-2 focus:ring-[#96C0FF] focus:border-transparent disabled:opacity-60 bg-[rgba(0,0,0,0.3)] text-white border-[rgba(255,255,255,0.2)] placeholder:text-gray-400"
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={loading || resolvingUnit || !resolvedUnitId}
                                className="w-full font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 bg-[linear-gradient(303.86deg,#8686FF_6.61%,#96C0FF_93.39%)] text-white hover:opacity-90 disabled:opacity-70"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>登录中...</span>
                                    </>
                                ) : resolvingUnit ? (
                                    <span>加载机构信息...</span>
                                ) : (
                                    "登录"
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )    
}

export default Login;

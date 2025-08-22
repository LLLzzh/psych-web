import { useState } from "react"
import { login, type LoginRequset, type LoginResponse, type UserInfo } from "../apis/login"



interface LoginProps {
    onLoginSuccess?: (userId: string, token: string, info: UserInfo) => void;
}

function Login({ onLoginSuccess }: LoginProps) {
    const [authId, setAuthId] = useState("");
    const [verifyCode, setVerifyCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [, setInfo] = useState<UserInfo | null>(null);

    const unitId: string = "68a14236ef1dc2bc4149606c"

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // 表单验证
        if (!authId.trim()) {
            setError("请输入账号号");
            return;
        }
        if (!verifyCode.trim()) {
            setError("请输入密码");
            return;
        }

        setLoading(true);
        setError("");
        try {
            const loginParams: LoginRequset = {
                unitId: unitId,
                authType: 'AuthStudentIdAndPwd',
                authId: authId.trim(),
                verifyCode: verifyCode.trim()
            }
            const response = await login(loginParams) as LoginResponse;
            console.log("登录成功:", response);
            
            // 登录成功后的处理
            if (response && response.data) {
                const { token, ...info } = response.data;


                if (onLoginSuccess && info.userId &&token) {
                    onLoginSuccess(info.userId, token, info);
                    setInfo(info);
                } else {
                    setError("登录成功但返回数据格式异常");
                }
            } else {
                setError("登录成功但返回数据格式异常");
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
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">欢迎回来</h1>
                        <p className="text-gray-600">请登录您的账户开始对话</p>
                    </div>
                    
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                                手机号
                            </label>
                            <input 
                                type="text" 
                                id="phone" 
                                value={authId}
                                onChange={(e) => setAuthId(e.target.value)}
                                disabled={loading}
                                placeholder="请输入手机号"
                                autoComplete="tel"
                                className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                密码
                            </label>
                            <input 
                                type="password" 
                                id="password" 
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value)}
                                disabled={loading}
                                placeholder="请输入密码"
                                autoComplete="current-password"
                                className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>登录中...</span>
                                </>
                            ) : (
                                "登录"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )    
}

export default Login;
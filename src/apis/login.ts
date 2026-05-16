import request from "../utils/request";

export type LoginAuthType =
    | "phone-password"
    | "phone-verify"
    | "code-password"
    | "email-password"
    | "email-verify";

export interface LoginRequset {
    unitId: string;
    authType: LoginAuthType;
    authId: string;
    verifyCode: string;
}

interface LoginPayload {
    userId: string;
    token: string;
    unitId: string;
    codeValue?: string;
    studentId?: string;
}

export interface LoginResponse {
    code: number;
    msg: string;
    data: LoginPayload;
}

export interface UserInfo {
    userId: string;
    unitId: string;
    codeValue?: string;
    studentId?: string;
    conversationId?: string;
}

export interface UserInfoResponse {
    code: number;
    msg: string;
    data: {
        userId: string;
    };
}


type RawLoginResponse = LoginResponse & Partial<LoginPayload>;

function normalizeLoginResponse(raw: RawLoginResponse, fallbackAuthId: string): LoginResponse {
    const payload = raw.data ?? raw;
    return {
        code: raw.code,
        msg: raw.msg,
        data: {
            userId: payload.userId,
            token: payload.token,
            unitId: payload.unitId,
            codeValue: payload.codeValue ?? payload.studentId ?? fallbackAuthId,
            studentId: payload.studentId ?? payload.codeValue ?? fallbackAuthId,
        },
    };
}

export async function login(params:LoginRequset): Promise<LoginResponse> {
    const data = {
        unitId: params.unitId,
        authType: params.authType,
        authId: params.authId,
        verifyCode: params.verifyCode
    }
    const res = await request.post<RawLoginResponse>("/user/sign_in", data);
    return normalizeLoginResponse(res, params.authId);
}

export async function getUserInfo() {
    const res = await request.get("/user/info")
    return res;
}

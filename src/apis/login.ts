import request from "../utils/request";

export interface LoginRequset {
    unitId: string;
    authType: string;
    authId: string;
    verifyCode: string;
}


export interface LoginResponse {
    code: number;
    msg: string;
    data: {
        userId: string;
        strong: boolean;
        token: string;
        unitId: string;
        studentId: string;
    };
}

export interface UserInfo {
    userId: string;
    strong: boolean;
    unitId: string;
    studentId: string;
}

export interface UserInfoResponse {
    code: number;
    msg: string;
    data: {
        userId: string;
    };
}


const authType:string[] = ['AuthPhoneAndPwd','AuthStudentIdAndPwd','AuthPhoneAndCode','AuthWeakAccountAndPwd']

export async function login(params:LoginRequset) {
    const data = {
        unitId: params.unitId,
        authType: authType.indexOf(params.authType),
        authId: params.authId,
        verifyCode: params.verifyCode
    }
    const res = await request.post("/user/sign_in", data);
    return res;
}

export async function getUserInfo() {
    const res = await request.get("/user/info")
    return res;
}
import request from "../utils/request";

export interface StudentProfile {
  id: string;
  code: string;
  name: string;
  avatar: string;
  birth: number;
  gender: number;
  enrollYear: number;
  grade: number;
  class: number;
}

interface StudentProfileResponse {
  code: number;
  msg: string;
  data: { profile: StudentProfile };
}

export interface UpdateStudentProfileInput {
  name: string;
  avatar: string;
  birth: number;
  gender: number;
}

export async function getStudentProfile(): Promise<StudentProfile> {
  const response = await request.get<StudentProfileResponse>("/student/profile");
  return response.data.profile;
}

export async function updateStudentProfile(
  input: UpdateStudentProfileInput
): Promise<StudentProfile> {
  const response = await request.post<StudentProfileResponse>(
    "/student/profile",
    input
  );
  return response.data.profile;
}

import request from "../utils/request";

export interface Unit {
  id: string;
  name: string;
  address: string;
  contact: string;
  level: number;
  status: number;
  createTime: string;
  updateTime: string;
  deleteTime: string;
}

export interface GetUnitByUriRequest {
  uri: string;
}

/** 与后端约定：unit 与 code、msg 同级 */
export interface GetUnitByUriResponse {
  code: number;
  msg: string;
  data: {
    unit: Unit;
  };
}

export async function getUnitByUri(uri: string): Promise<GetUnitByUriResponse> {
  return request.post<GetUnitByUriResponse>("/unit/get_by_uri", { uri });
}

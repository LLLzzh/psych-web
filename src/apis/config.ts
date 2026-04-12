import request from "../utils/request";
import { getUnitByUri } from "./unit";

export interface ModelAndBgImageResponse {
  code: number;
  msg: string;
  data: {
    backgroundImage: string;
    modelView: string;
  };
}

export async function getModelAndBgImage(
  unitId: string
): Promise<ModelAndBgImageResponse> {
  const res = await request.get<ModelAndBgImageResponse>(
    "/config/get_model_and_bg_image",
    { params: { unitId } }
  );
  return res;
}

/**
 * 根据链接中的机构 URI（如 gmqwgy）解析登录所需的 unitId。
 * POST /unit/get_by_uri，body: { uri }（baseURL 已为 …/psych）。
 * 失败时使用 CONFIG.UNIT_URI_TO_ID_FALLBACK。
 */
export async function getUnitIdByUri(unitUri: string): Promise<string> {
  const uri = unitUri.trim();
  if (!uri) {
    throw new Error("机构链接无效");
  }
  const fallback = ""
  try {
    const res = await getUnitByUri(uri);
    console.log(res);
    const id = res.data.unit?.id?.trim();
    if (id) return id;
  } catch {
    // 使用下方兜底
  }
  if (fallback) return fallback;
  throw new Error("无法识别该访问链接中的机构，请核对网址或联系管理员");
}

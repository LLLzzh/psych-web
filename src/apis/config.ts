import request from "../utils/request";

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

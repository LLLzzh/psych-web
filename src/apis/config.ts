import request from "../utils/request";
import { getUnitByUri } from "./unit";
import type { Character, GetCharactersResponse } from "../types/character";
import mockCharacter1 from "../assets/character-selection/mock-character-1.webp";
import mockCharacter2 from "../assets/character-selection/mock-character-2.webp";
import mockCharacter3 from "../assets/character-selection/mock-character-3.webp";
import mockCharacter4 from "../assets/character-selection/mock-character-4.webp";
import mockCharacter5 from "../assets/character-selection/mock-character-5.webp";
import mockCampusBackground from "../assets/character-selection/campus-background.webp";

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

export interface VoiceItem {
  id: string;
  voiceType: string;
  name: string;
  avatar?: string;
  gender?: string;
  age?: string;
  description?: string;
  trialUrl?: string;
  volcanoId?: string;
  resourceId?: string;
}

export interface ListVoicesResponse {
  voices?: VoiceItem[];
  data?: {
    voices: VoiceItem[];
  };
  code: number;
  msg: string;
}

export interface AddCharacterRequest {
  unitId: string;
  character: Omit<Character, "backendCharacterId" | "accentColor" | "isMock" | "fallbackImage">;
}

export interface AddCharacterResponse {
  characterId?: string;
  data?: {
    characterId?: string;
  };
  code: number;
  msg: string;
}

export interface UpdateCharacterRequest {
  unitId: string;
  character: Pick<Character, "id"> & Partial<Omit<Character, "id" | "backendCharacterId" | "accentColor" | "isMock" | "fallbackImage">>;
}

export interface DeleteCharacterRequest {
  unitId: string;
  characterId: string;
}

export async function listVoices(page = 1, limit = 10): Promise<VoiceItem[]> {
  const response = await request.get<ListVoicesResponse>("/config/list_voice", {
    // 测试环境实际使用顶层 page/limit；同时兼容返回值有无 data 包装层。
    params: { page, limit },
  });
  return response.voices ?? response.data?.voices ?? [];
}

/** 管理端新增单位人物；Authorization 由 request 拦截器自动注入。 */
export async function addCharacter(
  params: AddCharacterRequest
): Promise<AddCharacterResponse> {
  return request.post<AddCharacterResponse>("/config/add_character", params);
}

export async function updateCharacter(
  params: UpdateCharacterRequest
): Promise<AddCharacterResponse> {
  return request.post<AddCharacterResponse>("/config/update_character", params);
}

export async function deleteCharacter(
  params: DeleteCharacterRequest
): Promise<AddCharacterResponse> {
  return request.post<AddCharacterResponse>("/config/delete_character", params);
}

export async function getCharacters(unitId: string): Promise<GetCharactersResponse> {
  const raw = await request.get<
    GetCharactersResponse & { data?: Pick<GetCharactersResponse, "characters" | "scene"> }
  >("/config/get_character", { params: { unitId } });

  const preferredCharacterOrder = [
    "福福老师",
    "张文老师",
    "张倩老师",
    "刘强老师",
    "王丽老师",
  ];
  const characters = (raw.characters ?? raw.data?.characters ?? [])
    .filter((character) => character.id && character.status !== 0)
    .sort((left, right) => {
      const leftIndex = preferredCharacterOrder.indexOf(left.name);
      const rightIndex = preferredCharacterOrder.indexOf(right.name);
      if (leftIndex < 0 && rightIndex < 0) return 0;
      if (leftIndex < 0) return 1;
      if (rightIndex < 0) return -1;
      return leftIndex - rightIndex;
    });
  const localImageByName: Record<string, string> = {
    "福福老师": mockCharacter1,
    "张文老师": mockCharacter2,
    "张倩老师": mockCharacter3,
    "刘强老师": mockCharacter4,
    "王丽老师": mockCharacter5,
  };
  const charactersWithFallback = characters.map((character) => ({
    ...character,
    fallbackImage: localImageByName[character.name],
  }));
  const useLocalMock =
    import.meta.env.DEV && import.meta.env.VITE_CHARACTER_SELECTION_MOCK === "true";

  if (useLocalMock && charactersWithFallback.length > 0) {
    const realCharacter = charactersWithFallback[0];
    const mockNames = ["福福老师", "张文老师", "张倩老师", "刘强老师", "王丽老师"];
    const mockImages = [mockCharacter1, mockCharacter2, mockCharacter3, mockCharacter4, mockCharacter5];
    const accentColors = ["#F6A6A6", "#8CCBFF", "#FFBA86", "#91AFFF", "#B39CFF"];
    return {
      characters: mockNames.map((name, index) => ({
        ...realCharacter,
        id: `local-preview-${index + 1}`,
        backendCharacterId: realCharacter.id,
        name,
        image: mockImages[index],
        accentColor: accentColors[index],
        isMock: true,
      })),
      scene: [mockCampusBackground],
      code: raw.code ?? 0,
      msg: raw.msg ?? "success",
    };
  }

  return {
    characters: charactersWithFallback,
    scene: raw.scene ?? raw.data?.scene ?? [],
    code: raw.code ?? 0,
    msg: raw.msg ?? "success",
  };
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

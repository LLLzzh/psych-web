import request from "../utils/request";
import { getUnitByUri } from "./unit";
import type { Character, GetCharactersResponse } from "../types/character";
import mockCharacter1 from "../assets/character-selection/mock-character-1-upright.png";
import mockCharacter2 from "../assets/character-selection/mock-character-2-upright.png";
import mockCharacter3 from "../assets/character-selection/mock-character-3.webp";
import mockCharacter4 from "../assets/character-selection/mock-character-4-upright.png";
import mockCharacter5 from "../assets/character-selection/mock-character-5-upright.png";
import mockCampusBackground from "../assets/character-selection/campus-background.webp";

export interface ModelAndBgImageResponse {
  code: number;
  msg: string;
  data: {
    backgroundImage: string;
    modelView: string;
  };
}

/**
 * 配置中的历史图片可能仍是 COS 的临时签名地址。学生端不能依赖签名
 * 的过期时间，统一把对象路径映射到公开静态 CDN。
 */
export function resolveStaticAssetUrl(url: string | undefined | null): string {
  if (!url) return "";
  const cdnBase = import.meta.env.VITE_STATIC_CDN_BASE_URL?.replace(/\/+$/, "");
  if (!cdnBase) return url;
  try {
    const parsed = new URL(url, window.location.origin);
    if (
      parsed.searchParams.has("q-sign-algorithm") ||
      parsed.hostname.includes("cos.") ||
      parsed.hostname.includes("myqcloud.com")
    ) {
      const objectPath = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");
      return objectPath ? `${cdnBase}/${objectPath}` : url;
    }
  } catch {
    // 兼容相对路径和历史脏数据，保留原值交给浏览器处理。
  }
  return url;
}

export async function getModelAndBgImage(
  unitId: string
): Promise<ModelAndBgImageResponse> {
  // 当前 core-api 的公开配置接口是 /config/get_character；旧版本曾提供
  // /config/get_model_and_bg_image，统一在这里兼容两种返回格式。
  try {
    const res = await request.get<GetCharactersResponse>("/config/get_character", {
      params: { unitId },
    });
    const characters = res.characters ?? res.data?.characters ?? [];
    const modelView = characters.find((item) => item.image)?.image ?? "";
    const backgroundImage = res.backgroundImage ?? res.data?.backgroundImage ?? res.scene?.[0] ?? res.data?.scene?.[0] ?? "";
    return {
      code: res.code ?? 0,
      msg: res.msg ?? "success",
      data: {
        backgroundImage: resolveStaticAssetUrl(backgroundImage),
        modelView: resolveStaticAssetUrl(modelView),
      },
    };
  } catch {
    const res = await request.get<ModelAndBgImageResponse>(
      "/config/get_model_and_bg_image",
      { params: { unitId } }
    );
    return {
      ...res,
      data: {
        backgroundImage: resolveStaticAssetUrl(res.data?.backgroundImage),
        modelView: resolveStaticAssetUrl(res.data?.modelView),
      },
    };
  }
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
  const availableCharacters = (raw.characters ?? raw.data?.characters ?? [])
    .filter((character) => character.id && character.status !== 0);
  // 后端历史配置中可能同时存在通用“心理老师”和已命名角色，且两者使用
  // 同一人物图片。已有具体角色时不再展示通用占位角色，避免轮播重复。
  const characters = availableCharacters
    .filter(
      (character) =>
        character.name !== "心理老师" || availableCharacters.length === 1
    )
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
    "心理老师": mockCharacter1,
    "张文老师": mockCharacter2,
    "张倩老师": mockCharacter3,
    "刘强老师": mockCharacter4,
    "王丽老师": mockCharacter5,
  };
  const charactersWithFallback = characters.map((character) => ({
    ...character,
    image: resolveStaticAssetUrl(character.image),
    // 只有后端没有配置图片时才使用本地演示图；否则学校配置应优先展示。
    fallbackImage: character.image ? undefined : localImageByName[character.name],
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
    scene: (raw.scene ?? raw.data?.scene ?? []).map((item) => resolveStaticAssetUrl(item)),
    backgroundImage: resolveStaticAssetUrl(raw.backgroundImage ?? raw.data?.backgroundImage),
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

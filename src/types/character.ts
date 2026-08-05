export interface Character {
  id: string;
  name: string;
  voice: string;
  image: string;
  status: number;
  identity?: string;
  style?: string;
  greeting?: string;
  /** 本地 UI Mock 可使用独立卡片 ID，但 WebSocket 仍传真实后端角色 ID。 */
  backendCharacterId?: string;
  accentColor?: string;
  isMock?: boolean;
  /** 学校定制素材兜底：远端私有 COS 地址失效时使用。 */
  fallbackImage?: string;
  /** 预留：后端未来提供人物音频时可直接展示。 */
  audio?: string;
}

export interface GetCharactersResponse {
  characters: Character[];
  scene: string[];
  code: number;
  msg: string;
}

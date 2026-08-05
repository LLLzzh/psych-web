import { useEffect, useMemo, useRef, useState } from "react";
import { message, Spin } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { getCharacters } from "../apis/config";
import { getUnitIdByUri } from "../apis/config";
import defaultTeacherImage from "../assets/teacher.png";
import defaultBackground from "../assets/background1.jpg";
import logo from "../assets/logo.png";
import { CONFIG } from "../config";
import { pathChat, pathLogin } from "../paths";
import { useAuthStore } from "../store/authStore";
import { useCharacterStore } from "../store/characterStore";
import { useConfigStore } from "../store/configStore";
import type { Character } from "../types/character";
import selectionArc from "../assets/character-selection/selection-arc.webp";
import campusBackground from "../assets/character-selection/campus-background.webp";

interface CharacterSelectionPageProps {
  previewMode?: boolean;
}

function CharacterSelectionPage({ previewMode = false }: CharacterSelectionPageProps) {
  const navigate = useNavigate();
  const { unitUri = CONFIG.DEFAULT_UNIT_URI } = useParams<{ unitUri: string }>();
  const { token, info, clearAuth } = useAuthStore();
  const { selectedCharacter, selectCharacter } = useCharacterStore();
  const { setModelView, setBackgroundImage } = useConfigStore();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedId, setSelectedId] = useState(selectedCharacter?.id ?? "");
  const [scene, setScene] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const swipeStartXRef = useRef<number | null>(null);
  const isPreview = previewMode && import.meta.env.DEV;

  useEffect(() => {
    if (!isPreview && (!token || !info?.unitId)) {
      navigate(pathLogin(unitUri), { replace: true });
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    const unitIdPromise = info?.unitId
      ? Promise.resolve(info.unitId)
      : getUnitIdByUri(unitUri);
    unitIdPromise
      .then((unitId) => getCharacters(unitId))
      .then((response) => {
        if (cancelled) return;
        setCharacters(response.characters);
        setScene(response.scene[0] ?? "");
        if (response.characters.length === 0) {
          setError("学校暂未配置可用人物，请联系管理员");
          return;
        }
        const initialIndex = Math.floor(response.characters.length / 2);
        setSelectedId(response.characters[initialIndex]?.id ?? "");
      })
      .catch((requestError) => {
        if (cancelled) return;
        console.error("获取人物配置失败:", requestError);
        setError("人物信息加载失败，请稍后重试");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [info?.unitId, isPreview, navigate, selectedCharacter?.id, token, unitUri]);

  const selectedIndex = useMemo(
    () => Math.max(0, characters.findIndex((item) => item.id === selectedId)),
    [characters, selectedId]
  );

  const selectByOffset = (offset: number) => {
    if (characters.length === 0) return;
    const nextIndex =
      (selectedIndex + offset + characters.length) % characters.length;
    setSelectedId(characters[nextIndex].id);
  };

  const handleConfirm = () => {
    const character = characters.find((item) => item.id === selectedId);
    if (!character) {
      message.warning("请先选择一位心理老师");
      return;
    }
    if (isPreview && (!token || !info?.unitId)) {
      setSelectedId(character.id);
      message.info("请先登录，登录后即可选择人物并开始真实对话");
      navigate(pathLogin(unitUri));
      return;
    }
    selectCharacter(character);
    setModelView(character.fallbackImage || character.image || "");
    if (scene) setBackgroundImage(scene);
    navigate(pathChat(unitUri));
  };

  const handleLogout = () => {
    clearAuth();
    navigate(pathLogin(unitUri), { replace: true });
  };

  return (
    <div className="relative h-dvh min-h-[620px] w-full overflow-hidden bg-[#F8FAFF] font-sans">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
        style={{
          backgroundImage: `url(${isPreview ? campusBackground : scene || campusBackground || defaultBackground})`,
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,251,255,0.48)_0%,rgba(239,246,255,0.32)_48%,rgba(239,236,255,0.86)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_88%,rgba(155,132,255,0.23),transparent_42%)]" />
      <img
        src={selectionArc}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[70%] z-10 w-[142vw] max-w-none -translate-x-1/2 opacity-90 md:top-[69%] md:w-[116vw]"
      />

      <header className="relative z-30 flex items-center justify-between px-5 py-5 md:px-10 md:py-7">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="花狮心理" className="h-10 w-10 object-contain" />
          <span className="text-lg font-semibold text-[#20243A]">花狮心理</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          title="退出登录"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#95C2FF] to-[#7773F8] text-white shadow-[0_8px_20px_rgba(119,115,248,0.25)] transition hover:scale-105"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M10 17l5-5-5-5M15 12H3M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </header>

      <main className="relative z-20 flex h-[calc(100%-88px)] flex-col items-center">
        {loading ? (
          <div className="flex flex-1 items-center justify-center"><Spin size="large" /></div>
        ) : error ? (
          <div className="mt-[20vh] rounded-2xl bg-white/80 px-8 py-9 text-center shadow-xl backdrop-blur-xl">
            <p className="text-[#5B6175]">{error}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-full bg-gradient-to-r from-[#96C0FF] to-[#8686FF] px-7 py-2.5 text-white">
              重新加载
            </button>
          </div>
        ) : (
          <>
            <div
              className="relative mt-7 h-[56vh] min-h-[350px] w-full max-w-[1180px] touch-pan-y select-none md:mt-1 md:h-[63vh]"
              onPointerDown={(event) => {
                swipeStartXRef.current = event.clientX;
              }}
              onPointerUp={(event) => {
                const startX = swipeStartXRef.current;
                swipeStartXRef.current = null;
                if (startX === null) return;
                const deltaX = event.clientX - startX;
                if (Math.abs(deltaX) >= 45) {
                  selectByOffset(deltaX > 0 ? -1 : 1);
                }
              }}
              onPointerCancel={() => {
                swipeStartXRef.current = null;
              }}
            >
              {characters.map((character, index) => {
                let offset = index - selectedIndex;
                if (offset > characters.length / 2) offset -= characters.length;
                if (offset < -characters.length / 2) offset += characters.length;
                const distance = Math.abs(offset);
                const visible = distance <= 2;
                const selected = offset === 0;
                const horizontalShift =
                  offset === 0
                    ? "0px"
                    : offset > 0
                      ? distance === 1
                        ? "clamp(190px, 18vw, 250px)"
                        : "clamp(360px, 34vw, 470px)"
                      : distance === 1
                        ? "calc(-1 * clamp(190px, 18vw, 250px))"
                        : "calc(-1 * clamp(360px, 34vw, 470px))";
                const verticalShift =
                  distance === 0
                    ? "0px"
                    : distance === 1
                      ? "clamp(30px, 3vw, 46px)"
                      : "clamp(120px, 10vw, 155px)";
                const remoteImage = /^https?:\/\//i.test(character.image)
                  ? character.image
                  : "";
                return (
                  <button
                    key={character.id}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`选择${character.name || "心理老师"}`}
                    onClick={() => setSelectedId(character.id)}
                    className="absolute left-1/2 top-1/2 overflow-visible transition-[transform,opacity,filter] duration-500 ease-out"
                    style={{
                      width: selected
                        ? "clamp(180px, 22vw, 286px)"
                        : distance === 1
                          ? "clamp(170px, 21vw, 278px)"
                          : "clamp(165px, 20vw, 258px)",
                      height: selected
                        ? "clamp(290px, 32vw, 410px)"
                        : distance === 1
                          ? "clamp(280px, 34vw, 430px)"
                          : "clamp(275px, 32vw, 410px)",
                      zIndex: 10 - distance,
                      opacity: visible ? (distance === 2 ? 0.78 : 1) : 0,
                      pointerEvents: visible ? "auto" : "none",
                      transform: `translate(calc(-50% + ${horizontalShift}), calc(-50% - 4vw + ${verticalShift})) rotate(${offset * 10}deg)`,
                      filter: selected ? "none" : "saturate(.88)",
                    }}
                  >
                    <div
                      className={`relative h-full w-full overflow-hidden rounded-[28px] border border-white/85 bg-[linear-gradient(180deg,rgba(230,235,243,0.68)_0%,rgba(247,249,253,0.58)_58%,rgba(255,255,255,0.82)_100%)] backdrop-blur-[10px] ${selected ? "ring-2 ring-white/80" : ""}`}
                      style={{
                        boxShadow: selected
                          ? `0 24px 64px ${character.accentColor ?? "#AAB4CE"}3D, inset 0 1px 0 rgba(255,255,255,0.82)`
                          : "0 18px 48px rgba(105,116,145,0.16), inset 0 1px 0 rgba(255,255,255,0.72)",
                      }}
                    >
                      <img
                        src={remoteImage || character.fallbackImage || defaultTeacherImage}
                        alt={character.name || "心理老师"}
                        className="h-full w-full object-contain object-bottom"
                        style={{
                          transform: `scale(${distance === 0 ? 1.04 : distance === 1 ? 1.12 : 1.22})`,
                          transformOrigin: "center bottom",
                        }}
                        onError={(event) => {
                          const fallback = character.fallbackImage || defaultTeacherImage;
                          if (event.currentTarget.src !== fallback) {
                            event.currentTarget.src = fallback;
                          }
                        }}
                      />
                      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#F7F9FD]/90 via-[#F7F9FD]/38 to-transparent" />
                    </div>
                    <span className="absolute left-1/2 top-4 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#91BFFF] to-[#8177FA] px-7 py-1.5 text-xs font-medium text-white shadow-md">
                      {character.name || "心理老师"}
                    </span>
                  </button>
                );
              })}

              {characters.length > 1 && (
                <>
                  <button type="button" onClick={() => selectByOffset(-1)} aria-label="上一个人物" className="absolute left-3 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/55 text-[#8C92B8] shadow-lg backdrop-blur transition hover:bg-white md:left-8">
                    <span className="text-3xl leading-none">‹</span>
                  </button>
                  <button type="button" onClick={() => selectByOffset(1)} aria-label="下一个人物" className="absolute right-3 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/55 text-[#8C92B8] shadow-lg backdrop-blur transition hover:bg-white md:right-8">
                    <span className="text-3xl leading-none">›</span>
                  </button>
                </>
              )}
            </div>

            <div className="relative z-30 mt-5 flex flex-col items-center md:mt-2">
              {characters.some((character) => character.isMock) && (
                <span className="mb-3 rounded-full bg-white/65 px-3 py-1 text-[11px] text-[#858BA5] backdrop-blur">
            {isPreview ? "本地多人物 UI 预览（不发起真实对话）" : "本地多人物 UI 预览"}
                </span>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedId}
                className="min-w-44 rounded-full bg-gradient-to-r from-[#96C0FF] to-[#8175FA] px-10 py-3 font-medium text-white shadow-[0_12px_28px_rgba(121,132,241,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-[#DADADA] disabled:shadow-none"
              >
                开启对话
              </button>
              <p className="mt-4 text-xs text-[#9A9FB0]">
                左右滑动或点击箭头，选择发起对话的角色
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default CharacterSelectionPage;

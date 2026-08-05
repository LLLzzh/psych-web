import axios from "axios";
import request from "../utils/request";

export interface UploadFileResponse {
  code: number;
  msg: string;
  data: {
    url: string;
  };
}

export interface UploadedFile {
  /** 仅用于本次 PUT，不应持久化。 */
  uploadUrl: string;
  /** 持久化到 Character.image，例如 images/2026/08/04/xxx.webp。 */
  objectKey: string;
  /** 可直接用于 img src，并写入 Character.image。 */
  accessUrl: string;
}

/**
 * 获取 COS 预签名 PUT 地址并上传文件。
 * 返回去掉临时签名参数后的对象地址，供角色配置持久化。
 */
export async function uploadFile(file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await request.post<UploadFileResponse>(
    "/file/upload",
    formData
  );
  const presignedUrl = response.data.url;
  await axios.put(presignedUrl, file, {
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
  });
  const objectKey = decodeURIComponent(
    new URL(presignedUrl).pathname.replace(/^\/+/, "")
  );
  if (!objectKey) {
    throw new Error("上传成功，但未能解析 COS objectKey");
  }
  const cdnBase = import.meta.env.VITE_STATIC_CDN_BASE_URL?.trim().replace(/\/+$/, "");
  if (!cdnBase) {
    throw new Error("VITE_STATIC_CDN_BASE_URL 未配置");
  }
  return {
    uploadUrl: presignedUrl,
    objectKey,
    accessUrl: `${cdnBase}/${objectKey}`,
  };
}

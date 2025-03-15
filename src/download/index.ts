import { decrypt } from "./crypto";

export enum VideoDownloadError {
  DOWNLOAD_FAILED = "DOWNLOAD_FAILED",
  NOT_PURCHASED = "NOT_PURCHASED",
  CANCEL_DOWNLOAD = "CANCEL_DOWNLOAD"
}

export interface IVideoInfo { title: string; id: string; lang: string; s3key: string; };
export interface IOnVideoDownload {
  onBeforeDownload?: (chunkLength: number) => void;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onAllComplete?: () => void;
  onError?: (error: { id: string; message: VideoDownloadError; }) => void;
}
export interface IM3u8Data { id: string; url: string; key: ArrayBuffer; };
export type DownloadVideoFunc = (video: { dirName: string, videoInfo: IVideoInfo | IVideoInfo[]; }, onDownload?: IOnVideoDownload) => void;

export const downVideo: DownloadVideoFunc = async (video, onDownload) => {
  let dirHandle: FileSystemDirectoryHandle;
  try {
    dirHandle = await showDirectoryPicker({ mode: "readwrite" });
  } catch (error) {
    onDownload?.onError?.({ id: "0", message: VideoDownloadError.CANCEL_DOWNLOAD });
    return;
  }

  const saveVideo = async (dirName: string, videoInfo: IVideoInfo, m3u8Data: IM3u8Data) => {
    const dir = await getSaveDir(dirHandle, dirName);
    if (await isExists(dir, videoInfo.title)) {
      onDownload?.onComplete?.();
      return;
    }

    const save = await (await dir.getFileHandle(videoInfo.title, { create: true })).createWritable();
    const stream = await downStream(m3u8Data, onDownload);
    await stream.pipeTo(save, { preventClose: true });
    return save.close();
  };

  let videoInfoList = video.videoInfo;
  if (!Array.isArray(videoInfoList)) {
    videoInfoList = [videoInfoList];
  }

  for (const videoInfo of videoInfoList) {
    try {
      const m3u8Data = await getM3u8Data(videoInfo.id, videoInfo.lang, videoInfo.s3key);
      await saveVideo(video.dirName, videoInfo, m3u8Data);
    } catch (error) {
      onDownload?.onError?.({ id: videoInfo.id, message: VideoDownloadError.NOT_PURCHASED });
    }
  }
  onDownload?.onAllComplete?.();
};
// 判斷檔案是否存在
const isExists = async (dir: FileSystemDirectoryHandle, title: string) => {
  try {
    const fileHandle = await dir.getFileHandle(title);
    const file = await fileHandle.getFile();
    const fileSize = file.size;

    if (fileSize > 10240) {
      return true;
    }
  } catch (error) {
    return false;
  }
};

// 下載
const downStream = async (m3u8Data: IM3u8Data, onDownload?: IOnVideoDownload) => {
  const urlList = await getvideoChunks(m3u8Data.url);
  onDownload?.onBeforeDownload?.(urlList.length);

  const downChunk = async (url: string) => {
    const uint8Array = decrypt(await (await fetch(url)).arrayBuffer(), m3u8Data.key);
    onDownload?.onProgress?.(uint8Array.byteLength);
    return uint8Array;
  };

  const stream = new ReadableStream({
    async pull(controller) {
      if (!urlList[0]) {
        controller.close();
        onDownload?.onComplete?.();
        return;
      }

      const chunks = urlList.splice(0, 6);
      let data = await Promise.all(chunks.map(url => retryFunction(() => downChunk(url)))).catch(e => null);
      if (!data) {
        onDownload?.onError?.({ id: m3u8Data.id, message: VideoDownloadError.DOWNLOAD_FAILED });
        return;
      }
      data.forEach((value) => controller.enqueue(value));
      data = null;
      await this.pull!(controller);
    }
  });

  return stream;
};

// 重試
const retryFunction = async <T>(fn: () => Promise<T>, retries = 3, delay = 1500): Promise<T> => {
  try {
    return fn();
  } catch (error) {
    if (retries > 0) {
      console.warn(`"下载失败,正在重试,间隔 ${delay}ms"`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryFunction(fn, retries - 1, delay);
    }
    console.error("下载失败", error);
    throw error;
  }
};

// 获取保存目錄句柄
const getSaveDir = async (dir: FileSystemDirectoryHandle, name: string) => {
  const saveDir = await dir.getDirectoryHandle(name, { create: true });
  return saveDir;
};

const getM3u8Data = async (id: string, lang: string, s3key: string): Promise<IM3u8Data> => {
  const [type, num, hash] = s3key.split("/");
  const res = await fetch(`https://api.rplay-cdn.com/content/hlsstream?s3key=${lang || "kr"}/${type}/${num}/${hash}/${hash}.m3u8&token=${userData.token}&userOid=${userData.oid}&contentOid=${id}&loginType=plax&abr=true`, {
    "headers": {
      "accept": "*/*",
      "accept-language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7,ja;q=0.6,zh-CN;q=0.5",
      "sec-ch-ua": "\"Chromium\";v=\"134\", \"Not:A-Brand\";v=\"24\", \"Google Chrome\";v=\"134\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site"
    },
    "referrer": "https://rplay.live/",
    "referrerPolicy": "strict-origin-when-cross-origin",
    "body": null,
    "method": "GET",
    "mode": "cors",
    "credentials": "omit"
  });

  const m3u8Data = await res.text();
  const url = m3u8Data.split("\n").filter(s => s.includes("http")).pop() as string;
  const key = await getKey(m3u8Data);

  return { id, url, key };
};

const getKey = async (m3u8Data: string) => {
  const [url] = m3u8Data.match(/(?<=URI=")[^"]+(?=")/)!;
  return (await fetch(url)).arrayBuffer();
};

const getvideoChunks = async (url: string) => {
  const data = await (await fetch(url, {
    "headers": {
      "accept": "*/*",
      "accept-language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7,ja;q=0.6,zh-CN;q=0.5",
      "priority": "u=1, i",
      "sec-ch-ua": "\"Chromium\";v=\"134\", \"Not:A-Brand\";v=\"24\", \"Google Chrome\";v=\"134\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site"
    },
    "referrer": "https://rplay.live/",
    "referrerPolicy": "strict-origin-when-cross-origin",
    "body": null,
    "method": "GET",
    "mode": "cors",
    "credentials": "omit"
  })).text();

  const urlList = data.split("\n").filter(p => p.startsWith("http"));

  return urlList;
};
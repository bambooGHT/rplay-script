import { createWriteStream } from "streamsaver";
import { getDownloadUrlListAndKey } from "./get";
import { decrypt } from "./crypto";

/** @type {DownloadFun} */
export const download1 = async (url, title, progress) => {
  /** @type {FileSystemDirectoryHandle} */
  const getDir = await showDirectoryPicker({ mode: "readwrite" });
  const save = await (await getDir.getFileHandle(title, { create: true })).createWritable();
  const { stream } = await download(url, progress);

  await stream.pipeTo(save);
};
/** @type {DownloadFun} */
export const download2 = async (url, title, progress) => {
  const zipFileOutputStream = createWriteStream(title);
  const { stream } = await download(url, progress);

  await stream.pipeTo(zipFileOutputStream);
};
/**
 * @param {string} url
 * @param {(len:number)=>Progress} progress
 */
const download = async (url, progress) => {
  const { urlList, key } = await getDownloadUrlListAndKey(url);
  const updateProgress = progress(urlList.length);
  /** @returns {Promise<Uint8Array>} */
  const downAndDecryptFun = async (URL, retryCount = 0) => {
    try {
      const uint8Array = decrypt(await (await fetch(URL)).arrayBuffer(), key);
      updateProgress.updateProgress(uint8Array.byteLength);
      return uint8Array;
    } catch (error) {
      if (retryCount > MAX_RETRIES) {
        updateProgress.err();
        alert("下载失败");
        throw Error("下载失败");
      }
      console.log(`下载失败 正在重试. url:${URL}`);
      return downAndDecryptFun(URL, retryCount + 1);
    }
  };

  const stream = new ReadableStream({
    async pull(controller) {
      if (!urlList[0]) {
        controller.close();
        updateProgress.end();
        return;
      }

      const url = urlList.splice(0, 6);
      let datas = await Promise.all(url.map((URL) => downAndDecryptFun(URL)));
      datas.forEach((value) => controller.enqueue(value));
      datas = null;
      await this.pull(controller);
    }
  });

  return { stream };
};

/**
 * @callback DownloadFun
 * @param {string} url
 * @param {string} title
 * @param {Progress} progress
 * @returns {Promise<void>}
 */

/**
 * @typedef {object} Progress
 * @property {(value: number) => void} updateProgress
 * @property {() => void} end
 * @property {() => void} err
 */
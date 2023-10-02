import { getContentData } from "../data";
import { createWriteStream } from "streamsaver";
import { getDownloadUrlListAndKey } from "../get";
import { decrypt } from "./crypto";

/** @type {DownloadFun} */
export const download1 = async (value, title, progress) => {
  /** @type {FileSystemDirectoryHandle} */
  const getDir = await showDirectoryPicker({ mode: "readwrite" });

  const save = async (url, title) => {
    try {
      await getDir.getFileHandle(title);
      return true;
    } catch (error) {
      const save = await (await getDir.getFileHandle(title, { create: true })).createWritable();
      const { stream } = await download(url, progress);

      await stream.pipeTo(save, { preventClose: true });
      return save.close();
    }
  };

  if (typeof value === "string") {
    return save(value, title);
  }
  const updateProgress = progress(0);
  for (const item of value) {
    const { title, url } = await getContentData(item.id);
    updateProgress.updateIndex();
    const is = await save(url, title);
    if (is) updateProgress.skip();
  }
  updateProgress.downloaded();
};
/** @type {DownloadFun} */
export const download2 = async (value, title, progress) => {
  const zipFileOutputStream = createWriteStream(title);



  if (typeof value === "string") {
    const { stream } = await download(value, progress);
    return stream.pipeTo(zipFileOutputStream);
  }

  let i = 0;
  const updateProgress = progress(0);
  const readableZipStream = new ZIP({
    async pull(ctrl) {
      if (!value[i]) {
        ctrl.close();
        updateProgress.downloaded();
        return;
      }
      const process = () => {
        return new Promise(async (res) => {
          const item = value[i];
          updateProgress.updateIndex();
          const { title, url } = await getContentData(item.id);
          const { stream } = await download(url, progress);
          ctrl.enqueue({ name: title, stream: () => stream });
          i++;
          res();
        });

      };
      await process();
    }
  });

  return readableZipStream.pipeTo(zipFileOutputStream);
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
 * @param {string | idList} value
 * @param {string} title
 * @param {(len:number)=>Progress} progress
 * @returns {Promise<void>}
 */

/**
 * @typedef {object} Progress
 * @property {(value: number) => void} updateProgress
 * @property {() => void} updateIndex
 * @property {() => void} downloaded
 * @property {() => void} skip
 * @property {() => void} end
 * @property {() => void} err
 */

/**
 * @typedef {{id:string;}[]} idList
 */
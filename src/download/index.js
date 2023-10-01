import { createWriteStream } from "streamsaver";
import { getDownloadUrlListAndKey } from "./get";
import { decrypt } from "./crypto";
/** @type {DownloadFun} */
export const download1 = async (url, title) => {
  /** @type {FileSystemDirectoryHandle} */
  const getDir = await showDirectoryPicker({ mode: "readwrite" });
  const save = await (await getDir.getFileHandle(title, { create: true })).createWritable();
  const { stream } = await download(url);

  await stream.pipeTo(save);
};
/** @type {DownloadFun} */
export const download2 = async (url, title) => {
  const zipFileOutputStream = createWriteStream(title);
  const { stream } = await download(url);
  stream.pipeTo(zipFileOutputStream);
  // const readableZipStream = new ZIP({
  //   async pull(ctrl) {
  //     if (data.done) {
  //       ctrl.close();
  //       return;
  //     }
  //     ctrl.enqueue({ name: filename, stream: () => stream });
  //   }
  // });
  // if (window.WritableStream && readableZipStream.pipeTo) {
  //   readableZipStream.pipeTo(zipFileOutputStream);
  // }
};
/**
 * @param {string} url
 */
const download = async (url) => {
  const { urlList, key } = await getDownloadUrlListAndKey(url);
  /** @returns {Promise<Uint8Array>} */
  const downAndDecryptFun = async (URL, retryCount = 0) => {
    try {
      return decrypt(await (await fetch(URL)).arrayBuffer(), key);
    } catch (error) {
      if (retryCount > MAX_RETRIES) {
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
 * @returns {()=>Promise<void>}
 */
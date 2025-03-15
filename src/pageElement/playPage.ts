import { downVideo, VideoDownloadError, type IOnVideoDownload, type IVideoInfo } from "../download";
import { createButtonEl, createDomBox, createDownloadProgressEl } from "./element";
import { formatFileSize, formatVideoFilename } from "../tool";
import type { IContent } from "../types";

export const playPage = (content: IContent) => {
  if (!content.streamables
    || !document.URL.includes("play")
    || document.querySelector("#playPage")) return;
  addElement(content);
};

const addElement = async (content: IContent) => {
  const domBox = createDomBox();
  const button = createButtonEl("下载");

  domBox.id = "playPage";
  domBox.appendChild(button);

  let timer = 0;
  button.onclick = () => {
    const downloadProgressEl = domBox.querySelector("#downloadProgress") satisfies HTMLDivElement | null;
    if (downloadProgressEl && downloadProgressEl.innerText.includes("下载中")) return;

    const downProgressEl = downloadProgressEl ?? createDownloadProgressEl("下载中. 0 / 0 (0)");
    domBox.appendChild(downProgressEl);
    clearTimeout(timer);

    const { title, modified, streamables, _id, nickname } = content;
    const { lang, s3key } = streamables[0];
    const videoInfo = { title: formatVideoFilename(title, modified), id: _id, lang, s3key } satisfies IVideoInfo;

    let chunkLength = 0;
    let totalSize = 0;
    let downloadIndex = 0;
    const onDownload: IOnVideoDownload = {
      onBeforeDownload: (length: number) => {
        chunkLength = length;
        downProgressEl.innerText = `下载中. 0 / ${chunkLength} (0)`;
      },
      onProgress: (size: number) => {
        totalSize += size;
        downloadIndex += 1;
        downProgressEl.innerText = `下载中. ${downloadIndex} / ${chunkLength} (${formatFileSize(totalSize)})`;
      },
      onAllComplete() {
        downProgressEl.innerText = `下载完成. ${downloadIndex} / ${chunkLength} (${formatFileSize(totalSize)})`;
        timer = setTimeout(() => {
          domBox.removeChild(downProgressEl);
        }, 8000);
      },
      onError: (error) => {
        downProgressEl.innerText = error.message;
      },
    };

    onDownload.onBeforeDownload!(0);
    downVideo({ dirName: nickname, videoInfo }, onDownload);
  };

  await insertElement(domBox);
};

const insertElement = (dom: Element) => {
  return new Promise<void>((resolve) => {
    const insert = (e: Element) => {
      const dom1 = e.querySelector(".text-white");
      e.insertBefore(dom, dom1);
      resolve();
    };

    let el = document.querySelectorAll(".aspect-h-9")[1]?.parentElement;
    if (!el) {
      let observer = new MutationObserver(() => {
        el = document.querySelectorAll(".aspect-h-9")[1]?.parentElement;
        if (el) {
          insert(el);
          observer.disconnect();
          observer = null as any;
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return;
    }

    insert(el);
  });
};
import { downVideo, type IOnVideoDownload, type IVideoInfo, getM3u8Data } from "../download";
import { createButtonEl, createDomBox, createDownloadProgressEl, createSelectElement } from "./createElement";
import { formatFileSize, formatVideoFilename, getResolutionUrls } from "../tools";
import type { IContent } from "../types";

let content: IContent = null!;

export const playPage = (c: IContent) => {
  if (!c.canView.url || !document.URL.includes("play")) return;
  content = c;

  if (!document.querySelector("#playPage")) addElement();
};

const addElement = async () => {
  const m3u8Data = await getM3u8Data(content._id, content.canView.url);
  const qualityOptions = getResolutionUrls(m3u8Data.data);
  const domBox = createDomBox();
  const select = createSelectElement(qualityOptions, 0, (index: number) => downQualityIndex = index);
  const button = createButtonEl("下载");

  const line1Box = document.createElement("div");
  line1Box.style.display = "flex";
  line1Box.appendChild(select);
  line1Box.appendChild(button);
  
  domBox.id = "playPage";
  domBox.appendChild(line1Box);

  let downQualityIndex = 0;
  let timer = 0;
  button.onclick = () => {
    const downloadProgressEl = domBox.querySelector("#downloadProgress") satisfies HTMLDivElement | null;
    if (downloadProgressEl && downloadProgressEl.innerText.includes("下载中")) return;

    const downProgressEl = downloadProgressEl ?? createDownloadProgressEl("下载中. 0 / 0 (0)");
    domBox.appendChild(downProgressEl);
    clearTimeout(timer);

    const { title, modified, _id, nickname } = content;
    const videoInfo = { title: formatVideoFilename(title, modified), id: _id, url: qualityOptions[downQualityIndex].url, m3u8Data } satisfies IVideoInfo;

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
      const dom1 = e.querySelector(":scope > .text-white");
      e.insertBefore(dom, dom1);
      resolve();
    };

    let el = document.querySelectorAll(".aspect-h-9")[0]?.parentElement;
    if (!el) {
      let observer = new MutationObserver(() => {
        el = document.querySelectorAll(".aspect-h-9")[0]?.parentElement;
        if (el) {
          observer.disconnect();
          observer = null as any;
          insert(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return;
    }

    insert(el);
  });
};
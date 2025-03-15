import { downVideo, VideoDownloadError, type IOnVideoDownload, type IVideoInfo } from "../download";
import { formatFileSize, formatVideoFilename } from "../tool";
import type { ICreator } from "../types";
import { createButtonEl, createCheckbox, createDomBox, createDownloadProgressEl, createEl } from "./element";

export const creatorhomePage = (creator: ICreator) => {
  if (!document.URL.includes("creatorhome")
    || document.querySelector("#creatorhomePage")) return;
  addElement(creator);
};

const addElement = async (creator: ICreator) => {
  const domBox = createDomBox();
  const domRow1 = document.createElement("div");

  const downButton = createButtonEl("筛选下载");
  const selectAllButton = createButtonEl("全选(反选)");
  const filterEl = createEl("0 / 0");

  domBox.style.paddingBottom = "5px";
  domBox.id = "creatorhomePage";
  domRow1.style.display = "flex";
  domRow1.append(downButton, selectAllButton, filterEl);
  domBox.appendChild(domRow1);
  await insertElement(domBox);

  const listBox = document.querySelector(".md\\:justify-center")!.parentElement!.lastElementChild!;
  const videoIdList = new Set<string>();
  let currentPageVideoList: string[] = [];

  const uodateFilterCount = (count: number) => {
    filterEl.innerText = `${count} / ${currentPageVideoList.length}`;
  };

  const reset = () => {
    currentPageVideoList = document.URL.split("=")[1] === "contents" ? creator.published : creator.publishedReplays;
    uodateFilterCount(0);
    videoIdList.clear();
    initListCheckbox();
    observerVideoList(listBox.querySelector(".grid")!, addVideoCheckbox);
  };

  const initListCheckbox = () => {
    const list = listBox.querySelector<HTMLElement>(".grid")!;
    Array.from(list.children).forEach(el => {
      addVideoCheckbox(el as HTMLElement);
    });
  };

  const addVideoCheckbox = (el: HTMLElement) => {
    const checkbox = createCheckbox();
    checkbox.dataset["videoId"] = el.querySelector("a")!.href.split("play/")[1];
    checkbox.onchange = () => {
      const id = checkbox.dataset["videoId"]!;
      if (checkbox.checked) {
        videoIdList.add(id);
      } else {
        videoIdList.delete(id);
      }
      uodateFilterCount(videoIdList.size);
    };

    el.appendChild(checkbox);
  };

  selectAllButton.onclick = () => {
    const inputs = listBox.querySelectorAll<HTMLInputElement>(".grid div input")!;
    // 有一个未选中的场合全选, 全选的场合取消全选
    const allSelected = !Array.from(inputs).every(input => input.checked);
    inputs.forEach(input => input.checked = allSelected);

    if (allSelected) {
      uodateFilterCount(currentPageVideoList.length);
      currentPageVideoList.forEach(id => videoIdList.add(id));
      return;
    }
    uodateFilterCount(0);
    videoIdList.clear();
  };

  let timer = 0;
  downButton.onclick = () => {
    if (videoIdList.size === 0) return;

    const downloadProgressEl = domBox.querySelector("#downloadProgress") satisfies HTMLDivElement | null;
    if (downloadProgressEl && downloadProgressEl.innerText.includes("下载中")) return;

    const downProgressEl = downloadProgressEl ?? createDownloadProgressEl("下载中. [ 0 / 0 ] 0 / 0 (0)");
    domBox.appendChild(downProgressEl);
    clearTimeout(timer);

    const list = [...videoIdList].map<IVideoInfo>(p => {
      const content = creator.metadataSet.publishedContentSet[p];
      const streamInfo = content.streamables[0];

      return {
        title: formatVideoFilename(content.title, content.publishedAt || content.modified),
        id: content._id,
        lang: content.bucketRegion === "ap-northeast-1" ? "jp" : "kr",
        s3key: streamInfo.s3key
      };
    });

    let chunkLength = 0;
    let totalSize = 0;
    let downloadIndex = 0;
    let downloadChunkIndex = 0;
    let videoDownloadErrorCount: Record<VideoDownloadError, number> = {
      [VideoDownloadError.DOWNLOAD_FAILED]: 0,
      [VideoDownloadError.NOT_PURCHASED]: 0,
      [VideoDownloadError.CANCEL_DOWNLOAD]: 0
    };
    const onDownload: Required<IOnVideoDownload> = {
      onBeforeDownload: (length: number) => {
        chunkLength = length;
        downProgressEl.innerText = `下载中. [ ${downloadIndex} / ${list.length} ] 0 / ${length} (${formatFileSize(totalSize)})`;
      },
      onProgress: (size: number) => {
        totalSize += size;
        downloadChunkIndex += 1;
        downProgressEl.innerText = `下载中. [ ${downloadIndex} / ${list.length} ] ${downloadChunkIndex} / ${chunkLength} (${formatFileSize(totalSize)})`;
      },
      onComplete: () => {
        downloadIndex += 1;
        downloadChunkIndex = 0;
      },
      onAllComplete() {
        downProgressEl.innerText = `下载完成. [ ${downloadIndex} / ${list.length} ] (${formatFileSize(totalSize)})`;

        const downloadErrorInfo1 = createEl(`下载失败数量: ${videoDownloadErrorCount[VideoDownloadError.DOWNLOAD_FAILED]}`);
        const downloadErrorInfo2 = createEl(`未购买数量: ${videoDownloadErrorCount[VideoDownloadError.NOT_PURCHASED]}`);
        domBox.append(downloadErrorInfo1, downloadErrorInfo2);

        timer = setTimeout(() => {
          [downProgressEl, downloadErrorInfo1, downloadErrorInfo2].forEach(el => domBox.removeChild(el));
        }, 8000);
      },
      onError(error) {
        videoDownloadErrorCount[error.message] += 1;
        if (error.message === VideoDownloadError.CANCEL_DOWNLOAD) {
          downProgressEl.innerText = error.message;
        }
      },
    };

    downVideo({ dirName: creator.nickname, videoInfo: list }, onDownload);
  };

  observerPageToggle(listBox, reset);
  reset();
};

// 观察选项卡切换
const observerPageToggle = (el: Element, fn: () => void) => {
  const observer = new MutationObserver((mutationList) => {
    for (const item of mutationList) {
      if (item.type === "childList" && item.addedNodes.length > 0) fn();
    }
  });
  observer.observe(el, { childList: true });
};

const observerVideoList = (el: Element, fn: (node: HTMLElement) => void) => {
  const observer = new MutationObserver((mutationList) => {
    for (const item of mutationList) {
      if (item.type === "childList" && item.addedNodes.length > 0) {
        item.addedNodes.forEach(e => {
          fn(e as HTMLElement);
        });
      }
    }
  });
  observer.observe(el, { childList: true });
};

const insertElement = (dom: Element) => {
  return new Promise<void>((resolve) => {
    let el = document.querySelector(".md\\:justify-center");
    if (!el?.parentElement) {
      let observer = new MutationObserver(() => {
        el = document.querySelector(".md\\:justify-center");
        if (el?.parentElement) {
          el.parentElement.insertBefore(dom, el.nextElementSibling);
          observer.disconnect();
          observer = null as any;
          resolve();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return;
    }

    el.parentElement.insertBefore(dom, el.nextElementSibling);
    resolve();
  });
};
import { downVideo, VideoDownloadError, type IOnVideoDownload, type IVideoInfo } from "../download";
import { formatFileSize, formatVideoFilename } from "../tools";
import type { RecordContent } from "../types";
import { createCheckbox, createDownloadProgressEl, createEl } from "./createElement";

export const insertElement = (dom: Element, key: string): Promise<Element> => {
  return new Promise<Element>((resolve) => {
    let el = document.querySelector(key);

    if (!el?.parentElement) {
      let observer = new MutationObserver(() => {
        el = document.querySelector(key);
        if (el?.parentElement) {
          el.parentElement.insertBefore(dom, el.nextElementSibling || el);
          observer.disconnect();
          observer = null as any;
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return;
    }

    el.parentElement.insertBefore(dom, el.nextElementSibling || el);
    resolve(el);
  });
};

export const initListDownloadData = ({
  domBox, filterEl, listBox, selectAllButton, downButton, videoDataList, currentVideoIdList
}: InitListDataParams) => {
  const listData: ListData = {
    currentVideoIdList,
    videoIdList: new Set(),
  };

  const uodateFilterCount = (count: number) => {
    filterEl.innerText = `${count} / ${listData.currentVideoIdList.length}`;
  };

  let observer: MutationObserver;
  const observerVideoAdd = () => {
    if (observer) observer.disconnect();
    observer = observerVideoList(listBox.querySelector(".grid")!, addVideoCheckbox);
  };

  const resetData = () => {
    uodateFilterCount(0);
    listData.videoIdList.clear();
    observerVideoAdd();
  };

  const addVideoCheckbox = (el: HTMLElement) => {
    el.classList.add("video-item1");
    const checkbox = createCheckbox();
    checkbox.dataset["videoId"] = el.querySelector("a")!.href.split("?")[0].split("play/")[1];
    checkbox.onchange = () => {
      const id = checkbox.dataset["videoId"]!;
      const { videoIdList } = listData;

      if (checkbox.checked) {
        videoIdList.add(id);
      } else {
        videoIdList.delete(id);
      }
      uodateFilterCount(videoIdList.size);
    };

    el.appendChild(checkbox);
  };

  const bindElementsClickEvent = () => {
    selectAllButton.onclick = () => {
      const { videoIdList, currentVideoIdList } = listData;

      const inputs = listBox.querySelectorAll<HTMLInputElement>(".grid div input")!;
      const allSelected = !Array.from(inputs).every(input => input.checked);
      inputs.forEach(input => input.checked = allSelected);

      if (allSelected) {
        uodateFilterCount(currentVideoIdList.length);
        currentVideoIdList.forEach(id => videoIdList.add(id));
        return;
      }
      resetData();
    };

    downButton.onclick = async () => {
      const { videoIdList } = listData;
      if (videoIdList.size === 0) return;

      const list = getDownloadList(listData.videoIdList, videoDataList);
      const nikiname = Object.values(videoDataList)[0].nickname;
      downloadVideo(nikiname, list, domBox);
    };
  };

  const initListCheckbox = () => {
    const list = listBox.querySelector<HTMLElement>(".grid")!;
    Array.from(list.children).forEach(el => {
      addVideoCheckbox(el as HTMLElement);
    });
  };

  resetData();
  initListCheckbox();
  bindElementsClickEvent();
  return { listData, resetData, initListCheckbox };
};

const getDownloadList = (idList: Set<string>, videoDataList: RecordContent) => {
  return [...idList].map<IVideoInfo>(p => {
    const content = videoDataList[p];
    const streamInfo = content.streamables[0];

    return {
      title: formatVideoFilename(content.title, content.publishedAt || content.modified),
      id: content._id,
      lang: content.bucketRegion === "ap-northeast-1" ? "jp" : "kr",
      s3key: streamInfo.s3key
    };
  });
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
  return observer;
};


let timer: number;
const downloadVideo = (dirName: string, list: IVideoInfo[], domBox: HTMLElement) => {
  const downloadProgressEl = domBox.querySelector("#downloadProgress") satisfies HTMLDivElement | null;
  if (downloadProgressEl && downloadProgressEl.innerText.includes("下载中")) return;

  const downProgressEl = downloadProgressEl ?? createDownloadProgressEl("下载中. [ 0 / 0 ] 0 / 0 (0)");
  domBox.appendChild(downProgressEl);
  clearTimeout(timer);

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

  downVideo({ dirName, videoInfo: list }, onDownload);
};

type InitListDataParams = {
  videoDataList: RecordContent;
  currentVideoIdList: string[];
  domBox: HTMLElement;
  filterEl: HTMLElement;
  selectAllButton: HTMLElement;
  listBox: Element;
  downButton: HTMLElement;
};


type ListData = {
  currentVideoIdList: string[];
  videoIdList: Set<string>;
};

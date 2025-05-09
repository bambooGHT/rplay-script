import type { ICreator } from "../types";
import { createDownloadElement, createButtonEl, createCheckbox, createDomBox, createDownloadProgressEl, createEl } from "./createElement";
import { initListDownloadData, insertElement } from "./tools";

export const creatorhomePage = (creator: ICreator) => {
  if (!document.URL.includes("creatorhome")
    || document.querySelector("#creatorhomePage")) return;
  addElement(creator);
};

const addElement = async (creator: ICreator) => {
  const { domBox, selectAllButton, downButton, filterEl } = createDownloadElement();
  domBox.id = "creatorhomePage";

  const dom = await insertElement(domBox, ".md\\:justify-center");

  const listBox = dom.parentElement!.lastElementChild!;

  const { listData, resetData, initListCheckbox } = initListDownloadData({
    videoDataList: creator.metadataSet.publishedContentSet,
    domBox,
    filterEl,
    selectAllButton,
    listBox,
    downButton,
    currentVideoIdList: document.URL.split("=")[1] === "contents" ? creator.published : creator.publishedReplays
  });

  const reset = () => {
    listData.currentVideoIdList = document.URL.split("=")[1] === "contents" ? creator.published : creator.publishedReplays;
    resetData();
    initListCheckbox();
  };

  observerPageToggle(listBox, reset);
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
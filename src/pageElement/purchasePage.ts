import type { RecordContent } from "../types";
import { createDownloadElement } from "./createElement";
import { initListDownloadData, insertElement } from "./tools";

export const purchasePage = (contents: RecordContent) => {
  if (!document.URL.includes("myinfo?tab=purchase")
    || document.querySelector("#purchasePage")) return;

  addElement(contents);
};

const addElement = async (contents: RecordContent) => {
  const { domBox, filterEl, downButton, selectAllButton } = createDownloadElement();
  domBox.id = "purchasePage";

  const dom = await insertElement(domBox, '[style*="margin-top: 36px"] > div:nth-of-type(2) > div:nth-of-type(3)');
  initListDownloadData({
    videoDataList: contents,
    domBox,
    filterEl,
    selectAllButton,
    listBox: dom,
    downButton,
    currentVideoIdList: Object.keys(contents)
  });
};
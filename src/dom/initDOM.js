import { videoData } from "../data";
import { download1, download2 } from "../download";
import { clacSize } from "../get";
import { initVideo } from "./play";
import { createDOM, createDivBox, createSelectDOM } from "./createDOM";

export const initDOM = async () => {
  const div = createDivBox("0 0 0 5px");
  const div1 = createDivBox("0 0 0 5px");
  if (!await addDOM([div, div1])) return;

  let isDown = false;
  const { title, downloadIndex, urls } = videoData;
  div.appendChild(createSelectDOM(videoData.urls, downloadIndex, (e) => {
    videoData.downloadIndex = +e.target.value;
  }));
  div.appendChild(createDOM("播放", () => {
    const VIDEODOM = document.querySelector("#play-view").children[0].children[0].children[0];
    initVideo(urls[videoData.downloadIndex].url, VIDEODOM);
  }));

  const down = async (index) => {
    if (isDown) {
      alert("已经在下载中");
      return;
    }
    isDown = true;
    const { fun, remove } = await createProgressDOM();
    try {
      const URL = urls[videoData.downloadIndex].url;
      if (index === 1) {
        await download1(URL, title, fun);
      } else {
        await download2(URL, title, fun);
      }
      isDown = false;
    } catch (error) {
      remove(3000);
    }
  };

  div1.appendChild(createDOM("下载1 (Chrome | edge)(推荐)", () => {
    down(1);
  }));
  div1.appendChild(createDOM("下载2", () => {
    down(2);
  }));
};

const createProgressDOM = async () => {
  const divBox = createDivBox("0.55rem 0 0 0");
  const DOM = await addDOM([divBox]);
  if (!DOM) return;
  const remove = (time = 5500) => {
    setTimeout(() => {
      DOM.removeChild(divBox);
    }, time);
  };

  divBox.appendChild(createDOM(``, () => { }));

  const div = divBox.children[0];

  return {
    fun: (len) => {
      div.innerHTML = `下载中 ${0} / ${len} (0)`;

      let i = 0;
      let size = 0;

      const updateProgress = (value) => {
        size += value;
        div.innerHTML = `下载中 ${++i} / ${len} (${clacSize(size)})`;
      };
      const end = () => {
        div.innerHTML = `下载完成 ${i} / ${len} (${clacSize(size)})`;
        remove();
      };
      const err = () => {
        div.innerHTML = `下载失败!`;
        remove();
      };
      return {
        updateProgress, end, err
      };
    },
    remove
  };
};

const addDOM = (doms, index = 0) => {
  return new Promise((res) => {
    if (index > 4) {
      res(undefined);
      return;
    }
    ++index;
    let infoDOM = document.querySelector(".w-player")?.children[1];
    if (!infoDOM) infoDOM = document.querySelector("#play-view > div.inline-block.min-h-screen.w-full.align-top > div:nth-child(1)")?.children[1];
    if (infoDOM?.nodeName === "DIV") {
      if (!document.URL.includes("play/")) return;
      const firstDOM = infoDOM.firstChild;
      doms.forEach((dom) => {
        infoDOM.insertBefore(dom, firstDOM);
      });
      res(infoDOM);
      return;
    }

    setTimeout(() => {
      res(addDOM(doms, index));
    }, 300);
  });
};
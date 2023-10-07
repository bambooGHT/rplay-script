import { videoData } from "../data";
import { download1, download2 } from "../download";
import { clacSize } from "../get";
import { initVideo } from "./play";
import { createDOM, createDivBox, createSelectDOM } from "./createDOM";

export const initDOM = async () => {
  const div = createDivBox("0.55rem 0 0 5px");
  const div1 = createDivBox("0 0 0 5px");
  if (!await addDOM([div, div1])) return;

  let isDown = false;
  const { title, downloadIndex, urls, m3u8Data } = videoData;
  div.appendChild(createSelectDOM(videoData.urls, downloadIndex, (e) => {
    videoData.downloadIndex = +e.target.value;
  }));
  div.appendChild(createDOM("播放", () => {
    const VIDEODOM = document.querySelector("#play-view").children[0].children[0].children[0];
    initVideo(m3u8Data, VIDEODOM);
  }));

  const down = async (index) => {
    if (isDown) {
      alert("已经在下载中");
      return;
    }
    isDown = true;
    const { fun, remove } = await createProgressDOM();
    try {
      if (index === 1) {
        await download1(urls[videoData.downloadIndex].url, title, fun);
      } else {
        await download2(urls[videoData.downloadIndex].url, title, fun);
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

  divBox.appendChild(createDOM(``, () => {
    initVideo(m3u8Data);
  }));

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
    const infoDOM = document.querySelector(".text-lg")?.parentElement?.parentElement;

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
    }, 250);
  });
};
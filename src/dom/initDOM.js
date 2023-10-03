import { videoData } from "../data";
import { download1, download2 } from "../download";
import { clacSize } from "../get";
import { initVideo } from "../play";
import { createDOM, createDivBox, createSelectDOM } from "./createDOM";

export const initDOM = async () => {
  const div = createDivBox();
  await addDOM(div);

  let isDown = false;
  const { title, downloadIndex, urls, m3u8Data } = videoData;
  div.appendChild(createSelectDOM(videoData.urls, downloadIndex, (e) => {
    videoData.downloadIndex = +e.target.value;
  }));
  div.appendChild(createDOM("播放", () => {
    initVideo(m3u8Data);
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

  div.appendChild(createDOM("下载1 (Chrome | edge)", () => {
    down(1);
  }));
  div.appendChild(createDOM("下载2", () => {
    down(2);
  }));
};

const createProgressDOM = async () => {
  const divBox = createDivBox();
  const DOM = await addDOM(divBox);
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

const addDOM = (dom) => {
  return new Promise((res) => {
    const infoDOM = document.querySelector(".w-player").children[1];

    if (infoDOM?.nodeName === "DIV") {
      const firstDOM = infoDOM.firstChild;
      infoDOM.insertBefore(dom, firstDOM);
      res(infoDOM);
      return;
    }

    setTimeout(() => {
      res(addDOM(dom));
    }, 250);
  });
};
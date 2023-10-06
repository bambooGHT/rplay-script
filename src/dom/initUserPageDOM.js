import { createDivBox, createDOM, createInput } from "./createDOM";
import { download1, download2 } from "../download";
import { clacSize } from "../get";
import { clipPlay } from "./clipsPlay";

/**
 * @typedef {import("../types.js").VideoList} VideoList 
 * @typedef {import("../types.js").StoryList} StoryList
 */

let unObserverList = [];
/** @type {{normalPosts:Record<string,string>}} */
const data = {};
export const updateNormalPosts = (normalPosts) => {
  data.normalPosts = normalPosts.reduce((result, value) => {
    result[value._id] = value.text;
    return result;
  }, {});
};
/**
 * @param {VideoList} videoList 
 * @param {StoryList} storyList
 * @param {string} userName 
 */
export const initUserPageDOM = async (videoList, storyList, userName) => {
  unObserverList.forEach(p => p());
  unObserverList = [];

  const processDom = initProgressDom();
  const tipDom = initSelectDom(videoList, storyList);
  const downDom = initDownDom(videoList, storyList, userName);

  const [listDOM, clipDOM] = await addDOM([processDom, tipDom, downDom]);
  listAddCheck(false, listDOM, [videoList, storyList]);
  if (clipDOM) listAddCheck(true, clipDOM, [videoList], clipPlay);
};

const initProgressDom = () => {
  const processDom = createDivBox("0.55rem 0 0");
  processDom.id = "processDom";
  processDom.appendChild(createDOM("默认下载最高画质"));

  return processDom;
};

const initSelectDom = (videoList, storyList) => {
  const tipDom = createDivBox("0.1rem 0 0");
  let videoIsDown = true;
  let storyIsDown = true;

  tipDom.appendChild(createDOM("(全部|取消)勾选", () => {
    Object.values(videoList).forEach((p) => {
      if (!p.input) return;
      p.isDown = videoIsDown;
      p.input.checked = videoIsDown;
    });
    videoIsDown = !videoIsDown;
  }));

  if (Object.values(storyList).length) tipDom.appendChild(createDOM("(全部|取消)勾选合集", () => {
    Object.values(storyList).forEach((p) => {
      p.isDown = storyIsDown;
      p.input.checked = storyIsDown;
    });
    storyIsDown = !storyIsDown;
  }));

  return tipDom;
};
/**
 * @param {VideoList} videoList 
 * @param {StoryList} storyList
 * @param {string} userName 
 */
const initDownDom = (videoList, storyList, userName) => {
  const downDom = createDivBox("0.1rem 0 0");

  let isDown = false;
  const down = async (downloadType) => {
    if (isDown) {
      alert("已经在下载中");
      return;
    }
    isDown = true;

    const filterStorys = Object.values(storyList).filter((p) => p.isDown);
    const storyIds = new Set(filterStorys.flatMap((p) => p.ids));
    const downloadList = Object.values(videoList).filter((p) => {
      return p.isDown || storyIds.has(p.id);
    });

    if (!downloadList.length) {
      alert("未选择视频/合集");
      return;
    }

    const { fun, remove } = createProgressDOM(downloadList.length);
    try {
      if (downloadType === 1) {
        await download1(downloadList, "", fun);
      } else {
        await download2(downloadList, `${userName}.zip`, fun);
      }
      isDown = false;
    } catch (error) {
      console.warn(error);
      remove(3000);
    }
  };

  downDom.appendChild(createDOM("下载1 (会跳过已下载的文件)", () => {
    down(1);
  }));

  downDom.appendChild(createDOM("下载2 (压缩包)", () => {
    down(2);
  }));

  return downDom;
};


/**
 * @param {boolean} isClip
 * @param {HTMLDivElement} listDOM
 * @param {[VideoList,StoryList]} dataList 
 * @param {(id:string)=>void} fun 
 */
const listAddCheck = (isClip, listDOM, dataList, fun) => {
  const [videoList, storyList] = dataList;
  let addFun = undefined;
  if (isClip) {
    const ids = Object.values(videoList);
    addFun = (dom, index = 0) => {
      if (dom.textContent.length < 10) {
        if (index++ < 5) setTimeout(() => {
          addFun(dom, index);
        }, 250);
        return;
      }
      const { id } = ids.find(p => dom.textContent.includes(p.orName)) || {};

      if (id) {
        const input = createInput("checkbox");
        const playDOM = createDOM("play");

        playDOM.classList.add("playDOM");
        playDOM.onclick = () => fun(videoList[id].id);
        input.onchange = () => { videoList[id].isDown = input.checked; };

        videoList[id].input = input;
        dom.append(input, playDOM);
      }
    };
  } else {
    const ids = Object.keys(videoList);
    addFun = (dom) => {
      dom.style.position = "relative";

      const url = dom.querySelector("a").href;
      const { list, split } = url.includes("scenario") ?
        { list: storyList, split: "scenario/" } : { list: videoList, split: "play/" };

      let id = url.split(split)[1]?.replaceAll("/", "");

      if (!id) {
        if (!data.normalPosts) return;
        const id1 = url.split("creatorhome/")[1]?.replace("/detail", "");
        const text = data.normalPosts[id1];
        id = ids.find(p => text.includes(p));
        if (!id) return;
      };

      const input = createInput("checkbox");
      input.onchange = () => { list[id].isDown = input.checked; };
      list[id].input = input;
      dom.appendChild(input);
    };
  }

  const observer = new MutationObserver(function (mutationRecoards, observer) {
    for (const item of mutationRecoards) {
      if (item.type === 'childList') {
        /** @type {HTMLDivElement} */
        const DOM = item.addedNodes[0];
        addFun(DOM);
      }
    }
  });

  unObserverList.push(() => {
    observer.disconnect();
  });

  observer.observe(listDOM, { childList: true });

  [...listDOM.children].forEach(addFun);
};
/**
 * @param {HTMLDivElement[]} doms 
 * @returns {Promise<[HTMLDivElement,HTMLDivElement]>}
 */
const addDOM = (doms) => {
  return new Promise((res) => {
    const publishedContentDOM = [...document.querySelectorAll(".min-h-screen")];
    /** @type {HTMLDivElement} */
    const DOM = publishedContentDOM[publishedContentDOM.length - 1].firstChild?.firstChild;
    let listDOM = DOM.querySelectorAll(".grid");

    if (DOM?.nodeName === "DIV" && listDOM.length) {
      const firstDOM = DOM.children[1];
      doms.forEach((p) => {
        DOM.insertBefore(p, firstDOM);
      });

      let clipDOM = document.querySelector(".vue-recycle-scroller__item-wrapper");
      res([listDOM[0], clipDOM]);
      return;
    }

    setTimeout(() => {
      res(addDOM(doms));
    }, 250);
  });
};

const createProgressDOM = (len) => {
  const DOM = document.getElementById("processDom");
  const div = createDOM("");
  DOM.appendChild(div);

  const remove = (time = 5500) => {
    setTimeout(() => {
      DOM.removeChild(div);
    }, time);
  };

  let i = 0;
  let size = 0;

  div.innerHTML = `下载中 ${0} / ${len} (0)`;

  return {
    fun: () => {

      const updateProgress = (value) => {
        size += value;
        div.innerHTML = `下载中 ${i} / ${len} (${clacSize(size)})`;
      };

      const updateIndex = () => {
        i += 1;
        updateProgress(0);
      };

      const skip = () => {
        --i;
        --len;
      };

      const downloaded = () => {
        div.innerHTML = `下载完成 ${i} / ${len} (${clacSize(size)})`;
        remove();
      };

      const err = () => {
        div.innerHTML = `下载失败!`;
        remove();
      };

      return {
        updateProgress, end: () => { }, skip, downloaded, updateIndex, err
      };
    },
    remove
  };
};
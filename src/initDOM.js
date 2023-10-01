import { videoData } from "./data";
import { download1, download2 } from "./download";
import { initVideo } from "./play";

export const initDOM = async () => {
  const div = createDivBox();
  addDOM(div);

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
    const { fun, remove } = createProgressDOM();
    try {
      if (index === 1) {
        await download1(urls[videoData.downloadIndex].url, title, fun);
      } else {
        await download2(urls[videoData.downloadIndex].url, title, fun);
      }
      isDown = false;
    } catch (error) {
      remove(100);
    }
  };

  div.appendChild(createDOM("下载1 (Chrome | edge)", () => {
    down(1);
  }));
  div.appendChild(createDOM("下载2", () => {
    down(2);
  }));
};

const createProgressDOM = () => {
  const divBox = createDivBox();
  const DOM = addDOM(divBox);
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

const createDivBox = () => {
  const div = document.createElement("div");
  div.style.width = "100%";
  div.style.display = "flex";
  div.style.marginTop = "0.7rem";

  return div;
};

const addDOM = (dom) => {
  const infoDOM = document.querySelector(".w-player").children[1];
  const firstDOM = infoDOM.firstChild;
  infoDOM.insertBefore(dom, firstDOM);

  return infoDOM;
};
/**
  * @param {string} name 
  * @param {()=>void} fun 
  */
const createDOM = (name, fun) => {
  const tempDOM = `
  <div
    class="plax-button cursor-pointer px-4 py-2 hover:opacity-75 mb-2 mr-2 h-8 whitespace-nowrap px-4 text-md  bg-plaxgray-170 text-plaxgray-90"
    style="border-radius: 6px; margin:0 8px 0 0;">
    ${name}
  </div>`;
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = tempDOM;
  /** @type {HTMLDivElement} */
  const DOM = tempDiv.children[0];
  DOM.onclick = fun;
  return DOM;
};
/**
 * @param {videoUrls} urls
 * @param {number} selectIndex
 * @param {()=>void} fun
 */
const createSelectDOM = (urls, selectIndex, fun) => {
  const select = document.createElement("select");
  select.style.backgroundColor = "rgba(31,31,35,var(--tw-bg-opacity))";
  select.style.height = "32px";
  select.style.outline = "0";
  select.style.margin = "0 8px 0 0";
  select.style.cursor = "pointer";

  select.innerHTML = urls.reduce((result, value, index) => {
    const [left, right] = value.resolution.split("x");
    result += `<option value="${index}" ${index === selectIndex ? "selected" : ""}>
      ${right}p
    </option>`;
    return result;
  }, "");
  select.onchange = fun;

  return select;
};

const clacSize = (size) => {
  const aMultiples = ['B', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
  const bye = 1024;

  if (size < bye) return size + aMultiples[0];
  let i = 0;

  for (var l = 0; l < 8; l++) {
    if (size / Math.pow(bye, l) < 1) break;
    i = l;
  }

  return `${(size / Math.pow(bye, i)).toFixed(2)}${aMultiples[i]}`;
};
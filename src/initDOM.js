import { videoData } from "./data";
import { download1, download2 } from "./download";
import { initVideo } from "./play";

export const initDOM = async () => {
  const infoDOM = document.querySelector(".w-player").children[1];
  const firstDOM = infoDOM.firstChild;
  const div = createDivBox();
  infoDOM.insertBefore(div, firstDOM);

  const { title, downloadIndex, urls, m3u8Data } = videoData;
  div.appendChild(createSelectDOM(videoData.urls, downloadIndex, (e) => {
    videoData.downloadIndex = +e.target.value;
  }));
  div.appendChild(createDownloadDOM("播放", () => {
    initVideo(m3u8Data);
  }));
  div.appendChild(createDownloadDOM("下载1 (Chrome | edge)", () => {
    download1(urls[videoData.downloadIndex].url, title);
  }));
  div.appendChild(createDownloadDOM("下载2", () => {
    download2(urls[videoData.downloadIndex].url, title);
  }));
};

const createDivBox = () => {
  const div = document.createElement("div");
  div.style.width = "100%";
  div.style.display = "flex";
  div.style.marginTop = "0.7rem";

  return div;
};
/**
  * @param {string} name 
  * @param {()=>void} fun 
  */
const createDownloadDOM = (name, fun) => {
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
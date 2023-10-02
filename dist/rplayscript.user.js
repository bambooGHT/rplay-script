// ==UserScript==
// @name         rplayScript
// @namespace    https://github.com/bambooGHT
// @version      1.0
// @author       bambooGHT
// @description  支持个人页面直接下载(默认最高画质),视频页面可以播放
// @icon         https://www.google.com/s2/favicons?sz=64&domain=rplay.live
// @match        https://rplay.live/*
// @require      https://jimmywarting.github.io/StreamSaver.js/examples/zip-stream.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// @require      https://cdn.jsdelivr.net/npm/streamsaver@2.0.6/StreamSaver.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/video.js/8.5.2/video.min.js
// @grant        none
// ==/UserScript==

(function (streamsaver, cryptoJs, videojs) {
  'use strict';

  const getDownloadUrlListAndKey = async (url) => {
    const data = await (await fetch(url)).text();
    const key = await getKey(data);
    const urlList = data.replaceAll("\n", "").split(/#EXTINF:\d{1,3},/).slice(1);
    const urlListLast = urlList[urlList.length - 1];
    urlList[urlList.length - 1] = urlListLast.replace("#EXT-X-ENDLIST", "");
    return { urlList, key };
  };
  const getResolutionUrls = (m3u8Data2) => {
    const urlArray = m3u8Data2.split("\n").filter((s) => s.includes("http")).slice(1);
    const RESOLUTIONS = m3u8Data2.split("\n").filter((s) => s.includes("RESOLUTION"));
    return RESOLUTIONS.reduce((result, p, index) => {
      const [resolution] = p.match(new RegExp("(?<=RESOLUTION=).*?(?=,)"));
      result.push({
        resolution,
        url: urlArray[index]
      });
      return result;
    }, []);
  };
  const getKey = async (m3u8Data2) => {
    const [url] = m3u8Data2.match(new RegExp('(?<=URI=")[^"]+(?=")'));
    return await (await fetch(url, {
      headers: {
        Age: String(Date.now()).slice(-4)
      }
    })).arrayBuffer();
  };
  const clacSize = (size) => {
    const aMultiples = ["B", "K", "M", "G", "T", "P", "E", "Z", "Y"];
    const bye = 1024;
    if (size < bye)
      return size + aMultiples[0];
    let i = 0;
    for (var l = 0; l < 8; l++) {
      if (size / Math.pow(bye, l) < 1)
        break;
      i = l;
    }
    return `${(size / Math.pow(bye, i)).toFixed(2)}${aMultiples[i]}`;
  };
  const userData = (() => {
    const { AccountModule: data } = JSON.parse(localStorage.getItem("vuex") || `{}`);
    if (!data.token) {
      alert("需要登陆才行,登录后刷新页面");
      return {};
    }
    const { userInfo: { oid, token } } = data;
    return { oid, token };
  })();
  const videoData = { m3u8Data: "", downloadIndex: 0, title: "", urls: [] };
  const updateVideoData = async (title, s3Key) => {
    const { m3u8Data: m3u8Data2, urls } = await getm3u8data(s3Key);
    videoData.title = title;
    videoData.m3u8Data = m3u8Data2;
    videoData.urls = urls;
    videoData.downloadIndex = urls.length - 1;
  };
  const getM3u8Url = (s3Key) => {
    const [type, num, hash] = s3Key.split("/");
    return `https://api.rplay.live/content/hlsstream?s3key=kr/${type}/${num}/${hash}/${hash}.m3u8&token=${userData.token}&userOid=${userData.oid}&contentOid=6515cda280c7fc6b98065cbe&loginType=plax&abr=false`;
  };
  const getContentData = async (contentId) => {
    const url = `https://api.rplay.live/content?contentOid=${contentId}&status=published&withComments=true&withContentMetadata=false&requestCanView=true&lang=jp&requestorOid=${userData.oid}&loginType=plax`;
    const data = await (await fetch(url)).json();
    const { title, modified, streamables } = data;
    const { s3key } = streamables[0];
    const { urls } = await getm3u8data(s3key);
    return {
      title: formatTitle(title, modified),
      url: urls[urls.length - 1].url
    };
  };
  const getm3u8data = async (s3Key) => {
    const m3u8Data2 = await (await fetch(getM3u8Url(s3Key))).text();
    const urls = getResolutionUrls(m3u8Data2);
    return { m3u8Data: m3u8Data2, urls };
  };
  const formatTitle = (title, modified) => {
    return `[${modified.slice(0, 10)}] ${title.replaceAll(":", ".")}.ts`.replace(/[<>/\\? \*]/g, "");
  };
  const decrypt = (m3u8Data2, key) => {
    const encryptedData = new Uint8Array(m3u8Data2);
    const ciphertext = cryptoJs.lib.WordArray.create(encryptedData);
    const Key = cryptoJs.lib.WordArray.create(key);
    const ops = {
      iv: cryptoJs.lib.WordArray.create(16),
      mode: cryptoJs.mode.CBC,
      padding: cryptoJs.pad.Pkcs7
    };
    const decrypted = cryptoJs.AES.decrypt({ ciphertext }, Key, ops);
    return wordArrayToUint8Array(decrypted);
  };
  function wordArrayToUint8Array(wordArray) {
    const len = wordArray.sigBytes;
    const words = wordArray.words;
    const uint8Array = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      uint8Array[i] = words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
    }
    return uint8Array;
  }
  const download1 = async (value, title, progress) => {
    const getDir = await showDirectoryPicker({ mode: "readwrite" });
    const save = async (url, title2) => {
      try {
        await getDir.getFileHandle(title2);
        return true;
      } catch (error) {
        const save2 = await (await getDir.getFileHandle(title2, { create: true })).createWritable();
        const { stream } = await download(url, progress);
        await stream.pipeTo(save2, { preventClose: true });
        return save2.close();
      }
    };
    if (typeof value === "string") {
      return save(value, title);
    }
    const updateProgress = progress(0);
    for (const item of value) {
      const { title: title2, url } = await getContentData(item.id);
      updateProgress.updateIndex();
      const is = await save(url, title2);
      if (is)
        updateProgress.skip();
    }
    updateProgress.downloaded();
  };
  const download2 = async (value, title, progress) => {
    const zipFileOutputStream = streamsaver.createWriteStream(title);
    if (typeof value === "string") {
      const { stream } = await download(value, progress);
      return stream.pipeTo(zipFileOutputStream);
    }
    let i = 0;
    const updateProgress = progress(0);
    const readableZipStream = new ZIP({
      async pull(ctrl) {
        if (!value[i]) {
          ctrl.close();
          updateProgress.downloaded();
          return;
        }
        const process = () => {
          return new Promise(async (res) => {
            const item = value[i];
            updateProgress.updateIndex();
            const { title: title2, url } = await getContentData(item.id);
            const { stream } = await download(url, progress);
            ctrl.enqueue({ name: title2, stream: () => stream });
            i++;
            res();
          });
        };
        await process();
      }
    });
    return readableZipStream.pipeTo(zipFileOutputStream);
  };
  const download = async (url, progress) => {
    const { urlList, key } = await getDownloadUrlListAndKey(url);
    const updateProgress = progress(urlList.length);
    const downAndDecryptFun = async (URL2, retryCount = 0) => {
      try {
        const uint8Array = decrypt(await (await fetch(URL2)).arrayBuffer(), key);
        updateProgress.updateProgress(uint8Array.byteLength);
        return uint8Array;
      } catch (error) {
        if (retryCount > MAX_RETRIES) {
          updateProgress.err();
          alert("下载失败");
          throw Error("下载失败");
        }
        console.log(`下载失败 正在重试. url:${URL2}`);
        return downAndDecryptFun(URL2, retryCount + 1);
      }
    };
    const stream = new ReadableStream({
      async pull(controller) {
        if (!urlList[0]) {
          controller.close();
          updateProgress.end();
          return;
        }
        const url2 = urlList.splice(0, 6);
        let datas = await Promise.all(url2.map((URL2) => downAndDecryptFun(URL2)));
        datas.forEach((value) => controller.enqueue(value));
        datas = null;
        await this.pull(controller);
      }
    });
    return { stream };
  };
  const initVideo = (m3u8Data2) => {
    const video = createVideo();
    const blob = new Blob([m3u8Data2], { type: "application/x-mpegURL" });
    const url = URL.createObjectURL(blob);
    videojs(video, {
      controlBar: {
        pictureInPictureToggle: true
      },
      controls: true,
      autoplay: false,
      loop: false,
      preload: "auto",
      playbackRates: [0.5, 1, 1.5, 2, 2.5, 3],
      sources: [{
        src: url,
        type: "application/x-mpegURL"
      }],
      experimentalSvgIcons: true,
      disablepictureinpicture: false,
      bigPlayButton: true,
      pip: true,
      enableDocumentPictureInPicture: false
    }, () => URL.revokeObjectURL(url));
  };
  const createVideo = () => {
    const VIDEODOM = document.querySelector(".w-player").children[0];
    const tempVideo = `
  <video id="myVideo" class="video-js vjs-big-play-centered vjs-fluid">
    <p class="vjs-no-js">
      To view this video please enable JavaScript, and consider upgrading to a
      web browser that
      <a href="https://videojs.com/html5-video-support/" target="_blank">
        supports HTML5 video
      </a>
    </p>
  </video>`;
    VIDEODOM.innerHTML = tempVideo;
    return VIDEODOM.children[0];
  };
  const createDivBox = () => {
    const div = document.createElement("div");
    div.style.width = "100%";
    div.style.display = "flex";
    div.style.marginTop = "0.7rem";
    return div;
  };
  const createDOM = (name, fun) => {
    const tempDOM = `
  <div
    class="plax-button cursor-pointer px-4 py-2 hover:opacity-75 mb-2 mr-2 h-8 whitespace-nowrap px-4 text-md  bg-plaxgray-170 text-plaxgray-90"
    style="border-radius: 6px; margin:0 8px 0 0;">
    ${name}
  </div>`;
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = tempDOM;
    const DOM = tempDiv.children[0];
    DOM.onclick = fun;
    return DOM;
  };
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
  const createInput = (type) => {
    const input = document.createElement("input");
    input.type = type;
    input.style.position = "absolute";
    input.style.width = "18px";
    input.style.height = "18px";
    input.style.top = "0";
    input.style.left = "0";
    input.style.margin = "7px 7px";
    input.style.zIndex = "99999";
    return input;
  };
  const initDOM = async () => {
    const div = createDivBox();
    addDOM$1(div);
    let isDown = false;
    const { title, downloadIndex, urls, m3u8Data: m3u8Data2 } = videoData;
    div.appendChild(createSelectDOM(videoData.urls, downloadIndex, (e) => {
      videoData.downloadIndex = +e.target.value;
    }));
    div.appendChild(createDOM("播放", () => {
      initVideo(m3u8Data2);
    }));
    const down = async (index) => {
      if (isDown) {
        alert("已经在下载中");
        return;
      }
      isDown = true;
      const { fun, remove } = createProgressDOM$1();
      try {
        if (index === 1) {
          await download1(urls[videoData.downloadIndex].url, title, fun);
        } else {
          await download2(urls[videoData.downloadIndex].url, title, fun);
        }
        isDown = false;
      } catch (error) {
        remove(3e3);
      }
    };
    div.appendChild(createDOM("下载1 (Chrome | edge)", () => {
      down(1);
    }));
    div.appendChild(createDOM("下载2 (压缩包)", () => {
      down(2);
    }));
  };
  const createProgressDOM$1 = () => {
    const divBox = createDivBox();
    const DOM = addDOM$1(divBox);
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
          updateProgress,
          end,
          err
        };
      },
      remove
    };
  };
  const addDOM$1 = (dom) => {
    const infoDOM = document.querySelector(".w-player").children[1];
    const firstDOM = infoDOM.firstChild;
    infoDOM.insertBefore(dom, firstDOM);
    return infoDOM;
  };
  const initUserPageDOM = (contentIds, userName) => {
    const selectList = contentIds.map((p) => {
      return {
        id: p,
        isDown: false,
        input: void 0
      };
    });
    selectList.reverse();
    const tipDom = createDivBox();
    const div = createDivBox();
    tipDom.id = "tipDom";
    addDOM(tipDom, div, selectList);
    let isCheck = true;
    let isDown = false;
    tipDom.appendChild(createDOM("勾选后点下载,默认为最高画质"));
    tipDom.appendChild(createDOM("全部勾选/取消勾选", () => {
      selectList.forEach((p) => {
        p.isDown = isCheck;
        p.input.checked = isCheck;
      });
      isCheck = !isCheck;
    }));
    const down = async (downloadType) => {
      if (isDown) {
        alert("已经在下载中");
        return;
      }
      isDown = true;
      const isList = selectList.filter((p) => p.isDown);
      if (!isList.length) {
        alert("未选择视频");
        return;
      }
      const { fun, remove } = createProgressDOM(isList.length);
      try {
        if (downloadType === 1) {
          await download1(isList, "", fun);
        } else {
          await download2(isList, `${userName}.zip`, fun);
        }
        isDown = false;
      } catch (error) {
        console.log(error);
        remove(3e3);
      }
    };
    div.appendChild(createDOM("下载1 (会跳过已下载的文件)", () => {
      down(1);
    }));
    div.appendChild(createDOM("下载2 (压缩包)", () => {
      down(2);
    }));
  };
  const addDOM = (tipDom, dom, selectList) => {
    var _a;
    const publishedContentDOM = [...document.querySelectorAll(".min-h-screen")];
    const DOM = publishedContentDOM[publishedContentDOM.length - 1].firstChild.firstChild;
    const listDOM = (_a = DOM.children[1]) == null ? void 0 : _a.children[1];
    const firstDOM = DOM.children[1];
    if (DOM.nodeName !== "DIV") {
      setTimeout(() => {
        addDOM(tipDom, dom, selectList);
      }, 250);
      return;
    }
    DOM.insertBefore(tipDom, firstDOM);
    DOM.insertBefore(dom, firstDOM);
    listAddCheck([...listDOM.children], selectList);
  };
  const listAddCheck = (listDOM, selectList) => {
    listDOM.forEach((dom, index) => {
      const input = createInput("checkbox");
      input.onchange = () => {
        selectList[index].isDown = input.checked;
      };
      selectList[index].input = input;
      dom.appendChild(input);
    });
  };
  const createProgressDOM = (len) => {
    const DOM = document.getElementById("tipDom");
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
          updateProgress,
          end: () => {
          },
          skip,
          downloaded,
          updateIndex,
          err
        };
      },
      remove
    };
  };
  const script = document.createElement("script");
  script.setAttribute("type", "text/javascript");
  script.src = "https://cdn.jsdelivr.net/npm/web-streams-polyfill@3.2.1/dist/ponyfill.min.js";
  document.documentElement.appendChild(script);
  const link = document.createElement("link");
  link.href = "https://vjs.zencdn.net/8.5.2/video-js.css";
  link.rel = "stylesheet";
  link.type = "text/css";
  document.head.appendChild(link);
  const style = document.createElement("style");
  style.innerHTML = `
.video-js .vjs-time-control,
.video-js .vjs-control,
.vjs-playback-rate .vjs-playback-rate-value{
  display: flex;
  align-items: center;
}
.vjs-control-bar{
  align-items: center !important;
}
`;
  document.head.appendChild(style);
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    originalOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function() {
    const xhr = this;
    if (xhr._url.includes("content?contentOid") && userData.token) {
      xhr.addEventListener("load", function() {
        const { title, modified, streamables } = JSON.parse(xhr.response);
        const { s3key } = streamables[0];
        init(formatTitle(title, modified), s3key);
      });
    }
    if (xhr._url.includes("aeskey") && userData.token) {
      this.setRequestHeader("Age", String(Date.now()).slice(-4));
    }
    if (xhr._url.includes("getuser?customUrl") && userData.token) {
      xhr.addEventListener("load", function() {
        const { metadataSet: { publishedContentSet }, multiLangNick: { jp } } = JSON.parse(xhr.response);
        const contentIds = Object.keys(publishedContentSet);
        if (!contentIds.length)
          return;
        initUserPageDOM(contentIds, jp);
      });
    }
    originalSend.apply(this, arguments);
  };
  const init = async (title, s3Key) => {
    await updateVideoData(title, s3Key);
    initDOM();
  };

})(streamSaver, CryptoJS, videojs);
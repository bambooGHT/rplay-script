// ==UserScript==
// @name         newRplayScript
// @namespace    https://github.com/bambooGHT
// @version      1.0.2
// @author       bambooGHT
// @description  太久没写了,旧的已经看不懂了(
// @icon         https://www.google.com/s2/favicons?sz=64&domain=rplay.live
// @downloadURL  https://github.com/bambooGHT/rplay-script/raw/refs/heads/new/dist/monkey.user.js
// @updateURL    https://github.com/bambooGHT/rplay-script/raw/refs/heads/new/dist/monkey.user.js
// @match        https://rplay.live/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const listenReq = (conditions) => {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
      this._url = url;
      originalOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function() {
      const { _url } = this;
      for (const item of conditions) {
        const is = typeof item.value === "string" ? _url.includes(item.value) : item.value(_url);
        if (is) {
          this.addEventListener("load", function() {
            item.callback(JSON.parse(this.response));
          });
          break;
        }
      }
      originalSend.apply(this, arguments);
    };
  };
  const decrypt = (m3u8Data, key) => {
    const { lib, mode, pad, AES } = CryptoJS;
    const encryptedData = new Uint8Array(m3u8Data);
    const ciphertext = lib.WordArray.create(encryptedData);
    const Key = lib.WordArray.create(key);
    const ops = {
      iv: lib.WordArray.create(16),
      mode: mode.CBC,
      padding: pad.Pkcs7
    };
    const decrypted = AES.decrypt({ ciphertext }, Key, ops);
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
  var VideoDownloadError = /* @__PURE__ */ ((VideoDownloadError2) => {
    VideoDownloadError2["DOWNLOAD_FAILED"] = "DOWNLOAD_FAILED";
    VideoDownloadError2["NOT_PURCHASED"] = "NOT_PURCHASED";
    VideoDownloadError2["CANCEL_DOWNLOAD"] = "CANCEL_DOWNLOAD";
    return VideoDownloadError2;
  })(VideoDownloadError || {});
  const downVideo = async (video, onDownload) => {
    var _a, _b, _c;
    let dirHandle;
    try {
      dirHandle = await showDirectoryPicker({ mode: "readwrite" });
    } catch (error) {
      (_a = onDownload == null ? void 0 : onDownload.onError) == null ? void 0 : _a.call(onDownload, {
        id: "0",
        message: "CANCEL_DOWNLOAD"
        /* CANCEL_DOWNLOAD */
      });
      return;
    }
    const saveVideo = async (dirName, videoInfo, m3u8Data) => {
      var _a2;
      const dir = await getSaveDir(dirHandle, dirName);
      if (await isExists(dir, videoInfo.title)) {
        (_a2 = onDownload == null ? void 0 : onDownload.onComplete) == null ? void 0 : _a2.call(onDownload);
        return;
      }
      const save = await (await dir.getFileHandle(videoInfo.title, { create: true })).createWritable();
      const stream = await downStream(m3u8Data, onDownload);
      await stream.pipeTo(save, { preventClose: true });
      return save.close();
    };
    let videoInfoList = video.videoInfo;
    if (!Array.isArray(videoInfoList)) {
      videoInfoList = [videoInfoList];
    }
    for (const videoInfo of videoInfoList) {
      try {
        const m3u8Data = await getM3u8Data(videoInfo.id, videoInfo.lang, videoInfo.s3key);
        await saveVideo(video.dirName, videoInfo, m3u8Data);
      } catch (error) {
        (_b = onDownload == null ? void 0 : onDownload.onError) == null ? void 0 : _b.call(onDownload, {
          id: videoInfo.id,
          message: "NOT_PURCHASED"
          /* NOT_PURCHASED */
        });
      }
    }
    (_c = onDownload == null ? void 0 : onDownload.onAllComplete) == null ? void 0 : _c.call(onDownload);
  };
  const isExists = async (dir, title) => {
    try {
      const fileHandle = await dir.getFileHandle(title);
      const file = await fileHandle.getFile();
      const fileSize = file.size;
      if (fileSize > 10240) {
        return true;
      }
    } catch (error) {
      return false;
    }
  };
  const downStream = async (m3u8Data, onDownload) => {
    var _a;
    const urlList = await getvideoChunks(m3u8Data.url);
    (_a = onDownload == null ? void 0 : onDownload.onBeforeDownload) == null ? void 0 : _a.call(onDownload, urlList.length);
    const downChunk = async (url) => {
      var _a2;
      const uint8Array = decrypt(await (await fetch(url)).arrayBuffer(), m3u8Data.key);
      (_a2 = onDownload == null ? void 0 : onDownload.onProgress) == null ? void 0 : _a2.call(onDownload, uint8Array.byteLength);
      return uint8Array;
    };
    const stream = new ReadableStream({
      async pull(controller) {
        var _a2, _b;
        if (!urlList[0]) {
          controller.close();
          (_a2 = onDownload == null ? void 0 : onDownload.onComplete) == null ? void 0 : _a2.call(onDownload);
          return;
        }
        const chunks = urlList.splice(0, 6);
        let data = await Promise.all(chunks.map((url) => retryFunction(() => downChunk(url)))).catch((e) => null);
        if (!data) {
          (_b = onDownload == null ? void 0 : onDownload.onError) == null ? void 0 : _b.call(onDownload, {
            id: m3u8Data.id,
            message: "DOWNLOAD_FAILED"
            /* DOWNLOAD_FAILED */
          });
          return;
        }
        data.forEach((value) => controller.enqueue(value));
        data = null;
        await this.pull(controller);
      }
    });
    return stream;
  };
  const retryFunction = async (fn, retries = 3, delay = 1500) => {
    try {
      return fn();
    } catch (error) {
      if (retries > 0) {
        console.warn(`"下载失败,正在重试,间隔 ${delay}ms"`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return retryFunction(fn, retries - 1, delay);
      }
      console.error("下载失败", error);
      throw error;
    }
  };
  const getSaveDir = async (dir, name) => {
    const saveDir = await dir.getDirectoryHandle(name, { create: true });
    return saveDir;
  };
  const getM3u8Data = async (id, lang, s3key) => {
    const [type, num, hash] = s3key.split("/");
    const res = await fetch(`https://api.rplay-cdn.com/content/hlsstream?s3key=${lang || "kr"}/${type}/${num}/${hash}/${hash}.m3u8&token=${userData.token}&userOid=${userData.oid}&contentOid=${id}&loginType=plax&abr=true`, {
      "headers": {
        "accept": "*/*",
        "accept-language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7,ja;q=0.6,zh-CN;q=0.5",
        "sec-ch-ua": '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site"
      },
      "referrer": "https://rplay.live/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": null,
      "method": "GET",
      "mode": "cors",
      "credentials": "omit"
    });
    const m3u8Data = await res.text();
    const url = m3u8Data.split("\n").filter((s) => s.includes("http")).pop();
    const key = await getKey(m3u8Data);
    return { id, url, key };
  };
  const getKey = async (m3u8Data) => {
    const [url] = m3u8Data.match(new RegExp('(?<=URI=")[^"]+(?=")'));
    return (await fetch(url)).arrayBuffer();
  };
  const getvideoChunks = async (url) => {
    const data = await (await fetch(url, {
      "headers": {
        "accept": "*/*",
        "accept-language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7,ja;q=0.6,zh-CN;q=0.5",
        "priority": "u=1, i",
        "sec-ch-ua": '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site"
      },
      "referrer": "https://rplay.live/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": null,
      "method": "GET",
      "mode": "cors",
      "credentials": "omit"
    })).text();
    const urlList = data.split("\n").filter((p) => p.startsWith("http"));
    return urlList;
  };
  const formatVideoFilename = (title, date) => {
    if (date) date = `[${date.slice(0, 10)}]`;
    return `${date} ${title.replaceAll(":", ".")}.ts`.replace(/[/\\:?"<>|\*]/g, "");
  };
  const formatFileSize = (size) => {
    const aMultiples = ["B", "K", "M", "G", "T", "P", "E", "Z", "Y"];
    const bye = 1024;
    if (size < bye) return size + aMultiples[0];
    let i = 0;
    for (var l = 0; l < 8; l++) {
      if (size / Math.pow(bye, l) < 1) break;
      i = l;
    }
    return `${(size / Math.pow(bye, i)).toFixed(2)}${aMultiples[i]}`;
  };
  const createDomBox = () => {
    const domBox = document.createElement("div");
    domBox.style.width = "100%";
    domBox.style.paddingTop = "5px";
    return domBox;
  };
  const createButtonEl = (title) => {
    const tempEl = `
  <div class="plax-button cursor-pointer select-none px-4 py-2 hover:opacity-75 mr-2 h-8 whitespace-nowrap px-4 text-md  bg-plaxgray-170 text-plaxgray-90" data-v-55e34760="" style="border-radius: 6px;">
     ${title}
  </div>
  `;
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = tempEl;
    const DOM = tempDiv.children[0];
    DOM.style.userSelect = "none";
    DOM.style.width = "min-content";
    DOM.style.margin = "5px 6px 5px 0";
    return DOM;
  };
  const createEl = (value) => {
    const dom = createButtonEl(value);
    dom.classList.remove("cursor-pointer");
    dom.classList.remove("hover:opacity-75");
    return dom;
  };
  const createDownloadProgressEl = (value) => {
    const dom = createEl(value);
    dom.id = "downloadProgress";
    return dom;
  };
  const createCheckbox = () => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.classList.add("checkbox-input");
    return checkbox;
  };
  const creatorhomePage = (creator) => {
    if (!document.URL.includes("creatorhome") || document.querySelector("#creatorhomePage")) return;
    addElement$1(creator);
  };
  const addElement$1 = async (creator) => {
    const domBox = createDomBox();
    const domRow1 = document.createElement("div");
    const downButton = createButtonEl("筛选下载");
    const selectAllButton = createButtonEl("全选(反选)");
    const filterEl = createEl("0 / 0");
    domBox.style.paddingBottom = "5px";
    domBox.id = "creatorhomePage";
    domRow1.style.display = "flex";
    domRow1.append(downButton, selectAllButton, filterEl);
    domBox.appendChild(domRow1);
    await insertElement$1(domBox);
    const listBox = document.querySelector(".md\\:justify-center").parentElement.lastElementChild;
    const videoIdList = /* @__PURE__ */ new Set();
    let currentPageVideoList = [];
    const uodateFilterCount = (count) => {
      filterEl.innerText = `${count} / ${currentPageVideoList.length}`;
    };
    const reset = () => {
      currentPageVideoList = document.URL.split("=")[1] === "contents" ? creator.published : creator.publishedReplays;
      uodateFilterCount(0);
      videoIdList.clear();
      initListCheckbox();
      observerVideoList(listBox.querySelector(".grid"), addVideoCheckbox);
    };
    const initListCheckbox = () => {
      const list = listBox.querySelector(".grid");
      Array.from(list.children).forEach((el) => {
        addVideoCheckbox(el);
      });
    };
    const addVideoCheckbox = (el) => {
      const checkbox = createCheckbox();
      checkbox.dataset["videoId"] = el.querySelector("a").href.split("play/")[1];
      checkbox.onchange = () => {
        const id = checkbox.dataset["videoId"];
        if (checkbox.checked) {
          videoIdList.add(id);
        } else {
          videoIdList.delete(id);
        }
        uodateFilterCount(videoIdList.size);
      };
      el.appendChild(checkbox);
    };
    selectAllButton.onclick = () => {
      const inputs = listBox.querySelectorAll(".grid div input");
      const allSelected = !Array.from(inputs).every((input) => input.checked);
      inputs.forEach((input) => input.checked = allSelected);
      if (allSelected) {
        uodateFilterCount(currentPageVideoList.length);
        currentPageVideoList.forEach((id) => videoIdList.add(id));
        return;
      }
      uodateFilterCount(0);
      videoIdList.clear();
    };
    let timer = 0;
    downButton.onclick = () => {
      if (videoIdList.size === 0) return;
      const downloadProgressEl = domBox.querySelector("#downloadProgress");
      if (downloadProgressEl && downloadProgressEl.innerText.includes("下载中")) return;
      const downProgressEl = downloadProgressEl ?? createDownloadProgressEl("下载中. [ 0 / 0 ] 0 / 0 (0)");
      domBox.appendChild(downProgressEl);
      clearTimeout(timer);
      const list = [...videoIdList].map((p) => {
        const content = creator.metadataSet.publishedContentSet[p];
        const streamInfo = content.streamables[0];
        return {
          title: formatVideoFilename(content.title, content.publishedAt || content.modified),
          id: content._id,
          lang: content.bucketRegion === "ap-northeast-1" ? "jp" : "kr",
          s3key: streamInfo.s3key
        };
      });
      let chunkLength = 0;
      let totalSize = 0;
      let downloadIndex = 0;
      let downloadChunkIndex = 0;
      let videoDownloadErrorCount = {
        [VideoDownloadError.DOWNLOAD_FAILED]: 0,
        [VideoDownloadError.NOT_PURCHASED]: 0,
        [VideoDownloadError.CANCEL_DOWNLOAD]: 0
      };
      const onDownload = {
        onBeforeDownload: (length) => {
          chunkLength = length;
          downProgressEl.innerText = `下载中. [ ${downloadIndex} / ${list.length} ] 0 / ${length} (${formatFileSize(totalSize)})`;
        },
        onProgress: (size) => {
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
            [downProgressEl, downloadErrorInfo1, downloadErrorInfo2].forEach((el) => domBox.removeChild(el));
          }, 8e3);
        },
        onError(error) {
          videoDownloadErrorCount[error.message] += 1;
          if (error.message === VideoDownloadError.CANCEL_DOWNLOAD) {
            downProgressEl.innerText = error.message;
          }
        }
      };
      downVideo({ dirName: creator.nickname, videoInfo: list }, onDownload);
    };
    observerPageToggle(listBox, reset);
    reset();
  };
  const observerPageToggle = (el, fn) => {
    const observer = new MutationObserver((mutationList) => {
      for (const item of mutationList) {
        if (item.type === "childList" && item.addedNodes.length > 0) fn();
      }
    });
    observer.observe(el, { childList: true });
  };
  const observerVideoList = (el, fn) => {
    const observer = new MutationObserver((mutationList) => {
      for (const item of mutationList) {
        if (item.type === "childList" && item.addedNodes.length > 0) {
          item.addedNodes.forEach((e) => {
            fn(e);
          });
        }
      }
    });
    observer.observe(el, { childList: true });
  };
  const insertElement$1 = (dom) => {
    return new Promise((resolve) => {
      let el = document.querySelector(".md\\:justify-center");
      if (!(el == null ? void 0 : el.parentElement)) {
        let observer = new MutationObserver(() => {
          el = document.querySelector(".md\\:justify-center");
          if (el == null ? void 0 : el.parentElement) {
            el.parentElement.insertBefore(dom, el.nextElementSibling);
            observer.disconnect();
            observer = null;
            resolve();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return;
      }
      el.parentElement.insertBefore(dom, el.nextElementSibling);
      resolve();
    });
  };
  const playPage = (content) => {
    if (!content.streamables || !document.URL.includes("play") || document.querySelector("#playPage")) return;
    addElement(content);
  };
  const addElement = async (content) => {
    const domBox = createDomBox();
    const button = createButtonEl("下载");
    domBox.id = "playPage";
    domBox.appendChild(button);
    let timer = 0;
    button.onclick = () => {
      const downloadProgressEl = domBox.querySelector("#downloadProgress");
      if (downloadProgressEl && downloadProgressEl.innerText.includes("下载中")) return;
      const downProgressEl = downloadProgressEl ?? createDownloadProgressEl("下载中. 0 / 0 (0)");
      domBox.appendChild(downProgressEl);
      clearTimeout(timer);
      const { title, modified, streamables, _id, nickname, bucketRegion } = content;
      const { s3key } = streamables[0];
      const videoInfo = { title: formatVideoFilename(title, modified), id: _id, lang: bucketRegion === "ap-northeast-1" ? "jp" : "kr", s3key };
      let chunkLength = 0;
      let totalSize = 0;
      let downloadIndex = 0;
      const onDownload = {
        onBeforeDownload: (length) => {
          chunkLength = length;
          downProgressEl.innerText = `下载中. 0 / ${chunkLength} (0)`;
        },
        onProgress: (size) => {
          totalSize += size;
          downloadIndex += 1;
          downProgressEl.innerText = `下载中. ${downloadIndex} / ${chunkLength} (${formatFileSize(totalSize)})`;
        },
        onAllComplete() {
          downProgressEl.innerText = `下载完成. ${downloadIndex} / ${chunkLength} (${formatFileSize(totalSize)})`;
          timer = setTimeout(() => {
            domBox.removeChild(downProgressEl);
          }, 8e3);
        },
        onError: (error) => {
          downProgressEl.innerText = error.message;
        }
      };
      onDownload.onBeforeDownload(0);
      downVideo({ dirName: nickname, videoInfo }, onDownload);
    };
    await insertElement(domBox);
  };
  const insertElement = (dom) => {
    return new Promise((resolve) => {
      var _a;
      const insert = (e) => {
        const dom1 = e.querySelector(".text-white");
        e.insertBefore(dom, dom1);
        resolve();
      };
      let el = (_a = document.querySelectorAll(".aspect-h-9")[1]) == null ? void 0 : _a.parentElement;
      if (!el) {
        let observer = new MutationObserver(() => {
          var _a2;
          el = (_a2 = document.querySelectorAll(".aspect-h-9")[1]) == null ? void 0 : _a2.parentElement;
          if (el) {
            insert(el);
            observer.disconnect();
            observer = null;
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return;
      }
      insert(el);
    });
  };
  const initScript = () => {
    const scriptList = [
      "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js"
    ];
    scriptList.forEach((p) => {
      const script = document.createElement("script");
      script.setAttribute("type", "text/javascript");
      script.src = p;
      document.body.appendChild(script);
    });
  };
  const initCss = () => {
    const style = document.createElement("style");
    style.textContent = `
  .checkbox-input {
    position: absolute;
    width: 20px;
    height: 20px;
    top: 0;
    left: 0;
    margin: 7px 7px;
    z-index: 99999;
  }
`;
    document.head.appendChild(style);
  };
  initScript();
  initCss();
  window.userData = (() => {
    const { AccountModule: data } = JSON.parse(localStorage.getItem("vuex") || `{}`);
    if (!data.token) {
      alert("需要登录账号,登录后刷新页面");
      throw new Error("需要登录账号,登录后刷新页面");
    }
    const { userInfo: { oid }, token } = data;
    return {
      oid,
      token
    };
  })();
  listenReq([
    { value: "content?contentOid", callback: playPage },
    {
      value: (url) => {
        return url.includes("getuser?userOid") && url.split("?")[1].split("&")[0].split("=")[1] !== userData.oid;
      },
      callback: creatorhomePage
    }
  ]);

})();
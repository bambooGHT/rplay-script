// ==UserScript==
// @name         newRplayScript
// @namespace    https://github.com/bambooGHT
// @version      1.1.20
// @author       bambooGHT
// @description  现在需要订阅才能播放的视频需要订阅才会有下载按钮,批量下载的场合也要订阅
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
  const originalFetch = window.fetch;
  const listenReqAtFetch = (conditions) => {
    window.fetch = async function(...args) {
      const response = await originalFetch.apply(this, args);
      const url = typeof args[0] === "string" ? args[0] : args[0].href;
      for (const item of conditions) {
        const is = typeof item.value === "string" ? url.includes(item.value) : item.value(url);
        if (is) response.clone().json().then(item.callback);
      }
      return response;
    };
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
  const createDownloadElement = () => {
    const domBox = createDomBox();
    const domRow1 = document.createElement("div");
    const downButton = createButtonEl("筛选下载");
    const selectAllButton = createButtonEl("全选(反选)");
    const filterEl = createEl("0 / 0");
    domBox.style.paddingBottom = "5px";
    domRow1.style.display = "flex";
    domRow1.append(downButton, selectAllButton, filterEl);
    domBox.appendChild(domRow1);
    return { domBox, downButton, selectAllButton, filterEl };
  };
  const decrypt = (m3u8Data, key) => {
    if (!key) return new Uint8Array(m3u8Data);
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
        const m3u8Data = await getM3u8Data(videoInfo.id, videoInfo.url);
        await saveVideo(video.dirName, videoInfo, m3u8Data);
      } catch (error) {
        console.error(error);
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
  const getM3u8Data = async (id, url) => {
    const res = await fetch(url, {
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
    const url1 = m3u8Data.split("\n").filter((s) => s.startsWith("http"))[0];
    const key = await getKey(m3u8Data);
    return { id, url: url1, key };
  };
  const getKey = async (m3u8Data) => {
    const [url] = m3u8Data.match(new RegExp('(?<=URI=")[^"]+(?=")')) ?? [];
    if (!url) return void 0;
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
  const insertElement$1 = (dom, key) => {
    return new Promise((resolve) => {
      let el = document.querySelector(key);
      if (!(el == null ? void 0 : el.parentElement)) {
        let observer = new MutationObserver(() => {
          el = document.querySelector(key);
          if (el == null ? void 0 : el.parentElement) {
            el.parentElement.insertBefore(dom, el.nextElementSibling || el);
            observer.disconnect();
            observer = null;
            resolve(el);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return;
      }
      el.parentElement.insertBefore(dom, el.nextElementSibling || el);
      resolve(el);
    });
  };
  const initListDownloadData = ({
    domBox,
    filterEl,
    listBox,
    selectAllButton,
    downButton,
    videoDataList,
    currentVideoIdList
  }) => {
    const listData = {
      currentVideoIdList,
      videoIdList: /* @__PURE__ */ new Set()
    };
    const uodateFilterCount = (count) => {
      filterEl.innerText = `${count} / ${listData.currentVideoIdList.length}`;
    };
    let observer;
    const observerVideoAdd = () => {
      if (observer) observer.disconnect();
      observer = observerVideoList(listBox.querySelector(".grid"), addVideoCheckbox);
    };
    const resetData = () => {
      uodateFilterCount(0);
      listData.videoIdList.clear();
      observerVideoAdd();
    };
    const addVideoCheckbox = (el) => {
      el.classList.add("video-item1");
      const checkbox = createCheckbox();
      checkbox.dataset["videoId"] = el.querySelector("a").href.split("?")[0].split("play/")[1];
      checkbox.onchange = () => {
        const id = checkbox.dataset["videoId"];
        const { videoIdList } = listData;
        if (checkbox.checked) {
          videoIdList.add(id);
        } else {
          videoIdList.delete(id);
        }
        uodateFilterCount(videoIdList.size);
      };
      el.appendChild(checkbox);
    };
    const bindElementsClickEvent = () => {
      selectAllButton.onclick = () => {
        const { videoIdList, currentVideoIdList: currentVideoIdList2 } = listData;
        const inputs = listBox.querySelectorAll(".grid div input");
        const allSelected = !Array.from(inputs).every((input) => input.checked);
        inputs.forEach((input) => input.checked = allSelected);
        if (allSelected) {
          uodateFilterCount(currentVideoIdList2.length);
          currentVideoIdList2.forEach((id) => videoIdList.add(id));
          return;
        }
        resetData();
      };
      downButton.onclick = async () => {
        const { videoIdList } = listData;
        if (videoIdList.size === 0) return;
        const list = getDownloadList(listData.videoIdList, videoDataList);
        const nikiname = Object.values(videoDataList)[0].nickname;
        downloadVideo(nikiname, list, domBox);
      };
    };
    const initListCheckbox = () => {
      const list = listBox.querySelector(".grid");
      Array.from(list.children).forEach((el) => {
        addVideoCheckbox(el);
      });
    };
    resetData();
    initListCheckbox();
    bindElementsClickEvent();
    return { listData, resetData, initListCheckbox };
  };
  const getDownloadList = (idList, videoDataList) => {
    return [...idList].map((p) => {
      const content2 = videoDataList[p];
      const canView = content2.canView;
      return {
        title: formatVideoFilename(content2.title, content2.publishedAt || content2.modified),
        id: content2._id,
        url: canView.url
      };
    });
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
    return observer;
  };
  let timer;
  const downloadVideo = (dirName, list, domBox) => {
    const downloadProgressEl = domBox.querySelector("#downloadProgress");
    if (downloadProgressEl && downloadProgressEl.innerText.includes("下载中")) return;
    const downProgressEl = downloadProgressEl ?? createDownloadProgressEl("下载中. [ 0 / 0 ] 0 / 0 (0)");
    domBox.appendChild(downProgressEl);
    clearTimeout(timer);
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
    downVideo({ dirName, videoInfo: list }, onDownload);
  };
  const creatorhomePage = (creator) => {
    if (!document.URL.includes("creatorhome") || document.querySelector("#creatorhomePage")) return;
    addElement$2(creator);
  };
  const addElement$2 = async (creator) => {
    const { domBox, selectAllButton, downButton, filterEl } = createDownloadElement();
    domBox.id = "creatorhomePage";
    const dom = await insertElement$1(domBox, ".md\\:justify-center");
    const listBox = dom.parentElement.lastElementChild;
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
  const observerPageToggle = (el, fn) => {
    const observer = new MutationObserver((mutationList) => {
      for (const item of mutationList) {
        if (item.type === "childList" && item.addedNodes.length > 0) fn();
      }
    });
    observer.observe(el, { childList: true });
  };
  let content = null;
  const playPage = (c) => {
    if (!c.canView.url || !document.URL.includes("play")) return;
    content = c;
    if (!document.querySelector("#playPage")) addElement$1();
  };
  const addElement$1 = async () => {
    const domBox = createDomBox();
    const button = createButtonEl("下载");
    domBox.id = "playPage";
    domBox.appendChild(button);
    let timer2 = 0;
    button.onclick = () => {
      const downloadProgressEl = domBox.querySelector("#downloadProgress");
      if (downloadProgressEl && downloadProgressEl.innerText.includes("下载中")) return;
      const downProgressEl = downloadProgressEl ?? createDownloadProgressEl("下载中. 0 / 0 (0)");
      domBox.appendChild(downProgressEl);
      clearTimeout(timer2);
      const { title, modified, _id, nickname, bucketRegion, canView } = content;
      const videoInfo = { title: formatVideoFilename(title, modified), id: _id, url: canView.url };
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
          timer2 = setTimeout(() => {
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
        const dom1 = e.querySelector(":scope > .text-white");
        e.insertBefore(dom, dom1);
        resolve();
      };
      let el = (_a = document.querySelectorAll(".aspect-h-9")[0]) == null ? void 0 : _a.parentElement;
      if (!el) {
        let observer = new MutationObserver(() => {
          var _a2;
          el = (_a2 = document.querySelectorAll(".aspect-h-9")[0]) == null ? void 0 : _a2.parentElement;
          if (el) {
            observer.disconnect();
            observer = null;
            insert(el);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return;
      }
      insert(el);
    });
  };
  const purchasePage = (contents) => {
    if (!document.URL.includes("myinfo?tab=purchase") || document.querySelector("#purchasePage")) return;
    addElement(contents);
  };
  const addElement = async (contents) => {
    const { domBox, filterEl, downButton, selectAllButton } = createDownloadElement();
    domBox.id = "purchasePage";
    const dom = await insertElement$1(domBox, '[style*="margin-top: 36px"] > div:nth-of-type(2) > div:nth-of-type(3)');
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
  .video-item1 {
    position: relative;
  }

  .checkbox-input {
    position: absolute;
    width: 20px;
    height: 20px;
    top: 0;
    left: 0;
    margin: 7px 7px;
    z-index: 101;
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
  listenReqAtFetch([
    { value: "bulk?requestFormQueue", callback: purchasePage }
  ]);

})();
// ==UserScript==
// @name         rplayScript
// @namespace    https://github.com/bambooGHT
// @version      1.3.1
// @author       bambooGHT
// @description  现在可以播放短视频跟下载了
// @icon         https://www.google.com/s2/favicons?sz=64&domain=rplay.live
// @downloadURL  https://github.com/bambooGHT/rplay-script/raw/main/dist/rplayscript.user.js
// @updateURL    https://github.com/bambooGHT/rplay-script/raw/main/dist/rplayscript.user.js
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
    const data2 = await (await fetch(url)).text();
    const key = await getKey(data2);
    const urlList = data2.replaceAll("\n", "").split(/#EXTINF:\d{1,3},/).slice(1);
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
  const getM3u8Url = (s3Key) => {
    const [type, num, hash] = s3Key.split("/");
    return `https://api.rplay.live/content/hlsstream?s3key=kr/${type}/${num}/${hash}/${hash}.m3u8&token=${userData.token}&userOid=${userData.oid}&contentOid=6515cda280c7fc6b98065cbe&loginType=plax&abr=false`;
  };
  const getContentData = async (contentId) => {
    const url = `https://api.rplay.live/content?contentOid=${contentId}&status=published&withComments=true&withContentMetadata=false&requestCanView=true&lang=jp&requestorOid=${userData.oid}&loginType=plax`;
    const data2 = await (await fetch(url)).json();
    const { title, subtitles, modified, streamables } = data2;
    const title1 = Object.values(subtitles || {});
    const { s3key } = streamables[0];
    const { m3u8Data: m3u8Data2, urls } = await getm3u8data(s3key);
    return {
      title: formatTitle(title1[title1.length - 1] || title, modified),
      url: urls[urls.length - 1].url,
      m3u8Data: m3u8Data2
    };
  };
  const getm3u8data = async (s3Key) => {
    const m3u8Data2 = await (await fetch(getM3u8Url(s3Key))).text();
    const urls = getResolutionUrls(m3u8Data2);
    return { m3u8Data: m3u8Data2, urls };
  };
  const formatTitle = (title, modified) => {
    if (modified)
      modified = `[${modified.slice(0, 10)}]`;
    return `${modified} ${title.replaceAll(":", ".")}.ts`.replace(/[<>/\\? \*]/g, "");
  };
  const userData = (() => {
    const { AccountModule: data2 } = JSON.parse(localStorage.getItem("vuex") || `{}`);
    if (!data2.token) {
      alert("需要登陆才行,登录后刷新页面");
      return {};
    }
    const { userInfo: { oid, token } } = data2;
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
    const dir = await showDirectoryPicker({ mode: "readwrite" });
    const save = async (dir2, url, title2) => {
      try {
        await dir2.getFileHandle(title2);
        return true;
      } catch (error) {
        const save2 = await (await dir2.getFileHandle(title2, { create: true })).createWritable();
        const { stream } = await download(url, progress);
        await stream.pipeTo(save2, { preventClose: true });
        return save2.close();
      }
    };
    if (typeof value === "string") {
      return save(dir, value, title);
    }
    const updateProgress = progress(0);
    let currentDir = { dir: void 0, name: "" };
    for (const item of value) {
      const { id, name, isCreatorhome } = item;
      if (name) {
        if (name !== currentDir.name) {
          currentDir.dir = await getSaveDir(dir, name);
          currentDir.name = name;
        }
      } else {
        currentDir.dir = dir;
      }
      const { title: title2, url } = await getContentData(id);
      updateProgress.updateIndex();
      const is = await save(currentDir.dir, url, title2);
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
            const { id, name } = value[i];
            updateProgress.updateIndex();
            let { title: title2, url } = await getContentData(id);
            if (name) {
              title2 = `${name}/${title2}`;
            }
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
  const getSaveDir = async (dir, name) => {
    const saveDir = await dir.getDirectoryHandle(name, { create: true });
    return saveDir;
  };
  const initVideo = (m3u8Data2, element) => {
    const video = createVideo(element);
    const blob = new Blob([m3u8Data2], { type: "application/x-mpegURL" });
    const url = URL.createObjectURL(blob);
    const player = videojs(video, {
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
    return player;
  };
  const createVideo = (element) => {
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
    element.innerHTML = tempVideo;
    return element.children[0];
  };
  const createDivBox = () => {
    const div = document.createElement("div");
    div.style.width = "100%";
    div.style.display = "flex";
    div.style.margin = "0.65rem 0";
    return div;
  };
  const createDOM = (name, fun) => {
    const tempDOM = `
  <div
    class="plax-button cursor-pointer px-4 py-2 hover:opacity-75 mb-2 mr-2 h-8 whitespace-nowrap px-4 text-md  bg-plaxgray-170 text-plaxgray-90"
    style="border-radius: 6px;">
    ${name}
  </div>`;
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = tempDOM;
    const DOM = tempDiv.children[0];
    DOM.style.userSelect = "none";
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
    input.style.width = "20px";
    input.style.height = "20px";
    input.style.top = "0";
    input.style.left = "0";
    input.style.margin = "7px 7px";
    input.style.zIndex = "99999";
    return input;
  };
  const initDOM = async () => {
    const div = createDivBox();
    if (!await addDOM$1(div))
      return;
    let isDown = false;
    const { title, downloadIndex, urls, m3u8Data: m3u8Data2 } = videoData;
    div.appendChild(createSelectDOM(videoData.urls, downloadIndex, (e) => {
      videoData.downloadIndex = +e.target.value;
    }));
    div.appendChild(createDOM("播放", () => {
      const VIDEODOM = document.querySelector(".w-player").children[0];
      initVideo(m3u8Data2, VIDEODOM);
    }));
    const down = async (index) => {
      if (isDown) {
        alert("已经在下载中");
        return;
      }
      isDown = true;
      const { fun, remove } = await createProgressDOM$1();
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
    div.appendChild(createDOM("下载2", () => {
      down(2);
    }));
  };
  const createProgressDOM$1 = async () => {
    const divBox = createDivBox();
    const DOM = await addDOM$1(divBox);
    if (!DOM)
      return;
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
  const addDOM$1 = (dom, index = 0) => {
    return new Promise((res) => {
      if (index > 4) {
        res(void 0);
        return;
      }
      ++index;
      const infoDOM = document.querySelector(".w-player").children[1];
      if ((infoDOM == null ? void 0 : infoDOM.nodeName) === "DIV") {
        const firstDOM = infoDOM.firstChild;
        infoDOM.insertBefore(dom, firstDOM);
        res(infoDOM);
        return;
      }
      setTimeout(() => {
        res(addDOM$1(dom, index));
      }, 250);
    });
  };
  let videoPlay = {};
  const clipPlay = async (contentId) => {
    if (!videoPlay.videoBox)
      return;
    videoPlay.open();
    const { m3u8Data: m3u8Data2 } = await getContentData(contentId);
    initVideo(m3u8Data2, videoPlay.videoBox);
  };
  const createMaskDOM = () => {
    const mask = document.createElement("div");
    const videoBox = document.createElement("div");
    const closeVideo = document.createElement("div");
    videoBox.style.height = `${window.innerHeight}px`;
    closeVideo.innerText = "close";
    mask.classList.add("mask");
    videoBox.classList.add("videoBox");
    closeVideo.classList.add("closeVideo");
    mask.append(videoBox, closeVideo);
    const open = () => {
      mask.style.display = "flex";
      videoBox.innerHTML = `<div style="color: #fff;">加载中</div>`;
    };
    const close = () => {
      mask.style.display = "none";
      videoBox.innerHTML = "";
    };
    closeVideo.onclick = close;
    close();
    document.body.appendChild(mask);
    videoPlay = { mask, videoBox, closeVideo, open, close };
  };
  let unObserverList = [];
  const data = {};
  const updateNormalPosts = (normalPosts) => {
    data.normalPosts = normalPosts.reduce((result, value) => {
      result[value._id] = value.text;
      return result;
    }, {});
  };
  const initUserPageDOM = async (videoList, storyList, userName) => {
    unObserverList.forEach((p) => p());
    unObserverList = [];
    const processDom = initProgressDom();
    const tipDom = initSelectDom(videoList, storyList);
    const downDom = initDownDom(videoList, storyList, userName);
    const [listDOM, clipDOM] = await addDOM([processDom, tipDom, downDom]);
    listAddCheck(false, listDOM, [videoList, storyList]);
    if (clipDOM)
      listAddCheck(true, clipDOM, [videoList], clipPlay);
  };
  const initProgressDom = () => {
    const processDom = createDivBox();
    processDom.id = "processDom";
    processDom.appendChild(createDOM("默认下载最高画质"));
    return processDom;
  };
  const initSelectDom = (videoList, storyList) => {
    const tipDom = createDivBox();
    let videoIsDown = true;
    let storyIsDown = true;
    tipDom.appendChild(createDOM("(全部|取消)勾选", () => {
      Object.values(videoList).forEach((p) => {
        if (!p.input)
          return;
        p.isDown = videoIsDown;
        p.input.checked = videoIsDown;
      });
      videoIsDown = !videoIsDown;
    }));
    if (Object.values(storyList).length)
      tipDom.appendChild(createDOM("(全部|取消)勾选合集", () => {
        Object.values(storyList).forEach((p) => {
          p.isDown = storyIsDown;
          p.input.checked = storyIsDown;
        });
        storyIsDown = !storyIsDown;
      }));
    return tipDom;
  };
  const initDownDom = (videoList, storyList, userName) => {
    const downDom = createDivBox();
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
        remove(3e3);
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
  const listAddCheck = (isClip, listDOM, dataList, fun) => {
    const [videoList, storyList] = dataList;
    let addFun = void 0;
    if (isClip) {
      const ids = Object.values(videoList);
      addFun = (dom, index = 0) => {
        if (dom.textContent.length < 10) {
          if (index++ < 5)
            setTimeout(() => {
              addFun(dom, index);
            }, 250);
          return;
        }
        const { id } = ids.find((p) => dom.textContent.includes(p.orName)) || {};
        if (id) {
          const input = createInput("checkbox");
          const playDOM = createDOM("play");
          playDOM.classList.add("playDOM");
          playDOM.onclick = () => fun(videoList[id].id);
          input.onchange = () => {
            videoList[id].isDown = input.checked;
          };
          videoList[id].input = input;
          dom.append(input, playDOM);
        }
      };
    } else {
      const ids = Object.keys(videoList);
      addFun = (dom) => {
        var _a, _b;
        dom.style.position = "relative";
        const url = dom.querySelector("a").href;
        const { list, split } = url.includes("scenario") ? { list: storyList, split: "scenario/" } : { list: videoList, split: "play/" };
        let id = (_a = url.split(split)[1]) == null ? void 0 : _a.replaceAll("/", "");
        if (!id) {
          if (!data.normalPosts)
            return;
          const id1 = (_b = url.split("creatorhome/")[1]) == null ? void 0 : _b.replace("/detail", "");
          const text = data.normalPosts[id1];
          id = ids.find((p) => text.includes(p));
          if (!id)
            return;
        }
        const input = createInput("checkbox");
        input.onchange = () => {
          list[id].isDown = input.checked;
        };
        list[id].input = input;
        dom.appendChild(input);
      };
    }
    const observer = new MutationObserver(function(mutationRecoards, observer2) {
      for (const item of mutationRecoards) {
        if (item.type === "childList") {
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
  const addDOM = (doms) => {
    return new Promise((res) => {
      var _a;
      const publishedContentDOM = [...document.querySelectorAll(".min-h-screen")];
      const DOM = (_a = publishedContentDOM[publishedContentDOM.length - 1].firstChild) == null ? void 0 : _a.firstChild;
      let listDOM = DOM.querySelectorAll(".grid");
      if ((DOM == null ? void 0 : DOM.nodeName) === "DIV" && listDOM.length) {
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
  createMaskDOM();
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
.video-js {
  padding-top: 56.25% !important;
}
.video-js .vjs-time-control,
.video-js .vjs-control,
.vjs-playback-rate .vjs-playback-rate-value {
  display: flex;
  align-items: center;
}
.vjs-control-bar {
  align-items: center !important;
}
.mask {
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #00000090;
  z-index: 100000;
}
.closeVideo {
  position: absolute;
  top: 0;
  right: 0;
  margin: 6px;
  padding: 0 5px;
  border-radius: 20px;
  height: 30px;
  line-height: 30px;
  background-color: white;
  cursor: pointer;
}
.playDOM {
  border-radius: 6px;
  user-select: none;
  position: absolute;
  top: 0px;
  left: 24px;
  margin: 7px;
  z-index: 99999;
  height: 28px;
  line-height: 1.3;
  padding: 7px !important;
  margin-top: 3px !important;
}
.videoBox {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
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
    const { _url } = this;
    if (_url.includes("content?contentOid") && userData.token) {
      this.addEventListener("load", function() {
        const { title, modified, streamables } = JSON.parse(this.response);
        if (!streamables)
          return;
        const { s3key } = streamables[0];
        init(formatTitle(title, modified), s3key);
      });
    }
    if (_url.includes("aeskey") && userData.token) {
      this.setRequestHeader("Age", String(Date.now()).slice(-4));
    }
    if ((_url.includes("getuser?customUrl") || _url.includes("getuser?userOid") || _url.includes("replays?creatorOid")) && userData.token) {
      this.addEventListener("load", function() {
        const data2 = JSON.parse(this.response);
        const obj = {
          ids: [],
          storys: [],
          nickname: ""
        };
        if (Array.isArray(data2) && data2.length) {
          obj.ids = data2;
        } else {
          const { _id, metadataSet: { publishedContentSet, publishedScenarioSet, normalPosts }, nickname } = data2;
          if (normalPosts == null ? void 0 : normalPosts.length) {
            updateNormalPosts(normalPosts);
            return;
          }
          if (_id === userData.oid || !publishedContentSet)
            return;
          obj.ids = Object.values(publishedContentSet);
          obj.storys = Object.values(publishedScenarioSet);
          obj.nickname = nickname;
          if (!obj.ids.length)
            return;
        }
        const { videoList, storyList } = processUserVideoList(obj.ids, obj.storys);
        initUserPageDOM(videoList, storyList, obj.nickname);
      });
    }
    originalSend.apply(this, arguments);
  };
  const init = async (title, s3Key) => {
    await updateVideoData(title, s3Key);
    initDOM();
  };
  const processUserVideoList = (contentIds, storys) => {
    const ids = {};
    const storyList = storys.reduce((result, value) => {
      const contents = Object.keys(value.contents);
      const name = formatTitle(value.metadata.title, "");
      contents.forEach((p) => {
        ids[p] = name;
      });
      result[value._id] = {
        id: value._id,
        name,
        isDown: false,
        input: void 0,
        ids: contents
      };
      return result;
    }, {});
    const videoList = contentIds.reduce((result, value) => {
      const { _id, title } = value;
      const name = ids[_id];
      result[_id] = {
        id: _id,
        isDown: false,
        isCreatorhome: false,
        input: void 0,
        name,
        orName: title
      };
      return result;
    }, {});
    return { videoList, storyList };
  };

})(streamSaver, CryptoJS, videojs);
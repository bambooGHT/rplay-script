import { userData, updateVideoData } from "./data";
import { createMaskDOM, initDOM, initUserPageDOM, updateNormalPosts } from "./dom";
import { formatTitle } from "./get";
import { initPackage } from "./package";

const scripts = [
  "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js",
  "https://cdn.jsdelivr.net/npm/streamsaver@2.0.6/StreamSaver.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/video.js/8.5.2/video.min.js",
  "https://jimmywarting.github.io/StreamSaver.js/examples/zip-stream.js"
];
scripts.forEach((p) => {
  const script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.src = p;
  document.documentElement.appendChild(script);
});

initPackage();
createMaskDOM();

const link = document.createElement("link");
link.href = "https://vjs.zencdn.net/8.5.2/video-js.css";
link.rel = "stylesheet";
link.type = "text/css";
document.head.appendChild(link);

const style = document.createElement("style");
style.innerHTML = `
.video-js {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
}
.video-js .vjs-time-control,
.video-js .vjs-control,
.vjs-playback-rate .vjs-playback-rate-value {
  display: flex;
  align-items: center;
}
.vjs-play-control {
  justify-content: center !important;
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


// #region
const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;

let currentUser = {
  time: 0,
  userId: ""
};

XMLHttpRequest.prototype.open = function (method, url) {
  this._url = url;
  originalOpen.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function () {
  const { _url } = this;
  if (_url.includes("content?contentOid") && userData.token) {
    this.addEventListener('load', function () {
      const { title, modified, streamables } = JSON.parse(this.response);
      if (!streamables) return;
      const { s3key } = streamables[0];
      init(formatTitle(title, modified), s3key);
    });
  }

  if (_url.includes("aeskey") && userData.token) {
    this.setRequestHeader("Age", String(Date.now()).slice(-4));
  }

  if ((_url.includes("getuser?customUrl") || _url.includes("getuser?userOid") || _url.includes("replays?creatorOid")) && userData.token) {
    this.addEventListener('load', function () {
      const data = JSON.parse(this.response);
      const obj = {
        ids: [],
        storys: [],
        nickname: ""
      };
      if (Array.isArray(data) && data.length) {
        obj.ids = data;
      } else {
        const { _id, metadataSet: { publishedContentSet, publishedScenarioSet, normalPosts }, nickname } = data;
        if (normalPosts?.length) {
          updateNormalPosts(normalPosts);
          return;
        }
        const time = Date.now();
        if (_id === userData.oid || !publishedContentSet ||
          (currentUser.userId === _id && time - currentUser.time < 2500)) return;
        currentUser.userId = _id;
        currentUser.time = time;

        obj.ids = Object.values(publishedContentSet);
        obj.storys = Object.values(publishedScenarioSet);
        obj.nickname = nickname;
        if (!obj.ids.length) return;
      }

      const { videoList, storyList } = processUserVideoList(obj.ids, obj.storys);
      initUserPageDOM(videoList, storyList, obj.nickname);
    });
  }

  originalSend.apply(this, arguments);
};
// #endregion
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
      input: undefined,
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
      input: undefined,
      name: name,
      orName: title
    };
    return result;
  }, {});

  return { videoList, storyList };
};
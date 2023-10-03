// ==UserScript==
// @name         rplayScript
// @namespace    https://github.com/bambooGHT
// @version      1.0
// @description  白嫖大师
// @author       You
// @match        https://rplay.live/play/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=rplay.live
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// ==/UserScript==

import { userData, updateVideoData, formatTitle } from "./data";
import { initDOM, initUserPageDOM } from "./dom";

const script = document.createElement('script');
script.setAttribute('type', 'text/javascript');
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
// #region
const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;

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

  if ((_url.includes("getuser?customUrl") || _url.includes("getuser?userOid")) && userData.token) {
    this.addEventListener('load', function () {
      const { _id, metadataSet: { publishedContentSet }, nickname } = JSON.parse(this.response);
      if (_id === userData.oid || !publishedContentSet) return;
      const contentIds = Object.keys(publishedContentSet);
      if (!contentIds.length) return;
      initUserPageDOM(contentIds, nickname);
    });
  }

  originalSend.apply(this, arguments);
};
// #endregion

const init = async (title, s3Key) => {
  await updateVideoData(title, s3Key);
  initDOM();
};
/**
 * @typedef {import("video.js").default} videojs
 * @typedef {import("crypto-js")} cryptojs
 * @typedef {import("streamsaver")} streamsaver
 */

/** @type {videojs} */
export let videoJs = undefined;

/** @type {cryptojs} */
export let CryptoJS = undefined;

/** @type {streamsaver} */
export let streamsaver = undefined;

export const initPackage = () => {
  return new Promise((res) => {
    if (!window.videojs) {
      setTimeout(() => {
        res(initPackage());
      }, 250);
      return;
    }
    videoJs = window.videojs;
    CryptoJS = window.CryptoJS;
    streamsaver = window.streamSaver;
    res(true);
  });
};
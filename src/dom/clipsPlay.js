import { getContentData } from "../get";
import { initVideo } from "./play";

let videoPlay = {};

/** @param {string} contentId */
export const clipPlay = async (contentId) => {
  if (!videoPlay.videoBox) return;

  videoPlay.open();
  const { url } = await getContentData(contentId);
  initVideo(url, videoPlay.videoBox);
};

export const createMaskDOM = () => {
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
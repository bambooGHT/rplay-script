import videojs from "video.js";
/**
 * @param {string} m3u8Data 
 */
export const initVideo = (m3u8Data) => {
  const video = createVideo();
  const blob = new Blob([m3u8Data], { type: "application/x-mpegURL" });
  const url = URL.createObjectURL(blob);
  const player = videojs(video, {
    controlBar: {
      pictureInPictureToggle: true,
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

import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: "./src/index.js",
      userscript: {
        name: "rplayScript",
        namespace: "https://github.com/bambooGHT",
        version: "1.0",
        description: "支持个人页面直接下载(默认最高画质),视频页面可以播放",
        author: "bambooGHT",
        match: [
          "https://rplay.live/*"
        ],
        icon: "https://www.google.com/s2/favicons?sz=64&domain=rplay.live",
        grant: "none"
      },
      server: {
        open: false
      },
      build: {
        externalGlobals: {
          "crypto-js": ["CryptoJS", "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"],
          "streamsaver": ["streamSaver", "https://cdn.jsdelivr.net/npm/streamsaver@2.0.6/StreamSaver.min.js"],
          "video.js": ["videojs", "https://cdnjs.cloudflare.com/ajax/libs/video.js/8.5.2/video.min.js"]
        }
      }
    }),
  ],
});

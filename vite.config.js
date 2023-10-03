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
        version: "1.2.1",
        description: "修复不显示下载功能的bug",
        author: "bambooGHT",
        match: [
          "https://rplay.live/*"
        ],
        icon: "https://www.google.com/s2/favicons?sz=64&domain=rplay.live",
        grant: "none",
        require: ["https://jimmywarting.github.io/StreamSaver.js/examples/zip-stream.js"],
        updateURL: "https://github.com/bambooGHT/rplay-script/raw/main/dist/rplayscript.user.js",
        downloadURL: "https://github.com/bambooGHT/rplay-script/raw/main/dist/rplayscript.user.js"
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

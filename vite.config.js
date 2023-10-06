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
        version: "1.3.3",
        description: "现在手机也能正常使用了",
        author: "bambooGHT",
        match: [
          "https://rplay.live/*"
        ],
        icon: "https://www.google.com/s2/favicons?sz=64&domain=rplay.live",
        grant: "none",
        updateURL: "https://github.com/bambooGHT/rplay-script/raw/main/dist/rplayscript.user.js",
        downloadURL: "https://github.com/bambooGHT/rplay-script/raw/main/dist/rplayscript.user.js"
      },
      server: {
        open: false
      },
      // build: {
      //   externalGlobals: {
      //     "crypto-js": "CryptoJS",
      //     "streamsaver": "streamSaver",
      //     "video.js": "videojs"
      //   }
      // }
    }),
  ],
});

import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

export default defineConfig({
  plugins: [
    monkey({
      entry: "./src/index.ts",
      userscript: {
        name: "newRplayScript",
        namespace: "https://github.com/bambooGHT",
        version: "1.1.30",
        description: "播放页面添加清晰度下载选项，现在需要订阅才能播放的视频需要订阅才会有下载按钮,批量下载的场合也要订阅",
        author: "bambooGHT",
        match: [
          "https://rplay.live/*"
        ],
        icon: "https://www.google.com/s2/favicons?sz=64&domain=rplay.live",
        grant: "none",
        updateURL: "https://github.com/bambooGHT/rplay-script/raw/refs/heads/new/dist/monkey.user.js",
        downloadURL: "https://github.com/bambooGHT/rplay-script/raw/refs/heads/new/dist/monkey.user.js"
      },
      server: {
        open: false
      },
    }),
  ],
});
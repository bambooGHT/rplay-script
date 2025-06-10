import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

export default defineConfig({
  plugins: [
    monkey({
      entry: "./src/index.ts",
      userscript: {
        name: "newRplayScript",
        namespace: "https://github.com/bambooGHT",
        version: "1.1.10",
        description: "修复dom",
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
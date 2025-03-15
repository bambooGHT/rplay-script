import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

export default defineConfig({
  plugins: [
    monkey({
      entry: "./src/index.ts",
      userscript: {
        name: "newRplayScript",
        namespace: "https://github.com/bambooGHT",
        version: "1.0.0",
        description: "太久没写了,旧的已经看不懂了(",
        author: "bambooGHT",
        match: [
          "https://rplay.live/*"
        ],
        icon: "https://www.google.com/s2/favicons?sz=64&domain=rplay.live",
        grant: "none",
      },
      server: {
        open: false
      },
    }),
  ],
});
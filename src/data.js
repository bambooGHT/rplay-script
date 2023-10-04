import { getm3u8data } from "./get";

/** @type {{ oid:string | undefined; token:string | undefined }} */
export const userData = (() => {
  const { AccountModule: data } = JSON.parse(localStorage.getItem("vuex") || `{}`);
  if (!data.token) {
    alert("需要登陆才行,登录后刷新页面");
    return {};
  }
  const { userInfo: { oid, token } } = data;
  return { oid, token };
})();

/** @type {{m3u8Data:string; downloadIndex:number; title:string; urls:import("./types.js").VideoUrls}} */
export const videoData = { m3u8Data: "", downloadIndex: 0, title: "", urls: [] };


/**
 * @param { string } title 
 * @param { string } s3Key 
 * @returns { Promise<void> }
 */
export const updateVideoData = async (title, s3Key) => {
  const { m3u8Data, urls } = await getm3u8data(s3Key);
  videoData.title = title;
  videoData.m3u8Data = m3u8Data;
  videoData.urls = urls;
  videoData.downloadIndex = urls.length - 1;
};
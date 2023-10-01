import { getResolutionUrls } from "./download/get";

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

/** @type {{m3u8Data:string; downloadIndex:number; title:string; urls:import("./download/types.js").videoUrls}} */
export const videoData = { m3u8Data: "", downloadIndex: 0, title: "", urls: [] };


/**
 * @param { string } title 
 * @param { string } s3Key 
 * @returns { Promise<void> }
 */
export const updateVideoData = async (title, s3Key) => {
  const m3u8Data = await (await fetch(getM3u8Url(s3Key))).text();
  const urls = getResolutionUrls(m3u8Data);
  videoData.title = title;
  videoData.m3u8Data = m3u8Data;
  videoData.urls = urls;
  videoData.downloadIndex = urls.length - 1;
};


/**
 * @param { string } s3Key 
 * @returns { string }
 */
const getM3u8Url = (s3Key) => {
  const [type, num, hash] = s3Key.split("/");
  return `https://api.rplay.live/content/hlsstream?s3key=kr/${type}/${num}/${hash}/${hash}.m3u8&token=${userData.token}&userOid=${userData.oid}&contentOid=6515cda280c7fc6b98065cbe&loginType=plax&abr=false`;
};